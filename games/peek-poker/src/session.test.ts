// C-10 review: Peek Poker through createSession and the harness with identical inputs; privacy.
import { describe, expect, it } from 'vitest';
import { applyHostEvent, applyPhoneEvent } from '@kaki/platform';
import { peekPoker } from './rules/game';
import { joinRoom, twin } from '../../../packages/platform/src/session/testing.fixture';

interface V { phase: string; round: number }
function play(t: ReturnType<typeof twin>, limit: number): number {
  let mismatches = 0;
  const plan = new Map<string, number>();
  for (let i = 0; i < limit && !t.session.ended; i++) {
    const view = t.match.publicView() as V;
    if (view.phase === 'pick') for (const p of t.players) {
      const key = `${p.id}:${String(view.round)}`;
      if (!plan.has(key)) { plan.set(key, 0); plan.set(p.id, 0); }
      const done = (plan.get(key) ?? 0);
      if (done === 0) t.tap(p.id, 'grid', p.seat - 1);
      if (done === 1) t.tap(p.id, 'grid', p.seat + 7);
      if (done === 2) t.tap(p.id, 'lock', 'go');
      plan.set(key, done + 1);
    }
    t.step();
    const [a, b] = t.hashes(); if (a !== b) mismatches++;
  }
  return mismatches;
}

describe('C-10 review: Peek Poker through the session runner', { timeout: 60_000 }, () => {
  it.each([1, 8])('whole 3-round match at %i players: same hash as harness, no leak', (n) => {
    const t = twin({ game: peekPoker, seed: 42, players: n, settings: { rounds: 3 } });
    const mismatches = play(t, 20_000);
    expect(t.session.ended).toBe(true);
    expect(mismatches).toBe(0);
    const ev = t.events.find(e => e.type === 'results');
    expect(ev?.type === 'results' && ev.results).toEqual(t.match.results());
    expect(t.leaksFound).toEqual([]);
    expect((t.match.publicView() as V).round).toBe(3);
    // Picks were actually made and locked through the runner.
    expect(t.transport.sent.some(s => s.type === 'layout' && JSON.stringify(s.value).includes('"watch"'))).toBe(true);
  });

  it('privacy: reconnect, leader change, mid-match join; picks never reach another phone', () => {
    const t = twin({ game: peekPoker, seed: 9, players: 4, settings: { rounds: 3 } });
    let room = t.room;
    for (let i = 0; i < 4000 && !t.session.ended; i++) {
      const view = t.match.publicView() as V;
      if (view.phase === 'pick' && i % 3 === 0) for (const p of t.players) t.tap(p.id, 'grid', (p.seat * 3 + i) % 16);
      if (i === 500) { room = applyPhoneEvent(room, { deviceId: 'd3', connectionId: 'c3-r' }, { type: 'resume', seatToken: '3'.repeat(32) }, 0).state; t.session.updateRoom(room); }
      if (i === 900) { room = applyHostEvent(room, { type: 'disconnect', seat: 1 }, 0).state; t.session.updateRoom(room);
        room = applyHostEvent(room, { type: 'expire' }, 20000).state; t.session.updateRoom(room); }
      if (i === 1300) { room = joinRoom(room, 5); t.session.updateRoom(room); }
      t.step();
    }
    expect(t.leaksFound).toEqual([]);
  });
});

it('PLAT-007 reconnected real Peek Poker phone can pick immediately without ack', () => {
  const t = twin({ game: peekPoker, seed: 9, players: 2, settings: { rounds: 3 } });
  for (let i = 0; i < 2000 && t.match.publicView().phase !== 'pick'; i++) t.step();
  expect(t.match.publicView().phase).toBe('pick');
  t.transport.receive({ type: 'connection', connectionId: 'c2', connected: false });
  t.transport.receive({ type: 'connection', connectionId: 'c2', connected: true });
  t.tap('seat-2', 'grid', 3); t.step();
  expect(t.hashes()[0]).toBe(t.hashes()[1]);
  expect(t.session.state?.players.find(p => p.info.id === 'seat-2')?.picks).toEqual([3]);
});
