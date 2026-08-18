import { requireUnitDef, type UnitDef, type UnitDefId } from "@/lib/game/data/units";
import type { AppearanceComponent, Entity } from "@/lib/game/sim/types";

export type CosmeticProp = "crown" | "banner" | "blade" | "bow";

export function appearanceFromDef(def: UnitDef): AppearanceComponent {
  return {
    skinId: def.skinId,
    primaryColor: def.primaryColor,
    isCaptain: def.role === "captain",
    heightScale: def.heightScale,
    unitDefId: def.id
  };
}

export function attachUnitAppearance(entity: Entity, unitDefId: UnitDefId | string): AppearanceComponent {
  const appearance = appearanceFromDef(requireUnitDef(unitDefId));
  entity.components.appearance = appearance;
  return appearance;
}

export function cosmeticPropFor(def: UnitDef): CosmeticProp {
  if (def.role === "captain") return "crown";
  if (def.role === "ranged") return "bow";
  return "blade";
}

export function parseHexColor(hex: string, fallback = 0x888888): number {
  const cleaned = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return fallback;
  return Number.parseInt(cleaned, 16);
}
