import type { FormationId } from "@/lib/game/data/formations";

/** Fixed simulation step. Later tickets must not change this. */
export const FIXED_DT = 1 / 60;

export type EntityKind = "captain" | "bot" | "projectile";

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
  /** Last consumed InputCommand.buttons for this tick. */
  buttons?: number;
};

export type HitReactionState = "idle" | "alive" | "stumble" | "knockdown" | "death";

export type HitReactionComponent = {
  state: HitReactionState;
  force: number;
  remainingTicks: number;
};

export type AppearanceComponent = {
  skinId: string;
  primaryColor: string;
  isCaptain: boolean;
  heightScale: number;
  unitDefId: string;
};

export type SquadComponent = {
  captainId: string;
  slotIndex: number;
};

export type RoamComponent = {
  spawnX: number;
  spawnZ: number;
  targetX: number | null;
  targetZ: number | null;
  idleTicksRemaining: number;
  radius: number;
};

export type OrderMode = "garrison" | "follow" | "hold" | "retreat";

export type OrderComponent = {
  mode: OrderMode;
  slotIndex: number;
  formationId: FormationId;
  customOffset?: { x: number; z: number };
  holdX?: number;
  holdZ?: number;
  retreatX?: number;
  retreatZ?: number;
  fortId?: string;
  engaging?: boolean;
};

export type FormationLoadoutComponent = {
  activeId: FormationId;
  custom: { slots: Array<{ index: number; x: number; z: number }> };
  homeX: number;
  homeZ: number;
  homeFortId?: string;
};

export type ScrollPoseComponent = {
  active: boolean;
};

export type AbilityAttributes = {
  health: number;
  maxHealth: number;
};

export type AbilityEvent = {
  tick: number;
  sourceId: string;
  abilityId: string;
  aim: Vec3;
};

export type AbilitySystemComponent = {
  attributes: AbilityAttributes;
  /** Serializable tag set. Values are `State.*` strings. */
  tags: string[];
  granted: string[];
  cooldowns: Record<string, number>;
  activationQueue: AbilityEvent[];
  loadout: "melee" | "ranged";
};

export type ProjectileComponent = {
  vx: number;
  vy: number;
  vz: number;
  force: number;
  radius: number;
  gravity: number;
  sourceId: string;
  weaponId: string;
};

export type SwingComponent = {
  remainingTicks: number;
  yaw: number;
};

export type ShieldComponent = {
  equipped: true;
  arrowFactor: number;
};

export type InventoryComponent = {
  gear: string[];
  equipped?: string;
  ammo?: number;
  shoutRadiusScale?: number;
};

export type ShoutComponent = {
  text: string;
  tick: number;
};

export type RespawnComponent = {
  remainingTicks: number;
  homeFortId?: string;
  lastSlotX: number;
  lastSlotZ: number;
  retreatIssued?: boolean;
};

export type ClimbComponent = {
  fortId: string;
  progress: number;
  completed: boolean;
};

export type UpgradesComponent = {
  sword: boolean;
  shield: boolean;
};

export type KingState = "recruit" | "garrison" | "defend" | "sortie" | "retreat";

export type KingComponent = {
  personality: string;
  state: KingState;
  ready: boolean;
  targetFortId?: string;
  waypointIndex?: number;
  lastCommand?: string;
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
  appearance?: AppearanceComponent;
  squad?: SquadComponent;
  roam?: RoamComponent;
  order?: OrderComponent;
  formationLoadout?: FormationLoadoutComponent;
  scrollPose?: ScrollPoseComponent;
  abilitySystem?: AbilitySystemComponent;
  projectile?: ProjectileComponent;
  swing?: SwingComponent;
  shield?: ShieldComponent;
  inventory?: InventoryComponent;
  shout?: ShoutComponent;
  respawn?: RespawnComponent;
  climb?: ClimbComponent;
  upgrades?: UpgradesComponent;
  king?: KingComponent;
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
