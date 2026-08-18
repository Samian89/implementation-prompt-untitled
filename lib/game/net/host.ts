import type { InputCommand, Snapshot } from "@/lib/game/sim/types";

export type SnapshotListener = (snapshot: Snapshot) => void;

/**
 * Shared client-facing host. Local in-process play and the WebSocket client
 * both speak this so the play view does not care who is ticking the sim.
 */
export interface NetHost {
  submitInput(cmd: InputCommand): void;
  onSnapshot(cb: SnapshotListener): () => void;
  getLocalPlayerIds(): string[];
}
