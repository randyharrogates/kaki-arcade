import type { GameModule, GameMeta, PlayerInfo } from '@kaki/platform';

export const consoleE2eMeta: GameMeta = {
  id: 'console-e2e', name: 'Console test', blurb: 'Development console integration fixture.',
  players: { min: 1, max: 8 }, teams: 'none', coop: true, solo: true, midGameJoin: false,
};
export interface State { players: readonly PlayerInfo[]; counts: Record<string, number>; secrets: Record<string, string>; steps: number; joined: readonly string[] }
export const consoleE2e: GameModule<State, Record<string, never>, { steps: number; total: number }> = {
  meta: consoleE2eMeta,
  tinyStateReason: 'Eight integer counters and a step count only.',
  settings: { fields: [] },
  init: (seed, players) => ({ players, counts: Object.fromEntries(players.map(p => [p.id, 0])), secrets: Object.fromEntries(players.map(p => [p.id, `Secret ${p.id} seed ${String(seed)}`])), steps: 0, joined: [] }),
  step(state, inputs) {
    let counts = state.counts;
    for (const action of inputs.actions) if (action.control === 'advance' && Object.hasOwn(counts, action.player)) counts = { ...counts, [action.player]: (counts[action.player] ?? 0) + 1 };
    return { ...state, counts, steps: state.steps + 1 };
  },
  join: (state, player) => state.players.some(p => p.id === player.id) ? state : { ...state, players: [...state.players, player], joined: state.steps > 0 ? [...state.joined, player.id] : state.joined, counts: { ...state.counts, [player.id]: 0 }, secrets: { ...state.secrets, [player.id]: `Secret ${player.id}` } },
  leave: (state, id) => ({ ...state, players: state.players.filter(p => p.id !== id) }),
  publicView: state => ({ steps: state.steps, total: Object.values(state.counts).reduce((a, b) => a + b, 0) }),
  privateView: (state, id) => ({ revision: state.counts[id] ?? 0, blocks: [{ kind: 'text', text: state.secrets[id] ?? 'Waiting' }, { kind: 'stat', label: 'Your inputs', value: state.counts[id] ?? 0 }] }),
  controllerLayout: () => ({ revision: 1, controls: [{ kind: 'options', id: 'advance', size: 'large', options: [{ id: 'advance', label: 'Advance' }] }] }),
  isOver: state => state.steps >= 36000 || Object.values(state.counts).reduce((a, b) => a + b, 0) >= 16,
  results: state => ({ mode: 'coop', score: Object.values(state.counts).reduce((a, b) => a + b, 0), players: state.players.map(p => ({ id: p.id, score: Object.values(state.counts).reduce((a, b) => a + b, 0), place: 1, joinedMidGame: state.joined.includes(p.id) })) }),
  assets: () => [],
  secrets: state => state.players.map(p => ({ owner: p.id, label: 'Private text', value: state.secrets[p.id] ?? '' })),
  scrambleSecrets: (state, viewer, salt) => ({ ...state, secrets: Object.fromEntries(Object.entries(state.secrets).map(([id, secret]) => [id, id === viewer ? secret : `${secret} scrambled ${String(salt)}`])) }),
};
export function ConsoleE2eScreen({ view }: { view: { steps: number; total: number }; width: number; height: number }) {
  return <main class="screen room-status" aria-label="Console test game"><h1>Console test</h1><p>Steps <output data-console-step>{view.steps}</output></p><p>Inputs <output data-console-total>{view.total}</output></p></main>;
}
