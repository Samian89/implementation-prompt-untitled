import { describe, expect, it } from "vitest";
import { DEFENSES, listDefenseIds } from "./defenses";

describe("defenses table", () => {
  it("prices a high wall above leftover cash after 20 units", () => {
    expect(listDefenseIds()).toEqual(["palisade", "high_wall", "wood_gate", "reinforced_gate"]);
    expect(DEFENSES.palisade.cost).toBe(400);
    expect(DEFENSES.high_wall.cost).toBe(800);
    expect(DEFENSES.wood_gate.cost).toBe(200);
    expect(DEFENSES.reinforced_gate.cost).toBe(500);
    expect(DEFENSES.high_wall.tier).toBe("high");
  });
});
