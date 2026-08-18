import { getGear, type GearId } from "@/lib/game/data/gear";
import { weapons } from "@/lib/game/data/weapons";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { getEconomy } from "./treasury";

export function grantGear(world: Pick<SimWorld, "bags">, entity: Entity, gearId: GearId): void {
  const inventory = entity.components.inventory ?? { gear: [] };
  if (!inventory.gear.includes(gearId)) inventory.gear.push(gearId);
  const def = getGear(gearId);
  if (def?.kind === "melee" || def?.kind === "thrown") {
    inventory.equipped = gearId;
  }
  if (def && def.ammo > 0) {
    inventory.ammo = (inventory.ammo ?? 0) + def.ammo;
  }
  if (def && def.shoutRadiusScale > 1) {
    inventory.shoutRadiusScale = def.shoutRadiusScale;
  }
  entity.components.inventory = inventory;

  const bag = getEconomy(world);
  const teamGear = bag.inventories[entity.teamId] ?? [];
  teamGear.push(gearId);
  bag.inventories[entity.teamId] = teamGear;
  world.bags.economy = bag;
}

export type ResolvedMelee = {
  force: number;
  traceLength: number;
  radius: number;
  gateDamage: number;
};

export function resolveMeleeWeapon(entity: Entity): ResolvedMelee {
  const equipped = entity.components.inventory?.equipped;
  const gear = equipped ? getGear(equipped) : undefined;
  const swordUpgrade = entity.components.upgrades?.sword;
  if (gear && gear.kind === "melee") {
    return {
      force: gear.force,
      traceLength: gear.traceLength,
      radius: gear.radius,
      gateDamage: gear.id === "hatchet" ? 28 : 14
    };
  }
  return {
    force: weapons.sword.force + (swordUpgrade ? 8 : 0),
    traceLength: weapons.sword.traceLength,
    radius: weapons.sword.radius,
    gateDamage: 14
  };
}

export function shoutRadiusScaleOf(entity: Entity): number {
  return entity.components.inventory?.shoutRadiusScale ?? 1;
}
