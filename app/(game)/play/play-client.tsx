"use client";

import dynamic from "next/dynamic";
import "@/components/game/squad-count-hud";

const PlayCanvas = dynamic(
  () => import("@/components/game/play-canvas").then((mod) => mod.PlayCanvas),
  { ssr: false }
);

export default function PlayClient() {
  return <PlayCanvas />;
}
