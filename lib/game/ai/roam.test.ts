import { describe, expect, it } from "vitest";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { spawnSquad } from "@/lib/game/units/spawn";
import { ensureRoamSystem } from "./roam";

ensureRoamSystem();

function xzDistance(
  a: { x: number; z: number },
  b: { x: number; z: number }
): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe("roam", () => {
  it("moves at least one idle bot more than 0.5 on XZ after 180 ticks with no player input", () => {
    const sim = createEngine({ seed: 17 });
    const captain = spawnCaptain(sim, { playerId: "local", x: 0, z: 0 });
    const spawned = spawnSquad(sim, captain.id, ["swordsman", "archer", "swordsman"]);
    expect(spawned.ok).toBe(true);

    const start = spawned.entities.map((bot) => ({
      id: bot.id,
      x: bot.components.transform!.x,
      z: bot.components.transform!.z
    }));

    for (let i = 0; i < 180; i++) {
      sim.step();
    }

    const moved = start.some((pose) => {
      const after = sim.getEntity(pose.id)!.components.transform!;
      return xzDistance(pose, after) > 0.5;
    });
    expect(moved).toBe(true);
  });

  it("does not roam a player-driven Captain", () => {
    const sim = createEngine({ seed: 9 });
    const captain = spawnCaptain(sim, { playerId: "local", x: 0, z: 0 });
    spawnSquad(sim, captain.id, ["swordsman"]);
    const start = { x: captain.components.transform!.x, z: captain.components.transform!.z };
    for (let i = 0; i < 180; i++) sim.step();
    const after = sim.getEntity(captain.id)!.components.transform!;
    expect(xzDistance(start, after)).toBeLessThan(0.05);
    expect(captain.components.control!.drivenBy).toBe("player");
  });
});
