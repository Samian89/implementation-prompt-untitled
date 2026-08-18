import type { SimWorld, Vec3 } from "@/lib/game/sim/types";

export type CombatFxKind = "swing" | "stars" | "squash" | "puff";

export type CombatFx = {
  id: string;
  kind: CombatFxKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tick: number;
  entityId: string;
};

export type CombatBag = {
  nextId: number;
  fx: CombatFx[];
};

const FX_LIFE_TICKS = 48;

export function getCombatBag(world: Pick<SimWorld, "bags">): CombatBag {
  const existing = world.bags.combat as CombatBag | undefined;
  if (existing && Array.isArray(existing.fx)) return existing;
  const bag: CombatBag = { nextId: 1, fx: [] };
  world.bags.combat = bag;
  return bag;
}

export function pushCombatFx(
  world: Pick<SimWorld, "bags" | "tick">,
  kind: CombatFxKind,
  pose: Vec3 & { yaw?: number },
  entityId: string
): CombatFx {
  const bag = getCombatBag(world);
  const fx: CombatFx = {
    id: `fx-${bag.nextId++}`,
    kind,
    x: pose.x,
    y: pose.y,
    z: pose.z,
    yaw: pose.yaw ?? 0,
    tick: world.tick,
    entityId
  };
  bag.fx.push(fx);
  if (bag.fx.length > 32) bag.fx.splice(0, bag.fx.length - 32);
  return fx;
}

export function pruneCombatFx(world: Pick<SimWorld, "bags" | "tick">): void {
  const bag = world.bags.combat as CombatBag | undefined;
  if (!bag) return;
  bag.fx = bag.fx.filter((fx) => world.tick - fx.tick < FX_LIFE_TICKS);
}

export function listCombatFx(world: Pick<SimWorld, "bags">): CombatFx[] {
  const bag = world.bags.combat as CombatBag | undefined;
  return bag?.fx ?? [];
}
