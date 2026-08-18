import type { Entity } from "@/lib/game/sim/types";

/** Captains outrank bots so 004 can sort cone hits. No cone lives here. */
export function targetPriority(entity: Entity): number {
  if (entity.kind === "captain") return 2;
  if (entity.kind === "bot") return 1;
  return 0;
}
