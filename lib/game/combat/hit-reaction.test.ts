import { describe, expect, it } from "vitest";
import { State } from "@/lib/game/gas/tags";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { applyHit } from "./apply-hit";
import { getHealth } from "./health";

describe("applyHit", () => {
  it("sets stumble and keeps control at force 19", () => {
    const sim = createEngine({ seed: 1 });
    const target = spawnCaptain(sim);
    applyHit(target, 19);
    expect(target.components.hitReaction!.state).toBe("stumble");
    expect(target.components.control!.enabled).toBe(true);
  });

  it("sets knockdown at 35 and restores control by 2s", () => {
    const sim = createEngine({ seed: 1 });
    const target = spawnCaptain(sim);
    applyHit(target, 35);
    expect(target.components.hitReaction!.state).toBe("knockdown");
    expect(target.components.control!.enabled).toBe(false);
    for (let i = 0; i < 120; i++) sim.step();
    expect(sim.getEntity(target.id)!.components.control!.enabled).toBe(true);
  });

  it("sets death, State.Dead, and disabled control at force 51", () => {
    const sim = createEngine({ seed: 1 });
    const target = spawnCaptain(sim);
    applyHit(target, 51);
    expect(target.components.hitReaction!.state).toBe("death");
    expect(target.components.abilitySystem!.tags).toContain(State.Dead);
    expect(target.components.control!.enabled).toBe(false);
  });

  it("kills when health reaches 0 even if force is in the knockdown band (dual death path)", () => {
    const sim = createEngine({ seed: 2 });
    const target = spawnCaptain(sim);
    target.components.abilitySystem!.attributes.health = 10;
    applyHit(target, 20);
    expect(getHealth(target)).toBe(0);
    expect(target.components.hitReaction!.state).toBe("death");
    expect(target.components.abilitySystem!.tags).toContain(State.Dead);
    expect(target.components.control!.enabled).toBe(false);
  });
});
