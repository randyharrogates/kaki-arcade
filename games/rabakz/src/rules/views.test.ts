import { describe, expect, it } from 'vitest';
import { layoutFor } from '@kaki/platform/layout';
import { placeController, textHeight, optionLabelStep } from '@kaki/platform/private-placement';
import { twin } from '../../../../packages/platform/src/session/testing.fixture';
import { QUESTION_DATA, questionData, rabakz } from '../index';
import type { Question, State } from '../index';
import { controllerLayout, privateView } from './views';

const bank: Question[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i), prompt: 'Which option?', options: ['Right', 'Wrong one', 'Wrong two', 'Wrong three'],
  correct: 0, category: 'General', difficulty: 'easy', type: 'multiple-choice', region: 'general',
}));
const options = { game: rabakz, seed: 42, settings: { length: 10, difficulty: 'mixed' } as const,
  context: { data: { 'categories.json': { budgetBytes: 0, categories: [{ id: 'general', title: 'General', region: 'general', plain: { easy: 50, medium: 50, hard: 50 }, pictures: { easy: 0, medium: 0, hard: 0 }, bytes: 0, largestPicture: 0 }] }, [QUESTION_DATA]: questionData(bank) } } };
function own(state: State, pick: number | null): State {
  return { ...state, wrong: pick !== null && pick !== state.questions[state.round]?.correct ? [pick] : [], players: state.players.map((p, i) => i ? p : { ...p, pick, answers: pick === null ? [] : [pick] }) };
}
describe.each([1, 2, 8])('RZ-003 / RZ-005 phones, %i players', count => {
  it('shows shapes and option text, own lock-out, waiting, reveal and leader-only skip', () => {
    const t = twin({ ...options, players: count });
    const state = t.match.state, id = t.players[0]?.id ?? '';
    const answer = controllerLayout(state, id).controls[0];
    expect(answer?.kind).toBe('options');
    if (answer?.kind !== 'options') throw new Error('Missing answers');
    expect(answer.options.map(o => o.face)).toEqual(['face-bottom', 'face-right', 'face-left', 'face-top']);
    expect(answer.options.map(o => o.label)).toEqual(state.questions[0]?.options);
    expect(layoutFor(controllerLayout(state, id), true).controls.map(c => c.id)).toContain('skip');
    expect(layoutFor(controllerLayout(state, id), false).controls.map(c => c.id)).not.toContain('skip');
    const wrong = ((state.questions[0]?.correct ?? 0) + 1) % 4;
    const locked = own(state, wrong);
    expect(JSON.stringify(privateView(locked, id))).toContain('Locked out');
    expect(JSON.stringify(privateView(locked, id))).toContain('Wait until everyone');
    expect(JSON.stringify(privateView(locked, id))).not.toContain('Watch the TV for the reveal');
    const otherPhone = controllerLayout({ ...state, wrong: [wrong] }, id).controls[0];
    expect(otherPhone?.kind === 'options' && otherPhone.options[wrong]?.state).toBe('disabled');
    expect(JSON.stringify(controllerLayout(locked, id))).toContain('disabled');
    expect(controllerLayout(own(locked, null), id)).toEqual(controllerLayout(state, id));
    const correct = own(state, state.questions[0]?.correct ?? 0);
    expect(JSON.stringify(privateView(correct, id))).toContain('Locked in');
    for (const phase of ['final', 'reveal', 'scoreboard', 'over'] as const) {
      const view = privateView({ ...correct, phase }, id);
      expect(view).not.toBeNull();
      if (phase === 'reveal') {
        expect(JSON.stringify(view)).toContain('Right');
        expect(JSON.stringify(view)).toContain('Points gained');
        expect(view?.blocks[0]).toMatchObject({text:'Right',tone:'title'});
        expect(view?.blocks[1]).toMatchObject({label:'Points gained'});
        expect(view?.blocks[2]?.kind === 'text' && view.blocks[2].text).toContain('Streak');
        expect(view?.blocks[3]?.kind === 'text' && view.blocks[3].text).toContain('Score');
      }
      expect(controllerLayout({ ...correct, phase }, id).controls.some(c => c.id === 'answer')).toBe(false);
    }
    expect(JSON.stringify(privateView({ ...locked, phase: 'reveal' }, id))).toContain('Wrong');
    expect(JSON.stringify(privateView({ ...state, players: state.players.map(p => ({ ...p, eligible: false })) }, id))).toContain('You join at the next question');
  });
  it('does not disclose other players’ choices in any phase', () => {
    const t = twin({ ...options, players: count });
    const state = t.match.state, id = t.players[0]?.id ?? '';
    for (const phase of ['question', 'final', 'reveal', 'scoreboard', 'over'] as const) {
      const original = { ...state, phase };
      const changed = { ...original, players: original.players.map((p, i) => i ? { ...p, pick: 2, answers: [2] } : p) };
      expect(controllerLayout(changed, id)).toEqual(controllerLayout(original, id));
      expect(privateView(changed, id)).toEqual(privateView(original, id));
    }
  });
  it('sends one layout per phone on stable answering, locked, unlocked and reveal phases', () => {
    const t = twin({ ...options, players: count });
    const settle = () => { for (let i = 0; i < 30; i++) t.step(); };
    settle();
    expect(t.transport.sent.filter(s => s.type === 'layout')).toHaveLength(count);
    const before = t.transport.sent.filter(s => s.type === 'layout').length;
    settle();
    expect(t.transport.sent.filter(s => s.type === 'layout')).toHaveLength(before);
    const right = t.match.state.questions[0]?.correct ?? 0;
    t.tap(t.players[0]?.id ?? '', 'answer', String((right + 1) % 4)); t.step();
    const locked = t.transport.sent.filter(s => s.type === 'layout').length;
    if (count > 1) {
      settle(); expect(t.transport.sent.filter(s => s.type === 'layout')).toHaveLength(locked);
      for (const p of t.players.slice(1)) t.tap(p.id, 'answer', String((right + 2) % 4));
      t.step(); settle();
      const unlocked = t.transport.sent.filter(s => s.type === 'layout').length;
      settle(); expect(t.transport.sent.filter(s => s.type === 'layout')).toHaveLength(unlocked);
      t.tap(t.players[0]?.id ?? '', 'answer', String(right)); t.step();
    }
    settle();
    const revealed = t.transport.sent.filter(s => s.type === 'layout').length;
    settle(); expect(t.transport.sent.filter(s => s.type === 'layout')).toHaveLength(revealed);
    for (const p of t.players) {
      const layouts = t.transport.sent.filter(s => s.type === 'layout' && s.connection === `c${String(p.seat)}`);
      for (let i = 1; i < layouts.length; i++) expect(layouts[i]?.value).not.toEqual(layouts[i - 1]?.value);
    }
  });
});
const longOptions = [
  'Another long reply with forty characters',
  'These words fill the last lengthy option',
  'A lovely hot bowl of noodles with prawns',
  'The top place to meet friends for dinner',
];
for (const [width, height] of [[667,375], [844,390]] as const) for (const leader of [true,false]) {
  it(`RZ-003 four 40-character options fit real ${String(width)} ${leader ? 'leader' : 'guest'} placement`, () => {
    const t = twin({ ...options, players: 2 });
    const state = { ...t.match.state, questions: t.match.state.questions.map(q => ({ ...q, options: longOptions })) };
    const id = t.players[0]?.id ?? '';
    // Shipped play area (667 × 307 is the smaller supported content box).
    const area = { width, height: height - 68 };
    const placed = placeController(controllerLayout(state,id),privateView(state,id),area,leader,{}, {width,height});
    expect(placed.fits).toBe(true);
    const answer = placed.parts.find(p => p.control.id === 'answer');
    if (!answer) throw new Error('Missing answer placement');
    const box = {width:(answer.width-placed.gap)/2,height:(answer.height-placed.gap)/2};
    expect(optionLabelStep('Short',box.width,box.height,true)).toBe(34);
    for (const label of longOptions) {
      expect(label.length).toBeGreaterThanOrEqual(38);
      expect(label.length).toBeLessThanOrEqual(40);
      expect(optionLabelStep(label,box.width,box.height,true)).not.toBeNull();
      expect(textHeight(label,21,box.width-12-34,true)).toBeLessThanOrEqual(Math.ceil(3*21*1.3));
    }
    expect(placed.parts.some(p => p.control.id === 'skip')).toBe(leader);
    const skip = placed.parts.find(p => p.control.id === 'skip');
    if (skip) {
      expect(skip.left-answer.left-answer.width).toBeGreaterThanOrEqual(34);
      expect(skip.left+skip.width).toBe(width-placed.margin);
      expect(skip.width).toBeGreaterThanOrEqual(89);
      expect(skip.height).toBeGreaterThanOrEqual(68);
    }
  });
}
it('RZ-005 leader tie-window layout and private view reveal no firstCorrect or winners', () => {
  const t = twin({ ...options, players: 2 });
  const state = t.match.state, id = t.players[0]?.id ?? '';
  const changed = {...state, firstCorrect: state.tick, winners: state.players.slice(1)};
  expect(layoutFor(controllerLayout(changed,id),true)).toEqual(layoutFor(controllerLayout(state,id),true));
  expect(privateView(changed,id)).toEqual(privateView(state,id));
});
it('RZ-005 skipped reveal has no invented pick; scoreboard and end show shared placing and total', () => {
  const t = twin({ ...options, players: 2 });
  const state = t.match.state, id = t.players[0]?.id ?? '';
  const reveal = privateView({...state,phase:'reveal'},id);
  expect(reveal?.blocks[0]).toMatchObject({text:'Skipped'});
  expect(reveal?.blocks).toHaveLength(4);
  for (const phase of ['scoreboard','over'] as const) {
    const scored = {...state,phase,players:state.players.map((p,i) => ({...p,score:i ? 800 : 700}))};
    expect(privateView(scored,id)?.blocks).toEqual([{kind:'text',tone:'title',text:'2nd · 700'}]);
  }
});
it('RZ-005 status remains at least as large as every secondary line at both phone sizes', () => {
  const t = twin({ ...options, players: 2 });
  const state = t.match.state, id = t.players[0]?.id ?? '';
  for (const [width,height] of [[667,375],[844,390]] as const) {
    for (const phase of ['question','reveal'] as const) {
      const current = {...own(state,state.questions[0]?.correct ?? 0),phase};
      const placed = placeController(controllerLayout(current,id),privateView(current,id),
        {width,height:height-68},true,{}, {width,height});
      expect(placed.fits).toBe(true);
      const steps = placed.metrics?.steps ?? [];
      expect(steps[0]).toBe(34);
      expect(steps.slice(1).every(step => step <= (steps[0] ?? 0))).toBe(true);
      if (phase === 'reveal') expect(steps.slice(0,4)).toEqual([34,34,21,21]);
    }
  }
});

it('RZ-005 keeps long-option locked statuses in a fitting private strip', () => {
  const t = twin({ ...options, players: 2 });
  for (const lastOption of ['The top place to meet friends for dinner', 'Cretaceous-Paleogene']) {
  const state = { ...t.match.state, questions: t.match.state.questions.map(q => ({ ...q, options: [
    'Musical Interface of Digital Instruments',
    'Another long reply with forty characters',
    'A lovely hot bowl of noodles with prawns',
    lastOption,
  ] })) };
  const id = t.players[0]?.id ?? '';
  for (const [width,height] of [[667,375],[844,390],[932,430]] as const) {
    const correct = state.questions[0]?.correct ?? 0;
    for (const [phase,pick,label] of [
      ['question',correct,'Locked in'], ['question',(correct+1)%4,'Locked out'],
      ['reveal',correct,'Right'], ['reveal',(correct+1)%4,'Wrong'], ['reveal',null,'Skipped'],
    ] as const) {
      const current = {...own(state,pick),phase};
      const view = privateView(current,id);
      const placed = placeController(controllerLayout(current,id),view,
        {width,height:height-68},true,{}, {width,height});
      expect(view?.blocks[0]).toMatchObject({kind:'text',tone:'title',text:label});
      expect(placed.fits, `${lastOption}: ${String(width)} x ${String(height)} ${label}`).toBe(true);
      expect(placed.panel).not.toBeNull();
      if (width === 667 && phase === 'question') expect(placed.metrics?.widths).toHaveLength(3);
      if (placed.metrics?.widths) {
        expect(placed.panel.height).toBe(55);
        expect(placed.metrics.widths.reduce((sum,w) => sum+w,0)+2*placed.gap).toBeCloseTo(width-26);
        expect(placed.metrics.heights).toEqual([55,55,55]);
        expect(placed.metrics.steps[0]).toBeGreaterThanOrEqual(21);
      }
    }
  }
  }
});

it('RZ-003 keeps the four short names at 34 in the shipped 844 guest cells', () => {
  const names = ['Christopher Walken','David Hasselhoff','Jerry Springer','Patrick Swayze'];
  const t = twin({ ...options,players:2 });
  const state = { ...t.match.state,questions:t.match.state.questions.map(q => ({ ...q,options:names })) };
  const id = t.players[0]?.id ?? '';
  const placed = placeController(controllerLayout(state,id),privateView(state,id),{ width:844,height:322 },false,{}, { width:844,height:390 });
  const answer = placed.parts.find(p => p.control.id === 'answer');
  if (!answer) throw new Error('Missing answers');
  expect(placed.fits).toBe(true);
  expect(answer).toMatchObject({ left:13,top:81,width:813,height:228 });
  expect(placed.gap).toBe(8);
  expect(names.map(label => optionLabelStep(label,(answer.width-placed.gap)/2,(answer.height-placed.gap)/2,true))).toEqual([34,34,34,34]);
});
