import type { RoomState } from '@kaki/platform';
export type PadAction = { type: 'clear' | 'leave' } | { type: 'join'; index: number } | { type: 'key'; key: string };
/** Caller owns reusable history and output buffers. Binding is committed only after join succeeds. */
export function gamepadPoll(previous: boolean[][], pads: readonly (Gamepad | null)[], binding: number | undefined, phase: RoomState['phase'], actions: PadAction[] = []): PadAction[] {
  actions.length = 0;
  if (binding !== undefined && !pads[binding]) actions.push({ type: 'clear' });
  for (let index = 0; index < pads.length; index++) {
    const pad = pads[index];
    if (!pad) { previous[index]?.fill(false); continue; }
    const history = previous[index] ?? (previous[index] = []);
    for (let button = 0; button < pad.buttons.length; button++) {
      const pressed = pad.buttons[button]?.pressed ?? false;
      if (pressed && !history[button] && pad.mapping === 'standard') {
        if (binding === undefined && phase === 'lobby' && button === 9) actions.push({ type: 'join', index: pad.index });
        if (binding === pad.index) {
          if (button === 9 && phase === 'playing') actions.push({ type: 'key', key: 'Escape' });
          else if (button === 8) actions.push({ type: 'leave' });
          else if (phase !== 'playing') {
            const key = button === 0 ? 'Enter' : button === 1 ? 'Escape' : button === 12 ? 'ArrowUp' : button === 13 ? 'ArrowDown' : button === 14 ? 'ArrowLeft' : button === 15 ? 'ArrowRight' : null;
            if (key) actions.push({ type: 'key', key });
          }
        }
      }
      history[button] = pressed;
    }
  }
  return actions;
}

const presentPad = (pad: Gamepad | null): boolean => pad !== null;
const standardPad = (pad: Gamepad | null): boolean => pad?.mapping === 'standard';
/** Connection events own the timer; idle hosts never query pads each frame. */
export function watchGamepads(
  target: Pick<Window, 'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'>,
  source: Pick<Navigator, 'getGamepads'>,
  tick: (pads: readonly (Gamepad | null)[]) => void,
  connected: (value: boolean) => void,
): () => void {
  let timer: number | undefined;
  let standard = false;
  const refresh = (): void => {
    const pads = source.getGamepads();
    const next = pads.some(standardPad);
    if (next !== standard) { standard = next; connected(next); }
    if (pads.some(presentPad)) {
      timer ??= target.setInterval(poll, 1000 / 60);
    } else if (timer !== undefined) { target.clearInterval(timer); timer = undefined; }
  };
  const poll = (): void => { tick(source.getGamepads()); };
  target.addEventListener('gamepadconnected', refresh);
  target.addEventListener('gamepaddisconnected', refresh);
  refresh();
  return () => {
    target.removeEventListener('gamepadconnected', refresh);
    target.removeEventListener('gamepaddisconnected', refresh);
    if (timer !== undefined) target.clearInterval(timer);
  };
}
