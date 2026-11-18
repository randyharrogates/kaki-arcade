// C-10 review: Peek Poker through createSession and the harness with identical inputs; privacy.
import { describe, expect, it } from 'vitest';
import type { ControllerLayout, PrivateView } from '@kaki/platform';
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


it.each([1, 2, 8])('PP-020 inspects every host send during a scripted round with %i phones', count => {
  const t = twin({ game: peekPoker, seed: 42, players: count, settings: { rounds: 3 } });
  let cursor = 0;
  let pickingSteps = 0;
  let inspected = 0;
  const phase = () => t.session.state?.phase;
  while (phase() !== 'reveal' && t.session.step < 4000) {
    const state = t.session.state;
    if (state?.phase === 'pick') {
      for (const p of t.players) {
        if (pickingSteps === 0) t.tap(p.id, 'grid', p.seat - 1);
        if (pickingSteps === 1) t.tap(p.id, 'grid', p.seat + 7);
        // Leave the final phone unlocked so multiplayer also sends the locked view.
        if (pickingSteps === 2 && p.seat < count) t.tap(p.id, 'lock', 'go');
      }
      pickingSteps++;
    }
    t.step();
    if (phase() === 'reveal') break;
    for (const sent of t.transport.sent.slice(cursor)) {
      const payload = sent.value as ControllerLayout | PrivateView | null;
      const seat = Number(sent.connection.slice(1));
      if (payload && 'controls' in payload) for (const control of payload.controls) {
        expect(control.kind).not.toBe('cards');
        if (control.kind === 'grid') for (const [index, cell] of control.cells.entries()) {
          expect(cell.faceDown).toBe(true);
          expect(cell.label).toBeUndefined(); expect('mark' in cell).toBe(false);
          if (cell.state === 'selected') expect([seat - 1, seat + 7]).toContain(index);
        }
      }
      if (payload && 'blocks' in payload) expect(payload.blocks.every(b => b.kind !== 'cards' && b.kind !== 'grid')).toBe(true);
      inspected++;
    }
    cursor = t.transport.sent.length;
    const publicView = peekPoker.publicView(t.session.state ?? t.match.state);
    expect(publicView.players.every(p => p.picks === null)).toBe(true);
    expect(publicView.hands).toEqual([]);
  }
  expect(t.session.state?.phase).toBe('reveal');
  expect(inspected).toBeGreaterThan(count);
  expect(t.leaksFound).toEqual([]);
}, 60000);

it('PLAT-008 PP-013 late seat has no cards or picks until next round and starts at zero', () => {
  const t = twin({ game: peekPoker, seed: 7, players: 2, settings: { rounds: 3 } });
  t.step();
  const existing = t.session.state?.players.map(p => p.score);
  t.session.updateRoom(joinRoom(t.room, 3));
  expect(t.session.state?.players[2]).toMatchObject({ score: 0, waiting: true, joinedMidGame: true });
  expect(t.session.state?.players.slice(0, 2).map(p => p.score)).toEqual(existing);
  expect(t.transport.lastLayout.get('c3')?.controls.map(c => c.id)).toEqual(['wait']);
  t.transport.tap('c3', 'grid', 1); t.step();
  expect(t.session.state?.players[2]?.picks).toEqual([]);
  for (let i = 0; i < 6000 && t.session.state?.round === 1; i++) t.step();
  expect(t.session.state?.round).toBe(2);
  expect(t.session.state?.players[2]).toMatchObject({ score: 0, waiting: false });
  expect(t.session.state?.players.slice(0, 2).map(p => p.score)).toEqual(t.match.state.players.map(p => p.score));
  expect(t.leaksFound).toEqual([]);
  t.session.quit('seat-1', true);
});
