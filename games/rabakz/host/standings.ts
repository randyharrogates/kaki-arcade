import { COLOUR_TOKENS } from '@kaki/ui';
import type { RabakzPublicView } from './view-model';

/** Explicit allowlist: no question, pick, answer, streak or private revision is copied. */
export function scoreboardModel(view: RabakzPublicView) {
  const players = view.players.map(p => {
    return { id: p.id, seat: p.seat, name: p.name, colour: COLOUR_TOKENS[p.colour],
      overallLeader: p.score === Math.max(...view.players.map(other => other.score)), teamView: view.players.some(other => other.team === 0 || other.team === 1), tied: view.players.filter(other => other.score === p.score).length > 1, team: p.team === 0 || p.team === 1 ? p.team : undefined, score: p.score, before: p.previousScore, delta: p.score - p.previousScore,
      place: 1 + view.players.filter(other => other.score > p.score).length };
  }).sort((a, b) => b.score - a.score || a.seat - b.seat);
  const teams = players.some(p => p.team === 0 || p.team === 1) ? ([0, 1] as const).map(team => ({
    id: team, name: team === 0 ? 'Red team' : 'Blue team', score: view.teamScores[team] ?? 0,
    before: view.previousTeamScores[team] ?? 0, delta: (view.teamScores[team] ?? 0) - (view.previousTeamScores[team] ?? 0),
    place: 1 + view.teamScores.filter(score => score > (view.teamScores[team] ?? 0)).length,
    players: players.filter(p => p.team === team).map(p => ({ ...p, place: 1 + players.filter(other => other.team === team && other.score > p.score).length, tied: players.filter(other => other.team === team && other.score === p.score).length > 1 })),
  })).sort((a, b) => b.score - a.score || a.id - b.id) : [];
  return { round: view.round, players, teams, ordered: teams.length ? [...teams.flatMap(t => t.players), ...players.filter(p => p.team === undefined)] : players };
}
export type Standings = ReturnType<typeof scoreboardModel>;
export type StandingPlayer = Standings['players'][number];

/** Reconstruct prior ranks from public totals, including on a fresh TV mount. */
export function previousScoreboardModel(view: RabakzPublicView) {
  return scoreboardModel({ ...view, players: view.players.map(p => ({ ...p, score: p.previousScore })),
    teamScores: view.previousTeamScores });
}

/** Final places are competition ranks; tied entrants stay together on one step. */
export function finalPodiumModel(board: Standings) {
  const entrants = board.teams.length ? board.teams : board.players;
  const places = [...new Set(entrants.map(p => p.place))];
  const order = [2, 1, 3].filter(place => places.includes(place));
  return order.map(place => ({ place,
    label: places.length === 1 && entrants.length > 1 ? 'Tied for first' : `${entrants.filter(p => p.place === place).length > 1 ? '=' : ''}${String(place)}`,
    teams: board.teams.filter(t => t.place === place),
    players: board.teams.length ? [] : board.players.filter(p => p.place === place),
  }));
}
