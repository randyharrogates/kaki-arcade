// FIXTURE GAME 2: "Picks". Turn-phased, with secrets. Written only to prove the game
// interface and the conformance kit; it is not a product game and lives in no build.
//
// Each round every player secretly taps one number from 1 to 9 on their own phone and locks
// it in. The highest number that nobody else chose wins its value in points. Each round also
// has a sealed bonus number, hidden from everyone: whoever picked it gets 5 more. Picks, the
// bonus and the seal's code are shown only at the reveal. Players who have not picked when
// time runs out get a number drawn from the seed.
//
// `in-place`: a step changes the state it is given and returns it. (The other fixture is
// `returns-new`, so the kit is proved on both.)
import { cloneState, createRng, nextInt } from '@kaki/sim-core';
import type { RngState } from '@kaki/sim-core';
import {
  secondsToSteps,
  stepsToSeconds,
  tapSignature,
} from '../game/kit';
import type {
  ControllerLayout,
  GameModule,
  GridCell,
  JsonValue,
  PrivateView,
  Results,
  Secret,
  StepInputs,
} from '../game/kit';
export interface PicksSettings {
  rounds: 3 | 5 | 7;
  pickSeconds: number;
}
export interface Picker {
  id: string;
  seat: number;
  score: number;
  revision: number;
  pick: number | null;
  locked: boolean;
  /** Joined mid-round: plays from the next one. */
  waiting: boolean;
  gained: number;
  joinedMidGame: boolean;
  viewRevision: number;
}
export interface PicksState {
  rng: RngState;
  settings: PicksSettings;
  labels: string[];
  best: number;
  phase: 'pick' | 'reveal' | 'over';
  round: number;
  leftSteps: number;
  players: Picker[];
  bonusCell: number;
  seal: string;
  ticks: number;
}
function rank<
  Row extends {
    score: number;
  },
>(
  rows: readonly Row[],
): (Row & {
  place: number;
})[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  let place = 0;
  return sorted.map((row, index) => {
    if (index === 0 || row.score !== sorted[index - 1]?.score) place = index + 1;
    return { ...row, place };
  });
}
export const NUMBERS_FILE = 'picks/numbers.json';
export const PICKS_DATA: Record<string, JsonValue> = {
  [NUMBERS_FILE]: { labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
};
const REVEAL_STEPS = secondsToSteps(2);
const BONUS = 5;
const SEAL_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
function sealRound(state: PicksState): void {
  state.bonusCell = nextInt(state.rng, 1, 9);
  let seal = 'seal-';
  for (let i = 0; i < 6; i += 1)
    seal += SEAL_LETTERS.charAt(nextInt(state.rng, 0, SEAL_LETTERS.length - 1));
  state.seal = seal;
}
function reveal(state: PicksState): void {
  const playing = state.players.filter((player) => !player.waiting);
  for (const player of playing) player.pick ??= nextInt(state.rng, 1, 9);
  let winner: Picker | null = null;
  for (const player of playing) {
    const unique = playing.every((other) => other === player || other.pick !== player.pick);
    if (unique && (winner === null || (player.pick ?? 0) > (winner.pick ?? 0))) winner = player;
  }
  for (const player of playing) {
    player.gained =
      (player === winner ? (player.pick ?? 0) : 0) + (player.pick === state.bonusCell ? BONUS : 0);
    player.score += player.gained;
  }
  state.phase = 'reveal';
  state.leftSteps = REVEAL_STEPS;
}
function nextRound(state: PicksState): void {
  if (state.round >= state.settings.rounds) {
    state.phase = 'over';
    state.leftSteps = 0;
    return;
  }
  state.round += 1;
  state.phase = 'pick';
  state.leftSteps = secondsToSteps(state.settings.pickSeconds);
  for (const player of state.players) {
    player.pick = null;
    player.locked = false;
    player.waiting = false;
    player.gained = 0;
  }
  sealRound(state);
}
function stepRules(state: PicksState, inputs: StepInputs): PicksState {
  if (state.phase === 'over') return state;
  for (const action of inputs.actions) {
    const player = state.players.find((candidate) => candidate.id === action.player);
    if (action.control === 'next' && state.phase === 'reveal') state.leftSteps = 0;
    if (player === undefined || player.waiting || state.phase !== 'pick' || player.locked) continue;
    if (action.control === 'numbers' && typeof action.value === 'number')
      player.pick = action.value + 1;
    if (action.control === 'lock' && player.pick !== null) player.locked = true;
  }
  state.leftSteps -= 1;
  if (state.phase === 'pick') {
    const playing = state.players.filter((player) => !player.waiting);
    if (state.leftSteps <= 0 || (playing.length > 0 && playing.every((player) => player.locked)))
      reveal(state);
  } else if (state.leftSteps <= 0) nextRound(state);
  return state;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function picksStep(state: PicksState, inputs: StepInputs, dtMs: number): PicksState {
  const before = state.players.map((player) =>
    tapSignature(picks.controllerLayout(state, player.id)),
  );
  const privateBefore = state.players.map((player) =>
    JSON.stringify(picks.privateView(state, player.id)?.blocks),
  );
  state.ticks += 1;
  stepRules(state, inputs);
  state.players.forEach((player, i) => {
    if (tapSignature(picks.controllerLayout(state, player.id)) !== before[i]) player.revision += 1;
    if (JSON.stringify(picks.privateView(state, player.id)?.blocks) !== privateBefore[i])
      player.viewRevision += 1;
  });
  return state;
}
export function picksSecrets(state: PicksState): Secret[] {
  if (state.phase !== 'pick') return [];
  const secrets: Secret[] = [
    { owner: null, label: 'the seal', value: state.seal },
    {
      owner: null,
      label: 'the bonus number',
      value: state.bonusCell,
      match: (value, path) => /bonus/i.test(path) && value === state.bonusCell,
    },
  ];
  for (const player of state.players) {
    const pick = player.pick;
    if (!player.waiting)
      secrets.push({
        owner: player.id,
        label: `${player.id}'s pick`,
        value: pick,
        match: (value, path) => pick !== null && /pick/i.test(path) && value === pick,
      });
  }
  return secrets;
}
export const picks: GameModule<PicksState, PicksSettings> = {
  meta: {
    id: 'fixture-picks',
    name: 'Picks',
    blurb: 'Pick the highest number nobody else picks.',
    players: { min: 1, max: 8 },
    teams: 'none',
    coop: false,
    solo: true, localSeat: 'play', midGameJoin: true,
  },
  stepMode: 'in-place',
  settings: {
    fields: [
      {
        kind: 'choice',
        id: 'rounds',
        label: 'Rounds',
        options: [
          { value: 3, label: '3' },
          { value: 5, label: '5' },
          { value: 7, label: '7' },
        ],
        default: 3,
      },
      {
        kind: 'number',
        id: 'pickSeconds',
        label: 'Time to pick',
        min: 2,
        max: 20,
        step: 1,
        default: 4,
        unit: 's',
      },
    ],
  },
  preload: () => [{ key: NUMBERS_FILE, kind: 'data' }],
  init(seed, players, settings, context) {
    const file = context.data[NUMBERS_FILE] as {
      labels: string[];
    };
    const saved = context.saved as {
      best?: number;
    } | null;
    const state: PicksState = {
      rng: createRng(seed),
      settings: { ...settings },
      labels: [...file.labels],
      best: saved?.best ?? 0,
      phase: 'pick',
      round: 1,
      leftSteps: secondsToSteps(settings.pickSeconds),
      players: players.map((player) => ({
        id: player.id,
        seat: player.seat,
        score: 0,
        revision: 0,
        pick: null,
        locked: false,
        waiting: false,
        gained: 0,
        joinedMidGame: false,
        viewRevision: 0,
      })),
      bonusCell: 0,
      seal: '',
      ticks: 0,
    };
    sealRound(state);
    return state;
  },
  step: picksStep,
  join(state, player) {
    if (!state.players.some((candidate) => candidate.id === player.id)) {
      state.players.push({
        id: player.id,
        seat: player.seat,
        score: 0,
        revision: 0,
        pick: null,
        locked: false,
        waiting: state.phase !== 'over',
        gained: 0,
        joinedMidGame: state.ticks > 0,
        viewRevision: 0,
      });
      state.players.sort((a, b) => a.seat - b.seat);
    }
    return state;
  },
  leave(state, player) {
    const index = state.players.findIndex((candidate) => candidate.id === player);
    if (index !== -1) state.players.splice(index, 1);
    return state;
  },
  publicView(state) {
    const shown = state.phase !== 'pick';
    return {
      phase: state.phase,
      round: state.round,
      rounds: state.settings.rounds,
      secondsLeft: stepsToSeconds(state.leftSteps),
      players: state.players.map((player) => ({
        id: player.id,
        seat: player.seat,
        score: player.score,
        locked: player.locked,
        waiting: player.waiting,
        ...(shown ? { pick: player.pick, gained: player.gained } : {}),
      })),
      ...(shown ? { bonusCell: state.bonusCell, seal: state.seal } : {}),
    };
  },
  privateView(state, id): PrivateView | null {
    const player = state.players.find((candidate) => candidate.id === id);
    if (player === undefined || player.waiting) return null;
    if (state.phase === 'pick')
      return {
        revision: player.viewRevision,
        blocks: [
          {
            kind: 'stat',
            label: 'Your pick',
            value: player.pick === null ? 'none yet' : String(player.pick),
          },
        ],
      };
    return {
      revision: player.viewRevision,
      blocks: [
        {
          kind: 'stat',
          label: 'Your pick',
          value: player.pick === null ? 'none' : String(player.pick),
        },
        { kind: 'stat', label: 'Points this round', value: player.gained },
        { kind: 'stat', label: 'Total', value: player.score },
      ],
    };
  },
  controllerLayout(state, id): ControllerLayout {
    const player = state.players.find((candidate) => candidate.id === id);
    const rev = player?.revision ?? 0;
    if (state.phase === 'over')
      return {
        revision: rev,
        controls: [{ kind: 'text', id: 'done', text: 'Look at the TV', tone: 'title' }],
      };
    if (player === undefined || player.waiting)
      return {
        revision: rev,
        controls: [{ kind: 'text', id: 'wait', text: 'You are in from the next round' }],
      };
    if (state.phase === 'reveal') {
      return {
        revision: rev,
        controls: [
          { kind: 'text', id: 'look', text: 'Look at the TV' },
          {
            kind: 'options',
            id: 'next',
            audience: 'leader',
            options: [{ id: 'go', label: 'Next round' }],
          },
        ],
      };
    }
    if (player.locked)
      return {
        revision: rev,
        controls: [{ kind: 'text', id: 'locked', text: 'Locked in', tone: 'title' }],
      };
    const cells: GridCell[] = state.labels.map((label, index) =>
      player.pick === index + 1 ? { label, state: 'selected' } : { label },
    );
    return {
      revision: rev,
      controls: [
        { kind: 'text', id: 'ask', text: 'Pick a number' },
        { kind: 'grid', id: 'numbers', rows: 3, cols: 3, cells },
        {
          kind: 'options',
          id: 'lock',
          options: [
            { id: 'go', label: 'Lock in', state: player.pick === null ? 'disabled' : 'plain' },
          ],
        },
      ],
    };
  },
  isOver: (state) => state.phase === 'over',
  results(state): Results {
    const players = rank(
      state.players.map((player) => ({
        id: player.id,
        score: player.score,
        joinedMidGame: player.joinedMidGame,
      })),
    );
    const top = players[0]?.score ?? 0;
    const results: Results = {
      mode: 'players',
      players,
      extras: { best: Math.max(state.best, top) },
    };
    return results;
  },
  save: (state) => ({ best: Math.max(state.best, ...state.players.map((player) => player.score)) }),
  assets: () => [{ key: 'picks/numbers.png', kind: 'image' }],
  secrets: picksSecrets,
  // Everything hidden from `viewer` becomes something else it could have been.
  scrambleSecrets(state, viewer, salt) {
    if (state.phase !== 'pick') return state;
    const other = cloneState(state);
    const shift = (value: number): number => ((value - 1 + salt) % 9) + 1;
    other.bonusCell = shift(other.bonusCell);
    other.seal = `seal-${'ZYXWVT'.slice(salt)}${'BCDFGH'.slice(0, salt)}`;
    for (const player of other.players) {
      // Whether someone has locked in is public; what they chose, and whether an unlocked player
      // has chosen yet, is not.
      if (player.id !== viewer && !player.waiting)
        player.pick = player.locked
          ? shift(player.pick ?? 1)
          : player.pick === null
            ? salt
            : salt === 1
              ? null
              : shift(player.pick);
    }
    return other;
  },
};
