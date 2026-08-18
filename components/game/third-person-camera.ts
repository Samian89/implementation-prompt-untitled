export type CameraRig = {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
};

export type CameraTarget = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch?: number;
};

export function createCameraRig(target: CameraTarget = { x: 0, y: 0, z: 0, yaw: 0 }): CameraRig {
  const desired = desiredCameraPose(target);
  return { ...desired };
}

export function desiredCameraPose(
  target: CameraTarget,
  opts: { distance?: number; height?: number } = {}
): CameraRig {
  const distance = opts.distance ?? 5.4;
  const height = opts.height ?? 2.15;
  const pitch = target.pitch ?? -0.18;
  const yaw = target.yaw;
  const back = Math.cos(pitch) * distance;
  const lift = height - Math.sin(pitch) * distance;
  return {
    x: target.x - Math.sin(yaw) * back,
    y: target.y + lift,
    z: target.z - Math.cos(yaw) * back,
    lookX: target.x,
    lookY: target.y + 1.25,
    lookZ: target.z
  };
}

/** Critically-damped-ish spring follow. No first-person toggle. */
export function stepThirdPersonCamera(
  rig: CameraRig,
  target: CameraTarget,
  dt: number,
  stiffness = 10
): CameraRig {
  const desired = desiredCameraPose(target);
  const alpha = 1 - Math.exp(-stiffness * dt);
  rig.x += (desired.x - rig.x) * alpha;
  rig.y += (desired.y - rig.y) * alpha;
  rig.z += (desired.z - rig.z) * alpha;
  rig.lookX += (desired.lookX - rig.lookX) * alpha;
  rig.lookY += (desired.lookY - rig.lookY) * alpha;
  rig.lookZ += (desired.lookZ - rig.lookZ) * alpha;
  return rig;
}
