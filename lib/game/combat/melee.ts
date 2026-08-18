import { weapons } from "@/lib/game/data/weapons";
import { HIT_FORCE } from "@/lib/game/data/hit-reactions";
import type { Entity, SimWorld, Vec3 } from "@/lib/game/sim/types";
import { applyHitToEntity } from "./apply-hit";
import {
  facingAim,
  isCombatant,
  normalize,
  segmentCapsuleDistance,
  unitCollider,
  type UnitCollider
} from "./collider";
import { pushCombatFx } from "./fx";

export type MeleeTraceHit = {
  entity: Entity;
  collider: UnitCollider;
  distance: number;
  glance: boolean;
};

/** Capsule/ray swing from the striking limb. Never uses the projectile mover. */
export function meleeTrace(
  world: SimWorld,
  attacker: Entity,
  aim?: Vec3
): MeleeTraceHit | null {
  const { start, end } = swingSegment(attacker, aim);
  let best: MeleeTraceHit | null = null;
  for (const entity of world.entities.values()) {
    if (entity.id === attacker.id) continue;
    if (!isCombatant(entity)) continue;
    const collider = unitCollider(entity);
    if (!collider) continue;
    const signed = segmentCapsuleDistance(start, end, collider);
    if (signed > weapons.sword.radius) continue;
    const distance = Math.hypot(collider.x - start.x, collider.z - start.z);
    if (!best || distance < best.distance) {
      best = {
        entity,
        collider,
        distance,
        glance: signed > 0
      };
    }
  }
  return best;
}

export function executeMeleeStrike(world: SimWorld, attacker: Entity, aim?: Vec3): MeleeTraceHit | null {
  const { start, end } = swingSegment(attacker, aim);
  const dir = normalize({ x: end.x - start.x, y: end.y - start.y, z: end.z - start.z });
  attacker.components.swing = { remainingTicks: 14, yaw: attacker.components.transform?.yaw ?? 0 };
  pushCombatFx(world, "swing", { x: start.x, y: start.y, z: start.z, yaw: attacker.components.transform?.yaw ?? 0 }, attacker.id);

  const hit = meleeTrace(world, attacker, aim);
  if (!hit) return null;

  const force = hit.glance ? Math.min(HIT_FORCE.stumbleBelow - 1, weapons.sword.force * 0.4) : weapons.sword.force;
  applyHitToEntity(hit.entity, force, dir, world);
  return hit;
}

export function swingSegment(attacker: Entity, aim?: Vec3): { start: Vec3; end: Vec3 } {
  const transform = attacker.components.transform;
  const limb = attacker.components.ragdoll?.bones.lowerArmR;
  const start: Vec3 = limb
    ? { x: limb.x, y: limb.y, z: limb.z }
    : {
        x: transform?.x ?? 0,
        y: (transform?.y ?? 0) + 1.1,
        z: transform?.z ?? 0
      };
  const yaw = attacker.components.control?.lookYaw ?? transform?.yaw ?? 0;
  const direction = normalize(aim ?? facingAim(yaw, 0));
  const length = weapons.sword.traceLength;
  return {
    start,
    end: {
      x: start.x + direction.x * length,
      y: start.y + direction.y * length,
      z: start.z + direction.z * length
    }
  };
}
