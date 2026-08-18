import { describe, expect, it } from "vitest";
import { RANGED_SHOOT } from "@/lib/game/data/abilities";
import { weapons } from "@/lib/game/data/weapons";
import { tryActivate } from "@/lib/game/gas/ability-system";
import { createEngine } from "@/lib/game/sim/engine";
import { spawnUnit } from "@/lib/game/units/spawn";
import { listProjectiles } from "./projectile";

describe("ranged.shoot", () => {
  it("spawns a ballistic projectile whose y drops and that applies arrow force on overlap", () => {
    const sim = createEngine({ seed: 5, includeGlobalSystems: true });
    const archer = spawnUnit(sim, {
      id: "archer-0",
      kind: "captain",
      unitDefId: "captain",
      teamId: "team-0",
      captainId: "archer-0",
      x: 0,
      z: 0,
      playerId: "local",
      drivenBy: "player"
    });
    archer.components.abilitySystem!.granted = [RANGED_SHOOT];
    archer.components.abilitySystem!.loadout = "ranged";

    const fired = tryActivate(sim, archer.id, RANGED_SHOOT, { aim: { x: 0, y: 0, z: 1 } });
    expect(fired.ok).toBe(true);

    const spawned = listProjectiles(sim);
    expect(spawned).toHaveLength(1);
    const projectile = spawned[0]!;
    const y0 = projectile.components.transform!.y;

    sim.step();
    sim.step();
    const after = sim.getEntity(projectile.id);
    expect(after).toBeDefined();
    expect(after!.components.transform!.y).toBeLessThan(y0);

    const dummy = spawnUnit(sim, {
      id: "target-dummy",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "other",
      x: after!.components.transform!.x,
      y: 0,
      z: after!.components.transform!.z
    });
    dummy.components.control!.drivenBy = "none";
    delete dummy.components.roam;

    for (let i = 0; i < 12; i++) sim.step();
    expect(dummy.components.hitReaction!.force).toBe(weapons.arrow.force);
    expect(listProjectiles(sim).some((entity) => entity.id === projectile.id)).toBe(false);
  });
});
