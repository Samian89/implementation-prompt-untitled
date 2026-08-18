import { registerData } from "./registry";

export const COMMAND_FOLLOW = "command.follow";
export const COMMAND_CALL_TO_ARMS = "command.callToArms";
export const COMMAND_HOLD = "command.hold";
export const COMMAND_RETREAT = "command.retreat";
export const COMMAND_FORM_WEDGE = "command.form.wedge";
export const COMMAND_FORM_LINE = "command.form.line";
export const COMMAND_FORM_BOX = "command.form.box";
export const COMMAND_FORM_CUSTOM = "command.form.custom";

export type CommandAbilityId =
  | typeof COMMAND_FOLLOW
  | typeof COMMAND_CALL_TO_ARMS
  | typeof COMMAND_HOLD
  | typeof COMMAND_RETREAT
  | typeof COMMAND_FORM_WEDGE
  | typeof COMMAND_FORM_LINE
  | typeof COMMAND_FORM_BOX
  | typeof COMMAND_FORM_CUSTOM;

export type CommandAbilityDef = {
  id: CommandAbilityId;
  kind: "command";
  cooldownTicks: number;
};

export const COMMAND_ABILITY_IDS: CommandAbilityId[] = [
  COMMAND_FOLLOW,
  COMMAND_CALL_TO_ARMS,
  COMMAND_HOLD,
  COMMAND_RETREAT,
  COMMAND_FORM_WEDGE,
  COMMAND_FORM_LINE,
  COMMAND_FORM_BOX,
  COMMAND_FORM_CUSTOM
];

export const COMMAND_ABILITIES: Record<CommandAbilityId, CommandAbilityDef> = {
  [COMMAND_FOLLOW]: { id: COMMAND_FOLLOW, kind: "command", cooldownTicks: 0 },
  [COMMAND_CALL_TO_ARMS]: { id: COMMAND_CALL_TO_ARMS, kind: "command", cooldownTicks: 0 },
  [COMMAND_HOLD]: { id: COMMAND_HOLD, kind: "command", cooldownTicks: 0 },
  [COMMAND_RETREAT]: { id: COMMAND_RETREAT, kind: "command", cooldownTicks: 0 },
  [COMMAND_FORM_WEDGE]: { id: COMMAND_FORM_WEDGE, kind: "command", cooldownTicks: 0 },
  [COMMAND_FORM_LINE]: { id: COMMAND_FORM_LINE, kind: "command", cooldownTicks: 0 },
  [COMMAND_FORM_BOX]: { id: COMMAND_FORM_BOX, kind: "command", cooldownTicks: 0 },
  [COMMAND_FORM_CUSTOM]: { id: COMMAND_FORM_CUSTOM, kind: "command", cooldownTicks: 0 }
};

registerData("commandAbilities", COMMAND_ABILITIES);

export function isCommandAbilityId(id: string): id is CommandAbilityId {
  return (COMMAND_ABILITY_IDS as string[]).includes(id);
}

export function getCommandAbilityDef(id: string): CommandAbilityDef | undefined {
  if (!isCommandAbilityId(id)) return undefined;
  return COMMAND_ABILITIES[id];
}

export function listCommandAbilityIds(): CommandAbilityId[] {
  return COMMAND_ABILITY_IDS.slice();
}
