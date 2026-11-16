import { expect, it } from 'vitest';
import { applyPhoneEvent, createRoom, publicRoom, isRoomLeader, RECONNECT_WINDOW_MS } from './room';
import { token, identity, join, host, resume, tok, j, h, res } from './test-helpers';
it('PLAT-003 A7/A8 clamps finite clocks and refuses only non-finite clocks', () => {
  const s = join(createRoom(), 1, 'A', 1000).state;
  expect(join(s, 2, 'B', 999).state.clock).toBe(1000);
  expect(join(createRoom(), 1, 'A', 12.5).state.clock).toBe(12);
  for (const n of [NaN, Infinity, -Infinity])
    expect(host(s, { type: 'expire' }, n).result).toMatchObject({
      reason: 'bad-clock',
      hostInternal: true
    });
});
it('PLAT-006 A10/A15 leadership grace and leave', () => {
  const s = join(join(createRoom(), 1).state, 2).state;
  const drop = host(s, { type: 'disconnect', seat: 1 }, 10).state;
  expect(resume(drop, 1, 1010).state.leader).toBe(1);
  expect(resume(drop, 1, 10010).state.leader).toBe(2);
  expect(host(drop, { type: 'expire' },
    10010).effects).toContainEqual({ type: 'leader-changed', leader: 2 });
  expect(applyPhoneEvent(s, identity(1, 1), { type: 'leave' }, 0).state.leader).toBe(2);
  let all = s;
  for (const seat of [1, 2])
    all = host(all, { type: 'disconnect', seat }, 5).state;
  expect(all.leader).toBe(1);
  expect(resume(all, 2, 7).state.leader).toBe(1);
  expect(host(resume(all, 2, 7).state, { type: 'expire' }, 10005).state.leader).toBe(2);
});
it('PLAT-007 A11/A13 channel replacement and repeated hello', () => {
  const s = join(createRoom(), 1).state;
  expect(resume(s, 1, 0, 'new').effects).toContainEqual({
    type: 'close',
    connectionId: 'c1', reason: 'replaced'
  });
  const r = applyPhoneEvent(s, identity(1), {
    type: 'join', seatToken: token(2),
    name: 'Other'
  }, 0);
  expect(r.state.players).toHaveLength(1);
  expect(r.state.players[0]?.seatToken).toBe(token(1));
  const json = JSON.stringify(publicRoom(s));
  expect(json).not.toContain(token(1));
  expect(json).not.toContain('seatToken');
});
it('PLAT-008 A12 trusted policy and mid-game join', () => {
  const s = join(createRoom(), 1).state;
  expect(applyPhoneEvent(s, identity(1, 1), {
    type: 'phase', phase: 'playing',
    allowRunningJoin: true
  }, 0).result.ok).toBe(false);
  expect(host(s, { type: 'phase', phase: 'playing' }).result.ok).toBe(false);
  for (const phase of [
    'playing',
    'paused',
  ])
    for (const allowRunningJoin of [true, false]) {
      const r = join(host(s, { type: 'phase', phase, allowRunningJoin }).state, 2);
      expect(r.result.ok).toBe(allowRunningJoin);
      if (allowRunningJoin)
        expect(r.state.players[1]?.midGameJoin).toBe(true);
    }
  expect(applyPhoneEvent(s, identity(2, 2), { type: 'leave', seat: 1 },
    0).state.players).toHaveLength(1);
  const team = host(s, { type: 'team', seat: 1, team: 'red' }).state;
  expect(host(team, {
    type: 'quality', seat: 1,
    quality: { ping: 42 }
  }).state.players[0]).toMatchObject({ team: 'red', quality: { ping: 42 } });
});
it('PLAT-003 A14/A18 malformed data and throwing getters produce host-internal refusal', () => {
  for (const e of [null, {}, { type: 'join', name: 'x', seatToken: 'a'.repeat(129) },
    { type: 'join', seatToken: token(1), get name() { throw new Error('x'); } }])
    expect(applyPhoneEvent(createRoom(), identity(1), e,
      0).result).toMatchObject({ ok: false, hostInternal: true });
});
it('PLAT-007 held seat expiry boundaries', () => {
  let s = createRoom();
  for (let i = 1; i <= 8; i++)
    s = join(s, i).state;
  s = host(s, { type: 'disconnect', seat: 1 }).state;
  expect(join(s, 9).result).toMatchObject({ reason: 'room-full', hostInternal: false });
  expect(resume(s, 1, RECONNECT_WINDOW_MS).result.ok).toBe(true);
  const r = join(s, 9, 'New', RECONNECT_WINDOW_MS + 1);
  expect(r.state.players.at(-1)?.seat).toBe(1);
  expect(r.effects).toContainEqual({ type: 'seat-expired', seat: 1 });
  expect(resume(s, 1, RECONNECT_WINDOW_MS + 1).result).toMatchObject({ reason: 'seat-expired' });
});
it('PLAT-003 eight null joins produce corresponding default names', () => {
  let s = createRoom();
  for (let i = 1; i <= 8; i++)
    s = j(s, i, null).state;
  expect(s.players.map((p) => [p.seat, p.name])).toEqual(Array.from({ length: 8 }, (_,
    i) => [i + 1, `Player ${String(i + 1)}`]));
});
it('PLAT-007 resume moves device ownership and prevents old device steal back', () => {
  let s = j(createRoom(), 1, 'A').state;
  s = applyPhoneEvent(s, { deviceId: 'dB', connectionId: 'cB' }, {
    type: 'resume',
    seatToken: tok(1)
  }, 0).state;
  const r = applyPhoneEvent(s, { deviceId: 'd1', connectionId: 'cA2' }, {
    type: 'join',
    seatToken: tok(7), name: 'Other'
  }, 0);
  expect(r.state.players[0]).toMatchObject({ deviceId: 'dB', connectionId: 'cB' });
  expect(r.state.players[1]?.name).toBe('Other');
});
it('PLAT-003 join on seated connection ignores claimed seat and name', () => {
  const s = j(createRoom(), 1, 'A').state;
  const r = applyPhoneEvent(s, { deviceId: 'dZ', connectionId: 'c1', seat: 1 },
    { type: 'join', seatToken: tok(9), name: 'Hijack' }, 0);
  expect(r.state.players[0]).toEqual(s.players[0]);
});
it('PLAT-008 joining results phase is allowed', () => {
  const s = h(createRoom(), { type: 'phase', phase: 'results', allowRunningJoin: false }).state;
  expect(j(s, 1, 'A').result.ok).toBe(true);
});
it('PLAT-007 public projection contains no private credentials', () => {
  const json = JSON.stringify(publicRoom(j(createRoom(), 1, 'A').state));
  for (const key of [
    'seatToken',
    'deviceId',
    'connectionId',
  ])
    expect(json).not.toContain(key);
});
it('PLAT-003 forged leave cannot target another seat', () => {
  const s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  expect(applyPhoneEvent(s, { deviceId: 'd2', connectionId: 'c2', seat: 1 },
    { type: 'leave' }, 0).state.players).toHaveLength(2);
});
it('PLAT-006 disconnected successor is not leader within grace', () => {
  const s = h(j(j(createRoom(), 1, 'A').state, 2, 'B').state, {
    type: 'disconnect',
    seat: 1
  }, 0).state;
  expect(isRoomLeader(s, 2)).toBe(false);
  expect(s.leader).toBe(1);
});
it('PLAT-006 all dropped then successor returns outside grace', () => {
  let s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  s = h(s, { type: 'disconnect', seat: 1 }, 0).state;
  s = h(s, { type: 'disconnect', seat: 2 }, 0).state;
  expect(res(s, 2, 20000).state.leader).toBe(2);
});
