import { createRng, nextFloat, nextInt } from '@kaki/sim-core';
import type { RngState } from '@kaki/sim-core';
import { rejectAction } from '../game/layout';
import type { ControllerLayout } from '../game/layout';
import type { PlayerInfo } from '../game/types';
import type { Match } from './match';
import type { NamedButton } from './scripts';
import { positiveSteps } from './scripts';
export interface BotOptions {
  seed: number;
  pressDisabled?: boolean;
  weights?: Partial<Record<'idle' | 'tap' | 'stick' | 'button' | 'tilt' | 'shake', number>>;
  /** Probability per attempted step; joins restore a departed player in the same seat. */
  chaos?: { probability: number; join?: number; leave?: number; disconnect?: number; reconnect?: number };
}
interface Choice { weight: number; act: () => void }
function choose(rng: RngState, choices: Choice[]): void {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return;
  let value = nextFloat(rng) * total;
  for (const choice of choices) { value -= choice.weight; if (value < 0) { choice.act(); return; } }
}
/** All legal taps, including only enabled values. Validation remains owned by the layout. */
export function offeredTaps(layout: ControllerLayout): { control: string; value: string | number }[] {
  return layout.controls.flatMap((control) => {
    let values: (string | number)[] = [];
    if (control.kind === 'options') values = control.options.map((o) => o.id);
    if (control.kind === 'grid') values = control.cells.map((_, i) => i);
    if (control.kind === 'cards' && control.tappable) values = control.cards.map((c) => c.id);
    if (control.kind === 'swipe') values = ['up', 'down', 'left', 'right'];
    return values.filter((value) => rejectAction(layout, { player: '', control: control.id, value, revision: layout.revision }, true) === null ||
      rejectAction(layout, { player: '', control: control.id, value, revision: layout.revision }, false) === null)
      .map((value) => ({ control: control.id, value }));
  });
}
/** Keep this controller across calls: its random stream and chaos history are independent of batching. */
export function createBots<State, Settings extends object, View>(match: Match<State, Settings, View>, options: BotOptions) {
  const rng = createRng(options.seed);
  const weights = { idle: 3, tap: 2, stick: 2, button: 1, tilt: 1, shake: 1, ...options.weights };
  const chaos = options.chaos;
  for (const value of [...Object.values(weights), ...Object.values(chaos ?? {})]) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('bot weights must be finite and non-negative');
  }
  if (chaos && chaos.probability > 1) throw new RangeError('chaos probability must be from 0 to 1');

  const departed: PlayerInfo[] = [];
  function tick(): void {
    const away = new Set(match.disconnected);
    if (chaos && nextFloat(rng) < chaos.probability) {
      const players = match.players;
      const connected = players.filter((p) => !away.has(p.id));
      const gone = players.filter((p) => away.has(p.id));
      const candidates: Choice[] = [];
      if (connected.length) {
        const p = connected[nextInt(rng, 0, connected.length - 1)];
        if (p) {
          candidates.push({ weight: chaos.disconnect ?? 1, act: () => { match.disconnect(p.id); away.add(p.id); } });
          candidates.push({ weight: chaos.leave ?? 1, act: () => { match.leave(p.id); departed.push(p); away.delete(p.id); } });
        }
      }
      const returning = departed.find((p) => !players.some((other) => other.seat === p.seat || other.id === p.id));
      if (returning) candidates.push({ weight: chaos.join ?? 1, act: () => { match.join(returning); departed.splice(departed.indexOf(returning), 1); } });
      const reconnect = gone[nextInt(rng, 0, Math.max(0, gone.length - 1))];
      if (reconnect) candidates.push({ weight: chaos.reconnect ?? 1, act: () => { match.reconnect(reconnect.id); away.delete(reconnect.id); } });
      choose(rng, candidates);
    }
    for (const player of match.players) {
      if (away.has(player.id)) continue;
      const id = player.id, layout = match.layoutFor(id);
      const choices: Choice[] = [{ weight: weights.idle, act: () => undefined }];
      match.stick(id, 0, 0, true); match.tilt(id, 0, 0, true); match.release(id, 'shake');
      // Release last step's held controls, including those a phase change removed.
      for (const button of ['faceBottom', 'faceRight', 'faceLeft', 'faceTop', 'shoulderLeft', 'shoulderRight', 'up', 'down', 'left', 'right'] as const) match.release(id, button);
      for (const tap of offeredTaps(layout)) choices.push({ weight: weights.tap, act: () => { match.tap(id, tap.control, tap.value); } });
      for (const control of layout.controls) {
        if (control.kind === 'tilt') choices.push({ weight: weights.tilt, act: () => { match.tilt(id, nextFloat(rng) * 2 - 1, nextFloat(rng) * 2 - 1); } });
        if (control.kind === 'shake') choices.push({ weight: weights.shake, act: () => { match.press(id, 'shake'); } });
        if (control.kind === 'stick') choices.push({ weight: weights.stick, act: () => { match.stick(id, nextFloat(rng) * 2 - 1, nextFloat(rng) * 2 - 1); } });
        if (control.kind === 'button' && (!control.disabled || options.pressDisabled)) choices.push({ weight: weights.button, act: () => { match.press(id, control.button); } });
        if (control.kind === 'dpad') choices.push({ weight: weights.button, act: () => { match.press(id, (['up', 'down', 'left', 'right'] as const)[nextInt(rng, 0, 3)] as NamedButton); } });
      }
      choose(rng, choices);
    }
    match.step();
  }
  return { step(n = 1) { positiveSteps(n); for (let i = 0; i < n; i += 1) tick(); } };
}
