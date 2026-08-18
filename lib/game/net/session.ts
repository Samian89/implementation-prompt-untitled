import { attachKing } from "@/lib/game/ai/king";
import {
  createMatch,
  MATCH_CORNERS,
  playerIdForSeat,
  type CreateMatchOptions
} from "@/lib/game/match/create-match";
import type { SimEngine } from "@/lib/game/sim/engine";
import type { Entity, InputCommand } from "@/lib/game/sim/types";

export { playerIdForSeat };

export const SEAT_PLAYER_IDS = ["p1", "p2", "p3", "p4"] as const;
export type SeatPlayerId = (typeof SEAT_PLAYER_IDS)[number];

export type CreateSessionOptions = {
  humans?: number;
  playerIds?: string[];
  seed?: number;
  registerHeight?: boolean;
  world?: SimEngine;
};

export type GameSession = {
  humans: number;
  playerIds: string[];
  aiKingCount: number;
  world: SimEngine;
};

export function defaultPlayerIds(humans: number): string[] {
  const count = Math.max(0, Math.min(4, humans));
  return Array.from({ length: count }, (_, index) => playerIdForSeat(index));
}

export function countAiKings(world: Pick<SimEngine, "entities">): number {
  let count = 0;
  for (const entity of world.entities.values()) {
    if (entity.kind === "captain" && entity.components.king) count += 1;
  }
  return count;
}

export function createSession(opts: CreateSessionOptions = {}): GameSession {
  const requested = opts.playerIds?.length ?? opts.humans ?? 1;
  const humans = Math.max(0, Math.min(4, requested));
  const playerIds = (opts.playerIds ?? defaultPlayerIds(humans)).slice(0, humans);
  const world = createMatch({
    humanPlayers: humans,
    humanPlayerIds: playerIds,
    seed: opts.seed ?? 1,
    registerHeight: opts.registerHeight,
    world: opts.world
  } satisfies CreateMatchOptions);
  return {
    humans,
    playerIds,
    aiKingCount: countAiKings(world),
    world
  };
}

export function findCaptainByPlayerId(
  entities: Iterable<Entity>,
  playerId: string | null | undefined
): Entity | undefined {
  if (!playerId) return undefined;
  for (const entity of entities) {
    if (entity.kind === "captain" && entity.components.control?.playerId === playerId) {
      return entity;
    }
  }
  return undefined;
}

export function findHumanCaptain(
  entities: Iterable<Entity>,
  playerId?: string | null
): Entity | undefined {
  const list = Array.from(entities);
  const exact = findCaptainByPlayerId(list, playerId);
  if (exact) return exact;
  const aliases = playerId ? [playerId] : ["p1", "local"];
  for (const alias of aliases) {
    const found = findCaptainByPlayerId(list, alias);
    if (found) return found;
  }
  return (
    list.find((entity) => entity.kind === "captain" && entity.components.control?.drivenBy === "player") ??
    list.find((entity) => entity.kind === "captain")
  );
}

export function captainForSeat(world: Pick<SimEngine, "getEntity">, seatIndex: number): Entity | undefined {
  const corner = MATCH_CORNERS[seatIndex];
  if (!corner) return undefined;
  return world.getEntity(`captain-${corner.fortId}`);
}

export function claimHumanSeat(
  world: SimEngine,
  seatIndex: number,
  playerId = playerIdForSeat(seatIndex)
): Entity | undefined {
  const captain = captainForSeat(world, seatIndex);
  if (!captain) return undefined;
  const control = captain.components.control;
  if (control) {
    control.playerId = playerId;
    control.drivenBy = "player";
    control.moveX = 0;
    control.moveY = 0;
  }
  delete captain.components.king;
  return captain;
}

export function releaseHumanSeat(world: SimEngine, seatIndex: number): Entity | undefined {
  const corner = MATCH_CORNERS[seatIndex];
  const captain = captainForSeat(world, seatIndex);
  if (!corner || !captain) return undefined;
  const control = captain.components.control;
  if (control) {
    control.playerId = null;
    control.drivenBy = "ai";
    control.moveX = 0;
    control.moveY = 0;
  }
  if (!captain.components.king) {
    const king = attachKing(captain, corner.personality);
    king.ready = true;
    king.state = "garrison";
  }
  return captain;
}

export function firstFreeSeatIndex(world: SimEngine): number | null {
  for (let i = 0; i < MATCH_CORNERS.length; i++) {
    const captain = captainForSeat(world, i);
    if (!captain) continue;
    const control = captain.components.control;
    if (!control?.playerId || control.drivenBy !== "player") return i;
  }
  return null;
}

export function countHumanSeats(world: SimEngine): number {
  let taken = 0;
  for (const entity of world.entities.values()) {
    if (entity.kind === "captain" && entity.components.control?.drivenBy === "player") taken += 1;
  }
  return taken;
}

/** Server-side gate: drop spoofed player ids and inputs for dead / knocked-down control. */
export function shouldAcceptInput(world: SimEngine, cmd: InputCommand, assignedPlayerId: string): boolean {
  if (cmd.playerId !== assignedPlayerId) return false;
  const captain = findCaptainByPlayerId(world.entities.values(), assignedPlayerId);
  const control = captain?.components.control;
  if (!control) return false;
  const hit = captain?.components.hitReaction?.state;
  if (hit === "death" || hit === "knockdown") return false;
  return true;
}
