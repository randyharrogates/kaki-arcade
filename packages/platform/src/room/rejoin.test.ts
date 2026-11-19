import { expect, it } from 'vitest';
import { applyHostEvent, applyPhoneEvent, createRoom, LOCAL_CONNECTION } from './room';
const browserId = 'browser-private-id-123456789';
const first = { browserId, deviceId: 'old', connectionId: 'old' };
const token = 'seat-private-token-123456789';
it.each(['lobby', 'playing'] as const)('PLAT-034 same browser returns to its %s seat, including stale takeover', phase => {
  let room = applyPhoneEvent(createRoom(), first, { type: 'join', name: 'Randy', seatToken: token }, 0).state;
  room = applyHostEvent(room, { type: 'phase', phase, allowRunningJoin: false }, 0).state;
  const fresh = { ...first, deviceId: 'fresh', connectionId: 'fresh' };
  const stale = applyPhoneEvent(room, fresh, { type: 'join', name: 'Randy', seatToken: 'unused-token-123456789' }, 1);
  expect(stale.state.players).toHaveLength(1);
  expect(stale.state.players[0]).toMatchObject({ seat: 1, name: 'Randy', seatToken: token, connectionId: 'fresh' });
  expect(stale.effects).toContainEqual({ type: 'close', connectionId: 'old', reason: 'replaced' });
  room = applyHostEvent(room, { type: 'disconnect', seat: 1 }, 0).state;
  const resumed = applyPhoneEvent(room, fresh, { type: 'join', name: 'Randy', seatToken: 'unused-token-123456789' }, phase === 'playing' ? 200000 : 100000);
  expect(resumed.state.players[0]).toMatchObject({ seat: 1, name: 'Randy', seatToken: token });
  expect(resumed.state.players).toHaveLength(1);
});
it('PLAT-007 lobby still expires after two minutes; running seats stay held until results', () => {
  let room = applyPhoneEvent(createRoom(), first, { type: 'join', name: 'Randy', seatToken: token }, 0).state;
  room = applyHostEvent(room, { type: 'disconnect', seat: 1 }, 0).state;
  expect(applyHostEvent(room, { type: 'expire' }, 120001).state.players).toHaveLength(0);
  room = applyHostEvent(room, { type: 'phase', phase: 'playing', allowRunningJoin: false }, 0).state;
  room = applyHostEvent(room, { type: 'expire' }, 200000).state;
  expect(room.players).toHaveLength(1);
  room = applyHostEvent(room, { type: 'phase', phase: 'results', allowRunningJoin: false }, 200000).state;
  expect(applyHostEvent(room, { type: 'expire' }, 200001).state.players).toHaveLength(0);
});
it('PLAT-034 crafted claims cannot take a connected seat', () => {
  const room = applyPhoneEvent(createRoom(), first, { type: 'join', name: 'Randy', seatToken: token }, 0).state;
  const fresh = { browserId: 'other-browser-123456789', deviceId: 'new', connectionId: 'new' };
  expect(applyPhoneEvent(room, fresh, { type: 'claim', seat: 1, seatToken: 'new-token-123456789' }, 1).result.ok).toBe(false);
  const dropped = applyHostEvent(room, { type: 'disconnect', seat: 1 }, 1).state;
  const result = applyPhoneEvent(dropped, fresh, { type: 'claim', seat: 1, seatToken: 'new-token-123456789' }, 2);
  expect(result.state.players[0]).toMatchObject({ seat: 1, name: 'Randy', browserId, seatToken: 'new-token-123456789', disconnectedAt: null });
});
it('PLAT-011 a phone cannot remove the TV seat; local identities never enter the block list or close effects', () => {
  let room = applyPhoneEvent(createRoom(), first, { type: 'join', name: 'Randy', seatToken: token }, 0).state;
  room = applyPhoneEvent(room, { connectionId: LOCAL_CONNECTION, deviceId: LOCAL_CONNECTION }, { type: 'join', name: null, seatToken: 'local-token-123456789' }, 0).state;
  const result = applyPhoneEvent(room, { ...first, seat: 1 }, { type: 'remove', seat: 2 }, 1);
  expect(result.result.ok).toBe(false); expect(result.state.players).toHaveLength(2);
  expect(result.state.blocked).toBeUndefined(); expect(result.effects).toEqual([]);
});
