"use client";

import type { FormationId } from "@/lib/game/data/formations";
import type { Snapshot } from "@/lib/game/sim/types";
import { FormationScroll, type FormationCommand } from "./formation-scroll";
import { registerHudSlot } from "./hud-slots";
import { MapScroll } from "./map-scroll";

type CommandHudProps = {
  snapshot?: Snapshot | null;
  formationOpen: boolean;
  mapOpen: boolean;
  onIssue: (abilityId: FormationCommand) => void;
  onCloseFormation: () => void;
  onCloseMap: () => void;
  onCustomSlot: (slotIndex: number, x: number, z: number) => void;
};

function activeFormationOf(snapshot?: Snapshot | null): FormationId | undefined {
  const captain = snapshot?.entities.find((entity) => entity.kind === "captain");
  return captain?.components.formationLoadout?.activeId;
}

export function CommandHud({
  snapshot,
  formationOpen,
  mapOpen,
  onIssue,
  onCloseFormation,
  onCloseMap,
  onCustomSlot
}: CommandHudProps) {
  return (
    <div className="pointer-events-none flex w-full max-w-md flex-col gap-3">
      <FormationScroll
        open={formationOpen}
        snapshot={snapshot}
        activeFormation={activeFormationOf(snapshot)}
        onIssue={onIssue}
        onClose={onCloseFormation}
        onCustomSlot={onCustomSlot}
      />
      <MapScroll open={mapOpen} snapshot={snapshot} onClose={onCloseMap} />
    </div>
  );
}

registerHudSlot("command-hint", () => (
  <div className="w-fit rounded-lg bg-slate-950/60 px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-100 backdrop-blur">
    Q Formation Scroll · M Map Scroll
  </div>
));
