// Game-shaped harness subject, not a product game (PLAT-030, NFR-TEST).
import type { GameModule, PlayerInfo } from '../game/types';
import { BUTTON } from '../game/types';
interface State {
  tick: number; length: number; phase: string; paused: boolean; secret: string; cards: Record<string, string>;
  players: { info: PlayerInfo; score: number; joinedMidGame: boolean }[];
}
export const phasedFixture: GameModule<State, { length: number }> = {
  meta: { id: 'harness-fixture', name: 'Harness fixture', blurb: 'Phases, secrets and teams.',
    players: { min: 1, max: 8 }, teams: 'optional', coop: false, solo: true },
  settings: { fields: [{ kind: 'number', id: 'length', label: 'Length', min: 12, max: 60, step: 12, default: 12 }] },
  init(seed, players, settings, context) {
    return { tick: 0, length: settings.length, phase: 'prepare', paused: false,
      secret: `${String(seed)}-${JSON.stringify(context.data)}-${String(settings.length)}`,
      cards: Object.fromEntries(players.map((p) => [p.id, `private-${p.id}-card-${String(seed)}`])),
      players: players.map((info) => ({ info, score: 0, joinedMidGame: false })) };
  },
  step(state, inputs) {
    if (state.phase === 'over') return state;
    const tick = state.tick + 1;
    const players = state.players.map((p) => {
      const frame = inputs.frames.get(p.info.id);
      if (frame && ((frame.held | frame.pressed | frame.released) & (1 << BUTTON.START))) throw new Error('pause reached game');
      const gain = inputs.actions.filter((a) => a.player === p.info.id).length + (frame?.pressed ? 1 : 0);
      return gain ? { ...p, score: p.score + gain } : p;
    });
    return { ...state, players, tick, phase: tick < state.length / 4 ? 'prepare' : tick < state.length * 3 / 4 ? 'pick' : tick < state.length ? 'reveal' : 'over' };
  },
  join: (state, info) => ({ ...state, cards: { ...state.cards, [info.id]: `private-${info.id}-joined-card` }, players: [...state.players, { info, score: 0, joinedMidGame: state.tick > 0 }] }),
  leave: (state, id) => ({ ...state, players: state.players.filter((p) => p.info.id !== id) }),
  pause: (state) => ({ ...state, paused: true }), resume: (state) => ({ ...state, paused: false }),
  publicView: (state) => ({ phase: state.phase, tick: state.tick, scores: state.players.map((p) => p.score),
    ...(state.phase === 'reveal' || state.phase === 'over' ? { revealed: state.secret, cards: state.cards } : {}) }),
  privateView: (state, id) => ({ revision: 0, blocks: [{ kind: 'text', text: state.cards[id] ?? 'No card' },
    { kind: 'text', text: 'Leader hint', audience: 'leader' }] }),
  controllerLayout: (state) => ({ revision: state.phase === 'pick' ? 1 : 2, controls: [
    { kind: 'stick', id: 'move' }, { kind: 'button', id: 'confirm', button: 'face-bottom', label: 'Confirm' },
    ...(state.phase === 'pick' ? [{ kind: 'options' as const, id: 'pick', options: [
      { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No', state: 'disabled' as const },
    ] }, { kind: 'options' as const, id: 'lead', audience: 'leader' as const, options: [{ id: 'go', label: 'Go' }] }] : []),
  ] }),
  isOver: (state) => state.phase === 'over',
  results: (state) => {
    const teams = state.players.some((p) => p.info.team !== undefined);
    const totals = ([0, 1] as const).map((team) => ({ team,
      score: state.players.filter((p) => p.info.team === team).reduce((sum, p) => sum + p.score, 0),
    }));
    return { mode: teams ? 'teams' : 'players', players: state.players.map((p) => ({
      id: p.info.id, score: p.score, place: 1 + state.players.filter((other) => other.score > p.score).length,
      joinedMidGame: p.joinedMidGame,
    })).sort((a, b) => a.place - b.place), ...(teams ? { teams: totals.map((row) => ({ ...row,
      place: 1 + totals.filter((other) => other.score > row.score).length,
    })).sort((a, b) => a.place - b.place) } : {}) };
  },
  assets: () => [], secrets: (state) => state.phase === 'reveal' || state.phase === 'over' ? [] : [{ owner: null, label: 'answer', value: state.secret }, ...state.players.map((p) => ({ owner: p.info.id, label: 'private card', value: state.cards[p.info.id] ?? 'No card' }))],
  scrambleSecrets: (state, viewer, salt) => state.phase === 'reveal' || state.phase === 'over' ? state : ({
    ...state, secret: `other-${String(salt)}`, cards: Object.fromEntries(Object.entries(state.cards).map(([id, card]) =>
      [id, id === viewer ? card : `other-private-${id}-${String(salt)}`])),
  }),
};
