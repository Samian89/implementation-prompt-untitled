"use client";

import * as THREE from "three";
import { FOREST_PATCHES, HILL, RIVER } from "@/lib/game/world/terrain";

export type WorldView = {
  group: THREE.Group;
};

export function createWorldView(): WorldView {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x4d5d3f, roughness: 0.94 })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(HILL.radius, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x6b7d4a, roughness: 0.9 })
  );
  hill.position.set(HILL.x, 0, HILL.z);
  hill.scale.set(1, HILL.height / HILL.radius, 1);
  group.add(hill);

  const river = new THREE.Mesh(
    new THREE.BoxGeometry(72, 0.12, RIVER.halfWidth * 2),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.15 })
  );
  river.position.set(0, 0.04, RIVER.z);
  group.add(river);

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(RIVER.fordHalfWidth * 2.2, 0.18, RIVER.halfWidth * 2.4),
    new THREE.MeshStandardMaterial({ color: 0x7c5a3a, roughness: 0.8 })
  );
  bridge.position.set(0, 0.14, RIVER.z);
  group.add(bridge);

  for (const patch of FOREST_PATCHES) {
    const grove = new THREE.Group();
    grove.position.set(patch.x, 0, patch.z);
    const count = 5;
    for (let i = 0; i < count; i++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 1.4, 5),
        new THREE.MeshStandardMaterial({ color: 0x5b3a29, roughness: 0.9 })
      );
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 })
      );
      const angle = (i / count) * Math.PI * 2;
      const r = patch.radius * 0.45;
      trunk.position.set(Math.cos(angle) * r, 0.7, Math.sin(angle) * r);
      canopy.position.set(Math.cos(angle) * r, 1.8, Math.sin(angle) * r);
      grove.add(trunk, canopy);
    }
    group.add(grove);
  }

  return { group };
}

export function disposeWorldView(view: WorldView): void {
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
