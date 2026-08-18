import { describe, expect, it } from "vitest";
import { applyHit } from "@/lib/game/combat/apply-hit";
import { getHealth, getMaxHealth } from "@/lib/game/combat/health";
import { State } from "@/lib/game/gas/tags";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { dressCaptain, spawnUnit } from "@/lib/game/units/spawn";
import { getFort } from "@/lib/game/world/fort";
import { installWorld } from "@/lib/game/world/install";
import { ensureRespawnSystem, RESPAWN_TICKS } from "./respawn";

ensureRespawnSystem();

describe("bot respawn", () => {
  it("revives at the home gate after 1200 ticks and walks toward its last slot", () => {
    const sim = createEngine({ seed: 6, includeGlobalSystems: true });
    installWorld(sim, { registerHeight: false });
    const home = getFort(sim, "SW")!;
    const captain = spawnCaptain(sim, { id: "cap-home", teamId: "team-0", x: home.spawnX, z: home.spawnZ });
    dressCaptain(captain);
    captain.components.formationLoadout!.homeFortId = "SW";

    const bot = spawnUnit(sim, {
      id: "walker",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: captain.id,
      slotIndex: 0,
      x: home.spawnX + 1,
      z: home.spawnZ
    });
    const slot = { x: home.spawnX + 18, z: home.spawnZ + 2 };
    bot.components.order = {
      mode: "hold",
      slotIndex: 0,
      formationId: "line",
      holdX: slot.x,
      holdZ: slot.z
    };

    applyHit(bot, 60);
    expect(bot.components.hitReaction!.state).toBe("death");

    for (let i = 0; i < RESPAWN_TICKS; i++) sim.step();

    const revived = sim.getEntity(bot.id)!;
    expect(["alive", "idle"]).toContain(revived.components.hitReaction!.state);
    expect(revived.components.hitReaction!.state).not.toBe("death");
    expect(getHealth(revived)).toBe(getMaxHealth(revived));
    expect(revived.components.abilitySystem!.tags).not.toContain(State.Invulnerable);
    expect(revived.components.abilitySystem!.tags).not.toContain(State.Dead);
    const spawnDist = Math.hypot(revived.components.transform!.x - home.spawnX, revived.components.transform!.z - home.spawnZ);
    expect(spawnDist).toBeLessThan(2.5);

    const distAtRespawn = Math.hypot(
      revived.components.transform!.x - slot.x,
      revived.components.transform!.z - slot.z
    );
    for (let i = 0; i < 300; i++) sim.step();
    const after = sim.getEntity(bot.id)!;
    const distLater = Math.hypot(after.components.transform!.x - slot.x, after.components.transform!.z - slot.z);
    expect(distLater).toBeLessThan(distAtRespawn);
  });
});
