import { describe, expect, it } from "vitest";
import { battlefieldLabel } from "./bindings";

describe("split-screen labels", () => {
  it("names each local pane Captain n battlefield", () => {
    expect(battlefieldLabel(1)).toBe("Captain 1 battlefield");
    expect(battlefieldLabel(2)).toBe("Captain 2 battlefield");
  });
});
