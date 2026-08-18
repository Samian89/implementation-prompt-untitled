import { describe, expect, it } from "vitest";
import { GEAR, GEAR_IDS, listGearIds } from "./gear";

describe("gear table", () => {
  it("exports hatchet, knife, spear, arrows, rock, trumpet", () => {
    expect(listGearIds()).toEqual(["hatchet", "knife", "spear", "arrows", "rock", "trumpet"]);
    expect(GEAR_IDS).toEqual(["hatchet", "knife", "spear", "arrows", "rock", "trumpet"]);
    expect(GEAR.hatchet.id).toBe("hatchet");
    expect(GEAR.knife.id).toBe("knife");
    expect(GEAR.spear.id).toBe("spear");
    expect(GEAR.arrows.id).toBe("arrows");
    expect(GEAR.rock.id).toBe("rock");
    expect(GEAR.trumpet.id).toBe("trumpet");
  });
});
