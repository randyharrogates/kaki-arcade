import { must } from './invariant';
import type { ControllerLayout, JsonValue, PrivateView, Results, Secret } from '@kaki/platform';
import { STEPS_PER_SECOND } from '@kaki/platform';
import { cardCode, rankOf, suitOf } from './cards';
import { HAND_NAMES } from './evaluator';
import { rankedHands } from './round';
import type { State } from './state';

export function controllerLayout(state: State, id: string): ControllerLayout {
  const p = state.players.find((p) => p.info.id === id);
  const revision = p?.revision ?? 0;
  if (p === undefined || p.waiting) {
    return { revision, controls: [{ kind: 'text', id: 'wait', text: 'You join at the next round' }] };
  }
  if (state.phase === 'pick' && !p.locked) {
    return { revision, controls: [
      { kind: 'grid', id: 'grid', rows: 4, cols: 4,
        cells: Array.from({ length: 16 }, (_, i) => ({
          faceDown: true, state: p.picks.includes(i) ? 'selected' : 'plain',
        })),
      },
      { kind: 'options', id: 'lock', size: 'large', options: [{
        id: 'go', label: 'Lock in', state: p.picks.length === 2 ? 'plain' : 'disabled',
      }] },
    ] };
  }
  if (state.phase === 'reveal') return { revision, controls: [] };
  const text = state.phase === 'memorise' ? 'Watch the TV' :
    state.phase === 'swap' ? 'Watch the TV' : state.phase === 'pick' ? 'Locked in' :
    state.phase === 'scoreboard' ? 'Scores on the TV' : 'Match over';
  return { revision, controls: [{ kind: 'text', id: 'watch', text, tone: 'title' }] };
}

export function privateView(state: State, id: string): PrivateView | null {
  const p = state.players.find((p) => p.info.id === id);
  if (p === undefined) return null;
  const revision = p.viewRevision;
  if (state.phase === 'scoreboard' || state.phase === 'over') return { revision, blocks: [
    { kind: 'stat', label: 'Place', value: `${state.players.some(other => other !== p && other.score === p.score) ? '=' : ''}${String(1 + state.players.filter(other => other.score > p.score).length)}` },
    { kind: 'stat', label: 'Score', value: p.score },
  ] };
  if (p.waiting) return null;
  if (state.phase === 'memorise') {
    return { revision, blocks: [
      { kind: 'stat', label: 'Seconds', value: Math.ceil(state.left / STEPS_PER_SECOND) },
    ] };
  }
  if (state.phase === 'pick' && p.locked) return { revision, blocks: [
    { kind: 'text', text: 'Watch the TV for the reveal' },
  ] };
  if (state.phase !== 'reveal' || p.hand === null) return null;
  return { revision, blocks: [
    { kind: 'cards', cards: [...p.picks.map((i) => must(state.grid[i])), ...state.shared]
      .map((card, i) => ({
        id: `card-${String(i)}`, label: rankOf(card) === 10 ? '10' : cardCode(card).charAt(0),
        mark: must(['club', 'diamond', 'heart', 'spade'][suitOf(card)]),
      })) },
    { kind: 'text', text: must(HAND_NAMES[p.hand.category]) },
    { kind: 'stat', label: 'Points', value: p.gained },
    ...(p.filled ? [{ kind: 'text' as const, text: 'Missing picks were filled at random', tone: 'note' as const }] : []),
  ] };
}

export function publicView(state: State) {
  const revealed = state.phase === 'reveal' || state.phase === 'scoreboard' || state.phase === 'over';
  const faceUp = revealed || (state.phase === 'memorise' && !state.paused);
  return {
    soloBest: state.recordable && state.solo && state.players.length === 1 ? state.bestAtStart : null,
    newBest: false,
    phase: state.phase, round: state.round, totalRounds: state.settings.rounds,
    seconds: Math.ceil(state.left / STEPS_PER_SECOND),
    grid: faceUp ? state.grid.map(cardCode) : null,
    shared: state.shared.map(cardCode),
    swap: state.phase === 'swap' ? state.swaps[state.swapIndex] ?? null : null,
    players: state.players.map((p) => ({
      id: p.info.id, name: p.info.name, seat: p.info.seat, colour: p.info.colour, score: p.score,
      waiting: p.waiting, locked: p.locked,
      picks: revealed && !p.waiting ? p.picks : null,
    })),
    standings: state.phase === 'scoreboard' ? results(state).players : [],
    hands: revealed ? rankedHands(state).map((p) => ({
      id: p.info.id, name: must(HAND_NAMES[must(p.hand).category]), points: p.gained,
      cards: [...p.picks.map((i) => must(state.grid[i])), ...state.shared].map(cardCode),
    })) : [],
  };
}

export function results(state: State): Results {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  let place = 0;
  return { mode: 'players', players: sorted.map((p, i) => {
    if (i === 0 || p.score !== sorted[i - 1]?.score) place = i + 1;
    return { id: p.info.id, score: p.score, place, joinedMidGame: p.joinedMidGame };
  }) };
}

export function secrets(state: State): Secret[] {
  if (state.phase === 'reveal' || state.phase === 'scoreboard' || state.phase === 'over') return [];
  // Stop declaring faces while the screen discloses them; re-declare the hidden
  // mapping after the flip. This checks current payloads, not players' memories.
  const faces: Secret[] = state.phase === 'memorise' && !state.paused ? [] :
    state.grid.map((card, i) => ({
      owner: null, label: `Grid face ${String(i)}`, value: cardCode(card),
    }));
  return [...faces, ...state.players.filter((p) => p.picks.length > 0).map((p) => ({
    owner: p.info.id, label: `${p.info.id} picks`, value: p.picks,
    match: (value: JsonValue, path: string) =>
      path.includes('picks') && value !== null,
  }))];
}

export function scrambleSecrets(state: State, viewer: string | null, salt: number): State {
  if (state.phase === 'reveal' || state.phase === 'scoreboard' || state.phase === 'over') return state;
  const offset = 1 + Math.abs(salt) % 15;
  const hidden = state.phase !== 'memorise' || state.paused;
  const grid = hidden ? state.grid.map((_, i) => must(state.grid[(i + offset) % 16])) : state.grid;
  return { ...state, grid, players: state.players.map((p) =>
    p.info.id === viewer || p.picks.length === 0 ? p : {
      ...p, picks: p.picks.map((i) => (i + offset) % 16),
    }) };
}

/** PP-012, DATA-002: called only after the shell confirms a successful write (D-195). */
export function savedView(view: ReturnType<typeof publicView>, state: State): ReturnType<typeof publicView> {
  return state.recordable && state.solo && state.players.length === 1 && state.phase === 'over'
    && (state.players[0]?.score ?? 0) > state.bestAtStart ? { ...view, newBest: true } : view;
}
