import { describe, expect, it } from "vitest";
import {
  MAX_SQUAD_SIZE,
  UNIT_DEFS,
  getUnitDef,
  listUnitDefIds,
  RAGDOLL_PREFAB_ID
} from "./units";

describe("unit defs", () => {
  it("exports MAX_SQUAD_SIZE equal to 20", () => {
    expect(MAX_SQUAD_SIZE).toBe(20);
  });

  it("exports unit def ids swordsman, archer, captain", () => {
    expect(listUnitDefIds().sort()).toEqual(["archer", "captain", "swordsman"]);
    expect(UNIT_DEFS.swordsman.id).toBe("swordsman");
    expect(UNIT_DEFS.archer.id).toBe("archer");
    expect(UNIT_DEFS.captain.id).toBe("captain");
    expect(getUnitDef("swordsman")?.id).toBe("swordsman");
    expect(getUnitDef("archer")?.id).toBe("archer");
    expect(getUnitDef("captain")?.id).toBe("captain");
  });

  it("gives the captain a distinct skinId", () => {
    expect(UNIT_DEFS.captain.skinId).not.toBe(UNIT_DEFS.swordsman.skinId);
    expect(UNIT_DEFS.captain.skinId).not.toBe(UNIT_DEFS.archer.skinId);
    expect(UNIT_DEFS.swordsman.skinId).not.toBe(UNIT_DEFS.archer.skinId);
  });

  it("shares one ragdoll prefab across all rows", () => {
    expect(UNIT_DEFS.swordsman.ragdollPrefabId).toBe(RAGDOLL_PREFAB_ID);
    expect(UNIT_DEFS.archer.ragdollPrefabId).toBe(RAGDOLL_PREFAB_ID);
    expect(UNIT_DEFS.captain.ragdollPrefabId).toBe(RAGDOLL_PREFAB_ID);
  });
});
