import { FIXED_DT, type BoneState } from "@/lib/game/sim/types";
import { springDamperForce } from "./spring-damper";

/** World-up spring on pelvis / torso while uprightAllowed is true. */
export function applyUprightTorque(
  bone: BoneState,
  restY: number,
  stiffness: number,
  damping: number,
  dt = FIXED_DT
): void {
  const fy = springDamperForce(bone.y, restY, bone.vy, stiffness, damping);
  bone.vy += (fy / bone.mass) * dt;

  // Flatten tilt by damping horizontal spin and pulling rotation toward identity.
  bone.wx *= 0.85;
  bone.wz *= 0.85;
  bone.qx *= 0.92;
  bone.qz *= 0.92;
  const qlen = Math.hypot(bone.qx, bone.qy, bone.qz, bone.qw) || 1;
  bone.qx /= qlen;
  bone.qy /= qlen;
  bone.qz /= qlen;
  bone.qw /= qlen;
}
