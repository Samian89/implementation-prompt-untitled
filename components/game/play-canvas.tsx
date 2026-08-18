"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createEngine,
  DEBUG_IMPULSE_FORCE,
  emptyInput,
  INPUT_BUTTON,
  setUnitLoadout,
  spawnPlaySandbox,
  type LoadoutRole,
  type SimEngine,
  type Snapshot
} from "@/lib/game";
import {
  createCombatFeedback,
  disposeCombatFeedback,
  syncCombatFeedback
} from "./combat-feedback";
import { renderHudSlots } from "./hud-slots";
import { createCameraRig, stepThirdPersonCamera } from "./third-person-camera";
import { countLiveBots, squadCountLabel } from "./squad-count-hud";
import {
  createUnitPropMeshes,
  disposeUnitPropMeshes,
  syncEntityBones,
  syncUnitPropMeshes,
  type UnitPropMeshes
} from "./unit-appearance";

export function PlayCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimEngine | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [kit, setKit] = useState<LoadoutRole>("melee");

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const engine = createEngine({ seed: 7 });
    spawnPlaySandbox(engine);
    engineRef.current = engine;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87a0b8, 1);
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87a0b8, 18, 70);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const rig = createCameraRig({ x: 0, y: 0, z: 0, yaw: 0 });

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x3f4f3a, 1.05));
    const sun = new THREE.DirectionalLight(0xfff4d6, 0.95);
    sun.position.set(8, 14, 6);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 48),
      new THREE.MeshStandardMaterial({ color: 0x4d5d3f, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(36, 18, 0x6b7d58, 0x5a6b4a);
    grid.position.y = 0.01;
    scene.add(grid);

    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(18, 2.2, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.85 })
    );
    wall.position.set(0, 1.1, -10);
    scene.add(wall);

    const boneMeshes = new Map<string, THREE.Mesh>();
    const propMeshes = new Map<string, UnitPropMeshes>();
    const combatFx = createCombatFeedback();

    const keys = new Set<string>();
    let lookYaw = 0;
    let lookPitch = -0.12;
    let pendingButtons = 0;
    let drawingBow = false;
    let hudFrame = 0;
    let raf = 0;
    let acc = 0;
    let last = performance.now();

    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === "Digit1") pendingButtons |= INPUT_BUTTON.debugImpulse10;
      if (event.code === "Digit2") pendingButtons |= INPUT_BUTTON.debugImpulse35;
      if (event.code === "Digit3") pendingButtons |= INPUT_BUTTON.debugImpulse60;
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
      const captain = snap.entities.find((entity) => entity.kind === "captain");
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
      for (const mesh of boneMeshes.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      }
      for (const props of propMeshes.values()) {
        disposeUnitPropMeshes(props);
      }
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      wall.geometry.dispose();
      (wall.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

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

  const local = snapshot?.entities.find((entity) => entity.kind === "captain");
  const reaction = local?.components.hitReaction?.state ?? "idle";
  const live = local?.components.control?.enabled ? "on their feet" : "ragdolled";
  const squadLabel = snapshot ? squadCountLabel(countLiveBots(snapshot, local?.id)) : squadCountLabel(0);

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
            Click the field to look · WASD / arrows walk · LMB swing · RMB hold/release shoot · 1 shove (
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
    </div>
  );
}
