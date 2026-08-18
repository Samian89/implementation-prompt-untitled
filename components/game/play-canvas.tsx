"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  COMMAND_CALL_TO_ARMS,
  COMMAND_FOLLOW,
  COMMAND_HOLD,
  COMMAND_RETREAT,
  createEngine,
  createMatch,
  DEBUG_IMPULSE_FORCE,
  emptyInput,
  INPUT_BUTTON,
  issueCommand,
  readyAndMaybeBegin,
  setFormationScrollOpen,
  setMapScrollOpen,
  setUnitLoadout,
  spawnPlaySandbox,
  startMarch,
  tryBuyDefense,
  tryBuyUpgrade,
  tryRecruit,
  writeCustomSlot,
  type DefenseId,
  type LoadoutRole,
  type SimEngine,
  type Snapshot
} from "@/lib/game";
import { CommandHud } from "./command-hud";
import { MatchHud, readMatchPhase } from "./match-hud";
import type { FormationCommand } from "./formation-scroll";
import {
  createCombatFeedback,
  disposeCombatFeedback,
  syncCombatFeedback
} from "./combat-feedback";
import { createFortView, disposeFortView, syncFortView } from "./fort-view";
import { renderHudSlots } from "./hud-slots";
import { RecruitSetup } from "./recruit-setup";
import { createCameraRig, stepThirdPersonCamera } from "./third-person-camera";
import { countLiveBots, squadCountLabel } from "./squad-count-hud";
import {
  createUnitPropMeshes,
  disposeUnitPropMeshes,
  syncEntityBones,
  syncUnitPropMeshes,
  type UnitPropMeshes
} from "./unit-appearance";
import { createWorldView, disposeWorldView } from "./world-view";

function readPlayMode(): "sandbox" | "match" {
  if (typeof window === "undefined") return "match";
  return new URLSearchParams(window.location.search).get("mode") === "sandbox" ? "sandbox" : "match";
}

function findLocalCaptain(engine: SimEngine) {
  for (const entity of engine.entities.values()) {
    if (entity.kind === "captain" && entity.components.control?.playerId === "local") return entity;
  }
  for (const entity of engine.entities.values()) {
    if (entity.kind === "captain") return entity;
  }
  return undefined;
}

export function PlayCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimEngine | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [kit, setKit] = useState<LoadoutRole>("melee");
  const [formationOpen, setFormationOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [matchGen, setMatchGen] = useState(0);
  const [playMode, setPlayMode] = useState<"sandbox" | "match">("match");
  const phase = readMatchPhase(snapshot);

  useEffect(() => {
    if (phase === "live" || phase === "ended") setSetupOpen(false);
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const mode = readPlayMode();
    setPlayMode(mode);
    const engine =
      mode === "sandbox"
        ? (() => {
            const sim = createEngine({ seed: 7 });
            spawnPlaySandbox(sim);
            return sim;
          })()
        : createMatch({ humanPlayers: 1, seed: 7 });
    engineRef.current = engine;
    setSetupOpen(mode !== "sandbox");

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87a0b8, 1);
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87a0b8, 28, 110);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 280);
    const rig = createCameraRig({ x: 0, y: 0, z: 0, yaw: 0 });

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x3f4f3a, 1.05));
    const sun = new THREE.DirectionalLight(0xfff4d6, 0.95);
    sun.position.set(8, 14, 6);
    scene.add(sun);

    const worldView = createWorldView();
    scene.add(worldView.group);
    const fortView = createFortView();
    scene.add(fortView.group);
    syncFortView(fortView, engine.getSnapshot());

    const boneMeshes = new Map<string, THREE.Mesh>();
    const propMeshes = new Map<string, UnitPropMeshes>();
    const combatFx = createCombatFeedback();
    const scrollMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.02, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.75, metalness: 0.05 })
    );
    scrollMesh.visible = false;
    scene.add(scrollMesh);

    const keys = new Set<string>();
    let lookYaw = 0;
    let lookPitch = -0.12;
    let pendingButtons = 0;
    let drawingBow = false;
    let hudFrame = 0;
    let raf = 0;
    let acc = 0;
    let last = performance.now();

    const localCaptain = () => findLocalCaptain(engine);

    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === "Digit1") pendingButtons |= INPUT_BUTTON.debugImpulse10;
      if (event.code === "Digit2") pendingButtons |= INPUT_BUTTON.debugImpulse35;
      if (event.code === "Digit3") pendingButtons |= INPUT_BUTTON.debugImpulse60;
      if (event.repeat) return;
      const captain = localCaptain();
      if (event.code === "KeyQ") {
        setFormationOpen((open) => {
          const next = !open;
          setFormationScrollOpen(engine, next);
          if (next && document.pointerLockElement === canvas) document.exitPointerLock();
          return next;
        });
      }
      if (event.code === "KeyM") {
        setMapOpen((open) => {
          const next = !open;
          setMapScrollOpen(engine, next);
          if (next && document.pointerLockElement === canvas) document.exitPointerLock();
          return next;
        });
      }
      if (event.code === "KeyC" && captain) {
        issueCommand(engine, captain.id, COMMAND_CALL_TO_ARMS);
      }
      if (event.code === "KeyH" && captain) {
        issueCommand(engine, captain.id, COMMAND_HOLD);
      }
      if (event.code === "KeyR" && captain) {
        issueCommand(engine, captain.id, COMMAND_RETREAT);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      lookYaw -= event.movementX * 0.0024;
      lookPitch = Math.max(-0.7, Math.min(0.35, lookPitch - event.movementY * 0.002));
    };
    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        if (event.button === 0) void canvas.requestPointerLock();
        return;
      }
      if (event.button === 0) pendingButtons |= INPUT_BUTTON.meleeStrike;
      if (event.button === 2) {
        event.preventDefault();
        drawingBow = true;
      }
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 2 && drawingBow && document.pointerLockElement === canvas) {
        pendingButtons |= INPUT_BUTTON.rangedShoot;
      }
      drawingBow = false;
    };
    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    const resize = () => {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight - 56;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const sampleMove = () => {
      let moveX = 0;
      let moveY = 0;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) moveY += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) moveY -= 1;
      return { moveX, moveY };
    };

    const syncBones = (snap: Snapshot) => {
      for (const entity of snap.entities) {
        const ragdoll = entity.components.ragdoll;
        if (!ragdoll) continue;
        syncEntityBones(scene, boneMeshes, entity);
        const appearance = entity.components.appearance;
        if (!appearance) continue;
        let props = propMeshes.get(entity.id);
        if (!props) {
          props = createUnitPropMeshes(appearance);
          for (const mesh of [props.crown, props.banner, props.weapon]) {
            if (mesh) scene.add(mesh);
          }
          propMeshes.set(entity.id, props);
        }
        syncUnitPropMeshes(props, ragdoll, appearance);
      }
    };

    const frame = (now: number) => {
      const elapsed = Math.min(0.08, (now - last) / 1000);
      last = now;
      acc += elapsed;
      const { moveX, moveY } = sampleMove();
      while (acc >= engine.dt) {
        const buttons = pendingButtons;
        pendingButtons = 0;
        engine.submitInput({
          ...emptyInput("local", engine.tick),
          moveX,
          moveY,
          lookYaw,
          lookPitch,
          buttons
        });
        engine.step();
        acc -= engine.dt;
      }
      const snap = engine.getSnapshot();
      const captain =
        snap.entities.find((entity) => entity.kind === "captain" && entity.components.control?.playerId === "local") ??
        snap.entities.find((entity) => entity.kind === "captain");
      const transform = captain?.components.transform;
      const control = captain?.components.control;
      if (transform) {
        stepThirdPersonCamera(
          rig,
          {
            x: transform.x,
            y: transform.y,
            z: transform.z,
            yaw: control?.lookYaw ?? transform.yaw,
            pitch: control?.lookPitch ?? transform.pitch
          },
          elapsed
        );
        camera.position.set(rig.x, rig.y, rig.z);
        camera.lookAt(rig.lookX, rig.lookY, rig.lookZ);
      }
      syncBones(snap);
      syncCombatFeedback(scene, combatFx, snap);
      syncFortView(fortView, snap);
      const scrollCaptain = snap.entities.find((entity) => entity.kind === "captain");
      const holding = Boolean(scrollCaptain?.components.scrollPose?.active);
      const hand = scrollCaptain?.components.ragdoll?.bones.lowerArmL;
      scrollMesh.visible = holding && Boolean(hand);
      if (holding && hand) {
        scrollMesh.position.set(hand.x, hand.y, hand.z);
        scrollMesh.quaternion.set(hand.qx, hand.qy, hand.qz, hand.qw);
      }
      renderer.render(scene, camera);
      hudFrame += 1;
      if (hudFrame % 4 === 0) setSnapshot(snap);
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    raf = requestAnimationFrame(frame);
    setSnapshot(engine.getSnapshot());

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      engineRef.current = null;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      disposeCombatFeedback(combatFx);
      disposeWorldView(worldView);
      disposeFortView(fortView);
      scrollMesh.geometry.dispose();
      (scrollMesh.material as THREE.Material).dispose();
      scene.remove(scrollMesh);
      for (const mesh of boneMeshes.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      }
      for (const props of propMeshes.values()) {
        disposeUnitPropMeshes(props);
      }
      renderer.dispose();
    };
  }, [matchGen]);

  const issue = (abilityId: FormationCommand) => {
    const engine = engineRef.current;
    if (!engine) return;
    const captain = findLocalCaptain(engine);
    if (!captain) return;
    issueCommand(engine, captain.id, abilityId);
  };

  const closeFormation = () => {
    setFormationOpen(false);
    if (engineRef.current) setFormationScrollOpen(engineRef.current, false);
  };

  const closeMap = () => {
    setMapOpen(false);
    if (engineRef.current) setMapScrollOpen(engineRef.current, false);
  };

  const onCustomSlot = (slotIndex: number, x: number, z: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const captain = findLocalCaptain(engine);
    if (!captain) return;
    writeCustomSlot(captain, slotIndex, x, z);
    for (const entity of engine.entities.values()) {
      const order = entity.components.order;
      if (entity.kind === "bot" && order?.slotIndex === slotIndex) {
        order.customOffset = { x, z };
        if (captain.components.formationLoadout?.activeId === "custom") {
          order.formationId = "custom";
        }
      }
    }
  };

  const localCaptainEntity = () => {
    const engine = engineRef.current;
    if (!engine) return undefined;
    return findLocalCaptain(engine);
  };

  const onRecruit = (unitDefId: "swordsman" | "archer") => {
    const engine = engineRef.current;
    const captain = localCaptainEntity();
    if (!engine || !captain) return;
    tryRecruit(engine, { captainId: captain.id, unitDefId });
    setSnapshot(engine.getSnapshot());
  };

  const onBuyDefense = (id: DefenseId) => {
    const engine = engineRef.current;
    const captain = localCaptainEntity();
    if (!engine || !captain) return;
    tryBuyDefense(engine, id, { teamId: captain.teamId, captainId: captain.id });
    setSnapshot(engine.getSnapshot());
  };

  const onBuyUpgrade = (id: "sword" | "shield") => {
    const engine = engineRef.current;
    const captain = localCaptainEntity();
    if (!engine || !captain) return;
    tryBuyUpgrade(engine, id, captain.teamId);
    setSnapshot(engine.getSnapshot());
  };

  const onMarch = () => {
    const engine = engineRef.current;
    const captain = localCaptainEntity();
    if (engine && captain) readyAndMaybeBegin(engine, captain.id);
    if (engine) startMarch(engine);
    setSetupOpen(false);
  };

  const onPlayAgain = () => {
    setMatchGen((value) => value + 1);
    setSetupOpen(true);
    setFormationOpen(false);
    setMapOpen(false);
    setSnapshot(null);
  };

  const switchKit = (next: LoadoutRole) => {
    setKit(next);
    const engine = engineRef.current;
    if (!engine) return;
    for (const entity of engine.entities.values()) {
      if (entity.kind === "captain" && entity.components.control?.playerId === "local") {
        setUnitLoadout(entity, next);
      }
    }
  };

  const local =
    snapshot?.entities.find((entity) => entity.kind === "captain" && entity.components.control?.playerId === "local") ??
    snapshot?.entities.find((entity) => entity.kind === "captain");
  const reaction = local?.components.hitReaction?.state ?? "idle";
  const live = local?.components.control?.enabled ? "on their feet" : "ragdolled";
  const liveSquad = snapshot ? countLiveBots(snapshot, local?.id) : 0;
  const squadLabel = squadCountLabel(liveSquad);
  const shouts = (snapshot?.entities ?? [])
    .map((entity) => entity.components.shout)
    .filter((shout): shout is { text: string; tick: number } => Boolean(shout?.text));

  return (
    <div ref={hostRef} className="relative h-[calc(100dvh-3.5rem)] min-h-[22rem] w-full bg-slate-950">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Shield Wall battlefield"
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="rounded-lg bg-slate-950/55 px-3 py-2 text-xs backdrop-blur">
            <p className="font-semibold tracking-wide">Captain {live}</p>
            <p className="font-semibold tracking-wide">{squadLabel}</p>
            <p className="text-slate-200">Hit: {reaction}</p>
          </div>
          <div className="max-w-sm text-right text-[11px] leading-relaxed text-slate-100/90">
            Click the field to look · WASD / arrows walk · LMB swing · RMB hold/release shoot · Q Formation
            Scroll · M Map Scroll · C Follow · H Hold · R Retreat · 1 shove (
            {DEBUG_IMPULSE_FORCE.stumble}) · 2 knockdown ({DEBUG_IMPULSE_FORCE.knockdown}) · 3 death (
            {DEBUG_IMPULSE_FORCE.death})
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">{snapshot ? renderHudSlots(snapshot) : null}</div>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide ${
                kit === "melee" ? "bg-amber-500 text-slate-950" : "bg-slate-950/70 text-slate-100"
              }`}
              onClick={() => switchKit("melee")}
            >
              Sword
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide ${
                kit === "ranged" ? "bg-amber-500 text-slate-950" : "bg-slate-950/70 text-slate-100"
              }`}
              onClick={() => switchKit("ranged")}
            >
              Bow
            </button>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4 sm:top-24">
        <div className="flex w-full max-w-lg flex-col items-center gap-3">
          {shouts.length > 0 ? (
            <div className="pointer-events-none rounded-md bg-red-900/80 px-3 py-1 text-sm font-bold tracking-wide text-amber-100">
              {shouts[0]!.text}
            </div>
          ) : null}
          <MatchHud snapshot={snapshot} localTeamId={local?.teamId} onPlayAgain={onPlayAgain} />
          <RecruitSetup
            open={setupOpen && playMode !== "sandbox" && phase !== "live" && phase !== "ended"}
            snapshot={snapshot}
            squadCount={liveSquad}
            onRecruit={onRecruit}
            onBuyDefense={onBuyDefense}
            onBuyUpgrade={onBuyUpgrade}
            onMarch={onMarch}
          />
        <CommandHud
          snapshot={snapshot}
          formationOpen={formationOpen}
          mapOpen={mapOpen}
          onIssue={issue}
          onCloseFormation={closeFormation}
          onCloseMap={closeMap}
          onCustomSlot={onCustomSlot}
        />
        </div>
      </div>
    </div>
  );
}
