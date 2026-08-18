import type { InputCommand } from "./types";
import { DEBUG_IMPULSE_FORCE } from "@/lib/game/data/hit-reactions";

export const INPUT_BUTTON = {
  debugImpulse10: 1 << 0,
  debugImpulse35: 1 << 1,
  debugImpulse60: 1 << 2
} as const;

export function emptyInput(playerId: string, tick = 0): InputCommand {
  return {
    tick,
    playerId,
    moveX: 0,
    moveY: 0,
    lookYaw: 0,
    lookPitch: 0,
    buttons: 0
  };
}

export function debugImpulseFromButtons(buttons: number): number | null {
  if (buttons & INPUT_BUTTON.debugImpulse10) return DEBUG_IMPULSE_FORCE.stumble;
  if (buttons & INPUT_BUTTON.debugImpulse35) return DEBUG_IMPULSE_FORCE.knockdown;
  if (buttons & INPUT_BUTTON.debugImpulse60) return DEBUG_IMPULSE_FORCE.death;
  return null;
}

export function latestInputByPlayer(commands: InputCommand[]): Map<string, InputCommand> {
  const latest = new Map<string, InputCommand>();
  for (const command of commands) {
    const prev = latest.get(command.playerId);
    if (!prev || command.tick >= prev.tick) latest.set(command.playerId, command);
  }
  return latest;
}
