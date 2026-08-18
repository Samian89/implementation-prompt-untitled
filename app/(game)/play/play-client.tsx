"use client";

import dynamic from "next/dynamic";

const PlayCanvas = dynamic(
  () => import("@/components/game/play-canvas").then((mod) => mod.PlayCanvas),
  { ssr: false }
);

export default function PlayClient() {
  return <PlayCanvas />;
}
