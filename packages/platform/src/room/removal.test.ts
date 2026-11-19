import { expect, it } from 'vitest';
import { applyHostEvent, applyPhoneEvent, createRoom, publicRoom, LOCAL_CONNECTION } from './room';
import { createHostSnapshotStore, restoreHost } from '../reconnect/host-store';
import { Clock, CODE, MemoryStorage, SECRET } from '../reconnect/testing.fixture';
const token = (n: number) => String(n).repeat(32);
const identity = (n: number) => ({ connectionId: `c${String(n)}`, deviceId: `d${String(n)}`, browserId: token(n), seat: n });
function room() {
  let state = createRoom();
  for (let n = 1; n <= 3; n++) state = applyPhoneEvent(state, identity(n), { type: 'join', name: null, seatToken: token(n + 3) }, 1000).state;
  return state;
}
it('PLAT-011 host removes leader, frees seat and elects the next leader through the leave path', () => {
  const result = applyHostEvent(room(), { type: 'remove', seat: 1 }, 1000);
  expect(result.state.players.map(p => p.seat)).toEqual([2, 3]);
  expect(result.state.leader).toBe(2);
  expect(result.effects).toContainEqual({ type: 'player-left', seat: 1 });
  expect(result.effects).toContainEqual({ type: 'close', connectionId: 'c1', reason: 'removed' });
});
it('PLAT-011 only the connected leader can remove another player', () => {
  const state = room();
  for (const [actor, target] of [[2, 3], [1, 1]]) {
    expect(applyPhoneEvent(state, identity(actor ?? 0), { type: 'remove', seat: target }, 1000).result.ok).toBe(false);
  }
  const removed = applyPhoneEvent(state, identity(1), { type: 'remove', seat: 3 }, 1000).state;
  expect(removed.players).toHaveLength(2);
  expect(JSON.stringify(publicRoom(removed))).not.toContain('blocked');
  expect(JSON.stringify(publicRoom(removed))).not.toContain('browserId');
});
it('PLAT-011 blocks fresh transport joins by browser id and resumes by either credential', () => {
  const state = applyHostEvent(room(), { type: 'remove', seat: 3 }, 1000).state;
  const fresh = { ...identity(3), connectionId: 'new', deviceId: 'new' };
  for (const [id, event] of [
    [fresh, { type: 'join', name: null, seatToken: token(8) }],
    [fresh, { type: 'resume', seatToken: token(8) }],
    [identity(8), { type: 'resume', seatToken: token(6) }],
  ] as const) expect(applyPhoneEvent(state, id, event, 1000).result).toMatchObject({ ok: false, reason: 'removed' });
  expect(applyPhoneEvent(state, identity(8), { type: 'join', name: null, seatToken: token(8) }, 1000).state.players.at(-1)?.seat).toBe(3);
});
it('PLAT-011 keeps blocked identities and seated browser ids through host snapshot restore', async () => {
  const clock = new Clock(); const storage = new MemoryStorage();
  const store = createHostSnapshotStore({ clock, storage, validateSelection: () => true });
  const state = applyHostEvent(room(), { type: 'remove', seat: 3 }, clock.now()).state;
  expect(store.write({ credentials: { code: CODE, hostToken: SECRET }, createdAt: 1000, room: state, scores: {}, results: [], selection: null })).toBe(true);
  const restored = await restoreHost({ clock, store, reopen: () => Promise.resolve({ code: CODE, hostToken: SECRET, reopened: true, link: { stop() { /* No live link in this fake. */ } } }) });
  if (!restored || restored.retryable) throw new Error('Expected restored room');
  expect(restored.room.blocked).toEqual(state.blocked);
  expect(restored.room.players[0]?.browserId).toBe(token(1));
  expect(applyPhoneEvent(restored.room, identity(3), { type: 'resume', seatToken: token(6) }, clock.now()).result).toMatchObject({ reason: 'removed' });
});

it('PLAT-011 retains only the last 64 removed identities', () => {
  let state = createRoom();
  for (let n = 1; n <= 65; n++) {
    state = applyPhoneEvent(state, identity(n), { type: 'join', name: null, seatToken: token(n) }, 1000).state;
    state = applyHostEvent(state, { type: 'remove', seat: 1 }, 1000).state;
  }
  expect(state.blocked).toHaveLength(64);
  expect(state.blocked?.[0]?.browserId).toBe(token(2));
  expect(state.blocked?.at(-1)?.browserId).toBe(token(65));
});

it('PLAT-011 elects a connected phone ahead of an earlier local seat after removal', () => {
  const initial = room();
  const state = { ...initial, players: initial.players.map(p => p.seat === 2 ? { ...p, connectionId: LOCAL_CONNECTION } : p) };
  expect(applyHostEvent(state, { type: 'remove', seat: 1 }, 1000).state.leader).toBe(3);
  const offline = { ...state, players: state.players.map(p => p.seat === 3 ? { ...p, disconnectedAt: 1000 } : p) };
  expect(applyHostEvent(offline, { type: 'remove', seat: 1 }, 1000).state.leader).toBe(2);
});
