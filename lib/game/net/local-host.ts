import { FIXED_DT, type InputCommand, type Snapshot } from "@/lib/game/sim/types";
import type { SimEngine } from "@/lib/game/sim/engine";
import type { NetHost, SnapshotListener } from "./host";
import { createSession, type CreateSessionOptions } from "./session";

export type LocalHostOptions = CreateSessionOptions & {
  autoStart?: boolean;
};

export class LocalHost implements NetHost {
  readonly world: SimEngine;
  readonly playerIds: string[];
  readonly aiKingCount: number;
  private readonly listeners = new Set<SnapshotListener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: LocalHostOptions = {}) {
    const session = createSession(opts);
    this.world = session.world;
    this.playerIds = session.playerIds.slice();
    this.aiKingCount = session.aiKingCount;
    if (opts.autoStart) this.start();
  }

  submitInput(cmd: InputCommand): void {
    this.world.submitInput(cmd);
  }

  onSnapshot(cb: SnapshotListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  getLocalPlayerIds(): string[] {
    return this.playerIds.slice();
  }

  getSnapshot(): Snapshot {
    return this.world.getSnapshot();
  }

  step(): Snapshot {
    const snapshot = this.world.step();
    for (const listener of this.listeners) listener(snapshot);
    return snapshot;
  }

  start(): void {
    if (this.timer !== null) return;
    const ms = Math.max(1, Math.round(FIXED_DT * 1000));
    this.timer = setInterval(() => {
      this.step();
    }, ms);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}

export function createLocalHost(opts: LocalHostOptions = {}): LocalHost {
  return new LocalHost(opts);
}
