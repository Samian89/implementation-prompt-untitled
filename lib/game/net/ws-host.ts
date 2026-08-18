import { emptyInput } from "@/lib/game/sim/input";
import type { InputCommand, Snapshot } from "@/lib/game/sim/types";
import type { NetHost, SnapshotListener } from "./host";
import {
  PROTOCOL_VERSION,
  decodeServerMessage,
  type ServerJoinedMessage
} from "./protocol";

export type WsHostOptions = {
  wsUrl: string;
  roomCode: string;
  playerName?: string;
};

export class WsHost implements NetHost {
  private ws: WebSocket | null = null;
  private readonly listeners = new Set<SnapshotListener>();
  private localIds: string[] = [];
  private lastSnapshot: Snapshot | null = null;
  readonly roomCode: string;
  readonly wsUrl: string;
  readonly playerName: string;
  joined: ServerJoinedMessage | null = null;
  lastError: string | null = null;

  constructor(opts: WsHostOptions) {
    this.wsUrl = opts.wsUrl;
    this.roomCode = opts.roomCode;
    this.playerName = opts.playerName ?? "Captain";
  }

  connect(): Promise<ServerJoinedMessage> {
    if (typeof WebSocket === "undefined") {
      return Promise.reject(new Error("WebSocket is not available"));
    }
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.wsUrl);
      this.ws = socket;
      let settled = false;
      const onFail = (error: Error) => {
        this.lastError = error.message;
        if (settled) return;
        settled = true;
        reject(error);
      };
      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            v: PROTOCOL_VERSION,
            type: "join",
            roomCode: this.roomCode,
            playerName: this.playerName
          })
        );
      });
      socket.addEventListener("message", (event) => {
        const raw = typeof event.data === "string" ? event.data : String(event.data);
        const message = decodeServerMessage(raw);
        if (!message) return;
        if (message.type === "error") {
          this.lastError = String(message.error);
          onFail(new Error(String(message.error)));
          return;
        }
        if (message.type === "joined") {
          this.joined = message;
          this.localIds = [message.playerId];
          if (!settled) {
            settled = true;
            resolve(message);
          }
          return;
        }
        if (message.type === "snapshot") {
          this.lastSnapshot = message.snapshot;
          for (const listener of this.listeners) listener(message.snapshot);
        }
      });
      socket.addEventListener("error", () => {
        onFail(new Error("match_server_unavailable"));
      });
      socket.addEventListener("close", () => {
        if (!this.joined && !this.lastError) {
          onFail(new Error("match_server_unavailable"));
        }
      });
    });
  }

  submitInput(cmd: InputCommand): void {
    const assigned = this.localIds[0];
    if (!assigned || cmd.playerId !== assigned) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        type: "input",
        command: {
          ...emptyInput(assigned, cmd.tick),
          ...cmd,
          playerId: assigned
        }
      })
    );
  }

  onSnapshot(cb: SnapshotListener): () => void {
    this.listeners.add(cb);
    if (this.lastSnapshot) cb(this.lastSnapshot);
    return () => {
      this.listeners.delete(cb);
    };
  }

  getLocalPlayerIds(): string[] {
    return this.localIds.slice();
  }

  dispose(): void {
    this.listeners.clear();
    if (this.ws && this.ws.readyState < WebSocket.CLOSING) this.ws.close();
    this.ws = null;
  }
}

export function createWsHost(opts: WsHostOptions): WsHost {
  return new WsHost(opts);
}
