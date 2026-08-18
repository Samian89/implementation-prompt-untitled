"use client";

import * as THREE from "three";
import type { Snapshot } from "@/lib/game/sim/types";
import { FORT_IDS, type FortId } from "@/lib/game/world/map";
import { COURTYARD_HALF, GATE_DEPTH, GATE_WIDTH, WALL_THICKNESS } from "@/lib/game/world/map";
import { FORT_GATE_DIR } from "@/lib/game/world/map";

type FortMeshes = {
  id: FortId;
  group: THREE.Group;
  walls: THREE.Mesh;
  gate: THREE.Mesh;
  banner: THREE.Mesh;
};

export type FortView = {
  forts: Map<FortId, FortMeshes>;
  group: THREE.Group;
};

function hexColor(value: string | undefined): number {
  if (!value) return 0x78716c;
  return parseInt(value.replace("#", ""), 16);
}

export function createFortView(): FortView {
  const group = new THREE.Group();
  const forts = new Map<FortId, FortMeshes>();
  for (const id of FORT_IDS) {
    const node = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(COURTYARD_HALF * 2, 0.08, COURTYARD_HALF * 2),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.92 })
    );
    floor.position.y = 0.04;
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(COURTYARD_HALF * 2 + WALL_THICKNESS, 1.6, COURTYARD_HALF * 2 + WALL_THICKNESS),
      new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 0.88, transparent: true, opacity: 0.22 })
    );
    walls.position.y = 0.8;
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(GATE_WIDTH, 2.1, GATE_DEPTH),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.75 })
    );
    gate.position.y = 1.05;
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.4, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 })
    );
    banner.position.set(COURTYARD_HALF - 0.4, 1.4, COURTYARD_HALF - 0.4);
    node.add(floor, walls, gate, banner);
    group.add(node);
    forts.set(id, { id, group: node, walls, gate, banner });
  }
  return { forts, group };
}

export function syncFortView(view: FortView, snapshot: Snapshot): void {
  const raw = snapshot.bags.forts;
  if (!raw || typeof raw !== "object") return;
  for (const id of FORT_IDS) {
    const fort = (raw as Record<string, {
      x?: number;
      z?: number;
      ownerTeamId?: string;
      bannerColor?: string;
      defense?: { wall?: string; gate?: string; gateHp?: number };
    }>)[id];
    const meshes = view.forts.get(id);
    if (!fort || !meshes) continue;
    meshes.group.position.set(fort.x ?? 0, 0, fort.z ?? 0);
    const wall = fort.defense?.wall ?? "none";
    meshes.walls.visible = wall !== "none";
    meshes.walls.scale.y = wall === "high" ? 1.45 : 1;
    const gateOpen = (fort.defense?.gate ?? "none") === "none" || (fort.defense?.gateHp ?? 0) <= 0;
    meshes.gate.visible = !gateOpen;
    const dir = FORT_GATE_DIR[id];
    meshes.gate.position.set(dir.x * COURTYARD_HALF, 1.05, dir.z * COURTYARD_HALF);
    const mat = meshes.banner.material as THREE.MeshStandardMaterial;
    mat.color.setHex(hexColor(fort.bannerColor));
  }
}

export function disposeFortView(view: FortView): void {
  view.group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else (material as THREE.Material).dispose();
  });
  view.group.removeFromParent();
}
