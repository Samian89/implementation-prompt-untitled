import { describe, expect, it } from "vitest";
import { applyHit } from "@/lib/game/combat/apply-hit";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { dressCaptain, spawnUnit } from "@/lib/game/units/spawn";
import { getFort } from "@/lib/game/world/fort";
import { installWorld } from "@/lib/game/world/install";
import { ensureCaptainDeathSystem, RETREAT_SHOUT } from "./captain-death";
import { ensureRespawnSystem } from "./respawn";

ensureRespawnSystem();
ensureCaptainDeathSystem();

describe("captain death", () => {
  it("forces retreat and a Retreat! shout on every living allied bot", () => {
    const sim = createEngine({ seed: 5, includeGlobalSystems: true });
    installWorld(sim, { registerHeight: false });
    const home = getFort(sim, "SW")!;
    const captain = spawnCaptain(sim, { id: "cap-lead", teamId: "team-0", x: home.spawnX, z: home.spawnZ });
    dressCaptain(captain);
    const bots = [0, 1].map((slot) =>
      spawnUnit(sim, {
        id: `ally-${slot}`,
        kind: "bot",
        unitDefId: "swordsman",
        teamId: "team-0",
        captainId: captain.id,
        slotIndex: slot,
        x: home.spawnX + 1 + slot,
        z: home.spawnZ
      })
    );
    for (const bot of bots) {
      bot.components.order = {
        mode: "follow",
        slotIndex: bot.components.squad!.slotIndex,
        formationId: "line"
      };
    }

    applyHit(captain, 60);
    sim.step();

    for (const spawned of bots) {
      const bot = sim.getEntity(spawned.id)!;
      expect(bot.components.order!.mode).toBe("retreat");
      expect(bot.components.shout?.text).toBe(RETREAT_SHOUT);
      expect(bot.components.shout?.text).toBe("Retreat!");
    }
  });
});
