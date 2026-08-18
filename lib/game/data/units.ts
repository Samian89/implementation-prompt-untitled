import { registerData } from "./registry";

/** Architectural cap: bots per Captain. The Captain is not counted. */
export const MAX_SQUAD_SIZE = 20;

export const RAGDOLL_PREFAB_ID = "humanoid.default";

export type UnitRole = "melee" | "ranged" | "captain";

export type UnitDefId = "swordsman" | "archer" | "captain";

export type UnitDef = {
  id: UnitDefId;
  ragdollPrefabId: string;
  skinId: string;
  primaryColor: string;
  heightScale: number;
  role: UnitRole;
};

/**
 * Shared humanoid ragdoll prefab, distinct cosmetic skins.
 * Captain is a skin / priority marker only — no extra combat stats.
 */
export const UNIT_DEFS: Record<UnitDefId, UnitDef> = {
  swordsman: {
    id: "swordsman",
    ragdollPrefabId: RAGDOLL_PREFAB_ID,
    skinId: "skin.swordsman",
    primaryColor: "#1d4ed8",
    heightScale: 1,
    role: "melee"
  },
  archer: {
    id: "archer",
    ragdollPrefabId: RAGDOLL_PREFAB_ID,
    skinId: "skin.archer",
    primaryColor: "#15803d",
    heightScale: 0.97,
    role: "ranged"
  },
  captain: {
    id: "captain",
    ragdollPrefabId: RAGDOLL_PREFAB_ID,
    skinId: "skin.captain",
    primaryColor: "#b45309",
    heightScale: 1.12,
    role: "captain"
  }
};

registerData("units", UNIT_DEFS);

export function getUnitDef(id: string): UnitDef | undefined {
  if (id === "swordsman" || id === "archer" || id === "captain") {
    return UNIT_DEFS[id];
  }
  return undefined;
}

export function requireUnitDef(id: string): UnitDef {
  const def = getUnitDef(id);
  if (!def) throw new Error(`unknown unit def: ${id}`);
  return def;
}

export function listUnitDefIds(): UnitDefId[] {
  return ["swordsman", "archer", "captain"];
}
