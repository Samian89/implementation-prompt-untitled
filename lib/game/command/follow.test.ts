import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MELEE_STRIKE } from "@/lib/game/data/abilities";
import { COMMAND_FOLLOW, COMMAND_FORM_WEDGE } from "@/lib/game/data/commands";
import { getAbilityEvents, tryActivate } from "@/lib/game/gas/ability-system";
import { createEngine } from "@/lib/game/sim/engine";
import { countSquadBots, spawnPlaySandbox, spawnUnit } from "@/lib/game/units/spawn";
import { tryRecruit } from "@/lib/game/economy/recruit";
import { createMatch } from "@/lib/game/match/create-match";
import { getMatch } from "@/lib/game/world/install";
import { STARTING_TREASURY } from "@/lib/game/data/economy";
import { getTreasury } from "@/lib/game/economy/treasury";
import { LocalHost } from "@/lib/game/net/local-host";
import { marchSplitCaptain, recruitSplitCaptain } from "@/lib/game/net/muster";
import { findCaptainByPlayerId } from "@/lib/game/net/session";
import { startMarch } from "@/lib/game/world/play-world";
import { formationSlotWorld } from "./formations";
import { handleMapPointer } from "./map-scroll";
import {
  captainPoseOf,
  ensureFollowSystem,
  isLivingCombatant,
  setFormationScrollOpen
} from "./orders";
import { ensureTacticsSystem, tacticsSystem } from "@/lib/game/ai/tactics";
import { roamSystem } from "@/lib/game/ai/roam";

ensureFollowSystem();
ensureTacticsSystem();

describe("follow + wedge", () => {
  it("moves each living bot within 3m of its wedge slot after 300 ticks", () => {
    const sim = createEngine({ seed: 3 });
    const { captain, bots } = spawnPlaySandbox(sim);
    expect(bots.length).toBeGreaterThan(0);

    const follow = tryActivate(sim, captain.id, COMMAND_FOLLOW);
    expect(follow.ok).toBe(true);
    const form = tryActivate(sim, captain.id, COMMAND_FORM_WEDGE);
    expect(form.ok).toBe(true);

    for (let i = 0; i < 300; i++) {
      sim.step();
    }

    const pose = captainPoseOf(sim.getEntity(captain.id)!);
    for (const spawned of bots) {
      const bot = sim.getEntity(spawned.id)!;
      if (!isLivingCombatant(bot)) continue;
      const slotIndex = bot.components.squad?.slotIndex ?? 0;
      const slot = formationSlotWorld(pose, "wedge", slotIndex);
      const transform = bot.components.transform!;
      const distance = Math.hypot(transform.x - slot.x, transform.z - slot.z);
      expect(distance).toBeLessThanOrEqual(3);
    }
  });
});

describe("formation scroll time", () => {
  it("leaves timeScale === 1 for 120 ticks while the scroll is open", () => {
    const sim = createEngine({ seed: 5 });
    spawnPlaySandbox(sim);
    setFormationScrollOpen(sim, true);
    expect((sim.bags.ui as { formationScrollOpen?: boolean }).formationScrollOpen).toBe(true);

    for (let i = 0; i < 120; i++) {
      const snapshot = sim.step();
      expect(snapshot.timeScale).toBe(1);
    }
  });
});

describe("handleMapPointer", () => {
  it("returns { issuedOrders: [] } and does not push command.* events", () => {
    const sim = createEngine({ seed: 2 });
    const { captain } = spawnPlaySandbox(sim);
    tryActivate(sim, captain.id, COMMAND_FOLLOW);
    const before = Array.isArray(sim.bags.abilityEvents) ? (sim.bags.abilityEvents as unknown[]).length : 0;

    const result = handleMapPointer(0.25, -0.4, sim);
    expect(result).toEqual({ issuedOrders: [] });
    expect(result.issuedOrders).toEqual([]);

    const after = Array.isArray(sim.bags.abilityEvents) ? (sim.bags.abilityEvents as Array<{ abilityId: string }>) : [];
    const newCommands = after.slice(before).filter((event) => event.abilityId.startsWith("command."));
    expect(newCommands).toEqual([]);
  });
});

describe("March issues Follow", () => {
  it("PlayCanvas.onMarch issues Follow after ready so the live squad can engage", () => {
    const source = readFileSync(join(__dirname, "../../../components/game/play-canvas.tsx"), "utf8");
    const onMarch = source.slice(source.indexOf("const onMarch"), source.indexOf("const onPlayAgain"));
    expect(onMarch).toContain("readyAndMaybeBegin");
    expect(onMarch).toContain("issueCommand(engine, captain.id, COMMAND_FOLLOW)");
    expect(onMarch).toContain("startMarch");
  });

  it("LocalSplitPlay mounts RecruitSetup so each human can muster and March", () => {
    const source = readFileSync(join(__dirname, "../../../components/game/split-view.tsx"), "utf8");
    expect(source).toContain("RecruitSetup");
    expect(source).toContain("marchSplitCaptain");
    expect(source).toContain("recruitSplitCaptain");
    expect(source).toContain("${title} Recruit");
    expect(source).toContain("${title} · Muster");
    expect(source).not.toContain("startMarch");
  });

  it("lets each local human recruit independently and waits for every March before live", () => {
    const host = new LocalHost({ playerIds: ["p1", "p2"], humans: 2, seed: 7, registerHeight: false });
    const p1 = findCaptainByPlayerId(host.world.entities.values(), "p1");
    const p2 = findCaptainByPlayerId(host.world.entities.values(), "p2");
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(countSquadBots(host.world, p1!.id)).toBe(0);
    expect(countSquadBots(host.world, p2!.id)).toBe(0);
    expect(getTreasury(host.world, p1!.teamId)).toBe(STARTING_TREASURY);
    expect(getTreasury(host.world, p2!.teamId)).toBe(STARTING_TREASURY);
    expect(getMatch(host.world).phase).toBe("recruit");

    expect(recruitSplitCaptain(host.world, "p1", "swordsman")).toBe(true);
    expect(countSquadBots(host.world, p1!.id)).toBe(1);
    expect(countSquadBots(host.world, p2!.id)).toBe(0);

    expect(marchSplitCaptain(host.world, "p1")).toBe(true);
    expect(getMatch(host.world).phase).toBe("recruit");

    expect(recruitSplitCaptain(host.world, "p2", "archer")).toBe(true);
    expect(countSquadBots(host.world, p2!.id)).toBe(1);
    expect(marchSplitCaptain(host.world, "p2")).toBe(true);
    expect(getMatch(host.world).phase).toBe("live");
    host.dispose();
  });

  it("recruits swordsmen, marches, and melees a close hostile without C or H", () => {
    const world = createMatch({ humanPlayers: 1, seed: 7, registerHeight: false });
    const captain = world.getEntity("captain-SW");
    expect(captain).toBeDefined();
    const recruited = tryRecruit(world, { captainId: captain!.id, unitDefId: "swordsman" });
    expect(recruited.ok).toBe(true);
    if (!recruited.ok) return;
    const bot = recruited.entities[0]!;
    expect(bot.components.order).toBeUndefined();

    startMarch(world, captain!.id);

    expect(getMatch(world).phase).toBe("live");
    expect(bot.components.order?.mode).toBe("follow");

    roamSystem(world);
    expect(bot.components.order?.mode).toBe("follow");

    const transform = bot.components.transform!;
    transform.x = 0;
    transform.z = 0;
    transform.yaw = 0;
    if (bot.components.control) bot.components.control.lookYaw = 0;

    spawnUnit(world, {
      id: "hostile-close",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "enemy",
      x: 0,
      z: 2
    });

    const eventsBefore = getAbilityEvents(world).length;
    tacticsSystem(world);
    expect(bot.components.order?.engaging).toBe(true);
    expect(getAbilityEvents(world).slice(eventsBefore).some((event) => event.abilityId === MELEE_STRIKE)).toBe(true);
  });
});
