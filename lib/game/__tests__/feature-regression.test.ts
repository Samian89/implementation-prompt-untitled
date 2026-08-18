import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { applyHit } from "@/lib/game/combat/apply-hit";
import { getHealth, getMaxHealth } from "@/lib/game/combat/health";
import { handleMapPointer } from "@/lib/game/command/map-scroll";
import { isLivingCombatant, setFormationScrollOpen, setMapScrollOpen } from "@/lib/game/command/orders";
import { grantedAbilities } from "@/lib/game/data/abilities";
import { CAPTURE_PAYOUT, STARTING_TREASURY } from "@/lib/game/data/economy";
import { classifyHitForce } from "@/lib/game/data/hit-reactions";
import { tryRecruit } from "@/lib/game/economy/recruit";
import { getTreasury } from "@/lib/game/economy/treasury";
import { State } from "@/lib/game/gas/tags";
import { ensureCaptainDeathSystem, RETREAT_SHOUT } from "@/lib/game/lifecycle/captain-death";
import { ensureRespawnSystem, RESPAWN_TICKS } from "@/lib/game/lifecycle/respawn";
import { createMatch } from "@/lib/game/match/create-match";
import { debugSetFortOwner } from "@/lib/game/match/rules";
import { LocalHost } from "@/lib/game/net/local-host";
import { createSession } from "@/lib/game/net/session";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { emptyInput } from "@/lib/game/sim/input";
import { dressCaptain, spawnUnit } from "@/lib/game/units/spawn";
import { getFort, listForts, pointInCourtyard } from "@/lib/game/world/fort";
import { getMatch, installWorld } from "@/lib/game/world/install";
import { FORT_IDS } from "@/lib/game/world/map";

ensureRespawnSystem();
ensureCaptainDeathSystem();

const REPO_ROOT = join(__dirname, "../../..");

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...collectSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function exportedIdentifiers(source: string): string[] {
  const names: string[] = [];
  const pattern =
    /export\s+(?:async\s+)?(?:declare\s+)?(?:type|interface|enum|class|function|const|let|var)\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    names.push(match[1]!);
  }
  return names;
}

function livingSquadBots(world: ReturnType<typeof createEngine>, captainId: string) {
  return [...world.entities.values()].filter(
    (entity) =>
      entity.kind === "bot" &&
      entity.components.squad?.captainId === captainId &&
      isLivingCombatant(entity)
  );
}

function evictCourtyard(
  world: ReturnType<typeof createEngine>,
  fort: NonNullable<ReturnType<typeof getFort>>,
  keepId?: string
): void {
  for (const entity of world.entities.values()) {
    if (entity.id === keepId) continue;
    const transform = entity.components.transform;
    if (!transform) continue;
    if (pointInCourtyard(fort, transform.x, transform.z)) {
      transform.x = fort.x + 28;
      transform.z = fort.z + 28;
    }
  }
}

function stepUntilLive(world: ReturnType<typeof createMatch>, limit = 16): void {
  for (let i = 0; i < limit && getMatch(world).phase === "recruit"; i++) {
    world.step();
  }
}

describe("feature regression — hit bands", () => {
  it("keeps the locked classifyHitForce bands", () => {
    expect(classifyHitForce(19)).toBe("stumble");
    expect(classifyHitForce(20)).toBe("knockdown");
    expect(classifyHitForce(50)).toBe("knockdown");
    expect(classifyHitForce(51)).toBe("death");
  });
});

describe("feature regression — scrolls stay real-time and map is view-only", () => {
  it("keeps timeScale === 1 with both scrolls open and issues no map orders on a live four-fort snapshot", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    stepUntilLive(world);
    expect(getMatch(world).phase).toBe("live");
    expect(listForts(world)).toHaveLength(4);
    expect(world.bags.forts).toBeTruthy();

    setFormationScrollOpen(world, true);
    setMapScrollOpen(world, true);
    expect((world.bags.ui as { formationScrollOpen?: boolean }).formationScrollOpen).toBe(true);
    expect((world.bags.ui as { mapScrollOpen?: boolean }).mapScrollOpen).toBe(true);

    for (let i = 0; i < 120; i++) {
      const snapshot = world.step();
      expect(snapshot.timeScale).toBe(1);
      expect(world.timeScale).toBe(1);
    }

    const before = Array.isArray(world.bags.abilityEvents)
      ? (world.bags.abilityEvents as unknown[]).length
      : 0;
    const result = handleMapPointer(0.25, -0.4, world);
    expect(result).toEqual({ issuedOrders: [] });
    expect(result.issuedOrders).toEqual([]);
    const after = Array.isArray(world.bags.abilityEvents)
      ? (world.bags.abilityEvents as Array<{ abilityId: string }>)
      : [];
    expect(after.slice(before).filter((event) => event.abilityId.startsWith("command."))).toEqual([]);
  });
});

describe("feature regression — capture payout cannot break the 20-cap", () => {
  it("refuses a 21st living squad member after a post-capture treasury increase", () => {
    const sim = createEngine({ seed: 8, includeGlobalSystems: true });
    installWorld(sim, { registerHeight: false });
    const home = getFort(sim, "SW")!;
    const captain = spawnCaptain(sim, {
      id: "cap-shop",
      teamId: "team-0",
      x: home.spawnX,
      z: home.spawnZ
    });
    dressCaptain(captain);
    expect(getTreasury(sim, "team-0")).toBe(STARTING_TREASURY);

    const bought = tryRecruit(sim, { captainId: captain.id, unitDefId: "swordsman", count: 20 });
    expect(bought.ok).toBe(true);
    expect(getTreasury(sim, "team-0")).toBe(0);
    expect(livingSquadBots(sim, captain.id)).toHaveLength(20);

    const target = getFort(sim, "NW")!;
    expect(target.ownerTeamId).not.toBe("team-0");
    target.defense.wall = "none";
    target.defense.gate = "none";
    target.defense.gateHp = 0;
    const raider = livingSquadBots(sim, captain.id)[0]!;
    evictCourtyard(sim, target, raider.id);
    raider.components.transform!.x = target.x;
    raider.components.transform!.z = target.z;

    sim.step();
    expect(getFort(sim, "NW")!.ownerTeamId).toBe("team-0");
    expect(getTreasury(sim, "team-0")).toBe(CAPTURE_PAYOUT);
    expect(getTreasury(sim, "team-0")).toBeGreaterThan(0);

    const extra = tryRecruit(sim, { captainId: captain.id, unitDefId: "swordsman" });
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error).toBe("squad_cap");
    expect(livingSquadBots(sim, captain.id)).toHaveLength(20);
  });
});

describe("feature regression — captain death and bot respawn", () => {
  it("emits Retreat! on captain death and revives a bot at tick 1200 with full health and no invulnerability", () => {
    const sim = createEngine({ seed: 5, includeGlobalSystems: true });
    installWorld(sim, { registerHeight: false });
    const home = getFort(sim, "SW")!;
    const captain = spawnCaptain(sim, {
      id: "cap-lead",
      teamId: "team-0",
      x: home.spawnX,
      z: home.spawnZ
    });
    dressCaptain(captain);
    captain.components.formationLoadout!.homeFortId = "SW";

    const ally = spawnUnit(sim, {
      id: "ally-0",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: captain.id,
      slotIndex: 0,
      x: home.spawnX + 1,
      z: home.spawnZ
    });
    ally.components.order = {
      mode: "follow",
      slotIndex: 0,
      formationId: "line"
    };

    const walker = spawnUnit(sim, {
      id: "walker",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: captain.id,
      slotIndex: 1,
      x: home.spawnX + 2,
      z: home.spawnZ
    });
    walker.components.order = {
      mode: "hold",
      slotIndex: 1,
      formationId: "line",
      holdX: home.spawnX + 18,
      holdZ: home.spawnZ + 2
    };

    applyHit(captain, 60);
    sim.step();
    const livingAlly = sim.getEntity(ally.id)!;
    expect(livingAlly.components.order!.mode).toBe("retreat");
    expect(livingAlly.components.shout?.text).toBe(RETREAT_SHOUT);
    expect(livingAlly.components.shout?.text).toBe("Retreat!");

    applyHit(walker, 60);
    expect(walker.components.hitReaction!.state).toBe("death");
    for (let i = 0; i < RESPAWN_TICKS; i++) sim.step();

    const revived = sim.getEntity(walker.id)!;
    expect(revived.components.hitReaction!.state).not.toBe("death");
    expect(getHealth(revived)).toBe(getMaxHealth(revived));
    expect(revived.components.abilitySystem!.tags).not.toContain(State.Invulnerable);
    expect(revived.components.abilitySystem!.tags).not.toContain(State.Dead);
  });
});

describe("feature regression — four-fort match fixture", () => {
  it("goes from recruit through a fort ownership change to bags.match.phase === ended", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    expect(getMatch(world).phase).toBe("recruit");
    expect(listForts(world)).toHaveLength(4);

    stepUntilLive(world);
    expect(getMatch(world).phase).toBe("live");

    const ownersAtLive = Object.fromEntries(listForts(world).map((fort) => [fort.id, fort.ownerTeamId]));
    expect(new Set(Object.values(ownersAtLive)).size).toBeGreaterThan(1);

    const nw = getFort(world, "NW")!;
    nw.defense.wall = "none";
    nw.defense.gate = "none";
    nw.defense.gateHp = 0;
    const raider = [...world.entities.values()].find(
      (entity) => entity.kind === "bot" && entity.teamId === "team-0" && isLivingCombatant(entity)
    );
    expect(raider).toBeTruthy();
    evictCourtyard(world, nw, raider!.id);
    raider!.components.transform!.x = nw.x;
    raider!.components.transform!.z = nw.z;

    world.step();
    expect(getFort(world, "NW")!.ownerTeamId).toBe("team-0");
    expect(getFort(world, "NW")!.ownerTeamId).not.toBe(ownersAtLive.NW);
    expect(getMatch(world).phase).toBe("live");

    for (const id of FORT_IDS) {
      debugSetFortOwner(world, id, 0);
    }
    expect(getMatch(world).phase).not.toBe("ended");
    world.step();
    expect(getMatch(world).phase).toBe("ended");
    expect(getMatch(world).winnerTeamId).toBe(0);
  });
});

describe("feature regression — shared combat grants", () => {
  it("keeps captain melee grants deep-equal to swordsman melee", () => {
    expect(grantedAbilities("captain", "melee")).toEqual(grantedAbilities("swordsman", "melee"));
    expect(grantedAbilities("captain", "ranged")).toEqual(grantedAbilities("archer", "ranged"));
  });
});

describe("feature regression — local multiplayer", () => {
  it("moves two LocalHost captains in opposite x directions", () => {
    const host = new LocalHost({ playerIds: ["p1", "p2"], seed: 1, registerHeight: false });
    const start = host.getSnapshot();
    const startP1 = start.entities.find((entity) => entity.components.control?.playerId === "p1");
    const startP2 = start.entities.find((entity) => entity.components.control?.playerId === "p2");
    const x1 = startP1!.components.transform!.x;
    const x2 = startP2!.components.transform!.x;

    for (let i = 0; i < 60; i++) {
      host.submitInput({ ...emptyInput("p1", host.world.tick), moveX: 1 });
      host.submitInput({ ...emptyInput("p2", host.world.tick), moveX: -1 });
      host.step();
    }

    const end = host.getSnapshot();
    const endP1 = end.entities.find((entity) => entity.components.control?.playerId === "p1");
    const endP2 = end.entities.find((entity) => entity.components.control?.playerId === "p2");
    const dx1 = endP1!.components.transform!.x - x1;
    const dx2 = endP2!.components.transform!.x - x2;
    expect(dx1).toBeGreaterThan(0.5);
    expect(dx2).toBeLessThan(-0.5);
    host.dispose();
  });

  it("fills unfilled seats with AI kings", () => {
    expect(createSession({ humans: 1 }).aiKingCount).toBe(3);
  });
});

describe("feature regression — no blood or gore identifiers", () => {
  it("has no blood/gore filename or exported identifier under lib/game or components/game", () => {
    const roots = [join(REPO_ROOT, "lib/game"), join(REPO_ROOT, "components/game")];
    const banned = /blood|gore/i;
    for (const root of roots) {
      for (const file of collectSourceFiles(root)) {
        const rel = relative(REPO_ROOT, file);
        expect(rel, rel).not.toMatch(banned);
        for (const name of exportedIdentifiers(readFileSync(file, "utf8"))) {
          expect(name, `${rel} export ${name}`).not.toMatch(banned);
        }
      }
    }
  });
});
