import { describe, expect, it } from "vitest";
import { classifyHitForce } from "./hit-reactions";
import { weapons } from "./weapons";

describe("weapons", () => {
  it("exports sword trace + knockdown force and a ballistic arrow", () => {
    expect(weapons.sword.traceLength).toBeGreaterThan(1.5);
    expect(classifyHitForce(weapons.sword.force)).toBe("knockdown");
    expect(weapons.arrow.force).toBeGreaterThan(0);
    expect(weapons.arrow.speed).toBeGreaterThan(0);
    expect(weapons.arrow.gravity).toBeGreaterThan(0);
  });
});
