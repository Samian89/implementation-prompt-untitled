"use client";

import * as THREE from "three";
import type { CombatFx } from "@/lib/game/combat/fx";
import type { Snapshot } from "@/lib/game/sim/types";

export type CombatFeedback = {
  arrows: Map<string, THREE.Mesh>;
  effects: Map<string, THREE.Object3D>;
  swings: Map<string, THREE.Mesh>;
};

export function createCombatFeedback(): CombatFeedback {
  return {
    arrows: new Map(),
    effects: new Map(),
    swings: new Map()
  };
}

export function syncCombatFeedback(
  scene: THREE.Scene,
  feedback: CombatFeedback,
  snapshot: Snapshot
): void {
  const liveArrows = new Set<string>();
  for (const entity of snapshot.entities) {
    const body = entity.components.projectile;
    const transform = entity.components.transform;
    if (!body || !transform) continue;
    liveArrows.add(entity.id);
    let mesh = feedback.arrows.get(entity.id);
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.04, 0.62, 6),
        new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.55, metalness: 0.08 })
      );
      feedback.arrows.set(entity.id, mesh);
      scene.add(mesh);
    }
    mesh.position.set(transform.x, transform.y, transform.z);
    const dir = new THREE.Vector3(body.vx, body.vy, body.vz);
    if (dir.lengthSq() > 1e-5) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
  }
  for (const [id, mesh] of feedback.arrows) {
    if (liveArrows.has(id)) continue;
    disposeObject(mesh);
    feedback.arrows.delete(id);
  }

  const liveSwings = new Set<string>();
  for (const entity of snapshot.entities) {
    const swing = entity.components.swing;
    const transform = entity.components.transform;
    if (!swing || !transform) continue;
    liveSwings.add(entity.id);
    let mesh = feedback.swings.get(entity.id);
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.85, 0.03, 6, 16, Math.PI * 0.7),
        new THREE.MeshStandardMaterial({
          color: 0xfde68a,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.45,
          roughness: 0.4,
          metalness: 0.15,
          side: THREE.DoubleSide
        })
      );
      feedback.swings.set(entity.id, mesh);
      scene.add(mesh);
    }
    const fade = Math.max(0.25, swing.remainingTicks / 14);
    mesh.position.set(transform.x, transform.y + 1.15, transform.z);
    mesh.rotation.set(0.15, swing.yaw, 0.35);
    mesh.scale.setScalar(0.85 + (1 - fade) * 0.35);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = fade;
    mat.transparent = true;
  }
  for (const [id, mesh] of feedback.swings) {
    if (liveSwings.has(id)) continue;
    disposeObject(mesh);
    feedback.swings.delete(id);
  }

  const bag = snapshot.bags.combat as { fx?: CombatFx[] } | undefined;
  const liveFx = new Set<string>();
  for (const fx of bag?.fx ?? []) {
    liveFx.add(fx.id);
    let node = feedback.effects.get(fx.id);
    if (!node) {
      node = createImpactNode(fx.kind);
      feedback.effects.set(fx.id, node);
      scene.add(node);
    }
    const age = Math.max(0, snapshot.tick - fx.tick);
    const t = Math.min(1, age / 18);
    node.position.set(fx.x, fx.y + t * 0.25, fx.z);
    node.rotation.y = fx.yaw + age * 0.12;
    node.scale.setScalar(fx.kind === "squash" ? 1 + t * 0.6 : 0.7 + t * 0.9);
  }
  for (const [id, node] of feedback.effects) {
    if (liveFx.has(id)) continue;
    disposeObject(node);
    feedback.effects.delete(id);
  }
}

export function disposeCombatFeedback(feedback: CombatFeedback): void {
  for (const mesh of feedback.arrows.values()) disposeObject(mesh);
  for (const mesh of feedback.swings.values()) disposeObject(mesh);
  for (const node of feedback.effects.values()) disposeObject(node);
  feedback.arrows.clear();
  feedback.swings.clear();
  feedback.effects.clear();
}

function createImpactNode(kind: CombatFx["kind"]): THREE.Object3D {
  const group = new THREE.Group();
  if (kind === "swing") {
    return group;
  }
  if (kind === "squash") {
    const squash = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        roughness: 0.45
      })
    );
    squash.scale.set(1.35, 0.45, 1.35);
    group.add(squash);
    return group;
  }
  const color = kind === "puff" ? 0xd6d3d1 : 0xfacc15;
  const count = kind === "puff" ? 5 : 6;
  for (let i = 0; i < count; i++) {
    const star = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.16, 4),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.35
      })
    );
    const angle = (i / count) * Math.PI * 2;
    star.position.set(Math.cos(angle) * 0.22, 0.08, Math.sin(angle) * 0.22);
    star.rotation.z = angle;
    group.add(star);
  }
  return group;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else (material as THREE.Material).dispose();
  });
  object.removeFromParent();
}
