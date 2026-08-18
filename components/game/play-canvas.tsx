"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createEngine,
  DEBUG_IMPULSE_FORCE,
  emptyInput,
  INPUT_BUTTON,
  spawnCaptain,
  type Snapshot
} from "@/lib/game";
import { renderHudSlots } from "./hud-slots";
import { createCameraRig, stepThirdPersonCamera } from "./third-person-camera";

const BONE_COLORS: Record<string, number> = {
  pelvis: 0x7f1d1d,
  torso: 0xb91c1c,
  head: 0xf1c7a3,
  upperArmL: 0x64748b,
  upperArmR: 0x64748b,
  lowerArmL: 0x94a3b8,
  lowerArmR: 0x94a3b8,
  upperLegL: 0x334155,
  upperLegR: 0x334155,
  lowerLegL: 0x1e293b,
  lowerLegR: 0x1e293b
};

export function PlayCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const engine = createEngine({ seed: 7 });
    spawnCaptain(engine, { playerId: "local", x: 0, z: 0 });

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

    const keys = new Set<string>();
    let lookYaw = 0;
    let lookPitch = -0.12;
    let pendingButtons = 0;
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
    const onClick = () => {
      void canvas.requestPointerLock();
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
        for (const bone of Object.values(ragdoll.bones)) {
          const key = `${entity.id}:${bone.id}`;
          let mesh = boneMeshes.get(key);
          if (!mesh) {
            const geo = new THREE.CapsuleGeometry(bone.radius, Math.max(0.08, bone.length * 0.7), 3, 8);
            const mat = new THREE.MeshStandardMaterial({
              color: BONE_COLORS[bone.id] ?? 0x888888,
              roughness: 0.55,
              metalness: bone.id === "head" ? 0 : 0.18
            });
            mesh = new THREE.Mesh(geo, mat);
            boneMeshes.set(key, mesh);
            scene.add(mesh);
          }
          mesh.position.set(bone.x, bone.y, bone.z);
          mesh.quaternion.set(bone.qx, bone.qy, bone.qz, bone.qw);
        }
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
    canvas.addEventListener("click", onClick);
    raf = requestAnimationFrame(frame);
    setSnapshot(engine.getSnapshot());

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      for (const mesh of boneMeshes.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      }
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      wall.geometry.dispose();
      (wall.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  const local = snapshot?.entities.find((entity) => entity.kind === "captain");
  const reaction = local?.components.hitReaction?.state ?? "idle";
  const live = local?.components.control?.enabled ? "on their feet" : "ragdolled";

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
            <p className="text-slate-200">Hit: {reaction}</p>
          </div>
          <div className="max-w-sm text-right text-[11px] leading-relaxed text-slate-100/90">
            Click the field to look · WASD / arrows walk · 1 shove ({DEBUG_IMPULSE_FORCE.stumble}) · 2
            knockdown ({DEBUG_IMPULSE_FORCE.knockdown}) · 3 death ({DEBUG_IMPULSE_FORCE.death})
          </div>
        </div>
        <div className="flex flex-col gap-2">{snapshot ? renderHudSlots(snapshot) : null}</div>
      </div>
    </div>
  );
}
