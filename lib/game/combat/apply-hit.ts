import { classifyHitForce, HIT_FORCE, type HitBand } from "@/lib/game/data/hit-reactions";
import { applyImpulseToEntity } from "@/lib/game/sim/systems";
import type { Entity, SimWorld, Vec3 } from "@/lib/game/sim/types";
import { pushCombatFx } from "./fx";
import { damageHealth, getHealth } from "./health";
import {
  addTag,
  ensureAbilitySystem,
  hasTag,
  removeTag,
  State,
  syncAbilityTagsFromHit
} from "@/lib/game/gas/tags";

export type ApplyHitResult = {
  ok: true;
  band: HitBand;
  force: number;
  blockedBy: string | null;
  killed: boolean;
};

export type ApplyHitFail = {
  ok: false;
  error: "missing_target";
};

export function applyHit(target: Entity, force: number, direction?: Vec3): ApplyHitResult;
export function applyHit(
  sim: SimWorld,
  targetId: string,
  force: number,
  direction?: Vec3
): ApplyHitResult | ApplyHitFail;
export function applyHit(
  targetOrSim: Entity | SimWorld,
  forceOrTargetId: number | string,
  directionOrForce?: Vec3 | number,
  maybeDirection?: Vec3
): ApplyHitResult | ApplyHitFail {
  if (typeof forceOrTargetId === "string") {
    const sim = targetOrSim as SimWorld;
    const target = sim.getEntity(forceOrTargetId);
    if (!target) return { ok: false, error: "missing_target" };
    return applyHitToEntity(target, directionOrForce as number, maybeDirection, sim);
  }
  return applyHitToEntity(targetOrSim as Entity, forceOrTargetId, directionOrForce as Vec3 | undefined);
}

export function applyHitToEntity(
  target: Entity,
  force: number,
  direction?: Vec3,
  world?: SimWorld
): ApplyHitResult {
  ensureAbilitySystem(target);
  const dir = direction ?? { x: 1, y: 0.35, z: 0.15 };

  applyImpulseToEntity(target, force, dir);
  damageHealth(target, force);

  const hit = target.components.hitReaction;
  let band = hit ? classifyHitForce(hit.force) : classifyHitForce(force);

  // Dual death path: health reaching 0 is lethal even when the force band is
  // stumble/knockdown. Force-band death (> 50) remains the primary kill.
  if (getHealth(target) <= 0 && band !== "death") {
    promoteToDeath(target, force, dir);
    band = "death";
  }

  syncAbilityTagsFromHit(target);

  if (world) {
    const pose = impactPose(target);
    if (band === "stumble") {
      pushCombatFx(world, "stars", pose, target.id);
    } else if (band === "knockdown") {
      pushCombatFx(world, "squash", pose, target.id);
    } else {
      pushCombatFx(world, "puff", pose, target.id);
    }
  }

  return {
    ok: true,
    band,
    force,
    blockedBy: null,
    killed: band === "death" || hasTag(target, State.Dead)
  };
}

function promoteToDeath(target: Entity, force: number, direction: Vec3): void {
  const hit = target.components.hitReaction;
  const control = target.components.control;
  if (hit) {
    hit.state = "death";
    hit.force = Math.max(force, HIT_FORCE.deathAbove + 1);
    hit.remainingTicks = -1;
  }
  if (control) {
    control.enabled = false;
    control.uprightAllowed = false;
    control.moveX = 0;
    control.moveY = 0;
  }
  const ragdoll = target.components.ragdoll;
  if (ragdoll) {
    ragdoll.stiffnessScale = 0.06;
    ragdoll.poseEnabled = false;
  }
  addTag(target, State.Dead);
  addTag(target, State.Control.Lost);
  removeTag(target, State.Stumble);
  removeTag(target, State.Knockdown);
  void direction;
}

function impactPose(target: Entity): Vec3 & { yaw?: number } {
  const transform = target.components.transform;
  const torso = target.components.ragdoll?.bones.torso;
  return {
    x: torso?.x ?? transform?.x ?? 0,
    y: torso?.y ?? (transform?.y ?? 0) + 1.2,
    z: torso?.z ?? transform?.z ?? 0,
    yaw: transform?.yaw ?? 0
  };
}
