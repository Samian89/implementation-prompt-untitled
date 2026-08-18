import { registerData } from "./registry";

export type WallTier = "none" | "palisade" | "high";
export type GateTier = "none" | "wood" | "reinforced";

export type DefenseId = "palisade" | "high_wall" | "wood_gate" | "reinforced_gate";

export type DefenseDef = {
  id: DefenseId;
  kind: "wall" | "gate";
  tier: WallTier | GateTier;
  cost: number;
  hp: number;
};

export const DEFENSES: Record<DefenseId, DefenseDef> = {
  palisade: {
    id: "palisade",
    kind: "wall",
    tier: "palisade",
    cost: 400,
    hp: 0
  },
  high_wall: {
    id: "high_wall",
    kind: "wall",
    tier: "high",
    cost: 800,
    hp: 0
  },
  wood_gate: {
    id: "wood_gate",
    kind: "gate",
    tier: "wood",
    cost: 200,
    hp: 80
  },
  reinforced_gate: {
    id: "reinforced_gate",
    kind: "gate",
    tier: "reinforced",
    cost: 500,
    hp: 160
  }
};

registerData("defenses", DEFENSES);

export function getDefense(id: string): DefenseDef | undefined {
  if (id in DEFENSES) return DEFENSES[id as DefenseId];
  return undefined;
}

export function requireDefense(id: string): DefenseDef {
  const def = getDefense(id);
  if (!def) throw new Error(`unknown defense: ${id}`);
  return def;
}

export function listDefenseIds(): DefenseId[] {
  return ["palisade", "high_wall", "wood_gate", "reinforced_gate"];
}

export function wallTierOf(id: DefenseId): WallTier | null {
  const def = DEFENSES[id];
  return def.kind === "wall" ? (def.tier as WallTier) : null;
}

export function gateTierOf(id: DefenseId): GateTier | null {
  const def = DEFENSES[id];
  return def.kind === "gate" ? (def.tier as GateTier) : null;
}
