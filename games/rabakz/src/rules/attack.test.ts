import * as fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makePlayers } from '@kaki/platform/kit';
import { checkSettingsSchema, defaultSettings, STEP_MS } from '@kaki/platform';
import type { StepInputs, PlayerAction } from '@kaki/platform';
import { DEFAULT_SETTINGS, QUESTION_DATA, questionData, rabakz } from '../index';
import type { Question, Settings, State } from '../index';

const bank = (length = 10): Question[] => Array.from({ length }, (_, index) => ({
  id: `q-${String(index)}`, prompt: `Question ${String(index)}`,
  options: ['Correct', 'Wrong one', 'Wrong two', 'Wrong three'],
  correct: 0, category: 'General', difficulty: 'easy', type: 'multiple-choice', region: 'general',
}));
function init(count = 3, length: Settings['length'] = 10, teams = false, seed = 7) {
  return rabakz.init(seed, makePlayers(count, teams), { ...DEFAULT_SETTINGS, length }, {
    data: { [QUESTION_DATA]: questionData(bank(length)) }, saved: null, teams });
}
const id = (s: State, i: number) => required(s.players[i]).info.id;
function step(s: State, actions: PlayerAction[] = [], disc: string[] = [], leader?: string | null): State {
  const inputs: StepInputs = { frames: new Map(), actions, disconnected: disc,
    leader: leader === undefined ? id(s, 0) : leader,
    connected: new Map(s.players.map((p) => [p.info.id, !disc.includes(p.info.id)])) };
  return rabakz.step(s, inputs, STEP_MS);
}
const ans = (s: State, i: number, pick: number): PlayerAction =>
  ({ player: id(s, i), control: 'answer', value: String(pick), revision: 0 });
const ctl = (s: State, c: string): PlayerAction => ({ player: id(s, 0), control: c, revision: 0 });
const C = (s: State) => required(s.questions[s.round]).correct;
const W = (s: State, k = 1) => (C(s) + k) % 4;
function wait(s: State, n: number) { for (let i = 0; i < n; i++) s = step(s); return s; }

function next(s: State): State {
  s = wait(s, 240);
  return s.phase === 'scoreboard' ? step(s, [ctl(s, 'continue')]) : s;
}

describe('attacks', () => {
  it('A1 tie boundary: +15 in, +16 out', () => {
    let s = step(init(), [ans(init(), 0, C(init()))]);
    s = wait(s, 15);
    expect(s.phase).toBe('question');
    s = step(s, [ans(s, 1, C(s))]);
    expect(s.phase).toBe('reveal');
    expect(required(s.players[1]).gained).toBe(0);
  });
  it('A2 skip before a correct press in the same step', () => {
    const s0 = init();
    const s = step(s0, [ctl(s0, 'skip'), ans(s0, 1, C(s0))]);
    expect(s.phase).toBe('reveal');
    expect(s.firstCorrect).toBeNull();
    expect(required(s.players[1]).gained).toBe(0);
  });
  it('A3 leave and rejoin within the tie window: rejoiner must not score', () => {
    let s = init();
    const p0 = required(s.players[0]).info;
    s = step(s, [ans(s, 0, C(s))]);
    s = rabakz.leave(s, p0.id);
    s = rabakz.join(s, p0);
    s = wait(s, 16);
    const back = required(s.players.find((p) => p.info.id === p0.id));
    expect(back).toMatchObject({ eligible: false, joinedMidGame: true, gained: 0 });
    expect(back.score).toBe(0);
  });
  it('A4 30 s runs from question start and wrong answers do not reset it', () => {
    let s = init();
    s = wait(s, 1000);
    s = step(s, [ans(s, 0, W(s))]);
    s = wait(s, 798);
    expect(s.phase).toBe('question');
    s = step(s);
    expect(s.phase).toBe('reveal');
  });
  it('A5 leader null: reveal continues automatically', () => {
    let s = init();
    s = step(s, [ctl(s, 'skip')]);
    const s2 = step(s, [ctl(s, 'continue')], [], null);
    expect(s2.phase).toBe('reveal');
    let t = s2;
    for (let i = 0; i < 239; i++) t = step(t, [], [], null);
    expect(t.phase).toBe('question');
  });
  it('A6 everyone disconnected: idle still reveals, no unlock churn', () => {
    let s = init();
    const all = s.players.map((p) => p.info.id);
    for (let i = 0; i < 1800; i++) s = step(s, [], all);
    expect(s.phase).toBe('reveal');
  });
  it('A7 player who answered wrong then disconnects does not block unlock', () => {
    let s = init();
    s = step(s, [ans(s, 0, W(s))]);
    s = step(s, [ans(s, 1, W(s, 2))], [id(s, 0)]);
    expect(required(s.players[1]).pick).toBe(W(s, 2)); // p2 still to go
    s = step(s, [ans(s, 2, W(s, 3))], [id(s, 0)]);
    expect(s.players.every((p) => p.pick === null)).toBe(true);
    // three wrong marked => secret dropped
    expect(rabakz.secrets(s).some((x) => x.label === 'correct')).toBe(false);
  });
  it('A8 streak bonus exactly from third win, reset by other winner, kept by skip', () => {
    let s = init(2);
    const gains: number[] = [];
    for (let r = 0; r < 5; r++) {
      if (r === 3) { s = step(s, [ctl(s, 'skip')]); gains.push(-1); s = next(s); continue; }
      s = step(s, [ans(s, 0, C(s))]); s = wait(s, 16); gains.push(required(s.players[0]).gained); s = next(s);
    }
    expect(required(s.players[0]).streak).toBe(4);
    expect(gains).toEqual([100, 100, 150, -1, 150]);
  });
  it('A9 team: two team-mates tie: team gets 100 once', () => {
    let s = init(4, 10, true);
    const t = required(s.players[0]).info.team;
    const mates = s.players.map((p, i) => [p, i] as const).filter(([p]) => p.info.team === t).map(([, i]) => i);
    s = step(s, mates.map((i) => ans(s, i, C(s))));
    s = wait(s, 16);
    expect(s.teamScores[required(t)]).toBe(100);
    expect(s.teamScores[1 - required(t)]).toBe(0);
  });
  it('A10 cross-team tie scores both teams; results share team place', () => {
    let s = init(2, 10, true);
    s = step(s, [ans(s, 0, C(s)), ans(s, 1, C(s))]);
    s = wait(s, 16);
    const r = rabakz.results(s);
    expect(required(r.teams).map((x) => x.place)).toEqual([1, 1]);
  });
  it('A11 secret extraction: public/layout/private views identical for every possible correct index', () => {
    // For each step of a scripted question, swap correct and compare every non-owner view
    const s = init(3);
    const views = (st: State) => JSON.stringify([rabakz.publicView(st), rabakz.results(st),
      st.players.map((p) => [rabakz.controllerLayout(st, p.info.id), rabakz.privateView(st, p.info.id)])]);
    const swap = (st: State, k: number) => ({ ...st, questions: st.questions.map((q, i) => i === st.round ? { ...q, correct: k } : q) });
    // p0 wrong press on option a; check views equal across all non-wrong candidate correct indices
    const a = W(s);
    const base = s;
    const outcomes = new Set<string>();
    for (const k of [0, 1, 2, 3].filter((k) => k !== a)) {
      let t: State = swap(base, k);
      t = step(t, [ans(t, 0, a)]);
      outcomes.add(views(t));
    }
    expect(outcomes.size).toBe(1);
  });
  it('A12 waiting joiner pressing does nothing and is not counted for unlock', () => {
    let s = step(init(2));
    s = rabakz.join(s, { id: 'new', seat: 3, name: 'N', colour: 'seat-3' });
    s = step(s, [ans(s, 0, W(s)), ans(s, 1, W(s, 2))]);
    expect(s.players.slice(0, 2).every((p) => p.pick === null)).toBe(true);
    expect(rabakz.controllerLayout(s, 'new').controls.some((c) => c.id === 'answer')).toBe(false);
  });
  it('A13 duplicate question ids throw', () => {
    const b = bank(10).map((q) => ({ ...q, id: 'same' }));
    expect(() => rabakz.init(1, makePlayers(2, false), DEFAULT_SETTINGS, { data: { [QUESTION_DATA]: questionData(b) }, saved: null, teams: false })).toThrow('duplicate-question-id');
  });
  it('A14 a numeric answer value is ignored', () => {
    const s0 = init();
    const s = step(s0, [{ player: id(s0, 0), control: 'answer', value: C(s0), revision: 0 }]);
    expect(required(s.players[0]).pick).toBeNull();
  });
  it('A15 final double + streak: 10-question match last question gains 300 for a 10-streak', () => {
    let s = init(2);
    let last = 0;
    for (let r = 0; r < 10; r++) {
      if (s.phase === 'final') s = wait(s, 240);
      s = step(s, [ans(s, 0, C(s))]); s = wait(s, 16); last = required(s.players[0]).gained;
      s = next(s);
    }
    expect(last).toBe(300);
    expect(rabakz.isOver(s)).toBe(true);
    expect(required(s.players[0]).score).toBe(100 + 100 + 150 * 7 + 300);
  });
  it('A16 solo wrong answer reveals; second press impossible', () => {
    let s = init(1);
    s = step(s, [ans(s, 0, W(s))]);
    expect(s.phase).toBe('reveal');
    expect(required(s.players[0]).gained).toBe(0);
  });
  it('A17 multiplayer that drops to one remaining player behaves as solo', () => {
    let s = init(2);
    s = rabakz.leave(s, id(s, 1));
    s = step(s, [ans(s, 0, W(s))]);
    expect(s.phase).toBe('reveal');
  });
  it('A18 layout revision while locked: same revision, options disabled', () => {
    let s = init(3);
    const before = rabakz.controllerLayout(s, id(s, 0));
    s = step(s, [ans(s, 0, W(s))]);
    const after = rabakz.controllerLayout(s, id(s, 0));
    expect(after.revision).toBe(before.revision);
    const answer = after.controls.find((c) => c.id === 'answer');
    expect(answer?.kind === 'options' && answer.options.every((o) => o.state === 'disabled')).toBe(true);
  });
  it('A19 private view leaks nothing about own correctness before reveal beyond spec', () => {
    let s = init(3);
    s = step(s, [ans(s, 0, C(s)), ans(s, 1, W(s))]);
    expect(required(rabakz.privateView(s, id(s, 0))).blocks).toContainEqual({ kind: 'text', text: 'Locked in', tone: 'title' });
    expect(rabakz.publicView(s).players.map((p) => p.answered)).toEqual([false, true, false]);
    expect(rabakz.publicView(s).correct).toBeNull();
    expect(rabakz.publicView(s).wrong).toEqual([W(s)]);
  });
});
describe('more', () => {
  it('A20 joiner during the final announcement plays its first question', () => {
    let s = init(2);
    for (let r = 0; r < 9; r++) { s = step(s, [ctl(s, 'skip')]); s = next(s); }
    expect(s.phase).toBe('final');
    s = rabakz.join(s, { id: 'new', seat: 3, name: 'N', colour: 'seat-3' });
    s = wait(s, 240);
    expect(required(s.players[2]).eligible).toBe(true);
  });
  it('A21 rejoin preserves increasing private revision', () => {
    let s = init(2);
    s = step(s, [ans(s, 1, W(s))]); s = step(s, [ctl(s, 'skip')]);
    const info = required(s.players[1]).info; const r1 = required(rabakz.privateView(s, info.id)).revision;
    s = rabakz.leave(s, info.id); s = rabakz.join(s, info);
    expect(required(rabakz.privateView(s, info.id)).revision).toBeGreaterThan(r1);
  });
});

describe('D-071 review fixes', () => {
  it('RZ-032 exact reveal and scoreboard boundaries work with no leader', () => {
    let s = init();
    for (let round = 0; round < 5; round++) {
      s = step(s, [ctl(s, 'skip')]);
      s = wait(s, 239);
      expect(s.phase).toBe('reveal');
      s = step(s, [], [], null);
    }
    expect(s.phase).toBe('scoreboard');
    const controls = rabakz.controllerLayout(s, id(s, 0)).controls;
    expect(controls[0]).toMatchObject({ id: 'continue', audience: 'leader',
      options: [{ label: 'Continue' }] });
    expect(controls[0]?.kind === 'options' && controls[0].options[0]).not.toHaveProperty('face');
    for (let i = 0; i < 1199; i++) s = step(s, [], [], null);
    expect(s.phase).toBe('scoreboard');
    s = step(s, [], [], null);
    expect(s).toMatchObject({ phase: 'question', round: 5, elapsed: 0 });
    for (let r = 5; r < 9; r++) s = next(step(s, [ctl(s, 'skip')]));
    expect(s.phase).toBe('final');
    s = wait(s, 239);
    expect(s.phase).toBe('final');
    s = step(s, [], [], null);
    expect(s).toMatchObject({ phase: 'question', elapsed: 0 });
    s = next(step(s, [ctl(s, 'skip')]));
    expect(rabakz.isOver(s)).toBe(true);
    expect(step(s)).toBe(s);
  });
  it('RZ-012 departed winner pays the team and never the rejoined player', () => {
    let s = init(4, 10, true);
    const info = required(s.players[0]).info;
    s = step(s, [ans(s, 0, C(s))]);
    s = rabakz.join(rabakz.leave(s, info.id), info);
    s = wait(s, 16);
    expect(s.teamScores[required(info.team)]).toBe(100);
    expect(s.players.find((p) => p.info.id === info.id)).toMatchObject({ score: 0, gained: 0 });
  });
  it('RZ-006 wrong options stay disabled on phones after unlock; host refuses repeats', () => {
    let s = init(2);
    const wrong = W(s);
    s = step(s, [ans(s, 0, wrong), ans(s, 1, W(s, 2))]);
    const layout = rabakz.controllerLayout(s, id(s, 0));
    const answer = layout.controls.find((c) => c.id === 'answer');
    expect(answer?.kind === 'options' && required(answer.options[wrong]).state).toBe('disabled');
    s = step(s, [ans(s, 0, wrong)]);
    expect(required(s.players[0]).pick).toBeNull();
  });
  it('RZ-015 length errors distinguish short and long selected banks', () => {
    const start = (length: number) => rabakz.init(1, makePlayers(2, false), DEFAULT_SETTINGS,
      { data: { [QUESTION_DATA]: questionData(bank(length)) }, saved: null, teams: false });
    expect(() => start(9)).toThrow('bank-too-small');
    expect(() => start(11)).toThrow('bank-too-large');
  });
  it('RZ-010 RZ-011 settings use supplied category titles and readable labels', () => {
    const context = { data: {}, saved: null, teams: false };
    const empty = typeof rabakz.settings === 'function' ? rabakz.settings(context) : rabakz.settings;
    expect(empty.fields.find((f) => f.id === 'categories')).toBeUndefined();
    expect(checkSettingsSchema(empty)).toEqual([]);
    const supplied = { ...context, data: { 'categories.json': [{ id: 'film', title: 'Film and TV' }] } };
    const schema = typeof rabakz.settings === 'function' ? rabakz.settings(supplied) : rabakz.settings;
    expect(schema.fields.find((f) => f.id === 'categories')).toBeUndefined();
    expect(checkSettingsSchema(schema)).toEqual([]);
    const settings = defaultSettings(schema);
    const started = rabakz.init(1, makePlayers(2, false), settings, { ...context, data: { [QUESTION_DATA]: questionData(bank()) } });
    expect(started.settings.categories).toEqual([]);
    expect(schema.fields.find((f) => f.id === 'difficulty')).toMatchObject({ options: [
      { label: 'Easy' }, { label: 'Mixed' }, { label: 'Hard' }] });
  });
  it('RZ-004 future prompts and correct answers are secret; shared option text is safe', () => {
    const s = init();
    const future = required(s.questions[1]);
    const secrets = rabakz.secrets(s);
    expect(secrets).toContainEqual({ owner: null, label: 'future-1-prompt', value: future.prompt });
    expect(secrets.some((secret) => secret.label.includes('-option-'))).toBe(false);
    expect(secrets.some((secret) => secret.label === 'future-1-correct')).toBe(true);
    if (!rabakz.scrambleSecrets) throw new Error('Missing scramble hook');
    const changed = rabakz.scrambleSecrets(s, null, 3);
    expect(required(changed.questions[1]).prompt).not.toBe(future.prompt);
    required(changed.questions[1]).options.forEach((value, index) => { expect(value).not.toBe(future.options[index]); });
    expect(rabakz.publicView(changed)).toEqual(rabakz.publicView(s));
  });
  it('RZ-022 real built-bank questions are accepted unchanged', () => {
    // Copied verbatim from buildBank's general-knowledge chunk (first ten questions).
    const selected = JSON.parse(fs.readFileSync('games/rabakz/src/rules/bank-sample.json', 'utf8')) as Question[];
    const snapshot = JSON.stringify(selected);
    const s = rabakz.init(1, makePlayers(2, false), DEFAULT_SETTINGS,
      { data: { [QUESTION_DATA]: questionData(selected) }, saved: null, teams: false });
    expect(JSON.stringify(selected)).toBe(snapshot);
    s.questions.forEach((q, index) => {
      const original = required(selected[index]);
      expect(q.options[q.correct]).toBe(original.options[original.correct]);
      expect({ ...q, options: original.options, correct: original.correct }).toEqual(original);
    });
  });
  it('RZ-022 RZ-025 accepts unchanged bank-shaped questions (picture metadata sample)', () => {
    // Mirrors content/rabakz/src/schema.ts Question/BuiltPicture; no package dependency.
    const sample: Question = { id: 'bank-picture', type: 'picture', category: 'places',
      difficulty: 'medium', region: 'singapore', prompt: 'Which place is pictured?',
      options: ['First', 'Second', 'Third', 'Fourth'], correct: 2,
      picture: { file: 'place.webp', alt: 'A building', credit: 'Example photographer',
        licence: 'CC BY 4.0', sourceUrl: 'https://example.com/place', bytes: 1234 } };
    const selected = bank().map((q) => ({ ...sample, id: q.id }));
    const snapshot = JSON.stringify(selected);
    const s = rabakz.init(1, makePlayers(2, false), DEFAULT_SETTINGS,
      { data: { [QUESTION_DATA]: questionData(selected) }, saved: null, teams: false });
    expect(JSON.stringify(selected)).toBe(snapshot);
    expect(s.questions.every((q) => q.options[q.correct] === 'Third')).toBe(true);
    expect(rabakz.publicView(s).question?.picture).toEqual({ file: 'place.webp',
      alt: 'A building', credit: 'Example photographer' });
    expect(rabakz.assets(s)).toContainEqual({ key: 'place.webp', kind: 'image' });
  });
});

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("Missing expected value");
  return value;
}

it('RZ-001 RZ-032 a whole match finishes automatically with a null leader', () => {
  let s = init();
  for (let i = 0; i < 21839; i++) s = step(s, [], [], null);
  expect(rabakz.isOver(s)).toBe(false);
  s = step(s, [], [], null);
  expect(rabakz.isOver(s)).toBe(true);
});

it('RZ-012 RZ-016 team results rank totals and assign places', () => {
  const s = { ...init(4, 10, true), teamScores: [100, 200] as const };
  expect(rabakz.results(s).teams).toEqual([
    { team: 1, score: 200, place: 1 }, { team: 0, score: 100, place: 2 },
  ]);
});

it('RZ-006 simultaneous wrong taps on the same enabled option both consume a turn', () => {
  let s = init(3);
  const wrong = W(s);
  s = step(s, [ans(s, 0, wrong), ans(s, 1, wrong)]);
  expect(s.players.slice(0, 2).map((p) => p.pick)).toEqual([wrong, wrong]);
  s = step(s, [ans(s, 2, W(s, 2))]);
  expect(s.players.every((p) => p.pick === null)).toBe(true);
});

describe('round 2', () => {
  it('B1 reveal dwell is exactly 240 steps', () => {
    let s = step(init(), [ctl(init(), 'skip')]);
    s = wait(s, 239); expect(s.phase).toBe('reveal');
    s = step(s); expect(s.phase).toBe('question'); expect(s.round).toBe(1);
  });
  it('B2 scoreboard after 5th, auto at exactly 1200, leader continue earlier, last question ends', () => {
    let s = init();
    for (let r = 0; r < 5; r++) { s = step(s, [ctl(s, 'skip')]); s = wait(s, 240); }
    expect(s.phase).toBe('scoreboard'); expect(s.round).toBe(4);
    const pv = JSON.stringify(rabakz.publicView(s));
    expect(pv.includes('Question 5')).toBe(false);
    const lay = rabakz.controllerLayout(s, id(s, 1));
    expect(lay.controls[0]).toMatchObject({ id: 'continue', audience: 'leader' });
    const j = rabakz.join(s, { id: 'new', seat: 4, name: 'N', colour: 'seat-4' });
    let a = wait(j, 1199); expect(a.phase).toBe('scoreboard');
    a = step(a, [], [], null); expect(a.phase).toBe('question'); expect(a.round).toBe(5);
    expect(required(a.players.find((p) => p.info.id === 'new')).eligible).toBe(true);
    const b = step(s, [ctl(s, 'continue')]); expect(b.phase).toBe('question');
    const c = step(s, [{ player: id(s, 1), control: 'continue', revision: 0 }]); expect(c.phase).toBe('scoreboard');
    let e = a;
    while (e.round < 9 || e.phase === 'final' || e.phase === 'question') { e = step(e, [ctl(e, 'skip')]); if (e.phase === 'final') e = wait(e, 240); if (e.round === 9 && e.phase === 'reveal') break; }
    e = wait(e, 240); expect(e.phase).toBe('over');
  });
  it('B3 solo with a waiting joiner: a wrong answer must still reveal (only first answer scores)', () => {
    let s = step(init(1));
    s = rabakz.join(s, { id: 'new', seat: 2, name: 'N', colour: 'seat-2' });
    s = step(s, [ans(s, 0, W(s))]);
    expect(s.phase).toBe('reveal');
  });
  it('B4 join before the first step is not joinedMidGame', () => {
    const s = rabakz.join(init(2), { id: 'new', seat: 3, name: 'N', colour: 'seat-3' });
    expect(s.players[2]).toMatchObject({ joinedMidGame: false, eligible: true });
  });
  it('B5 picture credit and alt public; assets use file', () => {
    const b = bank(10).map((q) => ({ ...q, type: 'picture' as const, picture: { file: `p-${q.id}.webp`, alt: 'A thing', credit: 'Ann, CC BY 4.0', sourceUrl: 'https://x/merlion', licence: 'CC BY 4.0', bytes: 1 } }));
    const s = rabakz.init(1, makePlayers(2, false), DEFAULT_SETTINGS, { data: { [QUESTION_DATA]: questionData(b) }, saved: null, teams: false });
    const pv = rabakz.publicView(s);
    expect(required(pv.question).picture).toEqual({ file: 'p-q-0.webp', alt: 'A thing', credit: 'Ann, CC BY 4.0' });
    expect(JSON.stringify(pv).includes('merlion')).toBe(false);
    expect(rabakz.assets(s)).toHaveLength(10);
  });
  it('B6 future prompts stay secret and future options are scrambled', () => {
    const s = init();
    const sec = rabakz.secrets(s);
    expect(sec.some((x) => x.value === 'Question 3')).toBe(true);
    const sc = rabakz.scrambleSecrets?.(s, null, 3);
    expect(required(required(sc).questions[3]).prompt).not.toBe('Question 3');
    expect(required(required(sc).questions[0]).prompt).toBe('Question 0');
  });
  it('B7 leader skip then own answer in same step (contract order)', () => {
    const s0 = init();
    const s = step(s0, [ctl(s0, 'skip'), ans(s0, 0, C(s0))]);
    expect(s.phase).toBe('reveal');
    expect(s.firstCorrect).toBeNull();
    expect(required(s.players[0]).gained).toBe(0);
  });
});
function toQuestion(s: State) { let n = 0; while (s.phase !== 'question' && !rabakz.isOver(s) && n++ < 5000) s = step(s, [], [], null); return s; }
describe('fixed harness', () => {
  it('A15b final double + streak = 300; total', () => {
    let s = init(2); let last = 0;
    for (let r = 0; r < 10; r++) { s = toQuestion(s); s = step(s, [ans(s, 0, C(s))]); s = wait(s, 16); last = required(s.players[0]).gained; }
    s = toQuestion(s);
    expect(last).toBe(300); expect(rabakz.isOver(s)).toBe(true);
    expect(required(s.players[0]).score).toBe(100 + 100 + 150 * 7 + 300);
  });
  it('A20b joiner during final announcement plays it', () => {
    let s = init(2);
    for (let r = 0; r < 9; r++) { s = toQuestion(s); s = step(s, [ctl(s, 'skip')]); }
    let n = 0; while (s.phase !== 'final' && n++ < 5000) s = step(s, [], [], null);
    s = rabakz.join(s, { id: 'new', seat: 3, name: 'N', colour: 'seat-3' });
    s = toQuestion(s);
    expect(required(s.players[2]).eligible).toBe(true);
  });
});

it('RZ-032 over layout leaves the end screen to the console', () => {
  expect(rabakz.controllerLayout({ ...init(), phase: 'over' }, id(init(), 0)).controls).toEqual([]);
});
