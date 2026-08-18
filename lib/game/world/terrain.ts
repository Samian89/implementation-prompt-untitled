import { registerGroundHeight } from "@/lib/game/physics/ground";
import { MAP_HALF_EXTENT } from "./map";

export type ForestPatch = {
  id: string;
  x: number;
  z: number;
  radius: number;
};

export const FOREST_PATCHES: ForestPatch[] = [
  { id: "wood-nw", x: -9, z: 11, radius: 4.2 },
  { id: "wood-ne", x: 11, z: 8, radius: 3.6 },
  { id: "wood-sw", x: -12, z: -7, radius: 3.8 }
];

export const FOREST_SPEED_SCALE = 0.45;
export const RIVER_SPEED_SCALE = 0.62;

/** East-west river just south of the hill, with a ford/bridge on the N-S axis. */
export const RIVER = {
  z: -2.2,
  halfWidth: 2.1,
  depth: 0.85,
  fordHalfWidth: 2.4
};

export const HILL = {
  x: 0,
  z: 2.4,
  radius: 9,
  height: 3.1
};

export function sampleHill(x: number, z: number): number {
  const dx = x - HILL.x;
  const dz = z - HILL.z;
  const t = 1 - Math.min(1, (dx * dx + dz * dz) / (HILL.radius * HILL.radius));
  return t * t * HILL.height;
}

export function isOnFord(x: number, _z: number): boolean {
  return Math.abs(x) <= RIVER.fordHalfWidth;
}

export function isInRiver(x: number, z: number): boolean {
  if (isOnFord(x, z)) return false;
  return Math.abs(z - RIVER.z) <= RIVER.halfWidth && Math.abs(x) <= MAP_HALF_EXTENT - 2;
}

export function sampleRiver(x: number, z: number): number {
  if (!isInRiver(x, z)) return 0;
  const t = 1 - Math.abs(z - RIVER.z) / RIVER.halfWidth;
  return -RIVER.depth * t * t;
}

export function isInForest(x: number, z: number): boolean {
  return FOREST_PATCHES.some((patch) => Math.hypot(x - patch.x, z - patch.z) <= patch.radius);
}

export function sampleTerrainHeight(x: number, z: number): number {
  return sampleHill(x, z) + sampleRiver(x, z);
}

export function terrainSpeedScale(x: number, z: number): number {
  if (isInForest(x, z)) return FOREST_SPEED_SCALE;
  if (isInRiver(x, z)) return RIVER_SPEED_SCALE;
  return 1;
}

export function registerWorldGround(): void {
  registerGroundHeight(sampleTerrainHeight);
}
