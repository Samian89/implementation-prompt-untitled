import { facingAim } from "@/lib/game/combat/collider";
import { MELEE_STRIKE, RANGED_SHOOT } from "@/lib/game/data/abilities";
import { SENSORS } from "@/lib/game/data/sensors";
import { resolveMeleeWeapon } from "@/lib/game/economy/gear";
import { tryActivate } from "@/lib/game/gas/ability-system";
import { isLivingCombatant } from "@/lib/game/command/orders";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { bestConeHostile } from "./cone-sensor";

export const TACTICS_SYSTEM_NAME = "tactics";

const ENGAGE_MODES = new Set(["follow", "garrison", "hold"]);

/** Archers halt and fire inside this band; beyond it they keep closing. */
export const BOW_ENGAGE_RANGE = 8;

function combatAbilityId(entity: Entity): string {
  const loadout = entity.components.abilitySystem?.loadout;
  if (loadout === "ranged") return RANGED_SHOOT;
  const granted = entity.components.abilitySystem?.granted ?? [];
  if (granted.includes(RANGED_SHOOT) && !granted.includes(MELEE_STRIKE)) return RANGED_SHOOT;
  return MELEE_STRIKE;
}

export function weaponEngageRange(entity: Entity): number {
  if (combatAbilityId(entity) === RANGED_SHOOT) return BOW_ENGAGE_RANGE;
  return resolveMeleeWeapon(entity).traceLength;
}

export function distanceToEntity(entity: Entity, target: Entity): number {
  const from = entity.components.transform;
  const to = target.components.transform;
  if (!from || !to) return Number.POSITIVE_INFINITY;
  return Math.hypot(to.x - from.x, to.z - from.z);
}

/** True when a hostile is inside sword.traceLength or the short bow band. */
export function isInWeaponReach(entity: Entity, target: Entity): boolean {
  return distanceToEntity(entity, target) <= weaponEngageRange(entity);
}

export function tacticsSystem(world: SimWorld): void {
  const sensor = SENSORS.combat;
  for (const entity of world.entities.values()) {
    if (entity.kind !== "bot" && entity.kind !== "captain") continue;
    if (!isLivingCombatant(entity)) continue;
    const order = entity.components.order;
    if (!order || !ENGAGE_MODES.has(order.mode)) {
      if (order) order.engaging = false;
      continue;
    }

    const best = bestConeHostile(world, entity, sensor);
    if (!best || best.score <= sensor.engageThreshold || !isInWeaponReach(entity, best.target)) {
      order.engaging = false;
      continue;
    }

    order.engaging = true;
    const control = entity.components.control;
    const transform = entity.components.transform;
    const targetPose = best.target.components.transform;
    if (control && transform && targetPose) {
      const dx = targetPose.x - transform.x;
      const dz = targetPose.z - transform.z;
      control.lookYaw = Math.atan2(dx, dz);
      transform.yaw = control.lookYaw;
      control.moveX = 0;
      control.moveY = 0;
    }
    const aim = targetPose
      ? facingAim(control?.lookYaw ?? transform?.yaw ?? 0, 0)
      : undefined;
    tryActivate(world, entity.id, combatAbilityId(entity), {
      aim,
      targetId: best.target.id
    });
  }
}

export function ensureTacticsSystem(): void {
  registerSystem(TACTICS_SYSTEM_NAME, tacticsSystem);
}

ensureTacticsSystem();
