import { MAX_SQUAD_SIZE } from "./units";
import { registerData } from "./registry";

/** Starting cash: enough for 20 naked units, or a mix of units and defenses. */
export const STARTING_TREASURY = 2000;

/** Cost of one swordsman or archer. */
export const UNIT_COST = 100;

/**
 * Architectural army cap. Starting cash buys at most this many units
 * and cannot also afford a high wall.
 */
export const STARTING_ARMY_SIZE = MAX_SQUAD_SIZE;

export const CAPTURE_PAYOUT = 400;

export const UPGRADE_COST = {
  sword: 40,
  shield: 40
} as const;

export type UpgradeId = keyof typeof UPGRADE_COST;

export const UNIT_COSTS = {
  swordsman: UNIT_COST,
  archer: UNIT_COST
} as const;

export type RecruitableId = keyof typeof UNIT_COSTS;

registerData("economy", {
  STARTING_TREASURY,
  UNIT_COST,
  STARTING_ARMY_SIZE,
  CAPTURE_PAYOUT,
  UPGRADE_COST,
  UNIT_COSTS
});

if (STARTING_TREASURY / UNIT_COST !== MAX_SQUAD_SIZE) {
  throw new Error("STARTING_TREASURY / UNIT_COST must equal MAX_SQUAD_SIZE");
}
