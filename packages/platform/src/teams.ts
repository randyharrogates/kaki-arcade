import type { PlayerInfo, TeamId } from './game/types';

/** PLAT-025: stable seat order, with the leader taking the first (red) place. */
export function splitTeams(players: readonly PlayerInfo[], leader: number | null): PlayerInfo[] {
  const order = [...players].sort((a, b) => Number(b.seat === leader) - Number(a.seat === leader) || a.seat - b.seat);
  const teams = new Map(order.map((p, i) => [p.id, (i % 2) as TeamId]));
  return [...players].sort((a, b) => a.seat - b.seat).map(p => ({ ...p, team: teams.get(p.id) ?? 0 }));
}
export function switchTeam(players: readonly PlayerInfo[], id: string, team: TeamId): { players: readonly PlayerInfo[]; reason: string | null } {
  const player = players.find(p => p.id === id);
  if (!player || player.team === team) return { players, reason: null };
  if (players.filter(p => p.team === player.team).length <= 1) return { players, reason: `${player.team === 0 ? 'Red' : 'Blue'} needs at least one player.` };
  return { players: players.map(p => p.id === id ? { ...p, team } : p), reason: null };
}
/** Preserve choices on join/leave; only an empty team causes a fresh balanced split. */
export function reconcileTeams(previous: readonly PlayerInfo[], players: readonly PlayerInfo[], leader: number | null): PlayerInfo[] {
  const next: PlayerInfo[] = [];
  for (const p of [...players].sort((a, b) => a.seat - b.seat)) {
    const old = previous.find(old => old.id === p.id);
    if (old?.team !== undefined) next.push({ ...p, team: old.team });
  }
  for (const p of [...players].sort((a, b) => a.seat - b.seat)) if (!next.some(known => known.id === p.id)) {
    const red = next.filter(p => p.team === 0).length;
    next.push({ ...p, team: red <= next.length - red ? 0 : 1 });
  }
  return next.length > 1 && (!next.some(p => p.team === 0) || !next.some(p => p.team === 1))
    ? splitTeams(next, leader) : next.sort((a, b) => a.seat - b.seat);
}
