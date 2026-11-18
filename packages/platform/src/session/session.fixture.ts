// Game-shaped test support, kept out of the public entry point.
import type { GameModule, PlayerInfo, StepInputs, InitContext } from '../game/types';
import type { ControllerLayout, PrivateView } from '../game/layout';
export interface FixtureState {
  seed: number;
  step: number;
  players: readonly PlayerInfo[];
  actions: string[];
  presses: number;
  held: number;
  paused: boolean;
  data: InitContext['data'];
}
const layouts: readonly ControllerLayout[] = [0, 1, 2].map(revision => ({ revision,
  controls: [{ kind: 'options', id: 'pick', options: [{ id: 'yes', label: `Phase ${String(revision)}` },
    { id: 'no', label: 'No' }] }, { kind: 'swipe', id: 'move' }, { kind: 'dpad', id: 'pad' }] }));
export const fixture: GameModule<FixtureState, { steps: number }, { step: number }> = {
  meta: { id: 'session-fixture', name: 'Session fixture', blurb: 'Test', players: { min: 1, max: 8 },
    teams: 'optional', coop: false, solo: true, midGameJoin: true },
  settings: { fields: [{ kind: 'number', id: 'steps', label: 'Steps', min: 1, max: 100000, step: 1, default: 30 }] },
  init(seed, players, settings, context) {
    return { seed, step: -settings.steps, players, actions: [], presses: 0, held: 0, paused: false, data: context.data };
  },
  step(s, input: StepInputs) {
    let presses = s.presses; let held = 0;
    for (const f of input.frames.values()) { presses += f.pressed; held |= f.held; }
    return { ...s, step: s.step + 1, presses, held,
      actions: [...s.actions, ...input.actions.map(a => `${a.player}:${a.control}:${String(a.value)}`)] };
  },
  join(s, p) { return { ...s, players: [...s.players, p] }; },
  leave(s, p) { return { ...s, players: s.players.filter(x => x.id !== p) }; },
  pause(s) { return { ...s, paused: true }; },
  resume(s) { return { ...s, paused: false }; },
  publicView(s) { return { step: s.step }; },
  controllerLayout(s) { return layouts[Math.max(0, Math.min(2, Math.floor((s.step + 30) / 10)))] ?? { revision: 0, controls: [] }; },
  privateView(s, id): PrivateView {
    return { revision: s.paused ? 1 : 0, blocks: [{ kind: 'text', text: `private-${id}-${String(s.seed)}` }] };
  },
  isOver(s) { return s.step >= 0; },
  results(s) { return { mode: 'players', players: s.players.map(p => ({ id: p.id, score: 0, place: 1, joinedMidGame: false })) }; },
  assets() { return []; },
  secrets(s) { return [{ owner: null, label: 'hidden', value: `unrevealed-${String(s.seed)}` },
    ...s.players.map(p => ({ owner: p.id, label: 'private', value: `private-${p.id}-${String(s.seed)}` }))]; },
  scrambleSecrets(s) { return { ...s, seed: s.seed + 1 }; },
};
