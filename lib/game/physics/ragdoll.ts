import type {
  BoneId,
  BoneState,
  JointDef,
  RagdollComponent,
  Vec3
} from "@/lib/game/sim/types";
import { applyJointConstraint, applyPoseSpring, rotateYaw } from "./spring-damper";
import { applyUprightTorque } from "./balance";
import { sampleGroundHeight } from "./ground";

export const BONE_IDS: BoneId[] = [
  "pelvis",
  "torso",
  "head",
  "upperArmL",
  "upperArmR",
  "lowerArmL",
  "lowerArmR",
  "upperLegL",
  "upperLegR",
  "lowerLegL",
  "lowerLegR"
];

type BoneSpec = {
  id: BoneId;
  x: number;
  y: number;
  z: number;
  mass: number;
  radius: number;
  length: number;
};

const BONE_SPECS: BoneSpec[] = [
  { id: "pelvis", x: 0, y: 0.95, z: 0, mass: 4, radius: 0.16, length: 0.18 },
  { id: "torso", x: 0, y: 1.35, z: 0, mass: 5, radius: 0.18, length: 0.32 },
  { id: "head", x: 0, y: 1.72, z: 0, mass: 1.2, radius: 0.12, length: 0.16 },
  { id: "upperArmL", x: -0.28, y: 1.42, z: 0, mass: 1.5, radius: 0.06, length: 0.28 },
  { id: "upperArmR", x: 0.28, y: 1.42, z: 0, mass: 1.5, radius: 0.06, length: 0.28 },
  { id: "lowerArmL", x: -0.32, y: 1.08, z: 0, mass: 1, radius: 0.05, length: 0.26 },
  { id: "lowerArmR", x: 0.32, y: 1.08, z: 0, mass: 1, radius: 0.05, length: 0.26 },
  { id: "upperLegL", x: -0.12, y: 0.58, z: 0, mass: 2.5, radius: 0.08, length: 0.36 },
  { id: "upperLegR", x: 0.12, y: 0.58, z: 0, mass: 2.5, radius: 0.08, length: 0.36 },
  { id: "lowerLegL", x: -0.12, y: 0.22, z: 0, mass: 1.8, radius: 0.07, length: 0.34 },
  { id: "lowerLegR", x: 0.12, y: 0.22, z: 0, mass: 1.8, radius: 0.07, length: 0.34 }
];

const JOINT_PAIRS: Array<[BoneId, BoneId]> = [
  ["pelvis", "torso"],
  ["torso", "head"],
  ["torso", "upperArmL"],
  ["torso", "upperArmR"],
  ["upperArmL", "lowerArmL"],
  ["upperArmR", "lowerArmR"],
  ["pelvis", "upperLegL"],
  ["pelvis", "upperLegR"],
  ["upperLegL", "lowerLegL"],
  ["upperLegR", "lowerLegR"]
];

function makeBone(spec: BoneSpec, origin: Vec3): BoneState {
  return {
    id: spec.id,
    x: origin.x + spec.x,
    y: origin.y + spec.y,
    z: origin.z + spec.z,
    vx: 0,
    vy: 0,
    vz: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
    wx: 0,
    wy: 0,
    wz: 0,
    mass: spec.mass,
    radius: spec.radius,
    length: spec.length
  };
}

function makeJoint(parent: BoneSpec, child: BoneSpec): JointDef {
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;
  const dz = child.z - parent.z;
  const restLength = Math.hypot(dx, dy, dz) || 0.1;
  return {
    parent: parent.id,
    child: child.id,
    restLength,
    restDir: { x: dx / restLength, y: dy / restLength, z: dz / restLength },
    linearStiffness: 80,
    linearDamping: 8,
    angularStiffness: 40,
    angularDamping: 4,
    swingLimit: 0.9,
    twistLimit: 0.6
  };
}

export function createJointedRagdoll(origin: Vec3 = { x: 0, y: 0, z: 0 }): RagdollComponent {
  const byId = Object.fromEntries(BONE_SPECS.map((spec) => [spec.id, spec])) as Record<
    BoneId,
    BoneSpec
  >;
  const bones = {} as Record<BoneId, BoneState>;
  const restLocal = {} as Record<BoneId, Vec3>;
  for (const spec of BONE_SPECS) {
    bones[spec.id] = makeBone(spec, origin);
    restLocal[spec.id] = { x: spec.x, y: spec.y, z: spec.z };
  }
  const joints = JOINT_PAIRS.map(([parent, child]) => makeJoint(byId[parent], byId[child]));
  return {
    bones,
    joints,
    restLocal,
    stiffnessScale: 1,
    poseEnabled: true
  };
}

export function listBoneIds(ragdoll: RagdollComponent): BoneId[] {
  return (Object.keys(ragdoll.bones) as BoneId[]).sort();
}

export function restPoseWorld(
  restLocal: Vec3,
  root: { x: number; y: number; z: number; yaw: number },
  gait: Vec3 = { x: 0, y: 0, z: 0 }
): Vec3 {
  const local = { x: restLocal.x + gait.x, y: restLocal.y + gait.y, z: restLocal.z + gait.z };
  const rotated = rotateYaw(local, root.yaw);
  return {
    x: root.x + rotated.x,
    y: root.y + rotated.y,
    z: root.z + rotated.z
  };
}

export function translateRagdoll(ragdoll: RagdollComponent, dx: number, dy: number, dz: number): void {
  for (const bone of Object.values(ragdoll.bones)) {
    bone.x += dx;
    bone.y += dy;
    bone.z += dz;
  }
}

export function applyRagdollImpulse(
  ragdoll: RagdollComponent,
  force: number,
  direction: Vec3
): void {
  const len = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const nx = direction.x / len;
  const ny = direction.y / len;
  const nz = direction.z / len;
  for (const bone of Object.values(ragdoll.bones)) {
    const scale = force / bone.mass;
    bone.vx += nx * scale;
    bone.vy += ny * scale;
    bone.vz += nz * scale;
  }
}

const MAX_BONE_SPEED = 28;

function clampBoneVelocity(bone: BoneState, maxSpeed: number): void {
  const speed = Math.hypot(bone.vx, bone.vy, bone.vz);
  if (!Number.isFinite(speed)) {
    bone.vx = 0;
    bone.vy = 0;
    bone.vz = 0;
    return;
  }
  if (speed <= maxSpeed) return;
  const scale = maxSpeed / speed;
  bone.vx *= scale;
  bone.vy *= scale;
  bone.vz *= scale;
}

export function snapRagdollToPose(
  ragdoll: RagdollComponent,
  root: { x: number; y: number; z: number; yaw: number }
): void {
  for (const id of BONE_IDS) {
    const target = restPoseWorld(ragdoll.restLocal[id], root);
    const bone = ragdoll.bones[id];
    bone.x = target.x;
    bone.y = target.y;
    bone.z = target.z;
    bone.vx = 0;
    bone.vy = 0;
    bone.vz = 0;
    bone.qx = 0;
    bone.qy = 0;
    bone.qz = 0;
    bone.qw = 1;
  }
}

function gaitOffset(id: BoneId, tick: number, moving: boolean): Vec3 {
  if (!moving) return { x: 0, y: 0, z: 0 };
  const t = tick * (1 / 60) * 8;
  const amp = 0.14;
  const left = Math.sin(t);
  const right = Math.sin(t + Math.PI);
  switch (id) {
    case "upperLegL":
    case "lowerLegL":
      return { x: 0, y: Math.max(0, left) * 0.04, z: left * amp };
    case "upperLegR":
    case "lowerLegR":
      return { x: 0, y: Math.max(0, right) * 0.04, z: right * amp };
    case "upperArmL":
    case "lowerArmL":
      return { x: 0, y: 0, z: right * amp * 0.55 };
    case "upperArmR":
    case "lowerArmR":
      return { x: 0, y: 0, z: left * amp * 0.55 };
    case "torso":
      return { x: left * 0.02, y: 0, z: 0 };
    default:
      return { x: 0, y: 0, z: 0 };
  }
}

export function stepRagdoll(
  ragdoll: RagdollComponent,
  root: { x: number; y: number; z: number; yaw: number },
  opts: {
    dt: number;
    tick: number;
    uprightAllowed: boolean;
    moving: boolean;
    gravity: boolean;
  }
): void {
  const { dt, tick, uprightAllowed, moving, gravity } = opts;
  const poseStiffness = 90 * ragdoll.stiffnessScale;
  const poseDamping = 12;

  if (ragdoll.poseEnabled) {
    for (const id of BONE_IDS) {
      const target = restPoseWorld(ragdoll.restLocal[id], root, gaitOffset(id, tick, moving));
      applyPoseSpring(ragdoll.bones[id], target, poseStiffness, poseDamping, dt);
    }
  }

  if (uprightAllowed) {
    applyUprightTorque(ragdoll.bones.pelvis, root.y + ragdoll.restLocal.pelvis.y, 140, 16, dt);
    applyUprightTorque(ragdoll.bones.torso, root.y + ragdoll.restLocal.torso.y, 120, 14, dt);
  }

  for (const joint of ragdoll.joints) {
    const restDirWorld = rotateYaw(joint.restDir, root.yaw);
    applyJointConstraint(
      ragdoll.bones[joint.parent],
      ragdoll.bones[joint.child],
      joint,
      Math.max(0.15, ragdoll.stiffnessScale),
      restDirWorld,
      dt
    );
  }

  for (const bone of Object.values(ragdoll.bones)) {
    if (gravity) {
      bone.vy -= (uprightAllowed ? 6 : 16) * dt;
    }
    bone.vx *= 0.985;
    bone.vy *= 0.99;
    bone.vz *= 0.985;
    clampBoneVelocity(bone, MAX_BONE_SPEED);

    bone.x += bone.vx * dt;
    bone.y += bone.vy * dt;
    bone.z += bone.vz * dt;

    if (!Number.isFinite(bone.x) || !Number.isFinite(bone.y) || !Number.isFinite(bone.z)) {
      snapRagdollToPose(ragdoll, root);
      return;
    }

    const floor = sampleGroundHeight(bone.x, bone.z) + bone.radius;
    if (bone.y < floor) {
      bone.y = floor;
      if (bone.vy < 0) bone.vy *= -0.15;
      bone.vx *= 0.75;
      bone.vz *= 0.75;
    }

    bone.qx += bone.wx * dt * 0.5;
    bone.qy += bone.wy * dt * 0.5;
    bone.qz += bone.wz * dt * 0.5;
    const qlen = Math.hypot(bone.qx, bone.qy, bone.qz, bone.qw) || 1;
    bone.qx /= qlen;
    bone.qy /= qlen;
    bone.qz /= qlen;
    bone.qw /= qlen;
  }

  // Derive limb orientation from parent→child so the view looks jointed.
  for (const joint of ragdoll.joints) {
    const parent = ragdoll.bones[joint.parent];
    const child = ragdoll.bones[joint.child];
    const dx = child.x - parent.x;
    const dy = child.y - parent.y;
    const dz = child.z - parent.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    // Rotation that takes +Y to the bone axis.
    const ax = -uz;
    const ay = 0;
    const az = ux;
    const alen = Math.hypot(ax, ay, az);
    const angle = Math.acos(Math.min(1, Math.max(-1, uy)));
    if (alen > 1e-5) {
      const s = Math.sin(angle / 2) / alen;
      child.qx = ax * s;
      child.qy = ay * s;
      child.qz = az * s;
      child.qw = Math.cos(angle / 2);
    }
  }
}
