import { STARTING_TREASURY } from "@/lib/game/data/economy";
import { emptyEconomy } from "@/lib/game/economy/treasury";
import type { SimWorld } from "@/lib/game/sim/types";
import { createFortBag, writeForts, type FortBag } from "./fort";
import { PLAYER_HOME_FORT, type FortId } from "./map";
import { registerWorldGround } from "./terrain";
import { ensureCaptureSystem } from "./capture";
import { ensureWorldMovement } from "./movement";

export type MatchPhase = "recruit" | "live" | "ended";

export type MatchBag = {
  phase: MatchPhase;
  winnerTeamId?: string | number | null;
  fortOwners?: Record<string, string | number | null>;
  recruitEndsAt?: number;
  ready?: Record<string, boolean>;
};

export type InstallWorldOptions = {
  playerTeamId?: string;
  homeFortId?: FortId;
  registerHeight?: boolean;
  startingTreasury?: number;
  owners?: Partial<Record<FortId, string | null>>;
};

export function getMatch(world: Pick<SimWorld, "bags">): MatchBag {
  const existing = world.bags.match;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const bag = existing as MatchBag;
    if (bag.phase) return bag;
  }
  const created: MatchBag = { phase: "recruit" };
  world.bags.match = created;
  return created;
}

export function setMatchPhase(world: Pick<SimWorld, "bags">, phase: MatchPhase): void {
  const match = getMatch(world);
  match.phase = phase;
  world.bags.match = match;
}

export function installWorld(world: SimWorld, opts: InstallWorldOptions = {}): FortBag {
  ensureCaptureSystem();
  ensureWorldMovement();
  if (opts.registerHeight !== false) {
    registerWorldGround();
  }
  const forts = createFortBag(opts.owners);
  writeForts(world, forts);
  world.bags.economy = emptyEconomy(opts.startingTreasury ?? STARTING_TREASURY);
  world.bags.match = { phase: "recruit" } satisfies MatchBag;
  world.bags.world = {
    homeFortId: opts.homeFortId ?? PLAYER_HOME_FORT,
    playerTeamId: opts.playerTeamId ?? "team-0"
  };
  return forts;
}

export function playerTeamIdOf(world: Pick<SimWorld, "bags">): string {
  const extra = world.bags.world;
  if (extra && typeof extra === "object" && extra !== null && "playerTeamId" in extra) {
    const id = (extra as { playerTeamId?: unknown }).playerTeamId;
    if (typeof id === "string") return id;
  }
  return "team-0";
}
