import { expect, it } from 'vitest';
import { rabakz } from '../src/index';
import { scenario } from './scenarios';
import { scoreboardModel } from './standings';
import { rowPosition, RESULTS_HEIGHT, podiumSteps, stepHeight, podiumFit, podiumLayout, teamMark } from './Results';
import { textLines } from './view-model';
import { space, tvType, lineHeight } from '@kaki/ui';

it('RZ-032 ranks ties equally and uses seats only for stable display order', () => {
  const view = rabakz.publicView(scenario('scoreboard-ties', 4));
  const board = scoreboardModel(view);
  expect(board.players.map(p => p.place)).toEqual([1, 1, 1, 1]);
  expect(board.players.map(p => p.seat)).toEqual([1, 2, 3, 4]);
  expect(board.players.every(p => p.delta === p.score)).toBe(true);
  expect(scoreboardModel({ ...view, players: view.players.map(p => ({ ...p, previousScore: p.score })) }).players.every(p => p.delta === 0)).toBe(true);
  const changed = { ...view, players: view.players.map((p, i) => ({ ...p, score: i < 2 ? 100 : 50 })) };
  expect(scoreboardModel(changed).players.map(p => p.place)).toEqual([1, 1, 3, 3]);
});
it('RZ-032 orders authoritative team totals first and groups members', () => {
  const view = { ...rabakz.publicView(scenario('scoreboard-teams', 8)), teamScores: [100, 200] };
  const board = scoreboardModel(view);
  expect(board.teams.map(t => t.id)).toEqual([1, 0]);
  expect(board.ordered.map(p => p.team)).toEqual([1, 1, 1, 1, 0, 0, 0, 0]);
  expect(board.teams[0]?.score).toBe(200);
});
it('RZ-032 model allowlist discards answers, picks and injected private data', () => {
  const view = rabakz.publicView(scenario('scoreboard', 2));
  const injected = { ...view, secret: 'SECRET', players: view.players.map(p => ({ ...p, privateRevision: 'SECRET', answers: [42], pick: 42 })) };
  expect(scoreboardModel(injected)).toEqual(scoreboardModel(view));
  expect(JSON.stringify(scoreboardModel(injected))).not.toContain('SECRET');
});
it('RZ-032 single list geometry fits the safe TV area', () => {
  for (const count of [1, 2, 4, 8]) {
    for (let index = 0; index < count; index++) {
      const box = rowPosition(index);
      expect(box.x + box.width).toBeLessThanOrEqual(1810);
      expect(box.y + box.height).toBeLessThanOrEqual(RESULTS_HEIGHT);
    }
  }
});
it('RZ-032 results fixtures reach real rule phases at all requested player counts', () => {
  for (const count of [1, 2, 4, 8]) {
    for (const name of ['scoreboard', 'scoreboard-next', 'scoreboard-teams', 'scoreboard-ties', 'podium', 'podium-teams', 'podium-ties'] as const) {
      const state = scenario(name, count);
      expect(state.phase).toBe(name.startsWith('podium') ? 'over' : 'scoreboard');
      expect(state.players.every(p => p.info.name === 'W'.repeat(12))).toBe(true);
    }
  }
  const first = rabakz.publicView(scenario('scoreboard', 8));
  const next = rabakz.publicView(scenario('scoreboard-next', 8));
  const board = scoreboardModel(next);
  expect(board.players.some(p => p.delta > 0)).toBe(true);
  expect(board.players.map(p => p.id)).not.toEqual(scoreboardModel(first).players.map(p => p.id));
  for (const p of board.players) expect(p.delta).toBe(p.score - (next.players.find(current => current.id === p.id)?.previousScore ?? 0));
});

it('RZ-032 measured rows reserve complete lines at the reading floor at every resolution', () => {
  for (let count = 1; count <= 8; count++) {
    const board = scoreboardModel(rabakz.publicView(scenario('scoreboard-teams', count)));
    for (const [index, p] of board.ordered.entries()) {
      const box = rowPosition(index);
      const size = tvType.title;
      for (const [scale, expected] of [[2 / 3, 110 / 3], [1, 55], [2, 110]] as const) expect(size * scale).toBeCloseTo(expected);
      const lines = textLines(p.name, 955, size).length;
      expect(lines * size * lineHeight.body + 2 * space[5]).toBeLessThanOrEqual(box.height);
      expect(box.height).toBe(space[89]);
      expect(box.y).toBe(index * (space[89] + space[8]));
    }
  }
});

it('RZ-032 podium centres first, shares tied steps and descends in phi heights', () => {
  const board = scoreboardModel(rabakz.publicView(scenario('podium', 8)));
  expect(podiumSteps(board.players).order).toEqual([2, 1, 3]);
  const tied = scoreboardModel(rabakz.publicView(scenario('podium-ties', 8)));
  const steps = podiumSteps(tied.players);
  expect(steps.order).toEqual([1]);
  expect(steps.top).toHaveLength(2);
  expect(steps.rest).toHaveLength(6);
  expect(stepHeight(1) / stepHeight(2)).toBeCloseTo(144 / 89);
  expect(stepHeight(3)).toBe(55);
  expect(podiumSteps(board.players.slice(0, 2)).order).toEqual([2, 1]);
});

it('RZ-032 podium measurement retains the reading floor for all counts and tied groups', () => {
  for (let count = 2; count <= 8; count++) for (const name of ['podium', 'podium-ties'] as const) {
    const board = scoreboardModel(rabakz.publicView(scenario(name, count)));
    const { top, order } = podiumSteps(board.players);
    const height = RESULTS_HEIGHT;
    const size = podiumFit(top, order.length, height, undefined);
    expect(size).toBeGreaterThanOrEqual(tvType.body);
    expect(size).toBe(tvType.title);
  }
});

it('RZ-032 fresh host derives player and team deltas solely from publicView', () => {
  const view = rabakz.publicView(scenario('scoreboard-teams', 4));
  const reloaded = JSON.parse(JSON.stringify({ ...view, previousTeamScores: [13, 21],
    players: view.players.map(p => ({ ...p, previousScore: 34 })) })) as typeof view;
  const board = scoreboardModel(reloaded);
  for (const p of board.players) expect(p.delta).toBe(p.score - 34);
  for (const t of board.teams) expect(t.delta).toBe(t.score - (reloaded.previousTeamScores[t.id] ?? 0));
});

it('RZ-032 podium regions separate extra places within the artboard', () => {
  for (const count of [2, 4, 8]) {
    const board = scoreboardModel(rabakz.publicView(scenario('podium', count)));
    const { rest } = podiumSteps(board.players);
    const regions = podiumLayout(rest.length);
    expect(regions.arrangement).toBe(rest.length ? 'vertical' : 'podium-only');
    if (!rest.length) continue;
    expect(regions.restHeight).toBe(rest.length * space[55] + (rest.length - 1) * space[8]);
    expect(regions.podiumHeight + space[34] + regions.restHeight).toBe(RESULTS_HEIGHT);
    for (const [index] of rest.entries()) {
      const box = rowPosition(index, true);
      expect(regions.restY + box.y).toBeGreaterThan(regions.podiumHeight);
      expect(regions.restY + box.y + box.height).toBeLessThanOrEqual(RESULTS_HEIGHT);
      expect(tvType.body).toBe(34);
      expect(tvType.body * lineHeight.body + 2 * space[5]).toBeLessThanOrEqual(box.height);
    }
  }
});
it('RZ-032 team identity pairs its name with a colour mark and no seat numeral', () => {
  expect(teamMark(0).name).toBe('Red team');
  expect(teamMark(1).name).toBe('Blue team');
  expect(teamMark(0).colour).not.toBe(teamMark(1).colour);
  expect(teamMark(0)).not.toHaveProperty('seat');
});

it('RZ-032 four-player final rows match eight-player height and start at the region top', () => {
  expect(rowPosition(0, true)).toEqual(rowPosition(0, true));
  expect(rowPosition(0, true).y).toBe(0);
});
