import { describe, expect, it } from "vitest";
import { classifyHitForce } from "./hit-reactions";

describe("classifyHitForce", () => {
  it("returns stumble below 20", () => {
    expect(classifyHitForce(19)).toBe("stumble");
  });

  it("returns knockdown at the inclusive 20–50 band", () => {
    expect(classifyHitForce(20)).toBe("knockdown");
    expect(classifyHitForce(50)).toBe("knockdown");
  });

  it("returns death above 50", () => {
    expect(classifyHitForce(51)).toBe("death");
  });
});
