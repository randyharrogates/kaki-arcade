import type { ScriptContext } from '@kaki/platform/kit';
import { conformanceTimeout } from '@kaki/platform/kit';
import * as fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng, nextInt } from '@kaki/sim-core';
import { formatReport, fuzzScript, makePlayers, readSources, runConformance } from '@kaki/platform/kit';
import { STEP_MS } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { DEFAULT_SETTINGS, QUESTION_DATA, questionData, rabakz } from '../index';
import type { Question, Settings, State } from '../index';
import { IDLE_STEPS, TIE_STEPS } from './flow';
import { privateView } from './views';

const bank = (length = 10): Question[] => Array.from({ length }, (_, index) => ({
  id: `q-${String(index)}`, prompt: `Question ${String(index)}`,
  options: [`Correct ${String(index)}`, `Wrong one ${String(index)}`, `Wrong two ${String(index)}`, `Wrong three ${String(index)}`],
  correct: 0, category: 'General', difficulty: 'easy', type: 'multiple-choice', region: 'general',
}));
function init(count = 2, length: Settings['length'] = 10, teams = false, seed = 42) {
  return rabakz.init(seed, makePlayers(count, teams), { ...DEFAULT_SETTINGS, length }, {
    data: { [QUESTION_DATA]: questionData(bank(length)) }, saved: null, teams,
  });
}
function tick(state: State, picks: readonly [number, number][] = [],
  control?: string, disconnected: string[] = []): State {
  if (control === 'continue' && state.phase === 'reveal') {
    state = wait(state, 240);
    if (state.phase !== 'scoreboard') return state;
  }
  if (control === 'start-final' && state.phase === 'final') return wait(state, 240);
  const players = state.players;
  let inputs: StepInputs = {
    frames: new Map(), leader: players[0]?.info.id ?? null, disconnected,
    connected: new Map(players.map((player) =>
      [player.info.id, !disconnected.includes(player.info.id)])),
    actions: picks.map(([index, pick]) => ({
      player: players[index]?.info.id ?? '', control: 'answer', value: String(pick), revision: 0,
    })),
  };
  if (control && inputs.leader) {
    inputs = { ...inputs, actions: [...inputs.actions,
      { player: inputs.leader, control, revision: 0 }] };
  }
  return rabakz.step(state, inputs, STEP_MS);
}
function wait(state: State, steps: number): State {
  for (let i = 0; i < steps; i += 1) state = tick(state);
  return state;
}
function correct(state: State): number {
  return state.questions[state.round]?.correct ?? 0;
}
function win(state: State, indices = [0]): State {
  if (state.phase === 'final') state = tick(state, [], 'start-final');
  const pick = correct(state);
  return wait(tick(state, indices.map((index) => [index, pick])), TIE_STEPS + 1);
}

describe('Rabakz rules', () => {
  it('RZ-001 fixes 10/30/50 questions, ends, and ranks the highest total first', () => {
    for (const length of [10, 30, 50] as const) {
      let state = init(2, length);
      for (let i = 0; i < length; i += 1) state = tick(win(state, [1]), [], 'continue');
      expect(rabakz.isOver(state)).toBe(true);
      expect(rabakz.results(state).players[0]?.score).toBe(Math.max(...state.players.map((p) => p.score)));
      expect(rabakz.results(state).players[0]?.id).toBe(state.players[1]?.info.id);
      expect(state.round).toBe(length - 1);
    }
  });
  it('RZ-004 accepts an answer late without a visible countdown and never changes it', () => {
    let state = wait(init(3), 1000);
    expect(rabakz.publicView(state)).not.toHaveProperty('elapsed');
    const wrong = (correct(state) + 1) % 4;
    state = tick(state, [[0, wrong], [0, correct(state)]]);
    expect(state.players[0]?.pick).toBe(wrong);
  });
  it('RZ-006 includes exactly 15 steps, excludes the next, and preserves winners on skip', () => {
    let state = init(3);
    const pick = correct(state);
    state = tick(state, [[0, pick]]);
    state = wait(state, 14);
    state = tick(state, [[1, pick]]);
    expect(state.phase).toBe('question');
    state = tick(state, [[2, pick]], 'skip');
    expect(state.phase).toBe('reveal');
    expect(state.players.map((p) => p.gained)).toEqual([100, 100, 0]);
  });
  it('RZ-006 a skip inside the tie window does not cut off answers that tie', () => {
    let state = init(3);
    const pick = correct(state);
    state = tick(state, [[0, pick]]);
    state = wait(state, 4);
    state = tick(state, [], 'skip');
    expect(state.phase).toBe('question');
    state = tick(state, [[1, pick]]);
    state = wait(state, 16);
    expect(state.phase).toBe('reveal');
    expect(state.players.map((p) => p.gained)).toEqual([100, 100, 0]);
  });
  it('RZ-006 a wrong press during the window prevents a second correct press', () => {
    let state = init(3);
    const pick = correct(state);
    state = tick(state, [[0, pick]]);
    state = tick(state, [[1, (pick + 1) % 4], [1, pick]]);
    state = wait(state, 16);
    expect(state.players[1]?.gained).toBe(0);
    expect(state.players[1]?.pick).toBe((pick + 1) % 4);
  });
  it('RZ-006 all connected wrong answers unlock; disconnected players never hold it up', () => {
    let state = init(3);
    const wrong = (correct(state) + 1) % 4;
    state = tick(state, [[0, wrong], [1, (wrong + 1) % 4 === correct(state) ? (wrong + 2) % 4 : (wrong + 1) % 4]], undefined,
      [state.players[2]?.info.id ?? '']);
    expect(state.players.every((p) => p.pick === null)).toBe(true);
    expect(rabakz.publicView(state).wrong).toContain(wrong);
    expect(state.phase).toBe('question');
  });
  it('RZ-006 skip and 30 seconds without a correct answer reveal without points', () => {
    expect(tick(init(), [], 'skip').phase).toBe('reveal');
    const state = wait(init(), IDLE_STEPS);
    expect(state.phase).toBe('reveal');
    expect(state.players.every((p) => p.score === 0)).toBe(true);
    expect(rabakz.publicView(state).correct).toBe(correct(state));
  });
  it('RZ-007 winners get 100, simultaneous winners all score, wrong and skipped get zero', () => {
    const state = win(init(3), [0, 1]);
    expect(state.players.map((p) => p.score)).toEqual([100, 100, 0]);
    expect(tick(init(), [], 'skip').players.every((p) => p.score === 0)).toBe(true);
  });
  it('RZ-008 third consecutive win adds 50; a loss or wrong answer ends the streak', () => {
    let state = init();
    for (let i = 0; i < 3; i += 1) state = tick(win(state), [], 'continue');
    expect(state.players[0]?.score).toBe(350);
    expect(state.players[0]?.streak).toBe(3);
    expect(rabakz.privateView({ ...state, phase: 'reveal' }, state.players[0]?.info.id ?? '')?.blocks.find(block => block.kind === 'text' && block.text === 'Streak 3'))
      .toMatchObject({ tone: 'body' });
    state = tick(win(state, [1]), [], 'continue');
    expect(state.players[0]?.streak).toBe(0);
    state = tick(state, [[1, (correct(state) + 1) % 4]]);
    expect(state.players[1]?.streak).toBe(0);
  });
  it('RZ-009 last 1/3/5 questions announce and double base plus streak', () => {
    for (const length of [10, 30, 50] as const) {
      let state = init(2, length);
      for (let i = 0; i < length; i += 1) {
        expect(rabakz.publicView(state).finalRound).toBe(i >= length * 0.9);
        const won = win(state);
        expect(won.players[0]?.gained).toBe((i >= 2 ? 150 : 100) *
          (i >= length * 0.9 ? 2 : 1));
        state = tick(won, [], 'continue');
      }
    }
  });
  it('RZ-009 announces the final block before exposing its first question', () => {
    let state = init();
    for (let i = 0; i < 9; i += 1) state = tick(win(state), [], 'continue');
    expect(state.phase).toBe('final');
    expect(rabakz.publicView(state).finalRound).toBe(true);
    expect(rabakz.publicView(state).question).toBeNull();
    expect(rabakz.publicView(state).correct).toBeNull();
    state = tick(state, [], 'start-final');
    expect(state.phase).toBe('question');
    expect(rabakz.publicView(state).question).not.toBeNull();
  });
  it('RZ-012 supports solo, eight players and two teams scoring once per question', () => {
    const state = init(8, 10, true);
    const team = state.players[0]?.info.team;
    const indices = state.players.flatMap((p, i) => p.info.team === team ? [i] : []);
    const won = win(state, indices);
    expect(won.teamScores[team ?? 0]).toBe(100);
    expect(won.players.filter((p) => p.gained === 100)).toHaveLength(indices.length);
    let solo = init(1);
    solo = tick(solo, [[0, (correct(solo) + 1) % 4]]);
    expect(solo.phase).toBe('reveal');
    expect(win(init(1)).players[0]?.score).toBe(100);
  });
  it('RZ-012 RZ-008 tied team-mates pay one largest award with individual streaks', () => {
    let state = init(4, 10, true);
    for (let i = 0; i < 3; i += 1) state = tick(win(state), [], 'continue');
    const before = state.teamScores[0];
    state = win(state, [0, 2]);
    expect(state.players[0]?.gained).toBe(150);
    expect(state.players[2]?.gained).toBe(100);
    expect(state.teamScores[0] - before).toBe(150);
    state = tick(state, [], 'continue');
    state = win(state, [0, 1]);
    expect(state.teamScores[1]).toBe(100);
  });
  it('RZ-014 joins wait for the next question at zero; leader and everyone may leave', () => {
    let state = tick(init());
    const newcomer = { id: 'new', seat: 3, name: 'New', colour: 'seat-3' as const };
    state = rabakz.join(state, newcomer);
    expect(state.players[2]).toMatchObject({ score: 0, eligible: false, joinedMidGame: true });
    expect(rabakz.privateView(state, 'new')?.blocks).toContainEqual({ kind: 'text', text: 'You join at the next question', tone: 'title' });
    state = tick(state, [[2, correct(state)]]);
    expect(state.firstCorrect).toBeNull();
    state = tick(win(state), [], 'continue');
    expect(state.players[2]?.eligible).toBe(true);
    for (const player of state.players) state = rabakz.leave(state, player.info.id);
    expect(rabakz.results(state).players).toEqual([]);
    expect(() => rabakz.publicView(state)).not.toThrow();
  });
  it('RZ-006 leaving during the window preserves the team award and other streaks', () => {
    let state = init(8, 10, true);
    const winner = state.players[0];
    if (!winner) throw new Error('Missing player');
    state = tick(state, [[0, correct(state)]]);
    const scores = state.teamScores;
    state = rabakz.leave(state, winner.info.id);
    expect(state.teamScores).toBe(scores);
    state = wait(state, 16);
    expect(state.phase).toBe('reveal');
    expect(state.teamScores[winner.info.team ?? 0]).toBe(100);
  });
  it('RZ-006 disconnected opponents do not turn a multiplayer match into solo', () => {
    let state = init(3);
    const wrong = (correct(state) + 1) % 4;
    const away = state.players.slice(1).map((p) => p.info.id);
    state = tick(state, [[0, wrong]], undefined, away);
    expect(state.phase).toBe('question');
    expect(state.players[0]?.pick).toBeNull();
    state = tick(state, [], 'skip');
    expect(rabakz.publicView(state).players[0]?.answers).toEqual([wrong]);
  });
  it('RZ-014 joining in reveal and becoming leader can continue while waiting', () => {
    let state = win(init(1));
    const newcomer = { id: 'new', seat: 2, name: 'New', colour: 'seat-2' as const };
    state = rabakz.join(state, newcomer);
    state = rabakz.leave(state, state.players[0]?.info.id ?? '');
    const layout = rabakz.controllerLayout(state, newcomer.id);
    expect(layout.controls).toEqual([]);
    state = tick(state, [], 'continue');
    expect(state.players[0]?.eligible).toBe(true);
    expect(state.round).toBe(1);
  });
  it('RZ-004 RZ-006 other answers preserve this phone revisions and hidden answers', () => {
    let state = init(3);
    const viewer = state.players[1]?.info.id ?? '';
    const layout = rabakz.controllerLayout(state, viewer);
    const view = rabakz.privateView(state, viewer);
    state = tick(state, [[0, correct(state)]]);
    expect(rabakz.controllerLayout(state, viewer)).toEqual(layout);
    expect(rabakz.privateView(state, viewer)).toEqual(view);
    expect(rabakz.publicView(state).correct).toBeNull();
    expect(rabakz.publicView(state).players.every((p) => p.pick === null)).toBe(true);
  });
  it('RZ-016 equal totals share placing and skip the next place', () => {
    const state = win(init(3), [0, 1]);
    expect(rabakz.results(state).players.map((p) => p.place)).toEqual([1, 1, 3]);
  });
  it('RZ-026 seeded shuffles are reproducible and correct positions are uniform', () => {
    const counts = [0, 0, 0, 0];
    for (let seed = 0; seed < 2000; seed += 1) {
      const state = init(1, 10, false, seed);
      for (const q of state.questions) counts[q.correct] = (counts[q.correct] ?? 0) + 1;
      expect(state).toEqual(init(1, 10, false, seed));
    }
    for (const count of counts) expect(count).toBeGreaterThan(4700);
    for (const count of counts) expect(count).toBeLessThan(5300);
  });
  it('RZ-026 picture options shuffle while image assets remain available before play', () => {
    const source = bank().map((q) => ({ ...q, picture: { file: 'photos/question.webp', alt: 'A photo', credit: 'Photographer',
      sourceUrl: 'https://example.com/photo', licence: 'CC0 1.0', bytes: 100 } }));
    const state = rabakz.init(22, makePlayers(1, false), DEFAULT_SETTINGS, {
      data: { [QUESTION_DATA]: questionData(source) }, saved: null, teams: false,
    });
    expect(rabakz.assets(state)).toContainEqual({
      key: 'photos/question.webp', kind: 'image',
    });
    expect(rabakz.publicView(state).question?.picture).toEqual({ file: 'photos/question.webp', alt: 'A photo', credit: 'Photographer' });
    for (const q of state.questions) expect(q.options[q.correct]).toMatch(/^Correct /);
  });
  it('RZ-004 RZ-007 RZ-012 seeded long random matches preserve invariants', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const rng = createRng(seed);
      let state = init(8, 50, seed % 2 === 0, seed);
      const seen = new Set<string>();
      const teamTotals = [0, 0];
      let observedRound = -1;
      for (let step = 0; step < 40000 && !rabakz.isOver(state); step += 1) {
        if (state.phase !== 'question') {
          // No answer controls exist during timed presentations. Still step every frame.
          const scores = state.teamScores;
          state = tick(state, [], state.phase === 'scoreboard' ? 'continue' : undefined);
          if (state.teamScores !== scores) expect(state.teamScores).toEqual(teamTotals);
          continue;
        }
        if (nextInt(rng, 0, 99) < 2 && state.players.length > 2) {
          state = rabakz.leave(state, required(state.players.at(-1)).info.id);
        }
        if (nextInt(rng, 0, 99) < 2 && state.players.length < 8) {
          const info = required(makePlayers(8, state.teams)[state.players.length]);
          state = rabakz.join(state, { ...info, id: `join-${String(step)}` });
        }
        const old = state;
        if (old.round !== observedRound) {
          const id = required(old.questions[old.round]).id;
          expect(seen.has(id)).toBe(false);
          seen.add(id);
          observedRound = old.round;
        }
        const picks: [number, number][] = [];
        for (let index = 0; index < old.players.length; index += 1) {
          if (nextInt(rng, 0, 3) === 0) {
            picks.push([index, nextInt(rng, 0, 3)], [index, nextInt(rng, 0, 3)]);
          }
        }
        const disconnected = old.players.filter(() => nextInt(rng, 0, 9) === 0)
          .map((p) => p.info.id);
        const control = old.phase === 'scoreboard' ? 'continue' :
          old.phase === 'question' && nextInt(rng, 0, 99) === 0 ? 'skip' : undefined;
        state = tick(old, picks, control, disconnected);
        expect(state.wrong).not.toContain(correct(state));
        if (old.phase === 'question') {
          for (const p of old.players) {
            const after = required(state.players.find((item) => item.incarnation === p.incarnation));
            if (p.pick !== null) expect(after.answers).toEqual(p.answers);
          }
          if (state.phase === 'reveal') {
            const multiplier = old.round >= old.settings.length * 0.9 ? 2 : 1;
            const awards = [0, 0];
            for (const p of state.players) {
              const before = required(old.players.find((item) => item.incarnation === p.incarnation));
              const expected = state.winners.some((w) => w.incarnation === p.incarnation) ? (100 + (before.streak >= 2 ? 50 : 0)) * multiplier : 0;
              expect(p.score - before.score).toBe(expected);
              expect(p.gained).toBe(expected);
            }
            // Winner snapshots include departed players, whose teams still earn an award.
            for (const winner of state.winners) {
              if (winner.info.team !== undefined) awards[winner.info.team] = Math.max(
                required(awards[winner.info.team]), (100 + (winner.streak >= 2 ? 50 : 0)) * multiplier);
            }
            teamTotals[0] = required(teamTotals[0]) + required(awards[0]);
            teamTotals[1] = required(teamTotals[1]) + required(awards[1]);
          } else {
            expect(state.players.map((p) => p.score)).toEqual(old.players.map((p) => p.score));
          }
          if (old.firstCorrect === null && state.firstCorrect === null && control !== 'skip') {
            expect(state.phase === 'reveal').toBe(old.elapsed + 1 === 1800 ||
              (old.players.filter((p) => p.eligible).length === 1 && required(state.players[0]).pick !== null));
          }
        }
        expect(state.teamScores).toEqual(teamTotals);
      }
      expect(seen.size).toBe(50);
      expect(rabakz.isOver(state)).toBe(true);
    }
  });
  it.each([
    { count: 3, scores: [0, 100], expected: 1 },
    { count: 3, scores: [0, 100], expected: 0, reverse: true },
    { count: 2, scores: [100, 0], expected: 1 },
    { count: 2, scores: [0, 100], expected: 0 },
    { count: 2, scores: [100, 100], expected: 0 },
  ] as const)('RZ-014 D-234 deterministic placement %j', ({ count, scores, expected, ...options }) => {
    const original = init(count, 10, true);
    const state = { ...original, teamScores: scores, players: original.players.map(p =>
      'reverse' in options ? { ...p, info: { ...p.info, team: p.info.team === 0 ? 1 as const : 0 as const } } : p) };
    expect(rabakz.joinTeam?.(state)).toBe(expected);
    expect(rabakz.joinTeam?.(state)).toBe(expected);
  });
  it.each([false, true])('RZ-014 team join during question, just before reveal %s', nearReveal => {
    let state = tick(init(3, 10, true));
    if (nearReveal) {
      state = tick(state, [[0, correct(state)]]);
      state = wait(state, TIE_STEPS - 1);
    }
    const team = rabakz.joinTeam?.(state);
    if (team === undefined) throw new Error('Missing joinTeam');
    const newcomer = { ...required(makePlayers(4, true)[3]), team };
    state = rabakz.join(state, newcomer);
    expect(state.players.at(-1)).toMatchObject({ score: 0, eligible: false, joinedMidGame: true, info: { team: 1 } });
    expect(JSON.stringify(privateView(state, newcomer.id))).toContain("You're on Blue team");
    state = tick(state, [[3, correct(state)]]);
    expect(state.players.at(-1)?.pick).toBeNull();
    while (state.round === 0) state = tick(state);
    expect(state.players.at(-1)).toMatchObject({ score: 0, eligible: true });
    state = tick(state, [[3, correct(state)]]);
    state = wait(state, TIE_STEPS + 1);
    expect(state.players.at(-1)?.score).toBe(100);
    expect(state.teamScores[1]).toBe(100);
    expect(rabakz.results(state).players.find(p => p.id === newcomer.id)?.joinedMidGame).toBe(true);
  });
  it('RZ-001 RZ-012 passes conformance at minimum and maximum in FFA and teams', () => {
    const data = { [QUESTION_DATA]: questionData(bank()),
      'categories.json': { budgetBytes: 100, categories: ['general', 'singapore'].map(id => ({ id, title: id, region: id, plain: { easy: 50, medium: 50, hard: 50 }, pictures: { easy: 0, medium: 0, hard: 0 }, bytes: 0, largestPicture: 0 })) } };
    const report = runConformance(rabakz, [
      { name: 'solo', players: 1 }, { name: 'eight', players: 8 },
      { name: 'two teams', players: 2, teams: true },
      { name: 'team newcomer', players: 3, teams: true, script: (context: ScriptContext) => ({ ...fuzzScript()(context), join: context.step === 30 ? 1 : 0 }) },
      { name: 'eight teams', players: 8, teams: true },
    ].map((scenario) => ({ ...scenario, steps: 5000,
      script: scenario.script ?? fuzzScript(),
    })), { sources: readSources(fs, 'games/rabakz/src'), data });
    if (process.env.RABAKZ_EVIDENCE === '1') fs.writeFileSync('uat/evidence/R-01-rabakz-rules/conformance.txt', formatReport(report));
    if (process.env.RABAKZ_EVIDENCE === '1') fs.writeFileSync('uat/evidence/R-01-rabakz-rules/conformance.json',
      JSON.stringify(report, null, 2));
    expect(report.ok, formatReport(report)).toBe(true);
  }, conformanceTimeout(32618));
});

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("Missing expected value");
  return value;
}

it('RZ-032 snapshots every five questions, keeps two-board deltas and survives saved-state restoration', () => {
  for (const teams of [false, true]) {
    let state = init(4, 30, teams);
    const firstTotals = new Map<string, number>();
    let firstTeams: readonly number[] = [];
    for (let round = 1; round <= 10; round++) {
      state = wait(win(state, [round % 4]), 240);
      expect(state.phase).toBe(round % 5 === 0 ? 'scoreboard' : 'question');
      if (round === 5) {
        const view = rabakz.publicView(state);
        for (const p of view.players) {
          expect(p.previousScore).toBe(0);
          firstTotals.set(p.id, p.score);
        }
        expect(view.previousTeamScores).toEqual([0, 0]);
        firstTeams = view.teamScores;
        expect(state.scoreboardTotals?.current.teams).toEqual(state.teamScores);
        expect(state.scoreboardTotals?.current.players.map(p => p.score)).toEqual(state.players.map(p => p.score));
      }
      if (round === 10) {
        const view = rabakz.publicView(state);
        for (const p of view.players) expect(p.previousScore).toBe(firstTotals.get(p.id));
        expect(view.players.some(p => p.score > p.previousScore)).toBe(true);
        expect(view.previousTeamScores).toEqual(firstTeams);
        // Save and restore the simulation state, then continue the same match.
        const restored = JSON.parse(JSON.stringify(state)) as State;
        expect(rabakz.publicView(restored)).toEqual(view);
        const continued = tick(restored, [], 'continue');
        expect(rabakz.publicView(continued).players.map(p => p.previousScore)).toEqual(view.players.map(p => p.score));
        expect(rabakz.publicView(continued).previousTeamScores).toEqual(view.teamScores);
      }
      if (state.phase === 'scoreboard') state = tick(state, [], 'continue');
    }
  }
});

it('RZ-014 joining preserves earned scores and team totals while awaiting the next question', () => {
  const state = tick(win(init(2, 10, true)), [], 'continue');
  const running = tick(state);
  const third = makePlayers(3, true)[2];
  if (!third) throw new Error('No third player');
  const joined = rabakz.join(running, third);
  expect(joined.players.slice(0, 2)).toEqual(running.players);
  expect(joined.teamScores).toEqual(running.teamScores);
  expect(joined.players[2]).toMatchObject({ score: 0, eligible: false });
  expect(rabakz.controllerLayout(joined, third.id).controls.some(c => c.id === 'answer')).toBe(false);
});


describe('RZ-006 / RZ-007 same-step solo reveal', () => {
  it('a wrong answer before leader Skip keeps Wrong and zero points', () => {
    const initial = init(1);
    const state = tick(initial, [[0, (correct(initial) + 1) % 4]], 'skip');
    expect(state.phase).toBe('reveal');
    expect(state.players[0]).toMatchObject({ skipped: false, gained: 0 });
    expect(privateView(state, state.players[0]?.info.id ?? '')?.blocks[0])
      .toMatchObject({ text: 'Wrong' });
  });
  it('leader Skip before an answer ignores the answer and keeps Skipped', () => {
    const initial = init(1);
    const id = initial.players[0]?.info.id ?? '';
    const state = rabakz.step(initial, {
      frames: new Map(), leader: id, connected: new Map([[id, true]]), disconnected: [],
      actions: [
        { player: id, control: 'skip', revision: 0 },
        { player: id, control: 'answer', value: String(correct(initial)), revision: 0 },
      ],
    }, STEP_MS);
    expect(state.phase).toBe('reveal');
    expect(state.players[0]).toMatchObject({ pick: null, answers: [], skipped: true, gained: 0 });
    expect(privateView(state, id)?.blocks[0]).toMatchObject({ text: 'Skipped' });
  });
  it('a rejected stale answer cannot reveal a disconnected solo wrong pick early', () => {
    const initial = init(2);
    const [solo, joiner] = initial.players;
    if (!solo || !joiner) throw new Error('Missing players');
    const wrong = (correct(initial) + 1) % 4;
    const locked = { ...initial, players: [
      { ...solo, pick: wrong, answers: [wrong] }, { ...joiner, eligible: false },
    ] };
    for (const player of [solo, joiner]) {
      const state = rabakz.step(locked, {
        frames: new Map(), leader: solo.info.id, connected: new Map(),
        disconnected: [solo.info.id],
        actions: [{ player: player.info.id, control: 'answer', value: String(wrong), revision: 0 }],
      }, STEP_MS);
      expect(state.phase).toBe('question');
      expect(state.players).toEqual(locked.players);
    }
  });
  it('an accepted answer listed as disconnected does not reveal early', () => {
    const initial = init(1);
    const id = initial.players[0]?.info.id ?? '';
    const state = rabakz.step(initial, {
      frames: new Map(), leader: id, connected: new Map(), disconnected: [id],
      actions: [{ player: id, control: 'answer', value: String((correct(initial) + 1) % 4), revision: 0 }],
    }, STEP_MS);
    expect(state.players[0]?.pick).not.toBeNull();
    expect(state.phase).toBe('question');
  });
});
