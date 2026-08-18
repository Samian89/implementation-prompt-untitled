import { NextResponse } from "next/server";
import {
  MATCH_SERVER_UNAVAILABLE,
  SEATS_MAX,
  type CreateRoomResponse,
  type RoomStatusResponse
} from "@/lib/game/net/protocol";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json({ error: MATCH_SERVER_UNAVAILABLE }, { status: 503 });
}

function matchServerUrl(): string | null {
  const raw = process.env.MATCH_SERVER_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function httpToWs(url: string): string {
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  return url;
}

async function proxyJson(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store"
  });
}

export async function POST() {
  const base = matchServerUrl();
  if (!base) return unavailable();
  try {
    const upstream = await proxyJson(`${base}/rooms`, { method: "POST" });
    if (!upstream.ok) return unavailable();
    const body = (await upstream.json()) as Partial<CreateRoomResponse>;
    if (!body.roomCode || !body.wsUrl) return unavailable();
    return NextResponse.json({ roomCode: body.roomCode, wsUrl: body.wsUrl });
  } catch {
    return unavailable();
  }
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  const empty: RoomStatusResponse = { exists: false, seatsTaken: 0, seatsMax: SEATS_MAX };
  if (!code) return NextResponse.json(empty);
  const base = matchServerUrl();
  if (!base) return NextResponse.json(empty);
  try {
    const upstream = await proxyJson(`${base}/rooms/${encodeURIComponent(code)}`);
    if (!upstream.ok) return NextResponse.json(empty);
    const body = (await upstream.json()) as Partial<RoomStatusResponse>;
    return NextResponse.json({
      exists: Boolean(body.exists),
      seatsTaken: Number(body.seatsTaken) || 0,
      seatsMax: Number(body.seatsMax) || SEATS_MAX,
      wsUrl: typeof body.wsUrl === "string" ? body.wsUrl : httpToWs(base)
    } satisfies RoomStatusResponse);
  } catch {
    return NextResponse.json(empty);
  }
}
