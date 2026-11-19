import { describe, expect, it } from 'vitest';
import {
  acceptedActions,
  createTick,
  driveStep,
  layoutFor,
  rejectAction,
  stepModeOf,
  teamPlayers,
  teamsInUse,
} from './kit';
import type { ControllerLayout, GameOf, PlayerAction, PlayerInfo } from './kit';
interface Log {
  events: string[];
  round: number;
}
const layout = (state: Log): ControllerLayout => ({
  revision: state.round,
  controls: [
    { kind: 'stick', id: 'move' },
    { kind: 'text', id: 'words', text: 'Hello' },
    {
      kind: 'options',
      id: 'answer',
      options: [
        { id: 'a', label: 'Ayam' },
        { id: 'b', label: 'Bebek', state: 'disabled' },
      ],
    },
    {
      kind: 'grid',
      id: 'cells',
      rows: 1,
      cols: 3,
      cells: [{}, { state: 'disabled' }, { state: 'selected' }],
    },
    {
      kind: 'cards',
      id: 'hand',
      tappable: true,
      cards: [
        { id: 'c1', label: 'Q' },
        { id: 'c2', label: 'K', state: 'disabled' },
      ],
    },
    { kind: 'cards', id: 'shown', cards: [{ id: 'c1', label: 'Q' }] },
    { kind: 'swipe', id: 'flick' },
    { kind: 'options', id: 'skip', audience: 'leader', options: [{ id: 'go', label: 'Skip' }] },
  ],
});
const game = {
  meta: {
    id: 'log',
    name: 'Log',
    blurb: 'Writes down what happens.',
    players: { min: 1, max: 8 },
    teams: 'none',
    coop: false,
    solo: true, localSeat: 'play', midGameJoin: true,
  },
  settings: { fields: [] },
  init: () => ({ events: [], round: 1 }),
  step: (state, inputs) => ({
    ...state,
    events: [
      ...state.events,
      ...inputs.actions.map(
        (action) => `${action.player}:${action.control}:${String(action.value)}`,
      ),
      'step',
    ],
  }),
  join: (state, player) => ({ ...state, events: [...state.events, `join ${player.id}`] }),
  leave: (state, player) => ({ ...state, events: [...state.events, `leave ${player}`] }),
  publicView: (state) => state,
  privateView: () => null,
  controllerLayout: layout,
  isOver: () => false,
  results: () => ({ mode: 'players', players: [] }),
  assets: () => [],
  secrets: () => [],
} satisfies GameOf<Log>;
const tap = (
  control: string,
  value?: string | number,
  player = 'p1',
  revision = 1,
): PlayerAction => ({ player, control, revision, ...(value === undefined ? {} : { value }) });
describe('rejectAction', () => {
  const now = layout({ events: [], round: 1 });
  it('lets through a tap the layout offers', () => {
    expect(rejectAction(now, tap('answer', 'a'), false)).toBeNull();
    expect(rejectAction(now, tap('cells', 0), false)).toBeNull();
    expect(rejectAction(now, tap('cells', 2), false)).toBeNull();
    expect(rejectAction(now, tap('hand', 'c1'), false)).toBeNull();
    expect(rejectAction(now, tap('flick', 'left'), false)).toBeNull();
    expect(rejectAction(now, tap('skip', 'go'), true)).toBeNull();
  });
  it('says why a tap must not reach the game', () => {
    expect(rejectAction(now, tap('answer', 'a', 'p1', 0), false)).toBe(
      'made against revision 0; the layout is now at 1',
    );
    expect(rejectAction(now, tap('nothing', 'a'), false)).toBe(
      'no control "nothing" in the layout',
    );
    expect(rejectAction(now, tap('answer', 'z'), false)).toBe('"answer" has no option "z"');
    expect(rejectAction(now, tap('answer', 'b'), false)).toBe('option "b" is disabled');
    expect(rejectAction(now, tap('answer'), false)).toBe('"answer" has no option undefined');
    expect(rejectAction(now, tap('cells', 3), false)).toBe('"cells" has no cell 3');
    expect(rejectAction(now, tap('cells', 0.5), false)).toBe('"cells" has no cell 0.5');
    expect(rejectAction(now, tap('cells', '0'), false)).toBe('"cells" has no cell "0"');
    expect(rejectAction(now, tap('cells', 1), false)).toBe('cell 1 is disabled');
    expect(rejectAction(now, tap('hand', 'c2'), false)).toBe('card "c2" is disabled');
    expect(rejectAction(now, tap('hand', 'c9'), false)).toBe('"hand" has no card "c9"');
    expect(rejectAction(now, tap('shown', 'c1'), false)).toBe(
      'the cards in "shown" cannot be tapped',
    );
    expect(rejectAction(now, tap('flick', 'sideways'), false)).toBe(
      'a swipe is up, down, left or right, not "sideways"',
    );
    expect(rejectAction(now, tap('skip', 'go'), false)).toBe('"skip" is the leader\'s');
    expect(rejectAction(now, tap('move'), false)).toBe('"move" is a stick; it is not tapped');
    expect(rejectAction(now, tap('words'), false)).toBe('"words" is a text; it is not tapped');
  });
});
describe('layoutFor', () => {
  it("keeps the leader's controls off everyone else's phone", () => {
    const now = layout({ events: [], round: 1 });
    expect(layoutFor(now, true)).toBe(now);
    const others = layoutFor(now, false);
    expect(others.controls.map((control) => control.id)).toEqual([
      'move',
      'words',
      'answer',
      'cells',
      'hand',
      'shown',
      'flick',
    ]);
    expect(others.revision).toBe(1);
    const plain: ControllerLayout = { revision: 3, controls: [{ kind: 'stick', id: 'move' }] };
    expect(layoutFor(plain, false)).toBe(plain);
  });
});
describe('driveStep', () => {
  const start: Log = { events: [], round: 1 };
  const p9: PlayerInfo = { id: 'p9', seat: 2, name: 'Nine', colour: 'seat-2' };
  it('applies leavers, then joiners, then the taps that still fit, then one step', () => {
    const tick = createTick({
      leader: 'p1',
      departed: ['p2'],
      joined: [p9],
      actions: [
        tap('answer', 'a'),
        tap('answer', 'a', 'p1', 0),
        tap('skip', 'go', 'p3'),
        tap('skip', 'go'),
      ],
    });
    expect(driveStep(game, start, tick, 16).events).toEqual([
      'leave p2',
      'join p9',
      'p1:answer:a',
      'p1:skip:go',
      'step',
    ]);
  });
  it('hands the tick itself to step when nothing was dropped, and allocates no list', () => {
    const seen: unknown[] = [];
    const spy: GameOf<Log> = {
      ...game,
      step: (state, inputs) => (seen.push(inputs, inputs.actions), state),
    };
    const quiet = createTick({ leader: 'p1' });
    driveStep(spy, start, quiet, 16);
    expect(seen[0]).toBe(quiet);
    const busy = createTick({ leader: 'p1', actions: [tap('answer', 'a'), tap('cells', 0)] });
    driveStep(spy, start, busy, 16);
    expect(seen[2]).toBe(busy);
    expect(acceptedActions(spy, start, busy)).toBe(busy.actions);
    const stale = createTick({ leader: 'p1', actions: [tap('answer', 'a', 'p1', 7)] });
    driveStep(spy, start, stale, 16);
    expect(seen[5]).toEqual([]);
  });
  it('checks taps against the layout AFTER joins and leaves', () => {
    const afterJoin: GameOf<Log> = { ...game, join: (state) => ({ ...state, round: 2 }) };
    const tick = createTick({
      joined: [p9],
      actions: [tap('answer', 'a', 'p1', 1), tap('answer', 'a', 'p1', 2)],
    });
    expect(driveStep(afterJoin, start, tick, 16).events).toEqual(['p1:answer:a', 'step']);
  });
  it('createTick fills in an empty room', () => {
    const tick = createTick();
    expect([tick.frames.size, tick.actions, tick.leader, tick.joined, tick.departed]).toEqual([
      0,
      [],
      null,
      [],
      [],
    ]);
  });
});
describe('small helpers', () => {
  it('teams are in use when every player has one', () => {
    const a: PlayerInfo = { id: 'a', seat: 1, name: 'A', colour: 'seat-1', team: 0 };
    const b: PlayerInfo = { id: 'b', seat: 2, name: 'B', colour: 'seat-2', team: 1 };
    const c: PlayerInfo = { id: 'c', seat: 3, name: 'C', colour: 'seat-3' };
    expect(teamsInUse([a, b])).toBe(true);
    expect(teamsInUse([a, b, c])).toBe(false);
    expect(teamsInUse([])).toBe(false);
    expect(teamPlayers([a, b, c], 1)).toEqual([b]);
  });
  it('a module that does not say is returns-new', () => {
    expect(stepModeOf({})).toBe('returns-new');
    expect(stepModeOf({ stepMode: 'in-place' })).toBe('in-place');
  });
});
it(
  'delivers the first accepted tap per player per control, with ' +
    'rejected taps consuming no slot',
  () => {
    const actions = [
      tap('answer', 'b'),
      tap('answer', 'a', 'p1', 0),
      tap('answer', 'a'),
      tap('answer', 'a'),
      tap('answer', 'a', 'p2'),
      tap('cells', 0),
      tap('cells', 2),
    ];
    expect(acceptedActions(game, { round: 1, events: [] }, createTick({ actions }))).toEqual([
      actions[2],
      actions[4],
      actions[5],
    ]);
  },
);
it('exports exact step units and forwards per-player connectivity', async () => {
  const { STEPS_PER_SECOND, secondsToSteps } = await import('./index');
  expect(STEPS_PER_SECOND).toBe(60);
  expect(secondsToSteps(0.25)).toBe(15);
  const connected = new Map([
    ['p1', false],
    ['p2', true],
  ]);
  const spy: GameOf<Log> = {
    ...game,
    step: (state, inputs) => {
      expect(inputs.connected).toBe(connected);
      expect(inputs.connected.get('p1')).toBe(false);
      return state;
    },
  };
  driveStep(
    spy,
    { events: [], round: 1 },
    createTick({ connected, disconnected: ['p1'], actions: [tap('answer', 'b')] }),
    1000 / 60,
  );
});

it('strips console START from held, pressed and released without changing SHAKE or borrowed frames', () => {
  const frame = { held: (1 << 10) | (1 << 11), pressed: (1 << 10) | (1 << 11), released: (1 << 10) | (1 << 4), axes: [0.5], seq: 7, age: 0 };
  const original = { ...frame };
  const probe = { ...game, step: (state: Log, inputs: Parameters<typeof game.step>[1]) => {
    expect(inputs.frames.get('p1')).toEqual({ ...frame, held: 1 << 11, pressed: 1 << 11, released: 1 << 4 });
    return state;
  } };
  driveStep(probe, { events: [], round: 0 }, createTick({ frames: new Map([['p1', frame]]) }), 1000 / 60);
  expect(frame).toEqual(original);
});
