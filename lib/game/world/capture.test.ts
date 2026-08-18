import { describe, expect, it } from "vitest";
import { createEngine } from "@/lib/game/sim/engine";
import { spawnUnit } from "@/lib/game/units/spawn";
import { applyDefenseToFort, getFort, listForts } from "./fort";
import { installWorld } from "./install";
import { spawnPlayWorld } from "./play-world";
import { ensureCaptureSystem, tryCaptureFort, unitInFortForCapture } from "./capture";

ensureCaptureSystem();

describe("play world forts", () => {
  it("writes NW, NE, SW, SE into bags.forts", () => {
    const sim = createEngine({ seed: 3 });
    spawnPlayWorld(sim, { registerHeight: false, skipGarrisons: true });
    expect(listForts(sim).map((fort) => fort.id).sort()).toEqual(["NE", "NW", "SE", "SW"]);
    expect(getFort(sim, "NW")?.x).toEqual(expect.any(Number));
    expect(getFort(sim, "SE")?.z).toEqual(expect.any(Number));
  });
});

describe("fort capture", () => {
  it("flips owner when a unit enters an open none/none courtyard", () => {
    const sim = createEngine({ seed: 1 });
    installWorld(sim, { registerHeight: false, owners: { NW: "team-1", NE: "team-1", SW: "team-0", SE: "team-1" } });
    const fort = getFort(sim, "NW")!;
    expect(fort.defense.wall).toBe("none");
    expect(fort.defense.gate).toBe("none");
    expect(fort.ownerTeamId).toBe("team-1");

    spawnUnit(sim, {
      id: "raider",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "cap-0",
      x: fort.x,
      z: fort.z
    });

    sim.step();
    expect(getFort(sim, "NW")!.ownerTeamId).toBe("team-0");
  });

  it("blocks entry through a wood gate until gate.hp <= 0", () => {
    const sim = createEngine({ seed: 2 });
    installWorld(sim, { registerHeight: false, owners: { SE: "team-1", SW: "team-0", NW: "team-1", NE: "team-1" } });
    const fort = getFort(sim, "SE")!;
    applyDefenseToFort(fort, "wood_gate");
    expect(fort.defense.gate).toBe("wood");
    expect(fort.defense.gateHp).toBeGreaterThan(0);

    const raider = spawnUnit(sim, {
      id: "raider-se",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "cap-0",
      x: fort.x,
      z: fort.z
    });

    expect(unitInFortForCapture(fort, raider)).toBe(false);
    tryCaptureFort(sim, fort);
    expect(getFort(sim, "SE")!.ownerTeamId).toBe("team-1");

    fort.defense.gateHp = 0;
    expect(unitInFortForCapture(fort, raider)).toBe(true);
    tryCaptureFort(sim, fort);
    expect(getFort(sim, "SE")!.ownerTeamId).toBe("team-0");
  });
});
