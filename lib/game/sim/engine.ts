import { ensureAbilitySystem } from "@/lib/game/gas/ability-system";
import { createJointedRagdoll } from "@/lib/game/physics/ragdoll";
import {
  applyImpulseToEntity,
  balanceAndPhysicsSystem,
  getRegisteredSystems,
  hitReactionSystem,
  inputSystem,
  locomotionSystem
} from "./systems";
import { buildSnapshot } from "./snapshot";
import {
  FIXED_DT,
  type Entity,
  type InputCommand,
  type NamedSystem,
  type SimWorld,
  type Snapshot,
  type SystemFn,
  type Vec3
} from "./types";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let nextEntitySerial = 1;

export type CreateEngineOptions = {
  seed?: number;
  includeGlobalSystems?: boolean;
};

export class SimEngine implements SimWorld {
  tick = 0;
  readonly dt = FIXED_DT;
  timeScale = 1;
  readonly entities = new Map<string, Entity>();
  bags: Record<string, unknown> = {};
  readonly rng: () => number;
  private readonly systems: NamedSystem[] = [];
  private readonly queued: { commands: InputCommand[] } = { commands: [] };

  constructor(opts: CreateEngineOptions = {}) {
    this.rng = mulberry32(opts.seed ?? 1);
    this.registerSystem("input", (world) => inputSystem(world, this.queued));
    if (opts.includeGlobalSystems !== false) {
      for (const extra of getRegisteredSystems()) {
        this.registerSystem(extra.name, extra.fn);
      }
    }
    this.registerSystem("hitReaction", hitReactionSystem);
    this.registerSystem("locomotion", locomotionSystem);
    this.registerSystem("physics", balanceAndPhysicsSystem);
  }

  registerSystem(name: string, fn: SystemFn): void {
    const existing = this.systems.findIndex((system) => system.name === name);
    if (existing >= 0) this.systems[existing] = { name, fn };
    else this.systems.push({ name, fn });
  }

  hasSystem(name: string): boolean {
    return this.systems.some((system) => system.name === name);
  }

  submitInput(command: InputCommand): void {
    this.queued.commands.push(command);
  }

  spawnEntity(entity: Entity): Entity {
    this.entities.set(entity.id, entity);
    return entity;
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  applyImpulse(entityId: string, force: number, direction?: Vec3): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    applyImpulseToEntity(entity, force, direction);
  }

  step(): Snapshot {
    for (const system of this.systems) {
      system.fn(this);
    }
    this.tick += 1;
    return this.getSnapshot();
  }

  getSnapshot(): Snapshot {
    return buildSnapshot(this);
  }
}

export function createEngine(opts: CreateEngineOptions = {}): SimEngine {
  return new SimEngine(opts);
}

export type SpawnCaptainOptions = {
  id?: string;
  teamId?: string;
  playerId?: string | null;
  drivenBy?: "player" | "ai" | "none";
  x?: number;
  y?: number;
  z?: number;
};

export function spawnCaptain(world: SimWorld, opts: SpawnCaptainOptions = {}): Entity {
  const id = opts.id ?? `captain-${nextEntitySerial++}`;
  const x = opts.x ?? 0;
  const y = opts.y ?? 0;
  const z = opts.z ?? 0;
  const entity: Entity = {
    id,
    teamId: opts.teamId ?? "team-0",
    kind: "captain",
    components: {
      transform: { x, y, z, yaw: 0, pitch: 0 },
      control: {
        enabled: true,
        uprightAllowed: true,
        playerId: opts.playerId === null ? null : (opts.playerId ?? "local"),
        drivenBy: opts.drivenBy ?? "player",
        moveX: 0,
        moveY: 0,
        lookYaw: 0,
        lookPitch: 0
      },
      ragdoll: createJointedRagdoll({ x, y, z }),
      hitReaction: { state: "idle", force: 0, remainingTicks: 0 }
    }
  };
  ensureAbilitySystem(entity, "captain", "melee");
  return world.spawnEntity(entity);
}
