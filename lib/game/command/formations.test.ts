import { describe, expect, it } from "vitest";
import { FORMATIONS } from "@/lib/game/data/formations";
import { formationSlotWorld } from "./formations";

describe("formationSlotWorld", () => {
  it("returns different XZ points for line 0 and wedge 0", () => {
    const captainPose = { x: 0, y: 0, z: 0, yaw: 0 };
    const line = formationSlotWorld(captainPose, "line", 0);
    const wedge = formationSlotWorld(captainPose, "wedge", 0);
    expect(line.x !== wedge.x || line.z !== wedge.z).toBe(true);
    expect(FORMATIONS.line.slots[0]).not.toEqual(FORMATIONS.wedge.slots[0]);
  });
});
