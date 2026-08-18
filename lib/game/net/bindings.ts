export type LocalBinding = {
  playerIndex: number;
  playerId: string;
  title: string;
  detail: string;
  up: readonly string[];
  down: readonly string[];
  left: readonly string[];
  right: readonly string[];
  lookLeft: readonly string[];
  lookRight: readonly string[];
  lookUp: readonly string[];
  lookDown: readonly string[];
  usesMouse: boolean;
};

export const LOCAL_BINDINGS: readonly LocalBinding[] = [
  {
    playerIndex: 0,
    playerId: "p1",
    title: "Captain 1",
    detail: "WASD + mouse",
    up: ["KeyW"],
    down: ["KeyS"],
    left: ["KeyA"],
    right: ["KeyD"],
    lookLeft: [],
    lookRight: [],
    lookUp: [],
    lookDown: [],
    usesMouse: true
  },
  {
    playerIndex: 1,
    playerId: "p2",
    title: "Captain 2",
    detail: "IJKL + numpad 8/4/6/2 or ; '",
    up: ["KeyI"],
    down: ["KeyK"],
    left: ["KeyJ"],
    right: ["KeyL"],
    lookLeft: ["Numpad4", "Semicolon"],
    lookRight: ["Numpad6", "Quote"],
    lookUp: ["Numpad8"],
    lookDown: ["Numpad2"],
    usesMouse: false
  },
  {
    playerIndex: 2,
    playerId: "p3",
    title: "Captain 3",
    detail: "TFGH + [ ]",
    up: ["KeyT"],
    down: ["KeyG"],
    left: ["KeyF"],
    right: ["KeyH"],
    lookLeft: ["BracketLeft"],
    lookRight: ["BracketRight"],
    lookUp: [],
    lookDown: [],
    usesMouse: false
  },
  {
    playerIndex: 3,
    playerId: "p4",
    title: "Captain 4",
    detail: "Arrows + , .",
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    lookLeft: ["Comma"],
    lookRight: ["Period"],
    lookUp: [],
    lookDown: [],
    usesMouse: false
  }
];

export function bindingForPlayer(playerId: string, index: number): LocalBinding {
  return LOCAL_BINDINGS[index] ?? { ...LOCAL_BINDINGS[0]!, playerId, playerIndex: index };
}

export function sampleMove(
  keys: ReadonlySet<string>,
  binding: LocalBinding
): { moveX: number; moveY: number } {
  let moveX = 0;
  let moveY = 0;
  if (binding.left.some((code) => keys.has(code))) moveX -= 1;
  if (binding.right.some((code) => keys.has(code))) moveX += 1;
  if (binding.up.some((code) => keys.has(code))) moveY += 1;
  if (binding.down.some((code) => keys.has(code))) moveY -= 1;
  return { moveX, moveY };
}

export function sampleLookDelta(keys: ReadonlySet<string>, binding: LocalBinding, step = 0.045): {
  yaw: number;
  pitch: number;
} {
  let yaw = 0;
  let pitch = 0;
  if (binding.lookLeft.some((code) => keys.has(code))) yaw += step;
  if (binding.lookRight.some((code) => keys.has(code))) yaw -= step;
  if (binding.lookUp.some((code) => keys.has(code))) pitch += step * 0.6;
  if (binding.lookDown.some((code) => keys.has(code))) pitch -= step * 0.6;
  return { yaw, pitch };
}

export function battlefieldLabel(captainNumber: number): string {
  return `Captain ${captainNumber} battlefield`;
}
