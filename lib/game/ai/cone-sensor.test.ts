import { describe, expect, it } from "vitest";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { spawnUnit } from "@/lib/game/units/spawn";
import { scoreConeTarget } from "./cone-sensor";

describe("scoreConeTarget", () => {
  it("is 0 behind, > 0 forward, and captains outrank bots at the same pose", () => {
    const sim = createEngine({ seed: 6 });
    const sensor = spawnCaptain(sim, { id: "sensor", x: 0, z: 0 });
    sensor.components.transform!.yaw = 0;
    sensor.components.control!.lookYaw = 0;

    const behind = spawnUnit(sim, {
      id: "behind-bot",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "other",
      x: 0,
      z: -10
    });
    const forwardBot = spawnUnit(sim, {
      id: "fwd-bot",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "other",
      x: 0,
      z: 5
    });
    const forwardCaptain = spawnCaptain(sim, {
      id: "fwd-cap",
      teamId: "team-1",
      x: 0,
      z: 5
    });

    const origin = { x: 0, z: 0, yaw: 0 };
    expect(scoreConeTarget(origin, behind)).toBe(0);
    expect(scoreConeTarget(origin, forwardBot)).toBeGreaterThan(0);
    expect(scoreConeTarget(origin, forwardCaptain)).toBeGreaterThan(scoreConeTarget(origin, forwardBot));
    expect(scoreConeTarget(sensor, behind)).toBe(0);
    expect(scoreConeTarget(sensor, forwardBot)).toBeGreaterThan(0);
  });
});
