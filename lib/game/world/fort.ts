import type { GateTier, WallTier } from "@/lib/game/data/defenses";
import { DEFENSES } from "@/lib/game/data/defenses";
import type { SimWorld, Vec3 } from "@/lib/game/sim/types";
import {
  COURTYARD_HALF,
  FORT_GATE_DIR,
  FORT_IDS,
  FORT_ORIGINS,
  GATE_DEPTH,
  GATE_WIDTH,
  WALL_THICKNESS,
  bannerColorFor,
  defaultOwnerForFort,
  type FortId
} from "./map";

export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type FortDefense = {
  wall: WallTier;
  gate: GateTier;
  gateHp: number;
  gateMaxHp: number;
};

export type FortState = {
  id: FortId;
  x: number;
  z: number;
  ownerTeamId: string | null;
  spawnX: number;
  spawnZ: number;
  courtyard: Aabb;
  defense: FortDefense;
  bannerColor: string;
  originalOwnerTeamId: string;
};

export type FortBag = Record<FortId, FortState>;

export function courtyardOf(origin: { x: number; z: number }): Aabb {
  return {
    minX: origin.x - COURTYARD_HALF,
    maxX: origin.x + COURTYARD_HALF,
    minZ: origin.z - COURTYARD_HALF,
    maxZ: origin.z + COURTYARD_HALF
  };
}

export function gateAabb(fort: Pick<FortState, "id" | "x" | "z" | "courtyard">): Aabb {
  const dir = FORT_GATE_DIR[fort.id];
  const cx = dir.x === 0 ? fort.x : dir.x > 0 ? fort.courtyard.maxX : fort.courtyard.minX;
  const cz = dir.z === 0 ? fort.z : dir.z > 0 ? fort.courtyard.maxZ : fort.courtyard.minZ;
  if (dir.z !== 0) {
    return {
      minX: cx - GATE_WIDTH / 2,
      maxX: cx + GATE_WIDTH / 2,
      minZ: cz - GATE_DEPTH / 2,
      maxZ: cz + GATE_DEPTH / 2
    };
  }
  return {
    minX: cx - GATE_DEPTH / 2,
    maxX: cx + GATE_DEPTH / 2,
    minZ: cz - GATE_WIDTH / 2,
    maxZ: cz + GATE_WIDTH / 2
  };
}

export function spawnPointOf(id: FortId, origin: { x: number; z: number }): { x: number; z: number } {
  const dir = FORT_GATE_DIR[id];
  return {
    x: origin.x + dir.x * (COURTYARD_HALF - 1.4),
    z: origin.z + dir.z * (COURTYARD_HALF - 1.4)
  };
}

export function createFort(id: FortId, ownerTeamId?: string | null): FortState {
  const origin = FORT_ORIGINS[id];
  const owner = ownerTeamId === undefined ? defaultOwnerForFort(id) : ownerTeamId;
  const spawn = spawnPointOf(id, origin);
  return {
    id,
    x: origin.x,
    z: origin.z,
    ownerTeamId: owner,
    spawnX: spawn.x,
    spawnZ: spawn.z,
    courtyard: courtyardOf(origin),
    defense: { wall: "none", gate: "none", gateHp: 0, gateMaxHp: 0 },
    bannerColor: bannerColorFor(owner),
    originalOwnerTeamId: owner ?? defaultOwnerForFort(id)
  };
}

export function createFortBag(owners?: Partial<Record<FortId, string | null>>): FortBag {
  const bag = {} as FortBag;
  for (const id of FORT_IDS) {
    bag[id] = createFort(id, owners && id in owners ? owners[id] : undefined);
  }
  return bag;
}

export function asFortBag(value: unknown): FortBag | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!("NW" in record) || !("NE" in record) || !("SW" in record) || !("SE" in record)) return null;
  return record as FortBag;
}

export function listForts(world: Pick<SimWorld, "bags">): FortState[] {
  const bag = asFortBag(world.bags.forts);
  if (!bag) return [];
  return FORT_IDS.map((id) => bag[id]);
}

export function getFort(world: Pick<SimWorld, "bags">, id: string): FortState | undefined {
  const bag = asFortBag(world.bags.forts);
  if (!bag) return undefined;
  if (id === "NW" || id === "NE" || id === "SW" || id === "SE") return bag[id];
  return undefined;
}

export function writeForts(world: Pick<SimWorld, "bags">, bag: FortBag): void {
  world.bags.forts = bag;
}

export function pointInAabb(aabb: Aabb, x: number, z: number): boolean {
  return x >= aabb.minX && x <= aabb.maxX && z >= aabb.minZ && z <= aabb.maxZ;
}

export function pointInCourtyard(fort: FortState, x: number, z: number): boolean {
  return pointInAabb(fort.courtyard, x, z);
}

export function isCourtyardSealed(fort: FortState): boolean {
  return fort.defense.gate !== "none" && fort.defense.gateHp > 0;
}

export function isGateColliderActive(fort: FortState): boolean {
  return isCourtyardSealed(fort);
}

export function setFortOwner(fort: FortState, teamId: string | null): void {
  fort.ownerTeamId = teamId;
  fort.bannerColor = bannerColorFor(teamId);
}

export function applyDefenseToFort(fort: FortState, defenseId: keyof typeof DEFENSES): void {
  const def = DEFENSES[defenseId];
  if (def.kind === "wall") {
    fort.defense.wall = def.tier as WallTier;
  } else {
    fort.defense.gate = def.tier as GateTier;
    fort.defense.gateMaxHp = def.hp;
    fort.defense.gateHp = def.hp;
  }
}

export function damageFortGate(fort: FortState, amount: number): number {
  if (!isGateColliderActive(fort)) return fort.defense.gateHp;
  fort.defense.gateHp = Math.max(0, fort.defense.gateHp - amount);
  return fort.defense.gateHp;
}

export type WallSegment = Aabb & { climbable: boolean };

export function wallSegments(fort: FortState): WallSegment[] {
  if (fort.defense.wall === "none") return [];
  const c = fort.courtyard;
  const t = WALL_THICKNESS;
  const gate = gateAabb(fort);
  const raw: Aabb[] = [
    { minX: c.minX - t, maxX: c.maxX + t, minZ: c.maxZ, maxZ: c.maxZ + t },
    { minX: c.minX - t, maxX: c.maxX + t, minZ: c.minZ - t, maxZ: c.minZ },
    { minX: c.minX - t, maxX: c.minX, minZ: c.minZ, maxZ: c.maxZ },
    { minX: c.maxX, maxX: c.maxX + t, minZ: c.minZ, maxZ: c.maxZ }
  ];
  const segments: WallSegment[] = [];
  for (const box of raw) {
    const clipped = subtractAabb(box, inflateAabb(gate, 0.15));
    for (const part of clipped) {
      segments.push({ ...part, climbable: true });
    }
  }
  return segments;
}

function inflateAabb(box: Aabb, pad: number): Aabb {
  return {
    minX: box.minX - pad,
    maxX: box.maxX + pad,
    minZ: box.minZ - pad,
    maxZ: box.maxZ + pad
  };
}

function subtractAabb(box: Aabb, cut: Aabb): Aabb[] {
  if (!aabbOverlap(box, cut)) return [box];
  const parts: Aabb[] = [];
  if (box.minX < cut.minX) {
    parts.push({ minX: box.minX, maxX: Math.min(box.maxX, cut.minX), minZ: box.minZ, maxZ: box.maxZ });
  }
  if (box.maxX > cut.maxX) {
    parts.push({ minX: Math.max(box.minX, cut.maxX), maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ });
  }
  const midMinX = Math.max(box.minX, cut.minX);
  const midMaxX = Math.min(box.maxX, cut.maxX);
  if (midMinX < midMaxX) {
    if (box.minZ < cut.minZ) {
      parts.push({ minX: midMinX, maxX: midMaxX, minZ: box.minZ, maxZ: Math.min(box.maxZ, cut.minZ) });
    }
    if (box.maxZ > cut.maxZ) {
      parts.push({ minX: midMinX, maxX: midMaxX, minZ: Math.max(box.minZ, cut.maxZ), maxZ: box.maxZ });
    }
  }
  return parts.filter((part) => part.maxX - part.minX > 0.05 && part.maxZ - part.minZ > 0.05);
}

function aabbOverlap(a: Aabb, b: Aabb): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function pointInWall(fort: FortState, x: number, z: number): boolean {
  return wallSegments(fort).some((seg) => pointInAabb(seg, x, z));
}

export function pointInGate(fort: FortState, x: number, z: number): boolean {
  return pointInAabb(gateAabb(fort), x, z);
}

export function segmentHitsAabb(start: Vec3, end: Vec3, box: Aabb): boolean {
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start.x + (end.x - start.x) * t;
    const z = start.z + (end.z - start.z) * t;
    if (pointInAabb(box, x, z)) return true;
  }
  return false;
}

export function hitGateAlongSegment(world: Pick<SimWorld, "bags">, start: Vec3, end: Vec3, damage: number): FortState | null {
  for (const fort of listForts(world)) {
    if (!isGateColliderActive(fort)) continue;
    if (!segmentHitsAabb(start, end, gateAabb(fort))) continue;
    damageFortGate(fort, damage);
    return fort;
  }
  return null;
}

export function ownedFortsFor(world: Pick<SimWorld, "bags">, teamId: string): FortState[] {
  return listForts(world).filter((fort) => fort.ownerTeamId === teamId);
}

export function homeFortForTeam(
  world: Pick<SimWorld, "bags">,
  teamId: string,
  preferredId?: string
): FortState | undefined {
  const forts = listForts(world);
  if (forts.length === 0) return undefined;
  if (preferredId) {
    const named = forts.find((fort) => fort.id === preferredId);
    if (named) return named;
  }
  const owned = forts.find((fort) => fort.ownerTeamId === teamId);
  if (owned) return owned;
  const original = forts.find((fort) => fort.originalOwnerTeamId === teamId);
  return original ?? forts[0];
}
