import { describe, expect, it } from "vitest";
import { COMMAND_FOLLOW, COMMAND_FORM_WEDGE } from "@/lib/game/data/commands";
import { tryActivate } from "@/lib/game/gas/ability-system";
import { createEngine } from "@/lib/game/sim/engine";
import { spawnPlaySandbox } from "@/lib/game/units/spawn";
import { formationSlotWorld } from "./formations";
import { handleMapPointer } from "./map-scroll";
import {
  captainPoseOf,
  ensureFollowSystem,
  isLivingCombatant,
  setFormationScrollOpen
} from "./orders";
import { ensureTacticsSystem } from "@/lib/game/ai/tactics";

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
