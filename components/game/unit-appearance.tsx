"use client";

import * as THREE from "three";
import { getUnitDef } from "@/lib/game/data/units";
import { cosmeticPropFor, parseHexColor } from "@/lib/game/units/appearance";
import type { AppearanceComponent, Entity, RagdollComponent } from "@/lib/game/sim/types";

export type SkinPalette = {
  tabard: number;
  accent: number;
  metal: number;
  skin: number;
  leather: number;
};

const DEFAULT_SKIN = 0xf1c7a3;

const PALETTES: Record<string, SkinPalette> = {
  "skin.captain": {
    tabard: 0xb45309,
    accent: 0xfbbf24,
    metal: 0xf59e0b,
    skin: DEFAULT_SKIN,
    leather: 0x44403c
  },
  "skin.swordsman": {
    tabard: 0x1d4ed8,
    accent: 0x60a5fa,
    metal: 0xcbd5e1,
    skin: DEFAULT_SKIN,
    leather: 0x334155
  },
  "skin.archer": {
    tabard: 0x15803d,
    accent: 0x86efac,
    metal: 0xa8a29e,
    skin: DEFAULT_SKIN,
    leather: 0x3f3f2e
  }
};

export function paletteForAppearance(appearance?: AppearanceComponent): SkinPalette {
  if (appearance && PALETTES[appearance.skinId]) return PALETTES[appearance.skinId]!;
  if (appearance) {
    const tabard = parseHexColor(appearance.primaryColor, 0x64748b);
    return {
      tabard,
      accent: tabard,
      metal: 0x94a3b8,
      skin: DEFAULT_SKIN,
      leather: 0x334155
    };
  }
  return PALETTES["skin.captain"]!;
}

export function boneColor(appearance: AppearanceComponent | undefined, boneId: string): number {
  const palette = paletteForAppearance(appearance);
  switch (boneId) {
    case "torso":
    case "pelvis":
      return palette.tabard;
    case "head":
      return palette.skin;
    case "upperArmL":
    case "upperArmR":
      return palette.leather;
    case "lowerArmL":
    case "lowerArmR":
      return palette.metal;
    case "upperLegL":
    case "upperLegR":
      return palette.leather;
    case "lowerLegL":
    case "lowerLegR":
      return palette.accent;
    default:
      return 0x888888;
  }
}

export type UnitPropMeshes = {
  crown?: THREE.Mesh;
  banner?: THREE.Mesh;
  weapon?: THREE.Mesh;
};

export function createUnitPropMeshes(appearance: AppearanceComponent): UnitPropMeshes {
  const def = getUnitDef(appearance.unitDefId);
  const palette = paletteForAppearance(appearance);
  const props: UnitPropMeshes = {};
  const prop = def ? cosmeticPropFor(def) : appearance.isCaptain ? "crown" : "blade";

  if (appearance.isCaptain || prop === "crown") {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.35, metalness: 0.65 })
    );
    props.crown = crown;

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.34),
      new THREE.MeshStandardMaterial({
        color: palette.tabard,
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide
      })
    );
    props.banner = banner;
  }

  if (prop === "blade" || (def?.role === "melee" && !appearance.isCaptain)) {
    props.weapon = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.045, 0.52),
      new THREE.MeshStandardMaterial({ color: palette.metal, roughness: 0.28, metalness: 0.75 })
    );
  }

  if (prop === "bow" || def?.role === "ranged") {
    props.weapon = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.016, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7, metalness: 0.1 })
    );
  }

  return props;
}

function placeOnBone(
  mesh: THREE.Mesh,
  bone: { x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number },
  local: THREE.Vector3,
  scale: number
): void {
  const q = new THREE.Quaternion(bone.qx, bone.qy, bone.qz, bone.qw);
  const offset = local.clone().multiplyScalar(scale).applyQuaternion(q);
  mesh.visible = true;
  mesh.position.set(bone.x + offset.x, bone.y + offset.y, bone.z + offset.z);
  mesh.quaternion.copy(q);
  mesh.scale.setScalar(scale);
}

export function syncUnitPropMeshes(
  props: UnitPropMeshes,
  ragdoll: RagdollComponent,
  appearance: AppearanceComponent
): void {
  const scale = appearance.heightScale || 1;
  const head = ragdoll.bones.head;
  const torso = ragdoll.bones.torso;
  const hand = ragdoll.bones.lowerArmR;

  if (props.crown && head) {
    placeOnBone(props.crown, head, new THREE.Vector3(0, 0.2, 0), scale);
  }
  if (props.banner && torso) {
    placeOnBone(props.banner, torso, new THREE.Vector3(0.18, 0.12, -0.08), scale);
  }
  if (props.weapon && hand) {
    placeOnBone(props.weapon, hand, new THREE.Vector3(0, 0, 0.18), scale);
  }
}

export function disposeUnitPropMeshes(props: UnitPropMeshes): void {
  for (const mesh of [props.crown, props.banner, props.weapon]) {
    if (!mesh) continue;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.removeFromParent();
  }
}

export function syncEntityBones(
  scene: THREE.Scene,
  boneMeshes: Map<string, THREE.Mesh>,
  entity: Entity
): void {
  const ragdoll = entity.components.ragdoll;
  if (!ragdoll) return;
  const appearance = entity.components.appearance;
  const scale = appearance?.heightScale ?? 1;
  for (const bone of Object.values(ragdoll.bones)) {
    const key = `${entity.id}:${bone.id}`;
    let mesh = boneMeshes.get(key);
    if (!mesh) {
      const geo = new THREE.CapsuleGeometry(bone.radius, Math.max(0.08, bone.length * 0.7), 3, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: boneColor(appearance, bone.id),
        roughness: 0.55,
        metalness: bone.id === "head" ? 0 : 0.18
      });
      mesh = new THREE.Mesh(geo, mat);
      boneMeshes.set(key, mesh);
      scene.add(mesh);
    }
    mesh.position.set(bone.x, bone.y, bone.z);
    mesh.quaternion.set(bone.qx, bone.qy, bone.qz, bone.qw);
    mesh.scale.setScalar(bone.id === "head" && appearance?.isCaptain ? scale * 1.05 : scale);
  }
}
