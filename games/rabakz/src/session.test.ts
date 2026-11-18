// C-10 review: Rabakz run through createSession and the harness with identical inputs.
import { describe, expect, it } from 'vitest';
import { applyPhoneEvent } from '@kaki/platform';
import { QUESTION_DATA, questionData, rabakz } from './index';
import type { Question } from './index';
import { joinRoom, twin } from '../../../packages/platform/src/session/testing.fixture';

const bank = (n = 10): Question[] => Array.from({ length: n }, (_, i) => ({
  id: `q-${String(i)}`, prompt: `Question ${String(i)}`,
  options: [`Right ${String(i)}`, `Wrong a ${String(i)}`, `Wrong b ${String(i)}`, `Wrong c ${String(i)}`],
  correct: 0, category: 'General', difficulty: 'easy', type: 'multiple-choice', region: 'general',
}));
const context = { data: { 'categories.json': { budgetBytes: 0, categories: [{ id: 'general', title: 'General', region: 'general', plain: { easy: 50, medium: 50, hard: 50 }, pictures: { easy: 0, medium: 0, hard: 0 }, bytes: 0, largestPicture: 0 }] }, [QUESTION_DATA]: questionData(bank()) } };
const settings = { length: 10, difficulty: 'mixed' } as const;

function playRound(t: ReturnType<typeof twin>, limit: number): number {
  let mismatches = 0;
  for (let i = 0; i < limit && !t.session.ended; i++) {
    const view = t.match.publicView() as { phase: string; question?: { options: string[] } | null };
    if (view.phase === 'question' && i % 40 === 5) {
      const options = view.question?.options ?? [];
      for (const p of t.players) {
        const right = options.findIndex(o => o.startsWith('Right'));
        const wrong = options.findIndex(o => o.startsWith('Wrong'));
        t.tap(p.id, 'answer', String(p.seat === 1 ? right : wrong));
      }
    }
    if (view.phase === 'scoreboard' && i % 40 === 7) t.tap('seat-1', 'continue', 'next');
    t.step();
    const [a, b] = t.hashes(); if (a !== b) mismatches++;
  }
  return mismatches;
}

describe('C-10 review: Rabakz through the session runner', { timeout: 60_000 }, () => {
  it.each([[1, false], [8, false], [8, true]] as const)('whole match, %i players, teams %s: same hash as the harness, no leak', (n, teams) => {
    const t = twin({ game: rabakz, seed: 42, players: n, teams, settings, context });
    const mismatches = playRound(t, 30_000);
    expect(t.session.ended).toBe(true);
    expect(t.match.isOver).toBe(true);
    expect(mismatches).toBe(0);
    expect(t.hashes()[0]).toBe(t.hashes()[1]);
    const ev = t.events.find(e => e.type === 'results');
    expect(ev?.type === 'results' && ev.results).toEqual(t.match.results());
    if (teams) expect(ev?.type === 'results' && ev.results.mode).toBe('teams');
    expect(t.leaksFound).toEqual([]);
    expect(ev?.type === 'results' && ev.results.players.find(p => p.id === 'seat-1')?.score).toBeGreaterThan(1000);
    expect(t.transport.sent.length).toBeGreaterThan(20);
  });

  it('privacy across reconnect, leader change and mid-match join (Rabakz)', () => {
    const t = twin({ game: rabakz, seed: 7, players: 3, settings, context });
    for (let i = 0; i < 30; i++) t.step();
    // seat 2 reconnects on a new connection
    let room = applyPhoneEvent(t.room, { deviceId: 'd2', connectionId: 'c2-r' }, { type: 'resume', seatToken: '2'.repeat(32) }, 0).state;
    t.session.updateRoom(room);
    // leader leaves → seat 2 leads
    room = applyPhoneEvent(room, { deviceId: 'd1', connectionId: 'c1', seat: 1 }, { type: 'leave' }, 0).state;
    t.session.updateRoom(room);
    room = joinRoom(room, 4); t.session.updateRoom(room);
    for (let i = 0; i < 600; i++) t.step();
    expect(t.leaksFound).toEqual([]);
    expect(t.session.ended).toBe(false);
  });
});

it('PLAT-008 RZ-014 late seat waits safely, starts next question at zero and preserves existing scores', () => {
  const t = twin({ game: rabakz, seed: 7, players: 2, settings, context });
  t.step();
  const before = t.session.state;
  if (!before) throw new Error('No match');
  const correct = before.questions[0]?.correct;
  t.tap('seat-1', 'answer', String(correct)); t.step();
  const room = joinRoom(t.room, 3); t.session.updateRoom(room);
  expect(t.session.state?.players[2]).toMatchObject({ score: 0, eligible: false, joinedMidGame: true });
  expect(t.transport.lastLayout.get('c3')?.controls.some(c => c.id === 'answer')).toBe(false);
  const existing = t.session.state?.players.slice(0, 2).map(p => p.score);
  expect(existing).toEqual(before.players.map(p => p.score));
  for (let i = 0; i < 1000 && t.session.state?.round === 0; i++) t.step();
  expect(t.session.state?.round).toBe(1);
  expect(t.session.state?.players[2]).toMatchObject({ score: 0, eligible: true });
  expect(t.session.state?.players[0]?.score).toBe(100);
  expect(t.session.state?.players[1]?.score).toBe(0);
  expect(t.transport.lastLayout.get('c3')?.controls.some(c => c.id === 'answer')).toBe(true);
  expect(t.leaksFound).toEqual([]);
  t.session.quit('seat-1', true);
});
