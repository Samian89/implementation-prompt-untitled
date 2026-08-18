import { describe, expect, it } from "vitest";
import { MELEE_STRIKE } from "@/lib/game/data/abilities";
import { COMMAND_FOLLOW } from "@/lib/game/data/commands";
import { SENSORS } from "@/lib/game/data/sensors";
import { weapons } from "@/lib/game/data/weapons";
import { getAbilityEvents } from "@/lib/game/gas/ability-system";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { dressCaptain, spawnUnit } from "@/lib/game/units/spawn";
import { followSystem, issueCommand } from "@/lib/game/command/orders";
import { scoreConeTarget } from "./cone-sensor";
import { isInWeaponReach, tacticsSystem } from "./tactics";

function faceNorth(entity: { components: { transform?: { yaw: number }; control?: { lookYaw: number } } }): void {
  if (entity.components.transform) entity.components.transform.yaw = 0;
  if (entity.components.control) entity.components.control.lookYaw = 0;
}

describe("tacticsSystem weapon reach", () => {
  it("does not halt a follow swordsman ~9m from a cone hostile", () => {
    const sim = createEngine({ seed: 9, includeGlobalSystems: false });
    const captain = spawnCaptain(sim, { id: "cap-follow", x: 0, z: 4 });
    dressCaptain(captain);
    faceNorth(captain);

    const bot = spawnUnit(sim, {
      id: "sword-0",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: captain.id,
      x: 0,
      z: 0
    });
    faceNorth(bot);
    const issued = issueCommand(sim, captain.id, COMMAND_FOLLOW);
    expect(issued.ok).toBe(true);
    bot.components.control!.moveX = 0;
    bot.components.control!.moveY = 1;

    const hostile = spawnUnit(sim, {
      id: "guard-9m",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "enemy",
      x: 0,
      z: 9
    });
    faceNorth(hostile);

    const score = scoreConeTarget(bot, hostile, SENSORS.combat);
    expect(score).toBeGreaterThan(SENSORS.combat.engageThreshold);
    expect(isInWeaponReach(bot, hostile)).toBe(false);
    expect(weapons.sword.traceLength).toBe(2.2);

    const eventsBefore = getAbilityEvents(sim).length;
    tacticsSystem(sim);
    followSystem(sim);

    expect(bot.components.order?.engaging).toBe(false);
    expect(bot.components.control!.moveY).toBe(1);
    expect(getAbilityEvents(sim).slice(eventsBefore).some((event) => event.abilityId === MELEE_STRIKE)).toBe(
      false
    );
  });

  it("does not halt a captain ~11m from a cone captain", () => {
    const sim = createEngine({ seed: 10, includeGlobalSystems: false });
    const captain = spawnCaptain(sim, { id: "cap-march", teamId: "team-0", x: 0, z: 0 });
    dressCaptain(captain);
    faceNorth(captain);
    captain.components.order = {
      mode: "follow",
      slotIndex: -1,
      formationId: "box",
      engaging: false
    };
    captain.components.control!.moveY = 1;

    const enemy = spawnCaptain(sim, { id: "cap-guard", teamId: "team-1", x: 0, z: 11 });
    dressCaptain(enemy);
    faceNorth(enemy);

    const score = scoreConeTarget(captain, enemy, SENSORS.combat);
    expect(score).toBeGreaterThan(SENSORS.combat.engageThreshold);
    expect(isInWeaponReach(captain, enemy)).toBe(false);

    tacticsSystem(sim);
    expect(captain.components.order.engaging).toBe(false);
    expect(captain.components.control!.moveY).toBe(1);
  });

  it("halts and strikes only once a swordsman is inside sword.traceLength", () => {
    const sim = createEngine({ seed: 11, includeGlobalSystems: false });
    const captain = spawnCaptain(sim, { id: "cap-melee", x: 0, z: 0 });
    dressCaptain(captain);
    const bot = spawnUnit(sim, {
      id: "sword-close",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: captain.id,
      x: 0,
      z: 0
    });
    faceNorth(bot);
    issueCommand(sim, captain.id, COMMAND_FOLLOW);
    bot.components.control!.moveY = 1;

    const hostile = spawnUnit(sim, {
      id: "guard-2m",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-1",
      captainId: "enemy",
      x: 0,
      z: 2
    });

    expect(isInWeaponReach(bot, hostile)).toBe(true);
    const eventsBefore = getAbilityEvents(sim).length;
    tacticsSystem(sim);

    expect(bot.components.order?.engaging).toBe(true);
    expect(bot.components.control!.moveX).toBe(0);
    expect(bot.components.control!.moveY).toBe(0);
    expect(getAbilityEvents(sim).slice(eventsBefore).some((event) => event.abilityId === MELEE_STRIKE)).toBe(true);
  });

});
