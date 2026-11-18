import { must } from './invariant';
import { describe, expect, it } from 'vitest';
import { createRng, nextInt, hashState } from '@kaki/sim-core';
import {
  createTick, driveStep, EMPTY_SETUP, STEP_MS, secondsToSteps, defaultSettings,
} from '@kaki/platform';
import type { PlayerAction } from '@kaki/platform';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker as game } from './game';
import type { Settings, State } from './state';
import { cardCode } from './cards';
import { evaluate, HAND_POINTS } from './evaluator';
import { difficulty, MEMORISE_SECONDS, rankedHands, reveal, SWAP_STEPS } from './round';

function init(count = 2, rounds: 3 | 5 | 7 = 3): State {
  return game.init(42, makePlayers(count, false), { rounds }, EMPTY_SETUP);
}
function tick(state: State, actions: readonly PlayerAction[] = []): State {
  const leader = state.players[0]?.info.id ?? null;
  return driveStep(game, state, createTick({ actions, leader }), STEP_MS);
}
function advance(state: State, steps: number): State {
  for (let i = 0; i < steps; i += 1) state = tick(state);
  return state;
}
function tap(state: State, player: string, control: string, value: string | number): State {
  const revision = game.controllerLayout(state, player).revision;
  return tick(state, [{ player, control, value, revision }]);
}
function pickPhase(state = init()): State {
  while (state.phase !== 'pick') state = tick(state);
  return state;
}
function choose(state: State, id: string): State {
  return tap(tap(state, id, 'grid', 0), id, 'grid', 1);
}

describe('Peek Poker pure rules', () => {
  it('PP-001 leader settings offer only 3, 5, 7 rounds and default to 5', () => {
    expect(typeof game.settings).toBe('object');
    expect(defaultSettings(game.settings as Parameters<typeof defaultSettings<Settings>>[0]))
      .toEqual({ rounds: 5 });
  });
  it.each([3, 5, 7] as const)('PP-001 %i rounds sum scores and rank ties equally', (rounds) => {
    let state = init(2, rounds);
    const totals = [0, 0];
    let previous = '';
    for (let i = 0; i < 30000 && !game.isOver(state); i += 1) {
      state = tick(state);
      const phase = `${String(state.round)}-${state.phase}`;
      if (state.phase === 'reveal' && phase !== previous) {
        state.players.forEach((p, j) => { totals[j] = must(totals[j]) + p.gained; });
      }
      previous = phase;
    }
    expect(game.isOver(state)).toBe(true);
    expect(state.round).toBe(rounds);
    expect(state.players.map((p) => p.score)).toEqual(totals);
    const tied = { ...state, players: state.players.map((p) => ({ ...p, score: 9 })) };
    expect(game.results(tied).players.map((p) => p.place)).toEqual([1, 1]);
  });
  it('PP-002 deals 16 plus 3 unique standard cards deterministically each round', () => {
    const state = init();
    expect(state.grid).toHaveLength(16);
    expect(state.shared).toHaveLength(3);
    expect(new Set([...state.grid, ...state.shared]).size).toBe(19);
    expect(init()).toEqual(state);
    const later = advance(state, secondsToSteps(53));
    expect(later.round).toBe(2);
    expect(later.grid).not.toEqual(state.grid);
  });
  it('PP-003 PP-004 exact 20-second memorise window and shared faces throughout', () => {
    const state = init();
    const almost = advance(state, secondsToSteps(20) - 1);
    expect(game.publicView(almost).grid).not.toBeNull();
    const hidden = tick(almost);
    expect(hidden.phase).toBe('pick');
    expect(game.publicView(hidden).grid).toBeNull();
    expect(game.publicView(hidden).shared).toEqual(game.publicView(state).shared);
    expect(game.publicView(advance(hidden, secondsToSteps(20))).shared)
      .toEqual(game.publicView(state).shared);
  });
  it('PP-005 PP-006 tap selects/deselects, limits to two; players may share both cards', () => {
    let state = pickPhase();
    state = tap(state, 'p1', 'grid', 0);
    state = tap(state, 'p1', 'grid', 0);
    expect(must(state.players[0]).picks).toEqual([]);
    state = choose(state, 'p1');
    state = tap(state, 'p1', 'grid', 2);
    expect(must(state.players[0]).picks).toEqual([0, 1]);
    state = choose(state, 'p2');
    expect(must(state.players[1]).picks).toEqual([0, 1]);
    expect(game.publicView(state).players.every((p) => p.picks === null)).toBe(true);
    expect(game.results(state).players.every((p) => p.extras === undefined)).toBe(true);
    expect(game.controllerLayout(state, 'p2').controls.some((c) => c.kind === 'dpad')).toBe(false);
  });
  it('PP-005 PP-022 lock before pick in one step cannot alter a locked selection', () => {
    let state = choose(pickPhase(), 'p1');
    const revision = must(state.players[0]).revision;
    state = tick(state, [
      { player: 'p1', control: 'lock', value: 'go', revision },
      { player: 'p1', control: 'grid', value: 0, revision },
    ]);
    expect(must(state.players[0]).picks).toEqual([0, 1]);
    expect(must(state.players[0]).lockOrder).toBe(0);
    expect(state.phase).toBe('pick');
    state = choose(state, 'p2');
    state = tap(state, 'p2', 'lock', 'go');
    expect(state.phase).toBe('reveal');
    expect(must(state.players[1]).lockOrder).toBe(1);
  });
  it('PP-007 reveal uses exactly the two picked grid cards and three shared cards', () => {
    const state = reveal(choose(pickPhase(), 'p1'));
    const cards = [must(state.grid[0]), must(state.grid[1]), ...state.shared];
    expect(must(state.players[0]).hand).toEqual(evaluate(cards));
    expect(game.publicView(state).hands.find((p) => p.id === 'p1')?.cards)
      .toEqual(cards.map(cardCode));
    expect(must(game.publicView(state).hands[0]).cards).toHaveLength(5);
    expect(must(must(game.privateView(state, 'p1')).blocks[0]).kind).toBe('cards');
  });
  it('PP-009 seed 7 all-unlocked best tie scores equally at expiry', () => {
    let state = game.init(7, makePlayers(2, false), { rounds: 3 }, EMPTY_SETUP);
    state = choose(choose(pickPhase(state), 'p1'), 'p2');
    state = advance(state, state.left);
    expect(state.phase).toBe('reveal');
    expect(state.players.map((p) => p.gained)).toEqual(state.players.map((p) =>
      must(HAND_POINTS[must(p.hand).category]) + 1));
  });
  it.each([false, true])('PP-009 solo best bonus requires explicit lock (%s)', (locked) => {
    let state = choose(pickPhase(init(1)), 'p1');
    state = locked ? tap(state, 'p1', 'lock', 'go') : advance(state, state.left);
    const player = must(state.players[0]);
    expect(player.gained).toBe(must(HAND_POINTS[must(player.hand).category]) + (locked ? 3 : 1));
  });
  it('PP-009 lone random-filled best earns only +1', () => {
    const state = reveal(pickPhase(init(1)));
    const player = must(state.players[0]);
    expect(player.filled).toBe(true);
    expect(player.gained).toBe(must(HAND_POINTS[must(player.hand).category]) + 1);
  });
  it('PP-032 reveal is eight seconds then standings last five seconds, including final round', () => {
    let state = init(1);
    for (let round = 1; round <= 3; round += 1) {
      state = pickPhase(state);
      expect(state.left).toBe(secondsToSteps(20));
      state = advance(state, state.left);
      expect(state.left).toBe(secondsToSteps(8));
      state = advance(state, state.left - 1);
      expect(state.phase).toBe('reveal');
      state = tick(state);
      expect(state.phase).toBe('scoreboard');
      expect(state.left).toBe(secondsToSteps(5));
      expect(game.publicView(state).standings).toEqual(game.results(state).players);
      state = advance(state, state.left - 1);
      expect(state.phase).toBe('scoreboard');
      state = tick(state);
      expect(state.phase).toBe(round === 3 ? 'over' : 'memorise');
    }
  });
  it('PP-013 before-first-step join plays round one without mid-game mark', () => {
    let state = game.join(init(1), must(makePlayers(2, false)[1]));
    expect(must(state.players[1]).waiting).toBe(false);
    expect(must(state.players[1]).joinedMidGame).toBe(false);
    state = choose(choose(pickPhase(state), 'p1'), 'p2');
    expect(must(state.players[1]).picks).toEqual([0, 1]);
  });
  it('PP-022 waiting pick joiner does not block everyone locked in', () => {
    let state = game.join(choose(pickPhase(init(1)), 'p1'), must(makePlayers(2, false)[1]));
    state = tap(state, 'p1', 'lock', 'go');
    expect(state.phase).toBe('reveal');
    expect(must(state.players[1]).hand).toBeNull();
    expect(must(state.players[1]).score).toBe(0);
  });
  it('PP-005 private revision follows displayed seconds and stays stable during reveal', () => {
    let state = init();
    const before = game.privateView(state, 'p1');
    state = advance(state, 59);
    expect(game.privateView(state, 'p1')).toEqual(before);
    state = tick(state);
    expect(must(game.privateView(state, 'p1')).revision).toBeGreaterThan(must(before).revision);
    state = reveal(choose(pickPhase(state), 'p1'));
    expect(game.privateView(tick(state), 'p1')).toEqual(game.privateView(state, 'p1'));
  });
  it('PP-009 tied best hands award +3 to first lock and +1 to others', () => {
    let state = choose(choose(pickPhase(), 'p1'), 'p2');
    state = tap(state, 'p2', 'lock', 'go');
    state = tap(state, 'p1', 'lock', 'go');
    expect(must(state.players[1]).gained - must(state.players[0]).gained).toBe(2);
  });
  it('PP-008 PP-009 equal hands put the higher-seat speed winner first', () => {
    let state = choose(choose(pickPhase(), 'p1'), 'p2');
    state = tap(state, 'p2', 'lock', 'go');
    state = tap(state, 'p1', 'lock', 'go');
    expect(must(state.players[1]).gained - must(state.players[0]).gained).toBe(2);
    expect(game.publicView(state).hands.map(p => p.id)).toEqual(['p2', 'p1']);
  });
  it('PP-008 PP-009 equal +1 hands follow lock order before seat order', () => {
    let state = pickPhase(init(3));
    for (const id of ['p1', 'p2', 'p3']) state = choose(state, id);
    for (const id of ['p1', 'p3', 'p2']) state = tap(state, id, 'lock', 'go');
    expect(must(state.players[1]).gained).toBe(must(state.players[2]).gained);
    expect(game.publicView(state).hands.map(p => p.id)).toEqual(['p1', 'p3', 'p2']);
  });
  it('PP-008 PP-010 random-filled equal hands follow locked hands with equal points', () => {
    let state = pickPhase(init(3));
    // Preview only the random player's fill, then let both locked players pick that hand.
    const picks = must(reveal({ ...state, players: [must(state.players[0])] }).players[0]).picks;
    state = { ...state, players: state.players.map((p, i) => i === 0 ? p : {
      ...p, picks: [...picks], locked: true, lockOrder: i - 1,
    }) };
    state = reveal(state);
    expect(must(state.players[0]).filled).toBe(true);
    expect(must(state.players[0]).hand).toEqual(must(state.players[2]).hand);
    expect(must(state.players[0]).gained).toBe(must(state.players[2]).gained);
    expect(game.publicView(state).hands.map(p => p.id)).toEqual(['p2', 'p3', 'p1']);
  });
  it('PP-008 PP-010 a random fill follows an unlocked full pick with an equal hand (D-261)', () => {
    let state = pickPhase(init(2));
    const picks = must(reveal({ ...state, players: [must(state.players[0])] }).players[0]).picks;
    // p2 picked the same two cards in full but never locked; p1 is filled at random.
    state = { ...state, players: state.players.map((p, i) => i === 0 ? p : { ...p, picks: [...picks] }) };
    state = reveal(state);
    expect(must(state.players[0]).filled).toBe(true);
    expect(must(state.players[1]).filled).toBe(false);
    expect(state.players.every(p => p.lockOrder === null)).toBe(true);
    expect(must(state.players[0]).hand).toEqual(must(state.players[1]).hand);
    expect(must(state.players[0]).gained).toBe(must(state.players[1]).gained);
    expect(game.publicView(state).hands.map(p => p.id)).toEqual(['p2', 'p1']);
  });
  it('PP-008 equal hands, points and lock order fall back to seat order', () => {
    let state = reveal(choose(choose(pickPhase(), 'p1'), 'p2'));
    state = { ...state, players: [...state.players].reverse() };
    expect(state.players.every(p => p.lockOrder === null)).toBe(true);
    expect(state.players[0]?.gained).toBe(state.players[1]?.gained);
    expect(rankedHands(state).map(p => p.info.id)).toEqual(['p1', 'p2']);
  });
  it('PP-009 bonus compares kickers, not only hand category; random fills are slowest', () => {
    let state = pickPhase();
    state = { ...state, grid: [12, 11, 10, 9, ...state.grid.slice(4)], shared: [0, 16, 33] };
    state = { ...state, players: state.players.map((p, i) => ({
      ...p, picks: i === 0 ? [0, 1] : [2, 3], locked: true, lockOrder: i,
    })) };
    const shown = reveal(state);
    expect(must(shown.players[0]).gained).toBe(4);
    expect(must(shown.players[1]).gained).toBe(1);
    const same = { ...state, players: state.players.map((p, i) => ({
      ...p, picks: [0, 1], lockOrder: i === 0 ? null : 1, locked: i !== 0,
    })) };
    expect(reveal(same).players.map((p) => p.gained)).toEqual([2, 4]);
  });
  it('PP-009 random completion loses a tied best speed bonus to an explicit lock', () => {
    let state = pickPhase();
    state = { ...state, players: state.players.map((p, i) => ({
      ...p, picks: i === 1 ? [0] : [],
    })) };
    const preview = reveal(state);
    const picks = must(preview.players[1]).picks;
    state = { ...state, players: state.players.map((p, i) => i === 0 ? {
      ...p, picks: [...picks], locked: true, lockOrder: 0,
    } : p) };
    // Only p2 consumes random draws in the actual reveal, so derive its fill separately.
    const onlySecond = { ...state, players: [must(state.players[1])] };
    const actualPicks = must(reveal(onlySecond).players[0]).picks;
    state = { ...state, players: state.players.map((p, i) => i === 0 ? {
      ...p, picks: [...actualPicks],
    } : p) };
    const shown = reveal(state);
    expect(must(shown.players[1]).filled).toBe(true);
    expect(must(shown.players[0]).gained - must(shown.players[1]).gained).toBe(2);
  });
  it('PP-010 timeout preserves existing picks and fills only missing distinct positions', () => {
    let state = tap(pickPhase(), 'p1', 'grid', 9);
    state = advance(state, state.left - 1);
    expect(state.phase).toBe('pick');
    state = tick(state);
    expect(state.phase).toBe('reveal');
    expect(must(state.players[0]).picks[0]).toBe(9);
    for (const p of state.players) {
      expect(p.picks).toHaveLength(2);
      expect(new Set(p.picks).size).toBe(2);
      expect(p.filled).toBe(true);
    }
  });
  it.each([3, 5, 7] as const)('PP-011 exact ramp and sequential twists in %i rounds', (rounds) => {
    let state = init(1, rounds);
    for (let round = 1; round <= rounds; round += 1) {
      expect(state.phase).toBe('memorise');
      const row = difficulty(round, rounds);
      expect(state.left).toBe(secondsToSteps(must(MEMORISE_SECONDS[row])));
      const shared = state.shared;
      const grid = state.grid;
      state = advance(state, state.left);
      const count = row < 2 ? 0 : row < 4 ? 1 : row === 4 ? 2 : 3;
      expect(state.swaps).toHaveLength(count);
      for (let i = 0; i < count; i += 1) {
        expect(state.phase).toBe('swap');
        expect(game.publicView(state).grid).toBeNull();
        const swap = must(state.swaps[i]);
        expect(swap.kind).toBe(row === 3 ? 'rows' : 'cards');
        expect(swap.from).not.toBe(swap.to);
        const before = state.grid;
        state = advance(state, SWAP_STEPS);
        const width = swap.kind === 'rows' ? 4 : 1;
        for (let j = 0; j < width; j += 1) {
          expect(state.grid[swap.to * width + j]).toBe(before[swap.from * width + j]);
        }
      }
      expect(state.phase).toBe('pick');
      expect([...state.grid].sort((a, b) => a - b)).toEqual([...grid].sort((a, b) => a - b));
      expect(state.shared).toEqual(shared);
      state = advance(state, state.left);
      state = advance(state, state.left);
      state = advance(state, state.left);
    }
    expect(game.isOver(state)).toBe(true);
  });
  it('PP-012 solo persists a completed personal best and never overwrites it early', () => {
    let state = game.init(4, makePlayers(1, false), { rounds: 3 },
      { ...EMPTY_SETUP, saved: { best: 1 } });
    expect(game.save?.(state)).toEqual({ best: 1 });
    while (!game.isOver(state)) state = tick(state);
    expect(game.save?.(state)).toEqual({ best: must(state.players[0]).score });
    expect(tick(state)).toBe(state);
    expect(game.save?.(game.leave(state, 'p1'))).toEqual({ best: 1 });
  });
  it('PP-013 waiting newcomer starts at zero and first plays next round', () => {
    let state = tick(init(1));
    const p = must(makePlayers(2, false)[1]);
    state = game.join(state, p);
    expect(must(state.players[1]).waiting).toBe(true);
    expect(must(state.players[1]).score).toBe(0);
    expect(must(game.results(state).players.find((p) => p.id === 'p2')).joinedMidGame).toBe(true);
    while (state.round === 1) state = tick(state);
    expect(must(state.players[1]).waiting).toBe(false);
    expect(must(state.players[1]).score).toBe(0);
  });
  it.each(['memorise', 'swap', 'pick', 'reveal', 'scoreboard', 'over'] as const)(
    'PP-012 PP-013 leaving including leader and everyone in %s never scores or throws', (phase) => {
    let state = init();
    while (state.phase !== phase) state = tick(state);
    const score = must(state.players[1]).score;
    state = game.leave(state, 'p1');
    expect(must(state.players[0]).score).toBe(score);
    expect(() => game.publicView(state)).not.toThrow();
    state = game.leave(state, 'p2');
    expect(game.results(state).players).toEqual([]);
    expect(() => game.save?.(state)).not.toThrow();
    expect(game.leave(state, 'absent')).toBe(state);
    state = game.join(state, must(makePlayers(1, false)[0]));
    expect(() => tick(state)).not.toThrow();
  });
  it('PP-022 disconnected players do not block connected players locking in', () => {
    let state = choose(pickPhase(), 'p1');
    const revision = must(state.players[0]).revision;
    state = driveStep(game, state, createTick({ disconnected: ['p2'],
      actions: [{ player: 'p1', control: 'lock', value: 'go', revision }] }), STEP_MS);
    expect(state.phase).toBe('reveal');
    expect(must(state.players[1]).picks).toHaveLength(2);
  });
  it('PP-005 private picks scramble without changing TV, results or another phone', () => {
    const state = choose(choose(pickPhase(), 'p1'), 'p2');
    for (const viewer of [null, 'p1', 'p2']) {
      for (const salt of [0, 1, 15, 30]) {
        const scrambled = must(game.scrambleSecrets?.(state, viewer, salt));
        expect(game.publicView(scrambled)).toEqual(game.publicView(state));
        expect(game.results(scrambled)).toEqual(game.results(state));
        if (viewer) expect(game.controllerLayout(scrambled, viewer))
          .toEqual(game.controllerLayout(state, viewer));
        for (let i = 0; i < state.players.length; i += 1) {
          if (must(state.players[i]).info.id !== viewer) {
            expect(must(scrambled.players[i]).picks).not.toEqual(must(state.players[i]).picks);
          }
        }
      }
    }
    expect(game.secrets(reveal(state))).toEqual([]);
  });
  it('PP-003 PP-005 hidden faces and picks are declared only while withheld', () => {
    const memorise = init();
    expect(game.secrets(memorise)).toEqual([]);
    const state = choose(pickPhase(memorise), 'p1');
    expect(game.secrets(state).filter((secret) => secret.owner === null)).toHaveLength(16);
    expect(game.secrets(state).filter((secret) => secret.owner === 'p1')).toHaveLength(1);
    const scrambled = must(game.scrambleSecrets?.(state, 'p1', 0));
    expect(scrambled.grid).not.toEqual(state.grid);
    expect(scrambled.shared).toEqual(state.shared);
    expect(must(scrambled.players[0]).picks).toEqual(must(state.players[0]).picks);
    for (let i = 0; i < 16; i += 1) expect(scrambled.grid[i]).not.toBe(state.grid[i]);
    expect(game.publicView(scrambled)).toEqual(game.publicView(state));
    expect(game.secrets(reveal(state))).toEqual([]);
  });
  it.each(['memorise', 'swap', 'pick', 'reveal', 'scoreboard', 'over'] as const)(
    'PP-013 join in %s preserves scores and safely waits', (phase) => {
      let state = tick(init(1));
      while (state.phase !== phase) state = tick(state);
      const score = must(state.players[0]).score;
      const round = state.round;
      state = game.join(state, must(makePlayers(2, false)[1]));
      expect(must(state.players[0]).score).toBe(score);
      expect(must(state.players[1]).score).toBe(0);
      expect(must(state.players[1]).joinedMidGame).toBe(state.ticks > 0);
      if (phase !== 'over') {
        expect(must(state.players[1]).waiting).toBe(true);
        while (state.round === round && !game.isOver(state)) state = tick(state);
        if (!game.isOver(state)) expect(must(state.players[1]).waiting).toBe(false);
      }
    });
  it('PP-003 pause hides memorisation and resumes exactly', () => {
    const state = init();
    expect(game.publicView(must(game.pause?.(state))).grid).toBeNull();
    expect(hashState(must(game.resume?.(must(game.pause?.(state)))))).toEqual(hashState(state));
  });
  it('PP-005 revisions are per-player and stable under countdowns and other picks', () => {
    let state = pickPhase();
    const before = game.controllerLayout(state, 'p2');
    state = choose(state, 'p1');
    state = tap(state, 'p1', 'lock', 'go');
    expect(game.controllerLayout(state, 'p2')).toEqual(before);
    expect(game.controllerLayout(tick(state), 'p2')).toEqual(before);
  });
  it('PP-001 PP-002 PP-005 PP-010 seeded long random matches preserve invariants',
    { timeout: 30000 }, () => {
    const rng = createRng(9876);
    for (let seed = 0; seed < 8; seed += 1) {
      let state = game.init(seed, makePlayers(8, false),
        { rounds: 7 }, EMPTY_SETUP);
      for (let i = 0; i < 20000 && !game.isOver(state); i += 1) {
        const p = must(state.players[nextInt(rng, 0, state.players.length - 1)]);
        const control = nextInt(rng, 0, 3) === 0 ? 'lock' : 'grid';
        const old = state;
        state = tap(state, p.info.id, control, control === 'lock' ? 'go' : nextInt(rng, 0, 15));
        if (new Set([...state.grid, ...state.shared]).size !== 19) throw new Error('Invalid deal');
        for (let j = 0; j < state.players.length; j += 1) {
          const player = must(state.players[j]);
          if (player.score < must(old.players[j]).score || player.picks.length > 2 ||
              new Set(player.picks).size !== player.picks.length) throw new Error('Invalid player');
          if (old.phase === 'pick' && state.phase === 'pick' && must(old.players[j]).locked) {
            if (player.picks !== must(old.players[j]).picks) throw new Error('Locked picks changed');
          }
        }
      }
      expect(game.isOver(state)).toBe(true);
    }
  });
});

it('PP-012 save preserves the starting record on quit, ties, lower scores and multiplayer', () => {
  let state = game.init(42, makePlayers(1, false), { rounds: 3 }, { data: {}, saved: { best: 10 }, teams: false });
  must(state.players[0]).score = 30;
  state.best = 99; // Derived display state must never become the persistence baseline.
  expect(game.save?.(state)).toEqual({ best: 10 });
  state.phase = 'over';
  for (const score of [9, 10, 11]) {
    must(state.players[0]).score = score;
    expect(game.save?.(state)).toEqual({ best: Math.max(10, score) });
  }
  state = game.join(state, must(makePlayers(2, false)[1]));
  expect(game.save?.(state)).toEqual({ best: 10 });
  state = game.leave(state, 'p2');
  expect(game.save?.(state)).toEqual({ best: 10 });
});
it('PP-012 unreadable storage suppresses best claims throughout the match', () => {
  const state = game.init(42, makePlayers(1, false), { rounds: 3 }, { data: {}, saved: null, teams: false });
  expect(state.recordable).toBe(false);
  expect(game.publicView(state)).toMatchObject({ soloBest: null, newBest: false });
  state.phase = 'over';
  must(state.players[0]).score = 30;
  expect(game.publicView(state)).toMatchObject({ soloBest: null, newBest: false });
});
it('PP-013 joining preserves earned scores and never deals a waiting player into this round', () => {
  let state = tick(init());
  state = { ...state, players: state.players.map((p, i) => ({ ...p, score: i ? 20 : 40 })) };
  const joined = game.join(state, must(makePlayers(3, false)[2]));
  expect(game.results(joined).players.filter(p => p.id !== 'p3')).toEqual(game.results(state).players);
  expect(joined.players[2]).toMatchObject({ score: 0, waiting: true, picks: [] });
  expect(game.privateView(joined, 'p3')).toBeNull();
  expect(game.controllerLayout(joined, 'p3').controls).toEqual([{ kind: 'text', id: 'wait', text: 'You join at the next round' }]);
});
