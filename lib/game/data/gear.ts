import { registerData } from "./registry";

export const GEAR_HATCHET = "hatchet";
export const GEAR_KNIFE = "knife";
export const GEAR_SPEAR = "spear";
export const GEAR_ARROWS = "arrows";
export const GEAR_ROCK = "rock";
export const GEAR_TRUMPET = "trumpet";

export type GearId =
  | typeof GEAR_HATCHET
  | typeof GEAR_KNIFE
  | typeof GEAR_SPEAR
  | typeof GEAR_ARROWS
  | typeof GEAR_ROCK
  | typeof GEAR_TRUMPET;

export type GearDef = {
  id: GearId;
  kind: "melee" | "ammo" | "thrown" | "horn";
  /** Melee connect force. Unused for non-melee rows. */
  force: number;
  /** Melee / thrown trace length. */
  traceLength: number;
  radius: number;
  /** Knife is a faster, lighter blade. */
  cooldownScale: number;
  /** Trumpet bonus on Follow / Call shout radius. */
  shoutRadiusScale: number;
  ammo: number;
};

export const GEAR: Record<GearId, GearDef> = {
  hatchet: {
    id: "hatchet",
    kind: "melee",
    force: 48,
    traceLength: 2,
    radius: 0.2,
    cooldownScale: 1,
    shoutRadiusScale: 1,
    ammo: 0
  },
  knife: {
    id: "knife",
    kind: "melee",
    force: 16,
    traceLength: 1.45,
    radius: 0.12,
    cooldownScale: 0.55,
    shoutRadiusScale: 1,
    ammo: 0
  },
  spear: {
    id: "spear",
    kind: "melee",
    force: 28,
    traceLength: 3.4,
    radius: 0.14,
    cooldownScale: 1,
    shoutRadiusScale: 1,
    ammo: 0
  },
  arrows: {
    id: "arrows",
    kind: "ammo",
    force: 32,
    traceLength: 0,
    radius: 0.1,
    cooldownScale: 1,
    shoutRadiusScale: 1,
    ammo: 16
  },
  rock: {
    id: "rock",
    kind: "thrown",
    force: 22,
    traceLength: 8,
    radius: 0.16,
    cooldownScale: 1,
    shoutRadiusScale: 1,
    ammo: 4
  },
  trumpet: {
    id: "trumpet",
    kind: "horn",
    force: 0,
    traceLength: 0,
    radius: 0,
    cooldownScale: 1,
    shoutRadiusScale: 1.25,
    ammo: 0
  }
};

registerData("gear", GEAR);

export const GEAR_IDS: GearId[] = ["hatchet", "knife", "spear", "arrows", "rock", "trumpet"];

export function getGear(id: string): GearDef | undefined {
  if (id === "hatchet" || id === "knife" || id === "spear" || id === "arrows" || id === "rock" || id === "trumpet") {
    return GEAR[id];
  }
  return undefined;
}

export function listGearIds(): GearId[] {
  return GEAR_IDS.slice();
}

export function nextGearId(index: number): GearId {
  return GEAR_IDS[((index % GEAR_IDS.length) + GEAR_IDS.length) % GEAR_IDS.length]!;
}
