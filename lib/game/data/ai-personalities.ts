import { UNIT_COST, UPGRADE_COST } from "./economy";
import { DEFENSES, type DefenseId } from "./defenses";
import { registerData } from "./registry";
import type { RecruitableId, UpgradeId } from "./economy";

export type PersonalityId = "wall_lord" | "horde" | "balanced" | "archer_keep";

export type PersonalityDef = {
  id: PersonalityId;
  /** Planned home-fort wall. `horde` never writes `high`. */
  wall: "none" | "palisade" | "high";
  defenses: DefenseId[];
  units: Record<RecruitableId, number>;
  upgrades: UpgradeId[];
  sortieThreshold: number;
};

export const AI_PERSONALITY_IDS: PersonalityId[] = ["wall_lord", "horde", "balanced", "archer_keep"];

/**
 * Spend plans over the 005 economy API. Starting cash is 2000.
 * wall_lord: high wall + fewer units.
 * horde: 20 units, no wall.
 * balanced / archer_keep: mix of palisade, gate, and troops.
 */
export const AI_PERSONALITIES: Record<PersonalityId, PersonalityDef> = {
  wall_lord: {
    id: "wall_lord",
    wall: "high",
    defenses: ["high_wall", "wood_gate"],
    units: { swordsman: 8, archer: 2 },
    upgrades: [],
    sortieThreshold: 4
  },
  horde: {
    id: "horde",
    wall: "none",
    defenses: [],
    units: { swordsman: 16, archer: 4 },
    upgrades: [],
    sortieThreshold: 8
  },
  balanced: {
    id: "balanced",
    wall: "palisade",
    defenses: ["palisade", "wood_gate"],
    units: { swordsman: 8, archer: 6 },
    upgrades: [],
    sortieThreshold: 5
  },
  archer_keep: {
    id: "archer_keep",
    wall: "palisade",
    defenses: ["palisade", "wood_gate"],
    units: { swordsman: 4, archer: 10 },
    upgrades: [],
    sortieThreshold: 5
  }
};

registerData("aiPersonalities", AI_PERSONALITIES);

export function getPersonality(id: string): PersonalityDef | undefined {
  if (id === "wall_lord" || id === "horde" || id === "balanced" || id === "archer_keep") {
    return AI_PERSONALITIES[id];
  }
  return undefined;
}

export function requirePersonality(id: string): PersonalityDef {
  const def = getPersonality(id);
  if (!def) throw new Error(`unknown personality: ${id}`);
  return def;
}

export function personalityPlanCost(def: PersonalityDef): number {
  let cost = 0;
  for (const defenseId of def.defenses) {
    cost += DEFENSES[defenseId].cost;
  }
  cost += (def.units.swordsman + def.units.archer) * UNIT_COST;
  for (const upgrade of def.upgrades) {
    cost += UPGRADE_COST[upgrade];
  }
  return cost;
}
