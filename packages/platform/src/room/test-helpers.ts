import { expect } from 'vitest';
import { checkNickname } from '@kaki/protocol';
import { applyHostEvent, applyPhoneEvent } from './room';
import type { RoomState } from './room';
import { hasBlockedWord, nameSkeleton } from './blocked-words';
export const token = (id: number) => `attack_token_${String(id).padStart(6, '0')}`;
export const identity = (id: number, seat?: number) => ({
  deviceId: `d${String(id)}`,
  connectionId: `c${String(id)}`,
  ...(seat === undefined ? {} : { seat }),
});
export const join = (
  s: RoomState, id: number, name: string | null = `P${String(id)}`, now = s.clock,
) => applyPhoneEvent(s, identity(id), { type: 'join', seatToken: token(id), name }, now);
export const host = (s: RoomState, e: unknown, now = s.clock) => applyHostEvent(s, e, now);
export const resume = (s: RoomState, id: number, now: number,
  connectionId = `c${String(id)}`) => applyPhoneEvent(s, { ...identity(id), connectionId }, {
    type: 'resume',
    seatToken: token(id)
  }, now);
export const tok = (id: number) => `probe_token_${String(id).padStart(6, '0')}`;
export const idn = (id: number, seat?: number) => ({
  deviceId: `d${String(id)}`, connectionId: `c${String(id)}`, ...(seat ? { seat } : {}),
});
export const j = (s: RoomState, id: number, name: string | null,
  now = s.clock) => applyPhoneEvent(s, idn(id), { type: 'join', seatToken: tok(id), name }, now);
export const h = (s: RoomState, event: unknown, now = s.clock) => applyHostEvent(s, event, now);
export const res = (s: RoomState, id: number, now: number) => applyPhoneEvent(s, idn(id),
  { type: 'resume', seatToken: tok(id) }, now);
export function invariants(s: RoomState) {
  expect(s.players.length).toBeLessThanOrEqual(8);
  expect(new Set(s.players.map((p) => p.seat)).size).toBe(s.players.length);
  expect(new Set(s.players.map((p) => nameSkeleton(p.name))).size).toBe(s.players.length);
  for (const p of s.players) {
    expect(checkNickname(p.name)).toBe('ok');
    expect(hasBlockedWord(p.name)).toBe(false);
    expect(p.seat).toBeGreaterThanOrEqual(1);
    expect(p.seat).toBeLessThanOrEqual(8);
    expect(p.colour).toBe(p.seat - 1);
  }
  const leader = s.players.find((p) => p.seat === s.leader);
  if (leader?.awaitingRestore && leader.restoreDeadline !== undefined)
    expect(s.clock).toBeLessThan(leader.restoreDeadline);
  if (s.players.some((p) => p.disconnectedAt === null))
    expect(leader).toBeDefined();
  if (!leader?.awaitingRestore && leader?.disconnectedAt !== null &&
    leader?.disconnectedAt !== undefined)
    expect(s.clock - leader.disconnectedAt).toBeLessThan(10000);
}
