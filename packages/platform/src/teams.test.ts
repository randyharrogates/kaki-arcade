import { expect, it } from 'vitest';
import type { PlayerInfo } from './game/types';
import { reconcileTeams, splitTeams, switchTeam } from './teams';
const players = (count: number): PlayerInfo[] => Array.from({ length: count }, (_, i) => ({ id: `p${String(i + 1)}`, seat: i + 1, colour: 'seat-1', name: `Player ${String(i + 1)}` }));
it.each([2, 3, 4, 7, 8])('PLAT-025 balances %i seats with the leader first, deterministically', count => {
  const input = players(count);
  const result = splitTeams(input, count);
  expect(result.find(p => p.seat === count)?.team).toBe(0);
  expect(Math.abs(result.filter(p => p.team === 0).length - result.filter(p => p.team === 1).length)).toBeLessThanOrEqual(1);
  expect(splitTeams([...input].reverse(), count)).toEqual(result);
  expect(input.every(p => p.team === undefined)).toBe(true);
});
it('PLAT-025 switches without mutation and refuses an empty side, allowing uneven teams', () => {
  const split = splitTeams(players(4), 1);
  const moved = switchTeam(split, 'p1', 1);
  expect(moved.reason).toBeNull(); expect(moved.players.find(p => p.id === 'p1')?.team).toBe(1);
  expect(split[0]?.team).toBe(0);
  expect(switchTeam(moved.players, 'p3', 1).reason).toContain('at least one');
  const eight = switchTeam(splitTeams(players(8), 1), 'p1', 1);
  expect(eight.reason).toBeNull(); expect(eight.players.filter(p => p.team === 1)).toHaveLength(5);
  expect(switchTeam(split, 'p1', 1).reason).toBeNull();
});
it('PLAT-025 joins the smaller side, ties red; leaves preserve choices unless a side empties', () => {
  const split = splitTeams(players(4), 1);
  const joined = reconcileTeams(split, players(5), 1);
  expect(joined.find(p => p.seat === 5)?.team).toBe(0);
  expect(reconcileTeams(joined, players(6), 1).find(p => p.seat === 6)?.team).toBe(1);
  const moved = switchTeam(split, 'p1', 1).players;
  const left = reconcileTeams(moved, players(4).filter(p => p.id !== 'p2'), 1);
  expect(left.find(p => p.id === 'p1')?.team).toBe(1);
  const emptied = reconcileTeams(moved, players(4).filter(p => p.id !== 'p3'), 1);
  expect(emptied.filter(p => p.team === 0)).toHaveLength(2);
});
