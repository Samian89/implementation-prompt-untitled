import { describe, expect, it } from "vitest";
import {
  FORMATIONS,
  getFormation,
  listFormationIds
} from "./formations";

describe("formations", () => {
  it("exports wedge, line, box, custom each with at least 20 slots", () => {
    expect(listFormationIds()).toEqual(["wedge", "line", "box", "custom"]);
    for (const id of listFormationIds()) {
      const def = getFormation(id);
      expect(def?.id).toBe(id);
      expect(FORMATIONS[id].slots.length).toBeGreaterThanOrEqual(20);
    }
  });
});
