import { describe, expect, it } from "vitest";
import { MAX_SQUAD_SIZE } from "./units";
import { STARTING_ARMY_SIZE, STARTING_TREASURY, UNIT_COST } from "./economy";

describe("economy table", () => {
  it("exports starting treasury and unit cost that buy exactly the squad cap", () => {
    expect(STARTING_TREASURY).toBe(2000);
    expect(UNIT_COST).toBe(100);
    expect(STARTING_TREASURY / UNIT_COST).toBe(20);
    expect(STARTING_TREASURY / UNIT_COST).toBe(MAX_SQUAD_SIZE);
    expect(STARTING_ARMY_SIZE).toBe(MAX_SQUAD_SIZE);
  });
});
