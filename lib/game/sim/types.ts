/** Fixed simulation step. Later tickets must not change this. */
export const FIXED_DT = 1 / 60;

export type EntityKind = "captain" | "bot";

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type Quat = {
  x: number;
  y: number;
  z: number;
  w: number;
};

/**
 * The only way a human or AI drives a Captain.
 * moveX = camera-right strafe, moveY = camera-forward (yaw 0 faces +Z).
 */
export type InputCommand = {
  tick: number;
  playerId: string;
  moveX: number;
  moveY: number;
  lookYaw: number;
  lookPitch: number;
  buttons: number;
};

export type TransformComponent = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

export type ControlComponent = {
  enabled: boolean;
  uprightAllowed: boolean;
  playerId: string | null;
  drivenBy: "player" | "ai" | "none";
  moveX: number;
  moveY: number;
  lookYaw: number;
  lookPitch: number;
};

export type HitReactionState = "idle" | "stumble" | "knockdown" | "death";

export type HitReactionComponent = {
  state: HitReactionState;
  force: number;
  remainingTicks: number;
};

export type BoneId =
  | "pelvis"
  | "torso"
  | "head"
  | "upperArmL"
  | "upperArmR"
  | "lowerArmL"
  | "lowerArmR"
  | "upperLegL"
  | "upperLegR"
  | "lowerLegL"
  | "lowerLegR";

export type BoneState = {
  id: BoneId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  wx: number;
  wy: number;
  wz: number;
  mass: number;
  radius: number;
  length: number;
};

export type JointDef = {
  parent: BoneId;
  child: BoneId;
  restLength: number;
  restDir: Vec3;
  linearStiffness: number;
  linearDamping: number;
  angularStiffness: number;
  angularDamping: number;
  swingLimit: number;
  twistLimit: number;
};

export type RagdollComponent = {
  bones: Record<BoneId, BoneState>;
  joints: JointDef[];
  restLocal: Record<BoneId, Vec3>;
  stiffnessScale: number;
  poseEnabled: boolean;
};

export type EntityComponents = {
  transform?: TransformComponent;
  control?: ControlComponent;
  ragdoll?: RagdollComponent;
  hitReaction?: HitReactionComponent;
  [key: string]: unknown;
};

export type Entity = {
  id: string;
  teamId: string;
  kind: EntityKind;
  components: EntityComponents;
};

/**
 * Replication contract. `bags` is an open map later tickets write
 * (`forts`, `match`, `economy`, `ui`) without changing this shape.
 */
export type Snapshot = {
  tick: number;
  timeScale: number;
  entities: Entity[];
  bags: Record<string, unknown>;
};

export type SystemFn = (world: SimWorld) => void;

export type NamedSystem = {
  name: string;
  fn: SystemFn;
};

export interface SimWorld {
  readonly tick: number;
  readonly dt: number;
  timeScale: number;
  readonly entities: Map<string, Entity>;
  bags: Record<string, unknown>;
  rng(): number;
  submitInput(command: InputCommand): void;
  spawnEntity(entity: Entity): Entity;
  getEntity(id: string): Entity | undefined;
  applyImpulse(entityId: string, force: number, direction?: Vec3): void;
  getSnapshot(): Snapshot;
}
