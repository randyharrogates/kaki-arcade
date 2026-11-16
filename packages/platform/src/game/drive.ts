// The one way a game is stepped (PLAT-030, PLAT-032). The host, the dev harness, the bots
// and the conformance kit all call `driveStep`, so a game meets the same order of events
// everywhere and a recording of ticks replays exactly.
//
// A tick is everything that happened in the room since the previous step: the sampled held
// inputs, the taps, who leads, whose phone is away, who joined and who left. Order within a
// step:
//
//   1. everyone in `departed` leaves (`module.leave`), in order;
//   2. everyone in `joined` joins (`module.join`), in order;
//   3. each tap, in arrival order, is checked against the layout the game returns for the
//      state as it now is (`rejectAction`), and dropped if it does not fit or if an earlier
//      tap from the same player on the same control was already let through in this step;
//   4. `module.step` runs once.
//
// All taps of a step are checked against the SAME layout, the one for the state before the
// step: nothing a tap does can change what the next tap in the same step is checked against.
// That is why rule 3 lets only the first tap per player per control through, and why a game
// must still check its own state between two taps of one player on different controls.
//
// Pausing is not a tick: while the room is paused the host simply does not call this. The
// same holds while the match is short of players (`GameModule.leave`).
import type { SampledInput } from '@kaki/sim-core';
import { BUTTON } from './types';
import { rejectAction } from './layout';
import type { GameOf, PlayerAction, PlayerId, PlayerInfo, StepInputs } from './types';
/** One step's worth of room events. A superset of `StepInputs`. */
export interface Tick extends StepInputs {
  readonly joined: readonly PlayerInfo[];
  readonly departed: readonly PlayerId[];
}
const NO_FRAMES: ReadonlyMap<PlayerId, SampledInput> = new Map();
const NOTHING: readonly never[] = Object.freeze([]);
/** A tick in which nothing happened, optionally with some parts filled in. */
export function createTick(parts: Partial<Tick> = {}): Tick {
  return {
    frames: parts.frames ?? NO_FRAMES,
    actions: parts.actions ?? NOTHING,
    leader: parts.leader ?? null,
    disconnected: parts.disconnected ?? NOTHING,
    connected: parts.connected ?? new Map(),
    joined: parts.joined ?? NOTHING,
    departed: parts.departed ?? NOTHING,
  };
}
/** Steps 1 and 2: the leavers, then the joiners. Returns the state `step` will be given. */
export function applyMembership<State>(module: GameOf<State>, state: State, tick: Tick): State {
  let current = state;
  for (const id of tick.departed) current = module.leave(current, id);
  for (const player of tick.joined) current = module.join(current, player);
  return current;
}
/**
 * Step 3: the taps that reach the game. Returns the same array when all of them do, so a
 * step with no dropped tap allocates nothing.
 */
export function acceptedActions<State>(
  module: GameOf<State>,
  state: State,
  tick: StepInputs,
): readonly PlayerAction[] {
  const actions = tick.actions;
  let kept: PlayerAction[] | null = null;
  for (let i = 0; i < actions.length; i += 1) {
    const action = actions[i];
    if (action === undefined) continue;
    const layout = module.controllerLayout(state, action.player);
    let refused = rejectAction(layout, action, action.player === tick.leader) !== null;
    if (!refused) {
      // Only the first tap per player per control in one step.
      const through: readonly PlayerAction[] = kept ?? actions;
      const count = kept === null ? i : kept.length;
      for (let j = 0; j < count && !refused; j += 1) {
        const earlier = through[j];
        refused = earlier?.player === action.player && earlier.control === action.control;
      }
    }
    if (refused && kept === null) kept = actions.slice(0, i);
    else if (!refused && kept !== null) kept.push(action);
  }
  return kept ?? actions;
}
/** Steps 3 and 4, for a caller that has applied membership itself. */
export function stepChecked<State>(
  module: GameOf<State>,
  state: State,
  tick: StepInputs,
  dtMs: number,
): State {
  // START belongs to the console, including its press/release edges. Borrowed frames stay untouched.
  let frames: Map<PlayerId, SampledInput> | undefined;
  const mask = ~(1 << BUTTON.START);
  for (const [id, frame] of tick.frames) {
    if (((frame.held | frame.pressed | frame.released) & ~mask) !== 0) {
      frames ??= new Map(tick.frames);
      frames.set(id, { ...frame, held: frame.held & mask,
        pressed: frame.pressed & mask, released: frame.released & mask });
    }
  }
  if (frames !== undefined) tick = { ...tick, frames };
  if (tick.actions.length === 0) return module.step(state, tick, dtMs);
  const actions = acceptedActions(module, state, tick);
  if (actions === tick.actions) return module.step(state, tick, dtMs);
  return module.step(
    state,
    {
      frames: tick.frames,
      actions,
      leader: tick.leader,
      disconnected: tick.disconnected,
      connected: tick.connected,
    },
    dtMs,
  );
}
/** Runs one whole tick: membership, tap checking, one `step`. */
export function driveStep<State>(
  module: GameOf<State>,
  state: State,
  tick: Tick,
  dtMs: number,
): State {
  const current =
    tick.departed.length === 0 && tick.joined.length === 0
      ? state
      : applyMembership(module, state, tick);
  return stepChecked(module, current, tick, dtMs);
}
