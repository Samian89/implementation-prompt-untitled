import { describe, expect, it } from "vitest";
import { createEngine, spawnCaptain } from "./engine";
import { assertSerializable } from "./snapshot";
import { emptyInput } from "./input";

describe("SimEngine", () => {
  it("moves the Captain more than 0.5 on x after 60 ticks of moveX=1", () => {
    const sim = createEngine({ includeGlobalSystems: true });
    const captain = spawnCaptain(sim, { playerId: "local", x: 0, z: 0 });
    const spawnX = captain.components.transform!.x;
    for (let i = 0; i < 60; i++) {
      sim.submitInput({
        ...emptyInput("local", sim.tick),
        moveX: 1
      });
      sim.step();
    }
    const after = sim.getEntity(captain.id)!;
    expect(Math.abs(after.components.transform!.x - spawnX)).toBeGreaterThan(0.5);
  });

  it("classifies debug impulses as stumble, knockdown (recover by tick 120), and death", () => {
    const stumbleSim = createEngine();
    const stumbleCaptain = spawnCaptain(stumbleSim);
    stumbleSim.applyImpulse(stumbleCaptain.id, 10);
    expect(stumbleCaptain.components.control!.enabled).toBe(true);
    expect(stumbleCaptain.components.hitReaction!.state).toBe("stumble");

    const knockdownSim = createEngine();
    const knockdownCaptain = spawnCaptain(knockdownSim);
    knockdownSim.applyImpulse(knockdownCaptain.id, 35);
    expect(knockdownCaptain.components.control!.enabled).toBe(false);
    expect(knockdownCaptain.components.hitReaction!.state).toBe("knockdown");
    for (let i = 0; i < 120; i++) knockdownSim.step();
    expect(knockdownSim.getEntity(knockdownCaptain.id)!.components.control!.enabled).toBe(true);

    const deathSim = createEngine();
    const deathCaptain = spawnCaptain(deathSim);
    deathSim.applyImpulse(deathCaptain.id, 60);
    for (let i = 0; i < 180; i++) deathSim.step();
    const dead = deathSim.getEntity(deathCaptain.id)!;
    expect(dead.components.hitReaction!.state).toBe("death");
    expect(dead.components.control!.enabled).toBe(false);
  });

  it("writes serializable snapshots with timeScale 1", () => {
    const sim = createEngine();
    spawnCaptain(sim);
    sim.submitInput({ ...emptyInput("local", 0), moveX: 1 });
    const snapshot = sim.step();
    expect(snapshot.timeScale).toBe(1);
    expect(Array.isArray(snapshot.entities)).toBe(true);
    expect(() => assertSerializable(snapshot)).not.toThrow();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
