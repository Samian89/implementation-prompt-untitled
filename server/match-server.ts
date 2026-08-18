import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { createMatch } from "@/lib/game/match/create-match";
import type { SimEngine } from "@/lib/game/sim/engine";
import { FIXED_DT, type InputCommand } from "@/lib/game/sim/types";
import {
  PROTOCOL_VERSION,
  SEATS_MAX,
  decodeClientMessage,
  encodeServerMessage,
  parseInputCommand,
  type RoomStatusResponse
} from "@/lib/game/net/protocol";
import { claimHumanSeat, firstFreeSeatIndex, releaseHumanSeat, shouldAcceptInput } from "@/lib/game/net/session";
import { playerIdForSeat } from "@/lib/game/match/create-match";

const PORT = Number(process.env.MATCH_SERVER_PORT || 8787);
const PUBLIC_WS = process.env.MATCH_PUBLIC_WS_URL || `ws://127.0.0.1:${PORT}`;

type SeatClient = {
  ws: WebSocket;
  playerId: string;
  seatIndex: number;
  playerName: string;
};

type Room = {
  code: string;
  world: SimEngine;
  clients: SeatClient[];
};

const rooms = new Map<string, Room>();

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function createRoom(): Room {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();
  const world = createMatch({ humanPlayers: 0, seed: code.split("").reduce((n, ch) => n + ch.charCodeAt(0), 1) });
  const room: Room = { code, world, clients: [] };
  rooms.set(code, room);
  return room;
}

function roomStatus(room: Room | undefined): RoomStatusResponse {
  if (!room) return { exists: false, seatsTaken: 0, seatsMax: SEATS_MAX, wsUrl: PUBLIC_WS };
  return { exists: true, seatsTaken: room.clients.length, seatsMax: SEATS_MAX, wsUrl: PUBLIC_WS };
}

function send(ws: WebSocket, message: Parameters<typeof encodeServerMessage>[0]): void {
  if (ws.readyState === ws.OPEN) ws.send(encodeServerMessage(message));
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(payload);
}

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }
  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true, rooms: rooms.size });
    return;
  }
  if (req.method === "POST" && (url.pathname === "/rooms" || url.pathname === "/")) {
    await readJsonBody(req);
    const room = createRoom();
    json(res, 200, { roomCode: room.code, wsUrl: PUBLIC_WS });
    return;
  }
  const roomMatch = url.pathname.match(/^\/rooms\/([A-Za-z0-9]+)$/);
  if (req.method === "GET" && roomMatch) {
    const room = rooms.get(roomMatch[1]!.toUpperCase());
    json(res, 200, roomStatus(room));
    return;
  }
  json(res, 404, { error: "not_found" });
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  let joined: SeatClient | null = null;
  let room: Room | null = null;

  ws.on("message", (data) => {
    const message = decodeClientMessage(typeof data === "string" ? data : data.toString("utf8"));
    if (!message) return;

    if (message.type === "join") {
      if (joined) return;
      const code = String(message.roomCode ?? "").trim().toUpperCase();
      const found = rooms.get(code);
      if (!found) {
        send(ws, { v: PROTOCOL_VERSION, type: "error", error: "bad_room" });
        return;
      }
      const seatIndex = firstFreeSeatIndex(found.world);
      if (seatIndex === null || found.clients.length >= SEATS_MAX) {
        send(ws, { v: PROTOCOL_VERSION, type: "error", error: "room_full" });
        return;
      }
      const playerId = playerIdForSeat(seatIndex);
      claimHumanSeat(found.world, seatIndex, playerId);
      joined = {
        ws,
        playerId,
        seatIndex,
        playerName: String(message.playerName ?? "Captain").slice(0, 24)
      };
      room = found;
      found.clients.push(joined);
      send(ws, {
        v: PROTOCOL_VERSION,
        type: "joined",
        playerId,
        roomCode: found.code,
        seatsTaken: found.clients.length,
        seatsMax: SEATS_MAX
      });
      return;
    }

    if (message.type === "input") {
      if (!joined || !room) return;
      const command = parseInputCommand(message.command) as InputCommand | null;
      if (!command) return;
      if (!shouldAcceptInput(room.world, command, joined.playerId)) return;
      room.world.submitInput({ ...command, playerId: joined.playerId });
    }
  });

  ws.on("close", () => {
    if (!joined || !room) return;
    room.clients = room.clients.filter((client) => client !== joined);
    releaseHumanSeat(room.world, joined.seatIndex);
    if (room.clients.length === 0) {
      rooms.delete(room.code);
    }
  });
});

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.clients.length === 0) continue;
    const snapshot = room.world.step();
    const payload = encodeServerMessage({
      v: PROTOCOL_VERSION,
      type: "snapshot",
      snapshot
    });
    for (const client of room.clients) {
      if (client.ws.readyState === client.ws.OPEN) client.ws.send(payload);
    }
  }
}, Math.max(1, Math.round(FIXED_DT * 1000)));

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Shield Wall match server on :${PORT} (${PUBLIC_WS})`);
});
