import { describe, expect, it } from "vitest";
import * as abilities from "./abilities";
import {
  ABILITIES,
  MELEE_STRIKE,
  RANGED_SHOOT,
  grantedAbilities,
  listAbilityIds
} from "./abilities";

function exportedAbilityIds(): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(abilities)) {
    if (typeof value === "string") ids.add(value);
    if (value && typeof value === "object") {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        if (typeof nested === "string") ids.add(nested);
        if (nested && typeof nested === "object" && "id" in nested) {
          const id = (nested as { id: unknown }).id;
          if (typeof id === "string") ids.add(id);
        }
      }
    }
  }
  return [...ids];
}

describe("abilities", () => {
  it("exports melee.strike and ranged.shoot and no captain.* ids", () => {
    expect(MELEE_STRIKE).toBe("melee.strike");
    expect(RANGED_SHOOT).toBe("ranged.shoot");
    expect(listAbilityIds()).toEqual(["melee.strike", "ranged.shoot"]);
    expect(ABILITIES["melee.strike"]?.id).toBe("melee.strike");
    expect(ABILITIES["ranged.shoot"]?.id).toBe("ranged.shoot");
    expect(exportedAbilityIds().filter((id) => id.startsWith("captain."))).toEqual([]);
  });

  it("grants the same melee kit to captain and swordsman", () => {
    expect(grantedAbilities("captain", "melee")).toEqual(grantedAbilities("swordsman", "melee"));
    expect(grantedAbilities("captain", "melee")).toEqual(["melee.strike"]);
  });

  it("grants the same ranged kit to captain and archer", () => {
    expect(grantedAbilities("captain", "ranged")).toEqual(grantedAbilities("archer", "ranged"));
    expect(grantedAbilities("captain", "ranged")).toEqual(["ranged.shoot"]);
  });
});
