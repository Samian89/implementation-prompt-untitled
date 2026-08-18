import type { AbilityEvent, SimWorld } from "@/lib/game/sim/types";

export type MapPointerResult = {
  issuedOrders: [];
};

/**
 * View-only map pointer. Never enqueues InputCommand move orders or command.* abilities.
 * Accepts either handleMapPointer(nx, nz) or handleMapPointer(world, nx, nz).
 */
export function handleMapPointer(
  nxOrWorld?: number | Pick<SimWorld, "bags">,
  nzOrNx?: number,
  maybeWorldOrNz?: number | Pick<SimWorld, "bags">
): MapPointerResult {
  void nxOrWorld;
  void nzOrNx;
  void maybeWorldOrNz;
  return { issuedOrders: [] };
}

export function mapPointerIssuedCommandEvents(
  world: Pick<SimWorld, "bags">,
  beforeCount: number
): AbilityEvent[] {
  const log = world.bags.abilityEvents;
  if (!Array.isArray(log)) return [];
  return (log as AbilityEvent[])
    .slice(beforeCount)
    .filter((event) => event.abilityId.startsWith("command."));
}
