import { describe, expect, it } from "vitest";
import { MELEE_STRIKE } from "@/lib/game/data/abilities";
import { tryActivate } from "@/lib/game/gas/ability-system";
import { createEngine } from "@/lib/game/sim/engine";
import { spawnUnit } from "@/lib/game/units/spawn";
import { getHealth } from "./health";
import { isProjectileEntity } from "./collider";

describe("melee.strike", () => {
  it("reduces dummy health at 1.5m and does not create a projectile", () => {
    const sim = createEngine({ seed: 3 });
    const attacker = spawnUnit(sim, {
      id: "striker",
      kind: "captain",
      unitDefId: "captain",
      teamId: "team-0",
      captainId: "striker",
      x: 0,
      z: 0,
      playerId: "local",
      drivenBy: "player"
    });
    const dummy = spawnUnit(sim, {
      id: "dummy",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "other",
      x: 0,
      z: 1.5
    });
    dummy.components.control!.drivenBy = "none";
    dummy.components.control!.moveX = 0;
    dummy.components.control!.moveY = 0;
    delete dummy.components.roam;

    const healthBefore = getHealth(dummy);
    const result = tryActivate(sim, attacker.id, MELEE_STRIKE, { aim: { x: 0, y: 0, z: 1 } });
    expect(result.ok).toBe(true);
    expect(getHealth(dummy)).toBeLessThan(healthBefore);
    expect([...sim.entities.values()].some(isProjectileEntity)).toBe(false);
  });
});
