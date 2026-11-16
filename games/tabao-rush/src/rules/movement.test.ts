import { describe, expect, it } from 'vitest';
import { cloneState, createRng, deepFreeze, hashState, nextFloatBetween, nextInt } from '@kaki/sim-core';
import type { SampledInput } from '@kaki/sim-core';
import { createTick, EMPTY_SETUP, STEP_MS, STEPS_PER_SECOND } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { ROUND_STEPS, tabaoRush } from './game';
import { clearOfWalls, TEST_LEVEL } from './level';
import { moveCooks } from './movement';
import { COOK_RADIUS, MIN_SEPARATION, STICK_DEAD_ZONE, WALK_SPEED } from './state';
import type { Cook, Level, TabaoState, Tile } from './state';
import { facingFor, targetTile } from './target';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test fixture');
  return value;
}

function players(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${String(i + 1)}`, seat: i + 1, name: `Cook ${String(i + 1)}`,
    colour: `seat-${String(i + 1)}` as 'seat-1',
  }));
}

function initial(count = 1): TabaoState {
  return tabaoRush.init(42, players(count), {}, EMPTY_SETUP);
}

function frame(x: number, y: number, held = 0): SampledInput {
  return { axes: [x, y, 0, 0], held, pressed: held, released: 0, age: 0, seq: 0 };
}

function input(x: number, y: number, held = 0): StepInputs {
  return createTick({ frames: new Map([['p1', frame(x, y, held)]]) });
}

function cook(x: number, y: number, id = 'p1'): Cook {
  return { id, x, y, vx: 0, vy: 0, facing: 0, targetTile: null };
}

function map(rows: string[]): Level {
  const width = rows[0]?.length ?? 0;
  return {
    id: 'test', width, height: rows.length, spawns: [],
    tiles: rows.flatMap((row) => Array.from(row, (mark): Tile => {
      if (mark === '#') return { kind: 'wall' };
      if (mark === 'c') return { kind: 'counter' };
      if (mark === 's') return { kind: 'station', stationId: 'test-anchor' };
      return { kind: 'floor' };
    })),
  };
}

function invariants(level: Level, cooks: readonly Cook[]): void {
  for (let i = 0; i < cooks.length; i += 1) {
    const a = required(cooks[i]);
    if (!clearOfWalls(level, a.x, a.y)) throw new Error(`Wall penetration: ${a.id}`);
    for (let j = 0; j < i; j += 1) {
      const b = required(cooks[j]);
      if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_SEPARATION - 1e-8) {
        throw new Error(`Cook penetration: ${a.id}, ${b.id}`);
      }
    }
  }
}

describe('Tabao Rush pure movement', () => {
  it('TR-020 solo convex corners and random maps never steer beyond the stick displacement', () => {
    const rng = createRng(77);
    const levels = [map(['######', '#....#', '#.#..#', '#....#', '######'])];
    for (let m = 0; m < 200; m += 1) {
      levels.push(map(Array.from({ length: 9 }, (_, y) =>
        Array.from({ length: 12 }, (_, x) => x === 0 || x === 11 || y === 0 || y === 8 ||
          nextInt(rng, 0, 5) === 0 ? '#' : '.').join(''))));
    }
    for (const [index, level] of levels.entries()) {
      const tile = level.tiles.findIndex((entry) => entry.kind === 'floor');
      if (tile < 0) continue;
      let cooks: readonly Cook[] = [cook(tile % level.width + 0.5,
        Math.floor(tile / level.width) + 0.5)];
      let sx = 0;
      let sy = 0;
      for (let tick = 0; tick < 600; tick += 1) {
        if (tick % 20 === 0) {
          sx = nextFloatBetween(rng, -1, 1);
          sy = nextFloatBetween(rng, -1, 1);
        }
        if (index === 0 && (tick === 0 || tick === 8)) {
          cooks = [cook(3.2, tick === 0 ? 1.9 : 1.81)];
          sx = tick === 0 ? -0.9 : -0.97;
          sy = tick === 0 ? -0.44 : -0.3;
        }
        const before = required(cooks[0]);
        cooks = moveCooks(level, cooks, input(sx, sy), tick);
        const after = required(cooks[0]);
        invariants(level, cooks);
        for (const [delta, velocity] of [[after.x - before.x, after.vx],
          [after.y - before.y, after.vy]]) {
          expect(required(delta) * Math.sign(required(velocity))).toBeGreaterThanOrEqual(-1e-12);
          expect(Math.abs(required(delta))).toBeLessThanOrEqual(
            Math.abs(required(velocity)) / STEPS_PER_SECOND + 1e-12);
        }
      }
    }
  });

  it('TR-021 keeps facing and pinned highlights stable under boundary noise, then turns next step', () => {
    for (const initialFacing of [0, 1] as const) {
      let facing = initialFacing;
      for (let tick = 0; tick < 600; tick += 1) {
        const angle = Math.PI / 8 + (tick % 2 === 0 ? -0.02 : 0.02);
        facing = facingFor(Math.cos(angle), Math.sin(angle), facing) as typeof initialFacing;
        expect(facing).toBe(initialFacing);
      }
      expect(facingFor(0, 0, facing)).toBe(facing);
      const turn = initialFacing * Math.PI / 4 + Math.PI / 4;
      expect(facingFor(Math.cos(turn), Math.sin(turn), facing)).toBe(initialFacing + 1);
    }
    const level = map(['#######', '#.....#', '#...cc#', '#...c.#', '#######']);
    let cooks: readonly Cook[] = [cook(3.5, 2.5)];
    let pinnedTarget: number | null = null;
    for (let tick = 0; tick < 600; tick += 1) {
      const angle = Math.PI / 8 + (tick % 2 === 0 ? -0.02 : 0.02);
      cooks = moveCooks(level, cooks, input(Math.cos(angle), Math.sin(angle)), tick);
      if (tick === 60) pinnedTarget = required(cooks[0]).targetTile;
      if (tick > 60) expect(required(cooks[0]).targetTile).toBe(pinnedTarget);
    }
    expect(pinnedTarget).not.toBeNull();
    cooks = moveCooks(level, cooks, input(Math.SQRT1_2, Math.SQRT1_2), 600);
    expect(cooks[0]?.facing).toBe(1);
  });

  it('TR-021 first press and re-press after rest choose the nearest facing sector', () => {
    const angle = Math.PI / 3;
    const held = input(Math.cos(angle), Math.sin(angle));
    const south = { ...cook(3.5, 2.5), facing: 2 as const };
    expect(moveCooks(TEST_LEVEL, [south], held, 0)[0]?.facing).toBe(1);
    const deflected = { ...south, vx: 0, vy: WALK_SPEED };
    expect(moveCooks(TEST_LEVEL, [deflected], held, 0)[0]?.facing).toBe(2);
    for (const released of [createTick(), input(STICK_DEAD_ZONE, 0)]) {
      const resting = moveCooks(TEST_LEVEL, [deflected], released, 1);
      expect(resting[0]?.facing).toBe(2);
      expect(moveCooks(TEST_LEVEL, resting, held, 2)[0]?.facing).toBe(1);
    }
  });

  it('TR-020 sanitises non-finite sticks for every cook and rejects more than eight cooks', () => {
    for (const [x, y] of [[NaN, 0], [Infinity, 0], [-Infinity, Infinity], [1e308, 1e308]]) {
      const state = initial(8);
      const frames = new Map(state.cooks.map((entry) => [entry.id, frame(required(x), required(y))]));
      const cooks = moveCooks(state.level, state.cooks, createTick({ frames }), 0);
      for (const entry of cooks) {
        expect([entry.x, entry.y, entry.vx, entry.vy, entry.facing].every(Number.isFinite)).toBe(true);
      }
      invariants(state.level, cooks);
    }
    expect(() => moveCooks(TEST_LEVEL, Array.from({ length: 9 }, () => cook(2, 2)),
      createTick(), 0)).toThrow('at most 8 cooks');
  });

  it('TR-002 represents floor, counters, walls and static station anchors as plain data', () => {
    const level = map(['#####', '#.cs#', '#####']);
    expect(level.tiles.map((tile) => tile.kind)).toContain('counter');
    expect(JSON.parse(JSON.stringify(initial(8)))).toEqual(initial(8));
    expect(initial(8).cooks).toHaveLength(8);
    expect(TEST_LEVEL.tiles.some((tile) => tile.kind === 'station')).toBe(true);
  });

  it('TR-020 applies stick magnitude next step, stops and reverses without smoothing', () => {
    const level = map(['########', '#......#', '#......#', '########']);
    const start = [cook(3, 2)];
    const next = moveCooks(level, start, input(0.5, 0), 0);
    expect(next[0]?.vx).toBe(WALK_SPEED / 2);
    expect(next[0]?.x).toBe(3 + WALK_SPEED / 2 / STEPS_PER_SECOND);
    const reverse = moveCooks(level, next, input(-1, 0), 1);
    expect(reverse[0]?.vx).toBe(-WALK_SPEED);
    const released = moveCooks(level, reverse, createTick(), 2);
    expect(released[0]?.x).toBe(reverse[0]?.x);
    expect(released[0]?.vx).toBe(0);
    expect(released[0]?.facing).toBe(4);
  });

  it('TR-020 has a radial dead zone and clamps diagonals to walk speed', () => {
    const start = [cook(2, 2)];
    expect(moveCooks(TEST_LEVEL, start, input(STICK_DEAD_ZONE, 0), 0)[0]).toBe(start[0]);
    const next = required(moveCooks(TEST_LEVEL, start, input(1, 1), 0)[0]);
    expect(Math.hypot(next.vx, next.vy)).toBeCloseTo(WALK_SPEED, 12);
    expect(next.vx).toBeCloseTo(WALK_SPEED * Math.SQRT1_2, 12);
  });

  it('TR-002 derives all eight facing directions directly, retaining facing at rest', () => {
    for (let direction = 0; direction < 8; direction += 1) {
      const angle = direction * Math.PI / 4;
      expect(facingFor(Math.cos(angle), Math.sin(angle))).toBe(direction);
    }
    const start = [cook(2, 2)];
    expect(moveCooks(TEST_LEVEL, start, input(0, -1), 0)[0]?.facing).toBe(6);
    expect(facingFor(1, Math.tan(Math.PI / 8))).toBe(1);
  });

  it('TR-002 slides along walls, counters and stations without penetrating or tunnelling', () => {
    for (const obstacle of ['#', 'c', 's']) {
      const level = map(['######', `#..${obstacle}.#`, `#..${obstacle}.#`, '#....#', '######']);
      let cooks: readonly Cook[] = [cook(3 - COOK_RADIUS, 1.5)];
      for (let tick = 0; tick < 16; tick += 1) {
        cooks = moveCooks(level, cooks, input(1, 1), tick);
        invariants(level, cooks);
      }
      expect(cooks[0]?.x).toBeCloseTo(3 - COOK_RADIUS, 6);
      expect(required(cooks[0]).y).toBeGreaterThan(1.9);
    }
  });

  it('TR-021 highlights the faced reachable tile, including a stable exact-corner tie', () => {
    const level = map(['#####', '#.s.#', '#s..#', '#...#', '#####']);
    expect(targetTile(level, 2.5, 2.5, 6)).toBe(7);
    expect(targetTile(level, 2.5, 2.5, 4)).toBe(11);
    expect(targetTile(level, 2.5, 2.5, 5)).toBe(11);
    expect(targetTile(level, 2.5, 2.9, 6)).toBeNull();
    expect(targetTile(level, 2.5, 2.5, 0)).toBeNull();
    let cooks: readonly Cook[] = [{ ...cook(2.5, 2.5), facing: 5 }];
    for (let tick = 0; tick < 1000; tick += 1) {
      cooks = moveCooks(level, cooks, createTick(), tick);
      expect(cooks[0]?.targetTile).toBe(11);
    }
  });

  it('TR-021 never highlights through a wall or intervening floor', () => {
    const level = map(['#######', '#.#s..#', '#..s..#', '#######']);
    expect(targetTile(level, 1.8, 1.5, 0)).toBeNull();
    expect(targetTile(level, 1.8, 2.5, 0)).toBeNull();
    expect(targetTile(level, 2.5, 2.5, 0)).toBe(17);
  });

  it('TR-022 sweeps near-tangent cook contact even when both endpoints are clear', () => {
    const start = [cook(2, 2), cook(2.025, 2 + MIN_SEPARATION - 0.0001, 'p2')];
    const next = moveCooks(TEST_LEVEL, start, input(1, 0), 0);
    expect(required(next[0]).x).toBeLessThan(2.04);
    invariants(TEST_LEVEL, next);
  });

  it('TR-022 separates softly at rest without exceeding the allowed overlap', () => {
    const start = [cook(2, 2), cook(2 + MIN_SEPARATION, 2, 'p2')];
    const next = moveCooks(TEST_LEVEL, start, createTick(), 0);
    expect(required(next[0]).x).toBeLessThan(required(start[0]).x);
    expect(required(start[0]).x - required(next[0]).x).toBeLessThan(0.008);
    invariants(TEST_LEVEL, next);
  });

  it('TR-022 idle push stays safe and three cooks leave a dead end', () => {
    const room = map(['############', '#..........#', '#..........#', '#..........#',
      '#..........#', '#..........#', '############']);
    for (const start of [
      [cook(2, 3.5), cook(2.5, 3.5, 'p2')],
      [cook(5, 2.5), cook(5, 1.25, 'p2')],
    ]) {
      let cooks: readonly Cook[] = start;
      const held = start[0]?.x === 2 ? input(1, 0) : input(0, -1);
      for (let tick = 0; tick < 600; tick += 1) {
        cooks = moveCooks(room, cooks, held, tick);
        invariants(room, cooks);
      }
      expect(cooks[1]?.vx).toBe(0);
      expect(cooks[1]?.vy).toBe(0);
    }
    const level = map(['########', '#......#', '####.###', '####.###', '####.###', '########']);
    let cooks: readonly Cook[] = [cook(4.5, 4.5), cook(4.5, 3.95, 'p2'), cook(4.5, 3.4, 'p3')];
    const held = createTick({ frames: new Map(cooks.map((entry) => [entry.id, frame(0, -1)])) });
    for (let tick = 0; tick < 300; tick += 1) {
      cooks = moveCooks(level, cooks, held, tick);
      invariants(level, cooks);
    }
    expect(cooks.every((entry) => entry.y < 2.5)).toBe(true);
  });

  it('TR-022 opposing pairs and eight cooks pass in a one-tile corridor within 240 steps', () => {
    const level = map(['##############', '#............#', '##############']);
    for (const count of [2, 8]) {
      let cooks: readonly Cook[] = Array.from({ length: count }, (_, i) =>
        cook(i < count / 2 ? 2 + i * 0.55 : 10 - (i - count / 2) * 0.55,
          1.5, `p${String(i + 1)}`));
      const frames = new Map(cooks.map((entry, i) =>
        [entry.id, frame(i < count / 2 ? 1 : -1, 0)]));
      for (let tick = 0; tick < 240; tick += 1) {
        cooks = moveCooks(level, cooks, createTick({ frames }), tick);
        invariants(level, cooks);
      }
      expect(cooks.slice(0, count / 2).every((entry) => entry.x > 8)).toBe(true);
      expect(cooks.slice(count / 2).every((entry) => entry.x < 4)).toBe(true);
    }
  });

  it('TR-022 wall-leaning head-on pairs pass in one- and two-row rooms within 1200 steps', () => {
    for (const rows of [1, 2]) {
      const level = map(['##############', ...Array<string>(rows).fill('#............#'),
        '##############']);
      let cooks: readonly Cook[] = [cook(3, rows + 0.8), cook(9, rows + 0.8, 'p2')];
      const held = createTick({ frames: new Map([['p1', frame(1, 0.3)], ['p2', frame(-1, 0.3)]]) });
      for (let tick = 0; tick < 1200; tick += 1) {
        cooks = moveCooks(level, cooks, held, tick);
        invariants(level, cooks);
      }
      expect(required(cooks[0]).x).toBeGreaterThan(12);
      expect(required(cooks[1]).x).toBeLessThan(2);
    }
  });

  it('TR-022 offset head-on pairs pass a one-tile corridor', () => {
    const level = map(['##############', '#............#', '##############']);
    for (const offset of [0, 0.05, 0.15, 0.25]) {
      let cooks: readonly Cook[] = [cook(2, 1.5 - offset), cook(8, 1.5 + offset, 'p2')];
      const held = createTick({ frames: new Map([['p1', frame(1, 0)], ['p2', frame(-1, 0)]]) });
      for (let tick = 0; tick < 600; tick += 1) {
        cooks = moveCooks(level, cooks, held, tick);
        invariants(level, cooks);
      }
      expect(required(cooks[0]).x).toBeGreaterThan(8);
      expect(required(cooks[1]).x).toBeLessThan(2);
    }
  });

  it('TR-022 eight opposing cooks pass a one-tile doorway within 240 steps', () => {
    const level = map([
      '##############', '#.....##.....#', '#............#', '#.....##.....#', '##############',
    ]);
    let cooks: readonly Cook[] = Array.from({ length: 8 }, (_, i) =>
      cook(i < 4 ? 3 + i * 0.55 : 11 - (i - 4) * 0.55, 2.5, `p${String(i + 1)}`));
    const frames = new Map(cooks.map((entry, i) => [entry.id, frame(i < 4 ? 1 : -1, 0)]));
    for (let tick = 0; tick < 240; tick += 1) {
      cooks = moveCooks(level, cooks, createTick({ frames }), tick);
      invariants(level, cooks);
    }
    expect(cooks.slice(0, 4).every((entry) => entry.x > 8)).toBe(true);
    expect(cooks.slice(4).every((entry) => entry.x < 5)).toBe(true);
  });

  it('TR-022 four against four re-aimed doorway arrivals all get through', () => {
    const level = map(['###############', '#......#......#', '#......#......#',
      '#.............#', '#......#......#', '#......#......#', '###############']);
    let cooks: readonly Cook[] = Array.from({ length: 8 }, (_, i) => {
      const n = i % 4;
      return cook(i < 4 ? 2 + (n % 2) * 1.5 : 12 - (n % 2) * 1.5,
        (i < 4 ? 1.5 : 1.6) + n * 1.2, `p${String(i + 1)}`);
    });
    for (let tick = 0; tick < 1800; tick += 1) {
      const frames = new Map(cooks.map((entry, i) => {
        const left = i < 4;
        const through = (entry.x > 6.3 && entry.x < 8.7) ||
          (left ? entry.x > 8 : entry.x < 7);
        const dx = through ? (left ? 1 : -1) : 7.5 - entry.x;
        const dy = (3.5 - entry.y) * (through ? 0.5 : 1);
        const length = Math.hypot(dx, dy) || 1;
        return [entry.id, frame(dx / length, dy / length)] as const;
      }));
      cooks = moveCooks(level, cooks, createTick({ frames }), tick);
      invariants(level, cooks);
    }
    expect(cooks.slice(0, 4).every((entry) => entry.x > 8), JSON.stringify(cooks)).toBe(true);
    expect(cooks.slice(4).every((entry) => entry.x < 6.5)).toBe(true);
  });

  it('TR-022 seeded cramped runs preserve walls, overlap and free-ahead progress', () => {
    const level = map([
      '##############', '#.....##.....#', '#............#', '#.....##.....#', '##############',
    ]);
    for (const seed of [1, 2026, 0xfeed]) {
      const rng = createRng(seed);
      let cooks: readonly Cook[] = Array.from({ length: 8 }, (_, i) =>
        cook(2 + i, 2.5, `p${String(i + 1)}`));
      const frames = new Map<string, SampledInput>();
      let freeProbes = 0;
      let contactProbes = 0;
      for (let tick = 0; tick < 20000; tick += 1) {
        if (tick % 30 === 0) {
          for (const entry of cooks) {
            frames.set(entry.id, frame(nextFloatBetween(rng, -1, 1),
              nextFloatBetween(rng, -1, 1)));
          }
        }
        const previous = cooks;
        cooks = moveCooks(level, cooks, createTick({ frames }), tick);
        invariants(level, cooks);
        for (let i = 0; i < cooks.length; i += 1) {
          const before = required(previous[i]);
          const after = required(cooks[i]);
          const vx = after.vx / STEPS_PER_SECOND;
          const vy = after.vy / STEPS_PER_SECOND;
          if (vx === 0 && vy === 0) continue;
          // Conservative free-ahead probe: no other cook can enter this swept region
          // in this step, even after moving and soft separation (0.1 tile margin).
          const free = clearOfWalls(level, before.x + vx, before.y) &&
            clearOfWalls(level, before.x + vx, before.y + vy) && previous.every((other) =>
              other.id === before.id || Math.hypot(other.x - before.x, other.y - before.y) >
                MIN_SEPARATION + 0.16);
          // Fork a held-input contact scenario from the seeded run. The blocker rests;
          // a clear destination beyond it must be reached without waiting indefinitely.
          if (tick % 30 === 0 && clearOfWalls(level, before.x + vx * 20, before.y + vy * 20)) {
            const blocker = previous.find((other) => other.id !== before.id &&
              Math.hypot(other.x - before.x, other.y - before.y) < MIN_SEPARATION + 0.02 &&
              (other.x - before.x) * vx + (other.y - before.y) * vy > 0);
            if (blocker !== undefined) {
              let probe: readonly Cook[] = [before, blocker];
              const held = createTick({ frames: new Map([[before.id, required(frames.get(before.id))]]) });
              for (let step = 0; step < 120; step += 1) {
                probe = moveCooks(level, probe, held, tick + step);
                invariants(level, probe);
              }
              const end = required(probe[0]);
              expect((end.x - before.x) * vx + (end.y - before.y) * vy).toBeGreaterThan(1e-5);
              contactProbes += 1;
            }
          }
          if (free) {
            freeProbes += 1;
            const progress = (after.x - before.x) * vx + (after.y - before.y) * vy;
            if (progress < (vx * vx + vy * vy) * 0.99) {
              throw new Error(`Free-ahead cook failed bounded (one-step) progress: ${before.id}`);
            }
          }
        }
      }
      expect(freeProbes).toBeGreaterThan(1000);
      expect(contactProbes).toBeGreaterThan(0);
    }
  });

  it('TR-020 is deterministic, immutable, shares branches and ignores disabled buttons', () => {
    const state = deepFreeze(initial(8));
    const before = hashState(state);
    const a = tabaoRush.step(state, input(1, 0, 0xffff), STEP_MS);
    const b = tabaoRush.step(cloneState(state), input(1, 0), STEP_MS);
    expect(hashState(a)).toBe(hashState(b));
    expect(hashState(state)).toBe(before);
    expect(a.level).toBe(state.level);
    expect(a.players).toBe(state.players);
    expect(a.rng).toBe(state.rng);
    const idle = tabaoRush.step(state, createTick(), STEP_MS);
    expect(idle.cooks).toBe(state.cooks);
  });

  it('TR-002 handles solo, ties, leader/last departure and mid-round joins', () => {
    let state = initial(2);
    const initialJoin = tabaoRush.join(state, required(players(3)[2]));
    expect(initialJoin.cooks).toHaveLength(3);
    state = tabaoRush.step(state, createTick(), STEP_MS);
    const joined = tabaoRush.join(state, required(players(3)[2]));
    expect(joined.cooks).toBe(state.cooks);
    expect(joined.players[2]?.spectating).toBe(true);
    expect(tabaoRush.results(joined).players[2]?.joinedMidGame).toBe(true);
    expect(tabaoRush.privateView(joined, 'p3')).toBeNull();
    expect(tabaoRush.controllerLayout(joined, 'p3').controls[0]?.kind).toBe('text');
    expect(tabaoRush.secrets(joined)).toEqual([]);
    expect(tabaoRush.results(joined).players.every((row) => row.place === 1)).toBe(true);
    expect(tabaoRush.leave(joined, 'unknown')).toBe(joined);
    for (const player of joined.players) state = tabaoRush.leave(state, player.id);
    expect(state.cooks).toEqual([]);
    expect(tabaoRush.results(state)).toEqual({ mode: 'coop', score: 0, players: [] });
    expect(tabaoRush.publicView(state)).toBeDefined();
    expect(tabaoRush.controllerLayout(state, 'unknown').revision).toBe(0);
    expect(tabaoRush.join(state, required(players(1)[0])).players[0]?.spectating).toBe(true);
    expect(initial(1).cooks).toHaveLength(1);
  });

  it('TR-005 interface scaffold ends at exactly 210 seconds in steps and remains safe after the end', () => {
    let state = initial();
    state = { ...state, tick: ROUND_STEPS - 1 };
    expect(tabaoRush.isOver(state)).toBe(false);
    const end = tabaoRush.step(state, createTick(), STEP_MS);
    expect(tabaoRush.isOver(end)).toBe(true);
    expect(tabaoRush.step(end, input(1, 0), STEP_MS)).toBe(end);
    expect(tabaoRush.results(end).score).toBe(0);
  });
});
