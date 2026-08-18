import { FIXED_DT, type BoneState, type JointDef, type Vec3 } from "@/lib/game/sim/types";

export function springDamperForce(
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  damping: number
): number {
  return (target - current) * stiffness - velocity * damping;
}

export function applyPoseSpring(
  bone: BoneState,
  target: Vec3,
  stiffness: number,
  damping: number,
  dt = FIXED_DT
): void {
  const fx = springDamperForce(bone.x, target.x, bone.vx, stiffness, damping);
  const fy = springDamperForce(bone.y, target.y, bone.vy, stiffness, damping);
  const fz = springDamperForce(bone.z, target.z, bone.vz, stiffness, damping);
  const invDt = dt / bone.mass;
  bone.vx += fx * invDt;
  bone.vy += fy * invDt;
  bone.vz += fz * invDt;
}

/** Linear spring-damper along the parent–child segment, plus an angular rest-dir pull. */
export function applyJointConstraint(
  parent: BoneState,
  child: BoneState,
  joint: JointDef,
  stiffnessScale: number,
  restDirWorld: Vec3,
  dt = FIXED_DT
): void {
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;
  const dz = child.z - parent.z;
  const dist = Math.hypot(dx, dy, dz) || 1e-6;
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;
  const err = dist - joint.restLength;
  const relVel =
    (child.vx - parent.vx) * nx + (child.vy - parent.vy) * ny + (child.vz - parent.vz) * nz;
  const linear =
    (err * joint.linearStiffness * stiffnessScale + relVel * joint.linearDamping) * dt;
  const invP = 1 / parent.mass;
  const invC = 1 / child.mass;
  parent.vx += nx * linear * invP;
  parent.vy += ny * linear * invP;
  parent.vz += nz * linear * invP;
  child.vx -= nx * linear * invC;
  child.vy -= ny * linear * invC;
  child.vz -= nz * linear * invC;

  const desiredX = parent.x + restDirWorld.x * joint.restLength;
  const desiredY = parent.y + restDirWorld.y * joint.restLength;
  const desiredZ = parent.z + restDirWorld.z * joint.restLength;
  const ax = ((desiredX - child.x) * joint.angularStiffness * stiffnessScale - child.vx * joint.angularDamping) * dt;
  const ay = ((desiredY - child.y) * joint.angularStiffness * stiffnessScale - child.vy * joint.angularDamping) * dt;
  const az = ((desiredZ - child.z) * joint.angularStiffness * stiffnessScale - child.vz * joint.angularDamping) * dt;
  child.vx += ax * invC;
  child.vy += ay * invC;
  child.vz += az * invC;
  parent.vx -= ax * invP * 0.5;
  parent.vy -= ay * invP * 0.5;
  parent.vz -= az * invP * 0.5;

  const swing = Math.acos(Math.min(1, Math.max(-1, nx * restDirWorld.x + ny * restDirWorld.y + nz * restDirWorld.z)));
  if (swing > joint.swingLimit) {
    const pull = (swing - joint.swingLimit) * joint.angularStiffness * stiffnessScale * dt;
    child.vx += (restDirWorld.x - nx) * pull * invC;
    child.vy += (restDirWorld.y - ny) * pull * invC;
    child.vz += (restDirWorld.z - nz) * pull * invC;
  }
}

export function rotateYaw(v: Vec3, yaw: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: v.x * c + v.z * s,
    y: v.y,
    z: -v.x * s + v.z * c
  };
}
