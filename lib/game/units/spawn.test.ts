import { describe, expect, it } from "vitest";
import { listBoneIds } from "@/lib/game/physics/ragdoll";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { MAX_SQUAD_SIZE } from "@/lib/game/data/units";
import { countSquadBots, spawnPlaySandbox, spawnSquad, spawnUnit } from "./spawn";

describe("spawnSquad", () => {
  it("accepts 20 bots and refuses a 21st with squad_cap", () => {
    const sim = createEngine({ seed: 11 });
    const captain = spawnCaptain(sim, { id: "cap-a", x: 0, z: 0 });
    const first = spawnSquad(sim, captain.id, Array.from({ length: 20 }, () => "swordsman"));
    expect(first.ok).toBe(true);
    expect(first.entities).toHaveLength(20);
    expect(countSquadBots(sim, captain.id)).toBe(MAX_SQUAD_SIZE);

    const extra = spawnSquad(sim, captain.id, ["archer"]);
    expect(extra).toEqual({ ok: false, error: "squad_cap", entities: [] });
    expect(countSquadBots(sim, captain.id)).toBe(20);
  });

  it("gives every bot the same ragdoll bone id set as the Captain", () => {
    const sim = createEngine({ seed: 4 });
    const captain = spawnCaptain(sim, { x: 0, z: 0 });
    const result = spawnSquad(sim, captain.id, ["swordsman", "archer", "swordsman"]);
    expect(result.ok).toBe(true);
    const captainBones = listBoneIds(captain.components.ragdoll!);
    for (const bot of result.entities) {
      expect(listBoneIds(bot.components.ragdoll!)).toEqual(captainBones);
    }
  });

  it("starts bots as AI-driven with distinct appearance ids", () => {
    const sim = createEngine({ seed: 2 });
    const captain = spawnCaptain(sim, { x: 0, z: 0 });
    const result = spawnSquad(sim, captain.id, ["swordsman", "archer"]);
    expect(result.ok).toBe(true);
    const [swordsman, archer] = result.entities;
    expect(swordsman!.kind).toBe("bot");
    expect(swordsman!.components.control!.playerId).toBeNull();
    expect(swordsman!.components.control!.drivenBy).toBe("ai");
    expect(swordsman!.components.appearance!.skinId).not.toBe(archer!.components.appearance!.skinId);
    expect(swordsman!.components.appearance!.isCaptain).toBe(false);
    expect(captain.components.appearance!.isCaptain).toBe(true);
    expect(captain.components.appearance!.skinId).not.toBe(swordsman!.components.appearance!.skinId);
  });
});

describe("spawnPlaySandbox", () => {
  it("spawns one captain, four swordsmen, and two archers", () => {
    const sim = createEngine({ seed: 7 });
    const { captain, bots } = spawnPlaySandbox(sim);
    expect(captain.kind).toBe("captain");
    expect(captain.components.appearance?.isCaptain).toBe(true);
    expect(bots).toHaveLength(6);
    expect(bots.filter((bot) => bot.components.appearance?.unitDefId === "swordsman")).toHaveLength(4);
    expect(bots.filter((bot) => bot.components.appearance?.unitDefId === "archer")).toHaveLength(2);
    expect(countSquadBots(sim, captain.id)).toBe(6);
  });
});

describe("createUnit / spawnUnit", () => {
  it("attaches transform, control, ragdoll, hitReaction, appearance, and squad", () => {
    const sim = createEngine({ seed: 1 });
    const unit = spawnUnit(sim, {
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "cap-1",
      x: 3,
      z: -2,
      slotIndex: 4
    });
    expect(unit.components.transform).toMatchObject({ x: 3, z: -2 });
    expect(unit.components.control).toBeDefined();
    expect(unit.components.ragdoll).toBeDefined();
    expect(unit.components.hitReaction).toBeDefined();
    expect(unit.components.appearance?.unitDefId).toBe("swordsman");
    expect(unit.components.squad).toEqual({ captainId: "cap-1", slotIndex: 4 });
    expect(unit.components.roam).toBeDefined();
  });
});
