import { describe, expect, it } from "vitest";
import { STARTING_TREASURY } from "./economy";
import {
  AI_PERSONALITIES,
  AI_PERSONALITY_IDS,
  personalityPlanCost
} from "./ai-personalities";

describe("ai personalities", () => {
  it("defines wall_lord, horde, balanced, and archer_keep spend plans that fit starting cash", () => {
    expect(AI_PERSONALITY_IDS).toEqual(["wall_lord", "horde", "balanced", "archer_keep"]);
    for (const id of AI_PERSONALITY_IDS) {
      expect(personalityPlanCost(AI_PERSONALITIES[id])).toBeLessThanOrEqual(STARTING_TREASURY);
    }
    expect(AI_PERSONALITIES.horde.defenses).not.toContain("high_wall");
    expect(AI_PERSONALITIES.horde.wall).toBe("none");
    expect(AI_PERSONALITIES.horde.units.swordsman + AI_PERSONALITIES.horde.units.archer).toBe(20);
    expect(AI_PERSONALITIES.wall_lord.defenses).toContain("high_wall");
    expect(AI_PERSONALITIES.wall_lord.wall).toBe("high");
  });
});
