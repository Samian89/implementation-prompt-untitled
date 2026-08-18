import { describe, expect, it } from "vitest";
import { applyHit } from "@/lib/game/combat/apply-hit";
import { resolveRetreatTarget } from "@/lib/game/command/orders";
import { tryRecruit } from "@/lib/game/economy/recruit";
import { fireRespawn } from "@/lib/game/lifecycle/respawn";
import { createMatch } from "@/lib/game/match/create-match";
import { beginLiveMatch } from "@/lib/game/match/rules";
import { spawnUnit } from "@/lib/game/units/spawn";
import { getFort, homeFortForTeam, pointInCourtyard, setFortOwner } from "@/lib/game/world/fort";

function playerCaptain(world: ReturnType<typeof createMatch>) {
  const captain = [...world.entities.values()].find(
    (entity) => entity.kind === "captain" && entity.teamId === "team-0"
  );
  expect(captain).toBeTruthy();
  return captain!;
}

describe("home fort after capture", () => {
  it("does not respawn the player captain inside a lost SW yard", () => {
    const world = createMatch({ humanPlayers: 1, seed: 4, registerHeight: false });
    beginLiveMatch(world);
    const captain = playerCaptain(world);
    const sw = getFort(world, "SW")!;

    captain.components.transform!.x = sw.courtyard.minX - 4;
    captain.components.transform!.z = sw.courtyard.minZ - 4;
    setFortOwner(sw, "team-1");

    expect(homeFortForTeam(world, "team-0", captain.components.formationLoadout?.homeFortId)).toBeUndefined();

    applyHit(captain, 60);
    world.step();
    expect(captain.components.respawn).toBeTruthy();
    fireRespawn(world, captain);

    expect(pointInCourtyard(sw, captain.components.transform!.x, captain.components.transform!.z)).toBe(false);
    const spawnDist = Math.hypot(
      captain.components.transform!.x - sw.spawnX,
      captain.components.transform!.z - sw.spawnZ
    );
    expect(spawnDist).toBeGreaterThan(2.5);
  });

  it("recruits at the still-owned SW fort after a captured NW home is lost", () => {
    const world = createMatch({ humanPlayers: 1, seed: 5, registerHeight: false });
    beginLiveMatch(world);
    const captain = playerCaptain(world);
    const nw = getFort(world, "NW")!;
    const sw = getFort(world, "SW")!;

    setFortOwner(nw, "team-0");
    captain.components.formationLoadout!.homeFortId = "NW";
    expect(captain.components.formationLoadout?.homeFortId).toBe("NW");

    setFortOwner(nw, "team-2");
    captain.components.transform!.x = sw.spawnX;
    captain.components.transform!.z = sw.spawnZ;

    const recruited = tryRecruit(world, { captainId: captain.id, unitDefId: "swordsman" });
    expect(recruited.ok).toBe(true);
    if (!recruited.ok) return;
    const bot = recruited.entities[0]!;
    const toSw = Math.hypot(bot.components.transform!.x - sw.spawnX, bot.components.transform!.z - sw.spawnZ);
    const toNw = Math.hypot(bot.components.transform!.x - nw.spawnX, bot.components.transform!.z - nw.spawnZ);
    expect(toSw).toBeLessThan(3);
    expect(toSw).toBeLessThan(toNw);
    expect(homeFortForTeam(world, "team-0", captain.components.formationLoadout?.homeFortId)?.id).toBe("SW");
  });

  it("retreats living bots to an owned fort instead of a lost named home", () => {
    const world = createMatch({ humanPlayers: 1, seed: 6, registerHeight: false });
    beginLiveMatch(world);
    const captain = playerCaptain(world);
    const nw = getFort(world, "NW")!;
    const sw = getFort(world, "SW")!;

    captain.components.formationLoadout!.homeFortId = "NW";
    setFortOwner(nw, "team-0");
    setFortOwner(nw, "team-2");

    const target = resolveRetreatTarget(world, captain);
    expect(target.fortId).toBe("SW");
    const toSw = Math.hypot(target.x - sw.spawnX, target.z - sw.spawnZ);
    const toNw = Math.hypot(target.x - nw.spawnX, target.z - nw.spawnZ);
    expect(toSw).toBeLessThan(1);
    expect(toSw).toBeLessThan(toNw);

    const bot = spawnUnit(world, {
      id: "retreat-ally",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: captain.id,
      slotIndex: 0,
      x: 0,
      z: 0
    });
    bot.components.order = { mode: "follow", slotIndex: 0, formationId: "line" };
    applyHit(captain, 60);
    world.step();
    expect(bot.components.order?.mode).toBe("retreat");
    expect(bot.components.order?.fortId).toBe("SW");
  });
});
