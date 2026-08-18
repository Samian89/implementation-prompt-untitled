import { getMaxHealth, setHealth } from "@/lib/game/combat/health";
import { ensureAbilitySystem, removeTag, State } from "@/lib/game/gas/tags";
import { createJointedRagdoll, snapRagdollToPose } from "@/lib/game/physics/ragdoll";
import { sampleGroundHeight } from "@/lib/game/physics/ground";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, OrderComponent, SimWorld } from "@/lib/game/sim/types";
import { formationSlotWorld } from "@/lib/game/command/formations";
import { captainPoseOf } from "@/lib/game/command/orders";
import { homeFortForTeam } from "@/lib/game/world/fort";

export const RESPAWN_SYSTEM_NAME = "respawn";
/** 20 seconds at the locked 60 Hz tick. */
export const RESPAWN_TICKS = 1200;

export function isDeadCombatant(entity: Entity): boolean {
  if (entity.kind !== "captain" && entity.kind !== "bot") return false;
  if (entity.components.hitReaction?.state === "death") return true;
  return entity.components.abilitySystem?.tags.includes(State.Dead) ?? false;
}

export function lastOrderedSlot(world: SimWorld, entity: Entity): { x: number; z: number } {
  const order = entity.components.order;
  if (order?.mode === "hold" && order.holdX != null && order.holdZ != null) {
    return { x: order.holdX, z: order.holdZ };
  }
  if (order?.mode === "retreat" && order.retreatX != null && order.retreatZ != null) {
    return { x: order.retreatX, z: order.retreatZ };
  }
  const captainId = entity.kind === "captain" ? entity.id : entity.components.squad?.captainId;
  const captain = captainId ? world.getEntity(captainId) : undefined;
  if (captain && order) {
    const slot = formationSlotWorld(
      captainPoseOf(captain),
      order.formationId,
      order.slotIndex,
      order.customOffset ? [{ index: order.slotIndex, x: order.customOffset.x, z: order.customOffset.z }] : captain.components.formationLoadout?.custom.slots
    );
    return { x: slot.x, z: slot.z };
  }
  const home = homeFortForTeam(
    world,
    entity.teamId,
    captain?.components.formationLoadout?.homeFortId ?? entity.components.formationLoadout?.homeFortId
  );
  return { x: home?.spawnX ?? 0, z: home?.spawnZ ?? 0 };
}

export function queueRespawn(world: SimWorld, entity: Entity): void {
  if (entity.components.respawn) return;
  const slot = lastOrderedSlot(world, entity);
  const captain = entity.kind === "captain" ? entity : world.getEntity(entity.components.squad?.captainId ?? "");
  const home = homeFortForTeam(
    world,
    entity.teamId,
    captain?.components.formationLoadout?.homeFortId ?? entity.components.formationLoadout?.homeFortId
  );
  entity.components.respawn = {
    remainingTicks: RESPAWN_TICKS,
    homeFortId: home?.id,
    lastSlotX: slot.x,
    lastSlotZ: slot.z
  };
}

export function placeEntityAt(entity: Entity, x: number, z: number): void {
  const y = sampleGroundHeight(x, z);
  const transform = entity.components.transform;
  if (transform) {
    transform.x = x;
    transform.y = y;
    transform.z = z;
  }
  const yaw = entity.components.control?.lookYaw ?? transform?.yaw ?? 0;
  entity.components.ragdoll = createJointedRagdoll({ x, y, z });
  if (entity.components.ragdoll && transform) {
    snapRagdollToPose(entity.components.ragdoll, { x, y, z, yaw });
  }
}

export function reviveEntity(entity: Entity): void {
  const hit = entity.components.hitReaction;
  if (hit) {
    hit.state = "alive";
    hit.force = 0;
    hit.remainingTicks = 0;
  }
  const control = entity.components.control;
  if (control) {
    control.enabled = true;
    control.uprightAllowed = true;
    control.moveX = 0;
    control.moveY = 0;
  }
  const ragdoll = entity.components.ragdoll;
  if (ragdoll) {
    ragdoll.stiffnessScale = 1;
    ragdoll.poseEnabled = true;
  }
  ensureAbilitySystem(entity);
  setHealth(entity, getMaxHealth(entity));
  removeTag(entity, State.Dead);
  removeTag(entity, State.Control.Lost);
  removeTag(entity, State.Knockdown);
  removeTag(entity, State.Stumble);
  removeTag(entity, State.Invulnerable);
}

export function fireRespawn(world: SimWorld, entity: Entity): void {
  const pending = entity.components.respawn;
  const home = homeFortForTeam(world, entity.teamId, pending?.homeFortId);
  const x = home?.spawnX ?? pending?.lastSlotX ?? 0;
  const z = home?.spawnZ ?? pending?.lastSlotZ ?? 0;
  placeEntityAt(entity, x, z);
  reviveEntity(entity);
  const lastX = pending?.lastSlotX ?? x;
  const lastZ = pending?.lastSlotZ ?? z;
  if (entity.kind === "bot") {
    const order: OrderComponent = entity.components.order ?? {
      mode: "hold",
      slotIndex: entity.components.squad?.slotIndex ?? 0,
      formationId: "line"
    };
    order.mode = "hold";
    order.holdX = lastX;
    order.holdZ = lastZ;
    order.engaging = false;
    entity.components.order = order;
  }
  delete entity.components.respawn;
}

export function respawnSystem(world: SimWorld): void {
  if (!world.bags.forts) return;
  for (const entity of world.entities.values()) {
    if (!isDeadCombatant(entity)) continue;
    if (!entity.components.respawn) queueRespawn(world, entity);
    const pending = entity.components.respawn;
    if (!pending) continue;
    pending.remainingTicks -= 1;
    if (pending.remainingTicks <= 0) {
      fireRespawn(world, entity);
    }
  }
}

export function ensureRespawnSystem(): void {
  registerSystem(RESPAWN_SYSTEM_NAME, respawnSystem);
}

ensureRespawnSystem();
