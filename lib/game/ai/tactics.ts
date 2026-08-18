import { facingAim } from "@/lib/game/combat/collider";
import { MELEE_STRIKE, RANGED_SHOOT } from "@/lib/game/data/abilities";
import { SENSORS } from "@/lib/game/data/sensors";
import { tryActivate } from "@/lib/game/gas/ability-system";
import { isLivingCombatant } from "@/lib/game/command/orders";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { bestConeHostile } from "./cone-sensor";

export const TACTICS_SYSTEM_NAME = "tactics";

const ENGAGE_MODES = new Set(["follow", "garrison", "hold"]);

function combatAbilityId(entity: Entity): string {
  const loadout = entity.components.abilitySystem?.loadout;
  if (loadout === "ranged") return RANGED_SHOOT;
  const granted = entity.components.abilitySystem?.granted ?? [];
  if (granted.includes(RANGED_SHOOT) && !granted.includes(MELEE_STRIKE)) return RANGED_SHOOT;
  return MELEE_STRIKE;
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
    if (!best || best.score <= sensor.engageThreshold) {
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
