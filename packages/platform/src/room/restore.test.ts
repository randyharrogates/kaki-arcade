import { expect, it } from 'vitest';
import { applyPhoneEvent, createRoom, isRoomLeader } from './room';
import { idn, j, h, res } from './test-helpers';
it('PLAT-006 restored leader returns at +15s after other resumes at +3s and +11s', () => {
  let s = j(j(j(createRoom(), 1, 'A').state, 2, 'B').state, 3, 'C').state;
  s = h(s, { type: 'restore' }, 100000).state;
  s = res(s, 2, 103000).state;
  s = res(s, 3, 111000).state;
  expect(s.leader).toBe(1);
  expect(res(s, 1, 115000).state.leader).toBe(1);
  expect(h(s, { type: 'expire' }, 220001).state.leader).toBe(2);
});
it('PLAT-007 restore prunes seats whose hold already lapsed', () => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'disconnect', seat: 2 }).state;
  s = h(s, { type: 'restore' }, 999999).state;
  expect(s.players.map((p) => p.seat)).toEqual([1]);
});
it('PLAT-006 restored leader explicitly leaving transfers immediately', () => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'restore' }, 100000).state;
  s = res(s, 2, 103000).state;
  s = res(s, 1, 115000).state;
  expect(applyPhoneEvent(s, idn(1, 1), { type: 'leave' }, 115000).state.leader).toBe(2);
});
it('PLAT-007 restore preserves the remaining hold of an already dropped seat', () => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'disconnect', seat: 2 }, 1000).state;
  s = h(s, { type: 'restore' }, 100000).state;
  expect(s.players[1]?.disconnectedAt).toBe(1000);
  expect(h(s, { type: 'expire' }, 121001).state.players.map((p) => p.seat)).toEqual([1]);
});
it.each([false, true])('PLAT-006 restore deadline is first resume plus 20s (dropped=%s)',
  (dropped) => {
    let s = j(j(j(createRoom(), 1, 'A').state, 2, 'B').state, 3, 'C').state;
    if (dropped)
      s = h(s, { type: 'disconnect', seat: 1 }, 0).state;
    s = h(s, { type: 'restore' }, 5000).state;
    s = res(s, 3, 6000).state;
    s = res(s, 2, 15000).state;
    expect(h(s, { type: 'expire' }, 25999).state.leader).toBe(1);
    const r = h(s, { type: 'expire' }, 26000);
    expect(r.state.leader).toBe(2);
    expect(r.effects).toContainEqual({ type: 'leader-changed', leader: 2 });
    expect(res(r.state, 1, 26001).state.leader).toBe(2);
  });
it('PLAT-006 restore without other phones has no leadership deadline', () => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'restore' }, 1000).state;
  expect(h(s, { type: 'expire' }, 60000).state.leader).toBe(1);
  expect(res(s, 1, 60000).state.leader).toBe(1);
});
it('PLAT-009 restoring an empty room succeeds', () => {
  expect(h(createRoom(), { type: 'restore' }, 5).result.ok).toBe(true);
});
it.each([
  [20000, 1],
  [60000, 2],
  [120000, 2],
  [121001, 2],
])('PLAT-006 fresh restore stall probe at %s ms elects seat %s', (now, leader) => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'restore' }, 1000).state;
  s = res(s, 2, 2000).state;
  const r = h(s, { type: 'expire' }, now).state;
  expect(r.leader).toBe(leader);
  expect(isRoomLeader(r, 2)).toBe(leader === 2);
  expect(r.players.some((p) => isRoomLeader(r, p.seat))).toBe(leader === 2);
});
it('PLAT-006 fresh pre-dropped restore stall probe elects seat 2', () => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'disconnect', seat: 1 }, 0).state;
  s = h(s, { type: 'restore' }, 5000).state;
  s = res(s, 2, 6000).state;
  expect(h(s, { type: 'expire' }, 100000).state.leader).toBe(2);
});
it('PLAT-006 restore elects earliest seated connected phone after a seat was reused', () => {
  let s = j(j(j(createRoom(), 1, 'A').state, 2, 'B').state, 3, 'C').state;
  s = applyPhoneEvent(s, idn(2, 2), { type: 'leave' }, 0).state;
  s = j(s, 4, 'D').state;
  expect(s.players.map((p) => p.seat)).toEqual([1, 3, 2]);
  s = h(s, { type: 'restore' }, 1000).state;
  s = res(s, 3, 2000).state;
  s = res(s, 4, 3000).state;
  expect(h(s, { type: 'expire' }, 22000).state.leader).toBe(3);
});
