import { getFort, listForts, setFortOwner } from "@/lib/game/world/fort";
import { FORT_IDS, type FortId } from "@/lib/game/world/map";
import { getMatch, setMatchPhase, type MatchBag, type MatchPhase } from "@/lib/game/world/install";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, SimWorld } from "@/lib/game/sim/types";

export const MATCH_RULES_SYSTEM_NAME = "matchRules";
export const RECRUIT_TICKS = 2700;

export function teamIndex(teamId: string | number | null | undefined): number | null {
  if (teamId === null || teamId === undefined) return null;
  if (typeof teamId === "number") return Number.isFinite(teamId) ? teamId : null;
  if (typeof teamId !== "string") return null;
  if (teamId.startsWith("team-")) {
    const parsed = Number(teamId.slice(5));
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(teamId);
  return Number.isFinite(parsed) ? parsed : null;
}

export function teamIdFromIndex(index: number): string {
  return `team-${index}`;
}

export function normalizeTeamId(team: string | number): string {
  const index = teamIndex(team);
  if (index !== null) return teamIdFromIndex(index);
  return String(team);
}

export function writeMatch(world: Pick<SimWorld, "bags">, patch: Partial<MatchBag>): MatchBag {
  const match = getMatch(world);
  Object.assign(match, patch);
  world.bags.match = match;
  return match;
}

export function syncFortOwners(world: Pick<SimWorld, "bags">): MatchBag {
  const match = getMatch(world);
  const fortOwners: Record<string, string | number | null> = {};
  for (const fort of listForts(world)) {
    fortOwners[fort.id] = fort.ownerTeamId;
  }
  match.fortOwners = fortOwners;
  world.bags.match = match;
  return match;
}

export function listCaptains(world: SimWorld): Entity[] {
  const captains: Entity[] = [];
  for (const entity of world.entities.values()) {
    if (entity.kind === "captain") captains.push(entity);
  }
  return captains;
}

export function markCaptainReady(world: SimWorld, captainId: string): void {
  const match = getMatch(world);
  match.ready = { ...(match.ready ?? {}), [captainId]: true };
  world.bags.match = match;
  const captain = world.getEntity(captainId);
  if (captain?.components.king) captain.components.king.ready = true;
}

export function isCaptainReady(world: SimWorld, captain: Entity): boolean {
  if (captain.components.king?.ready) return true;
  return Boolean(getMatch(world).ready?.[captain.id]);
}

export function allCaptainsReady(world: SimWorld): boolean {
  const captains = listCaptains(world);
  if (captains.length === 0) return false;
  return captains.every((captain) => isCaptainReady(world, captain));
}

export function ownedFortCount(world: Pick<SimWorld, "bags">, teamId: string | number): number {
  const normalized = normalizeTeamId(teamId);
  const index = teamIndex(teamId);
  return listForts(world).filter((fort) => {
    if (fort.ownerTeamId === normalized) return true;
    return index !== null && teamIndex(fort.ownerTeamId) === index;
  }).length;
}

export function fortsLabel(owned: number): string {
  return `Forts ${owned}/4`;
}

export function phaseLabel(phase: MatchPhase): string {
  if (phase === "recruit") return "Recruit";
  if (phase === "live") return "Live";
  return "Ended";
}

export function dominatingTeam(world: Pick<SimWorld, "bags">): number | null {
  const forts = listForts(world);
  if (forts.length !== FORT_IDS.length) return null;
  const first = teamIndex(forts[0]?.ownerTeamId);
  if (first === null) return null;
  for (const fort of forts) {
    if (teamIndex(fort.ownerTeamId) !== first) return null;
  }
  return first;
}

export function applyVictoryIfDominated(world: Pick<SimWorld, "bags">): MatchBag {
  const match = syncFortOwners(world);
  if (match.phase === "ended") return match;
  const winner = dominatingTeam(world);
  if (winner === null) return match;
  match.phase = "ended";
  match.winnerTeamId = winner;
  world.bags.match = match;
  return match;
}

/**
 * Test-only ownership write. Not wired to the player HUD.
 * Accepts team `0` / `"0"` / `"team-0"` and a fort id, or a single team
 * argument to assign every fort.
 */
export function debugSetFortOwner(
  world: Pick<SimWorld, "bags">,
  fortIdOrTeam: FortId | string | number,
  team?: string | number
): void {
  if (team === undefined) {
    const asFort = String(fortIdOrTeam);
    if (asFort === "NW" || asFort === "NE" || asFort === "SW" || asFort === "SE") {
      return;
    }
    for (const id of FORT_IDS) {
      assignFortOwner(world, id, fortIdOrTeam);
    }
    syncFortOwners(world);
    return;
  }
  assignFortOwner(world, String(fortIdOrTeam), team);
  syncFortOwners(world);
}

function assignFortOwner(world: Pick<SimWorld, "bags">, fortId: string, team: string | number): void {
  const fort = getFort(world, fortId);
  if (!fort) return;
  setFortOwner(fort, normalizeTeamId(team));
}

/** Namespaced test hook: `sim.debug.setFortOwner`. */
export const sim = {
  debug: {
    setFortOwner: debugSetFortOwner
  }
};

export function beginLiveMatch(world: Pick<SimWorld, "bags">): void {
  const match = getMatch(world);
  if (match.phase === "ended") return;
  setMatchPhase(world, "live");
  syncFortOwners(world);
}

export function readyAndMaybeBegin(world: SimWorld, captainId: string): void {
  markCaptainReady(world, captainId);
  if (allCaptainsReady(world)) beginLiveMatch(world);
}

export function matchRulesSystem(world: SimWorld): void {
  if (!world.bags.match && !world.bags.forts) return;
  const match = getMatch(world);
  if (match.phase === "recruit") {
    const timedOut = match.recruitEndsAt != null && world.tick >= match.recruitEndsAt;
    if (timedOut || allCaptainsReady(world)) {
      beginLiveMatch(world);
    }
  }
  applyVictoryIfDominated(world);
}

export function ensureMatchRules(): void {
  registerSystem(MATCH_RULES_SYSTEM_NAME, matchRulesSystem);
}
