import { getCommandAbilityDef } from "./commands";
import { registerData } from "./registry";

export const MELEE_STRIKE = "melee.strike";
export const RANGED_SHOOT = "ranged.shoot";

export type AbilityId = typeof MELEE_STRIKE | typeof RANGED_SHOOT;

export type AbilityKind = "melee" | "ranged" | "command";

export type LoadoutRole = "melee" | "ranged";

export type AbilityDef = {
  id: string;
  kind: AbilityKind;
  cooldownTicks: number;
};

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  [MELEE_STRIKE]: {
    id: MELEE_STRIKE,
    kind: "melee",
    cooldownTicks: 36
  },
  [RANGED_SHOOT]: {
    id: RANGED_SHOOT,
    kind: "ranged",
    cooldownTicks: 45
  }
};

registerData("abilities", ABILITIES);

export function listAbilityIds(): AbilityId[] {
  return [MELEE_STRIKE, RANGED_SHOOT];
}

export function getAbilityDef(id: string): AbilityDef | undefined {
  if (id === MELEE_STRIKE || id === RANGED_SHOOT) return ABILITIES[id];
  return getCommandAbilityDef(id);
}

export function requireAbilityDef(id: string): AbilityDef {
  const def = getAbilityDef(id);
  if (!def) throw new Error(`unknown ability: ${id}`);
  return def;
}

/**
 * Grant table is role-based. Captain is not a unique combat kit —
 * melee matches swordsman, ranged matches archer.
 */
export function grantedAbilities(_unitDefId: string, loadout: LoadoutRole): AbilityId[] {
  if (loadout === "ranged") return [RANGED_SHOOT];
  return [MELEE_STRIKE];
}
