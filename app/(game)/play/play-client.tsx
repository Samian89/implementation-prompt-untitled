"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "@/components/game/squad-count-hud";
import "@/components/game/health-hud";
import "@/components/game/command-hud";
import "@/components/game/recruit-setup";
import "@/components/game/match-hud";
import { GameLobby, hostMatchRequest, joinMatchStatus, type LobbyMode } from "@/components/game/lobby";
import { LocalSplitPlay } from "@/components/game/split-view";
import { NetworkPlay } from "@/components/game/network-play";

const PlayCanvas = dynamic(
  () => import("@/components/game/play-canvas").then((mod) => mod.PlayCanvas),
  { ssr: false }
);

export default function PlayClient({
  initialLocal = 0,
  initialSandbox = false
}: {
  initialLocal?: number;
  initialSandbox?: boolean;
}) {
  const first = useMemo<LobbyMode>(() => {
    if (initialLocal === 2 || initialLocal === 3 || initialLocal === 4) {
      return { kind: "local", humans: initialLocal };
    }
    if (initialSandbox) return { kind: "sandbox" };
    return { kind: "solo" };
  }, [initialLocal, initialSandbox]);
  const [mode, setMode] = useState<LobbyMode>(first);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hosting, setHosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [network, setNetwork] = useState<{ roomCode: string; wsUrl: string; playerName: string } | null>(null);

  const setLocal = (humans: 2 | 3 | 4) => {
    setNetwork(null);
    setError(null);
    setMode({ kind: "local", humans });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("mode");
      params.set("local", String(humans));
      window.history.replaceState(null, "", `/play?${params.toString()}`);
    }
  };

  const setSolo = () => {
    setNetwork(null);
    setError(null);
    setMode({ kind: "solo" });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("local");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `/play?${qs}` : "/play");
    }
  };

  const onHost = async () => {
    setHosting(true);
    setError(null);
    try {
      const created = await hostMatchRequest();
      setNetwork({ roomCode: created.roomCode, wsUrl: created.wsUrl, playerName: "Host" });
      setJoinCode(created.roomCode);
    } catch (err) {
      setNetwork(null);
      setError(err instanceof Error ? err.message : "match_server_unavailable");
    } finally {
      setHosting(false);
    }
  };

  const onJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Room code required");
      const status = await joinMatchStatus(code);
      if (!status.exists) throw new Error("bad_room");
      if (status.seatsTaken >= status.seatsMax) throw new Error("room_full");
      const wsUrl =
        status.wsUrl ||
        (typeof window !== "undefined" ? `ws://${window.location.hostname}:8787` : "ws://127.0.0.1:8787");
      setNetwork({ roomCode: code, wsUrl, playerName: "Guest" });
    } catch (err) {
      setNetwork(null);
      setError(err instanceof Error ? err.message : "match_server_unavailable");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <GameLobby
        mode={network ? { kind: "solo" } : mode}
        roomCode={network?.roomCode}
        error={error}
        onLocal={setLocal}
        onSolo={setSolo}
        onHost={onHost}
        onJoin={onJoin}
        joinCode={joinCode}
        onJoinCodeChange={setJoinCode}
        hosting={hosting}
        joining={joining}
      />
      <div className="min-h-0 flex-1">
        {network ? (
          <NetworkPlay
            roomCode={network.roomCode}
            wsUrl={network.wsUrl}
            playerName={network.playerName}
            onError={setError}
          />
        ) : mode.kind === "local" ? (
          <LocalSplitPlay humans={mode.humans} onLeave={setSolo} />
        ) : (
          <PlayCanvas />
        )}
      </div>
    </div>
  );
}
