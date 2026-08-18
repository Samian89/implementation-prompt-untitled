import { describe, expect, it } from "vitest";
import { createSession } from "./session";

describe("createSession", () => {
  it("fills unfilled seats with AI kings", () => {
    expect(createSession({ humans: 1 }).aiKingCount).toBe(3);
    expect(createSession({ humans: 2 }).aiKingCount).toBe(2);
    expect(createSession({ humans: 4 }).aiKingCount).toBe(0);
  });
});
