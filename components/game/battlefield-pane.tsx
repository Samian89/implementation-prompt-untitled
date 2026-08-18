"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Snapshot } from "@/lib/game/sim/types";
import { findHumanCaptain } from "@/lib/game/net/session";
import {
  createCombatFeedback,
  disposeCombatFeedback,
  syncCombatFeedback
} from "./combat-feedback";
import { createFortView, disposeFortView, syncFortView } from "./fort-view";
import { createCameraRig, stepThirdPersonCamera } from "./third-person-camera";
import {
  createUnitPropMeshes,
  disposeUnitPropMeshes,
  syncEntityBones,
  syncUnitPropMeshes,
  type UnitPropMeshes
} from "./unit-appearance";
import { createWorldView, disposeWorldView } from "./world-view";

export type BattlefieldPaneProps = {
  snapshot: Snapshot | null;
  playerId: string;
  ariaLabel: string;
  className?: string;
  onPointerLook?: (deltaX: number, deltaY: number) => void;
  capturePointer?: boolean;
};

export function BattlefieldPane({
  snapshot,
  playerId,
  ariaLabel,
  className,
  onPointerLook,
  capturePointer = false
}: BattlefieldPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  const playerRef = useRef(playerId);
  const lookRef = useRef(onPointerLook);
  snapshotRef.current = snapshot;
  playerRef.current = playerId;
  lookRef.current = onPointerLook;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87a0b8, 1);

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

    const boneMeshes = new Map<string, THREE.Mesh>();
    const propMeshes = new Map<string, UnitPropMeshes>();
    const combatFx = createCombatFeedback();
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const width = host.clientWidth || 320;
      const height = host.clientHeight || 180;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!capturePointer || document.pointerLockElement !== canvas) return;
      lookRef.current?.(event.movementX, event.movementY);
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!capturePointer) return;
      if (document.pointerLockElement !== canvas && event.button === 0) {
        void canvas.requestPointerLock();
      }
    };

    const frame = (now: number) => {
      const elapsed = Math.min(0.08, (now - last) / 1000);
      last = now;
      const snap = snapshotRef.current;
      if (snap) {
        const captain = findHumanCaptain(snap.entities, playerRef.current);
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
        for (const entity of snap.entities) {
          if (!entity.components.ragdoll) continue;
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
          syncUnitPropMeshes(props, entity.components.ragdoll, appearance);
        }
        syncCombatFeedback(scene, combatFx, snap);
        syncFortView(fortView, snap);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      disposeCombatFeedback(combatFx);
      disposeWorldView(worldView);
      disposeFortView(fortView);
      for (const mesh of boneMeshes.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      }
      for (const props of propMeshes.values()) disposeUnitPropMeshes(props);
      renderer.dispose();
    };
  }, [capturePointer]);

  return (
    <div ref={hostRef} className={className ?? "relative h-full min-h-[10rem] w-full bg-slate-950"}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label={ariaLabel}
      />
    </div>
  );
}
