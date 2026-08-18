import type { InputCommand, Snapshot } from "@/lib/game/sim/types";

export const PROTOCOL_VERSION = 1;
export const SEATS_MAX = 4;

export type ProtocolError = "room_full" | "bad_room" | "match_server_unavailable" | string;

export type ClientJoinMessage = {
  v: number;
  type: "join";
  roomCode: string;
  playerName: string;
};

export type ClientInputMessage = {
  v: number;
  type: "input";
  command: InputCommand;
};

export type ClientMessage = ClientJoinMessage | ClientInputMessage;

export type ServerJoinedMessage = {
  v: number;
  type: "joined";
  playerId: string;
  roomCode: string;
  seatsTaken: number;
  seatsMax: number;
};

export type ServerSnapshotMessage = {
  v: number;
  type: "snapshot";
  snapshot: Snapshot;
};

export type ServerErrorMessage = {
  v: number;
  type: "error";
  error: ProtocolError;
};

export type ServerMessage = ServerJoinedMessage | ServerSnapshotMessage | ServerErrorMessage;

export type CreateRoomResponse = {
  roomCode: string;
  wsUrl: string;
};

export type RoomStatusResponse = {
  exists: boolean;
  seatsTaken: number;
  seatsMax: number;
  wsUrl?: string;
};

export const MATCH_SERVER_UNAVAILABLE = "match_server_unavailable" as const;

export function encodeSnapshot(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}

export function decodeSnapshot(payload: string): Snapshot {
  return JSON.parse(payload) as Snapshot;
}

export function encodeClientMessage(message: ClientMessage): string {
  return JSON.stringify({ ...message, v: PROTOCOL_VERSION });
}

export function encodeServerMessage(message: ServerMessage): string {
  return JSON.stringify({ ...message, v: PROTOCOL_VERSION });
}

export function decodeClientMessage(payload: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(payload) as ClientMessage;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "join" && typeof parsed.roomCode === "string") return parsed;
    if (parsed.type === "input" && parsed.command && typeof parsed.command.playerId === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function decodeServerMessage(payload: string): ServerMessage | null {
  try {
    const parsed = JSON.parse(payload) as ServerMessage;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "joined" || parsed.type === "snapshot" || parsed.type === "error") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function parseInputCommand(value: unknown): InputCommand | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<InputCommand>;
  if (typeof raw.playerId !== "string") return null;
  return {
    tick: Number(raw.tick) || 0,
    playerId: raw.playerId,
    moveX: clampAxis(raw.moveX),
    moveY: clampAxis(raw.moveY),
    lookYaw: Number(raw.lookYaw) || 0,
    lookPitch: Number(raw.lookPitch) || 0,
    buttons: Number(raw.buttons) || 0
  };
}

function clampAxis(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}
