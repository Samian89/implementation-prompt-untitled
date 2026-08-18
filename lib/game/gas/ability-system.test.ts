import { describe, expect, it } from "vitest";
import { MELEE_STRIKE, RANGED_SHOOT, grantedAbilities } from "@/lib/game/data/abilities";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { spawnUnit } from "@/lib/game/units/spawn";
import { applyHit } from "@/lib/game/combat/apply-hit";
import { getAbilityEvents, setUnitLoadout, tryActivate } from "./ability-system";
import { State } from "./tags";

describe("tryActivate", () => {
  it("commits an AbilityEvent on the same tick", () => {
    const sim = createEngine({ seed: 4 });
    const captain = spawnCaptain(sim);
    const result = tryActivate(sim, captain.id, MELEE_STRIKE, { aim: { x: 0, y: 0, z: 1 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.tick).toBe(sim.tick);
      expect(result.event.sourceId).toBe(captain.id);
      expect(result.event.abilityId).toBe(MELEE_STRIKE);
    }
    expect(getAbilityEvents(sim)).toHaveLength(1);
  });

  it("blocks attacks while knocked down or dead", () => {
    const sim = createEngine({ seed: 4 });
    const captain = spawnCaptain(sim);
    applyHit(captain, 35);
    expect(tryActivate(sim, captain.id, MELEE_STRIKE).ok).toBe(false);
    applyHit(captain, 51);
    expect(captain.components.abilitySystem!.tags).toContain(State.Dead);
    expect(tryActivate(sim, captain.id, MELEE_STRIKE).ok).toBe(false);
  });

  it("refuses abilities that are not granted", () => {
    const sim = createEngine({ seed: 4 });
    const captain = spawnCaptain(sim);
    expect(tryActivate(sim, captain.id, RANGED_SHOOT).ok).toBe(false);
    setUnitLoadout(captain, "ranged");
    expect(tryActivate(sim, captain.id, RANGED_SHOOT).ok).toBe(true);
  });
});

describe("shared grants", () => {
  it("deep-equals captain and role units", () => {
    expect(grantedAbilities("captain", "melee")).toEqual(grantedAbilities("swordsman", "melee"));
    expect(grantedAbilities("captain", "ranged")).toEqual(grantedAbilities("archer", "ranged"));
  });

  it("spawns swordsmen with melee.strike and archers with ranged.shoot", () => {
    const sim = createEngine({ seed: 8 });
    const swordsman = spawnUnit(sim, {
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "c",
      x: 1,
      z: 1
    });
    const archer = spawnUnit(sim, {
      kind: "bot",
      unitDefId: "archer",
      teamId: "team-0",
      captainId: "c",
      x: 2,
      z: 2
    });
    expect(swordsman.components.abilitySystem!.granted).toEqual([MELEE_STRIKE]);
    expect(archer.components.abilitySystem!.granted).toEqual([RANGED_SHOOT]);
  });
});
