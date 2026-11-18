import { useLayoutEffect, useRef } from 'preact/hooks';
import { FINAL_HINT_BAND, COLOUR_TOKENS, PHI, tvType, lineHeight, duration, easing, space, STAGGER_MS, SEAT_NUMERAL, enter, pulse, EDGE_WIDTH } from '@kaki/ui';
import { Score, inlineStyle } from './Screen';
import { cssLength, SCREEN, fallbackMeasure } from './view-model';
import type { ComponentChildren } from 'preact';
import type { MeasureText, RabakzPublicView } from './view-model';
import { STEP_MS } from '@kaki/platform';
import { SCOREBOARD_STEPS } from '../src/rules/flow';
import type { StandingPlayer, Standings } from './standings';

/** Chromium fallback face content extends 10 px below a 55 px title line. */
export const TITLE_DESCENDER_RATIO = 10 / 55;
export const RESULTS_HEADER_GAP = SCREEN.headerGap;
export const RESULTS_HEIGHT = SCREEN.innerHeight - SCREEN.header - RESULTS_HEADER_GAP;
/** Fixed rows end naturally, regardless of player count. */
export function rowPosition(index: number, final = false, finalGap: number = space[8]) {
  return { x: 0, y: index * (final ? space[55] + finalGap : space[89] + space[8]), width: SCREEN.innerWidth, height: final ? space[55] : space[89] };
}
/** Reserve occupied list rows and the selected token separation below the podium. */
export function podiumLayout(restCount: number, height = RESULTS_HEIGHT, rowGap: number = space[8], listGap: number = space[34]) {
  const restHeight = restCount ? restCount * space[55] + (restCount - 1) * rowGap : 0;
  const podiumHeight = restCount ? height - listGap - restHeight : height;
  return { arrangement: restCount ? 'vertical' : 'podium-only', podiumHeight,
    restY: podiumHeight + listGap, restHeight } as const;
}
export const teamMark = (team: number) => ({ colour: COLOUR_TOKENS[team === 0 ? 'seat-1' : 'seat-2'], name: team === 0 ? 'Red team' : 'Blue team' });
export function podiumSteps(players: readonly StandingPlayer[]) {
  const eligible = players.filter(p => p.place <= 3);
  const top = eligible.filter((p, i) => eligible.slice(0, i).filter(other => other.place === p.place).length < 2);
  const rest = players.filter(p => !top.includes(p));
  const places = [...new Set(top.map(p => p.place))];
  const order = [2, 1, 3].filter(place => places.includes(place));
  return { top, rest, order };
}
export const stepHeight = (place: number) => place === 1 ? space[89] + space[55] : place === 2 ? space[89] : space[55];
/** Match the padded name line, explicit grid gap and points line in screen.css. */
export const PODIUM_GEOMETRY = { line: lineHeight.body, padding: space[5], playerGap: space[5], memberGap: space[13], columnGap: space[21] };
export const PODIUM_PLAYER_HEIGHT = tvType.title * PODIUM_GEOMETRY.line + 2 * PODIUM_GEOMETRY.padding + PODIUM_GEOMETRY.playerGap + tvType.body * PODIUM_GEOMETRY.line;
export const podiumStepHeight = (place: number, members: number, surfaceHeight = stepHeight(place), geometry: { memberGap: number; playerGap: number } = PODIUM_GEOMETRY) => surfaceHeight + geometry.memberGap + members * (PODIUM_PLAYER_HEIGHT - PODIUM_GEOMETRY.playerGap + geometry.playerGap) + (members - 1) * geometry.memberGap;
/** Names deliberately ellipsise; fit checks the complete stacked line boxes. */
export function podiumFit(top: readonly StandingPlayer[], columns: number, height: number, measure: MeasureText = fallbackMeasure, surfaceHeight?: number, geometry: { memberGap: number; playerGap: number } = PODIUM_GEOMETRY): number | null {
  const width = (SCREEN.innerWidth - (columns - 1) * PODIUM_GEOMETRY.columnGap) / columns;
  if (!columns || width < space[55] + space[13] + measure('…', tvType.title, 'body')) return null;
  const fits = [...new Set(top.map(p => p.place))].every(place => {
    const rows = top.filter(p => p.place === place).length;
    return podiumStepHeight(place, rows, surfaceHeight, geometry) <= height;
  });
  return fits ? tvType.title : null;
}
export const placing = (p: StandingPlayer) => `${p.tied ? '=' : ''}${String(p.place)}`;
export function PlayerRow({ player: p, index, box, reduced, slow, frozenAt, compact = false, final = false }: {
  player: StandingPlayer; index: number; box: ReturnType<typeof rowPosition>;
  reduced: boolean; slow: number; frozenAt?: number | undefined; compact?: boolean; final?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced || root.current?.closest('[inert]')) return;
    const motion = enter({ kind: 'row', index, reduced: false });
    const animation = root.current?.animate(motion.keyframes, { ...motion.options, duration: motion.options.duration * slow, delay: motion.options.delay * slow });
    const chip = root.current?.querySelector<HTMLElement>('[data-chip]');
    const confirmation = pulse({ reduced: false });
    const chipAnimation = chip?.animate(confirmation.keyframes, { ...confirmation.options, duration: confirmation.options.duration * slow, delay: (motion.options.delay + motion.options.duration) * slow });
    return () => { animation?.cancel(); chipAnimation?.cancel(); };
  }, [p.id, box.x, box.y, reduced, slow, index]);
  return <div ref={root} class="rz-rank" data-leader={p.score > 0 && (p.teamView ? p.team !== undefined && p.overallLeader : !final && p.place === 1) || undefined} data-compact={compact || undefined} style={inlineStyle({ left: cssLength(box.x), top: cssLength(box.y), width: cssLength(box.width), height: cssLength(box.height) })}>
    <strong class="rz-place">{p.teamView && p.team === undefined ? '–' : placing(p)}</strong><span class="rz-seat-number" style={inlineStyle({ background: p.colour, color: SEAT_NUMERAL })}>{p.seat}</span>
    <span class="rz-player-name"><span class="rz-rank-name" title={p.name}>{p.name}</span>{p.team !== undefined && <span class="rz-row-team" aria-label={teamMark(p.team).name} style={inlineStyle({ background: teamMark(p.team).colour })} />}{p.team === undefined && p.teamView && <span class="rz-no-team">No team</span>}</span>
    <span class="rz-score-area"><span class="rz-total"><Score from={p.before} to={p.score} index={index} reduced={reduced} slow={slow} frozenAt={frozenAt} /></span>{!final && <span class="rz-delta" data-chip={p.delta !== 0 || undefined}>+{p.delta}</span>}</span>
  </div>;
}
function PodiumStep({ children, level, reduced, slow, surfaceHeight }: { children: ComponentChildren; level: number; reduced: boolean; slow: number; surfaceHeight?: number | undefined }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced || root.current?.closest('[inert]')) return;
    const animation = root.current?.animate([
      { transform: `translateY(${String(space[34])}px)`, clipPath: 'inset(100% 0 0 0)' },
      { transform: 'translateY(0)', clipPath: 'inset(0)' },
    ], { duration: duration.slow * slow, delay: level * STAGGER_MS * slow, easing: easing.out, fill: 'both' });
    return () => { animation?.cancel(); };
  }, [level, reduced, slow]);
  return <div ref={root} class="rz-step" style={inlineStyle({ '--rz-step-height': cssLength(surfaceHeight ?? stepHeight(level + 1)), '--rz-step-type': cssLength(tvType.body) })}>{children}</div>;
}
export function ResultsFrame({ view, board, reduced, slow, frozenAt, measure = fallbackMeasure }: {
  measure?: MeasureText; view: RabakzPublicView; board: Standings; reduced: boolean; slow: number; frozenAt?: number | undefined;
}) {
  const end = view.phase === 'over';
  const solo = end && board.players.length === 1 && board.teams.length === 0;
  const teamHeight = board.teams.length && !end ? tvType.title * lineHeight.body + space[5] : 0;
  // Budget against the shell reserve before selecting the row/podium rhythm.
  // Retain one row-entrance distance below the body while rows settle into place.
  const finalHeight = RESULTS_HEIGHT - (FINAL_HINT_BAND - SCREEN.safe) - space[13];
  const height = end ? finalHeight : RESULTS_HEIGHT - teamHeight - tvType.body * lineHeight.body - space[5];
  const ordered: StandingPlayer[] = end && board.teams.length ? board.teams.map(t => ({ id: `team-${String(t.id)}`, seat: t.id + 1, colour: teamMark(t.id).colour, name: t.name, score: t.score, before: 0, delta: 0, place: t.place, tied: board.teams.filter(other => other.score === t.score).length > 1, overallLeader: false, teamView: false, team: undefined })) : end ? board.players : board.ordered;
  const partition = podiumSteps(end ? ordered : []);
  const { top, order } = partition;
  const rest = end && board.teams.length ? board.ordered : partition.rest;
  const grouped = board.teams.length > 0;
  const list = end ? rest : ordered;
  const groupStarts = list.flatMap((p, i) => p.team !== undefined && (i === 0 || p.team !== list[i - 1]?.team) ? [i] : []);
  const tiedTeams = end && grouped && order.length === 1 && top.length > 1;
  // Recover 46 px in the stacked team podium and labels, preserving all text sizes.
  const geometry = tiedTeams ? { ...PODIUM_GEOMETRY, memberGap: 0, playerGap: 0 } : PODIUM_GEOMETRY;
  const groupHeight = tvType.body * lineHeight.body + (tiedTeams ? 0 : space[5]);
  const unteamedStart = grouped ? list.findIndex(p => p.team === undefined) : -1;
  const unteamedGap = unteamedStart > 0 ? space[5] : 0;
  const labelsHeight = (grouped ? groupStarts.length * groupHeight : 0) + unteamedGap;
  // Compress only empty podium surface space for stacked tied-team names.
  const surfaceHeight = tiedTeams
    ? [space[89] + space[55], space[89], space[55]].find(surface => podiumStepHeight(1, top.length, surface, geometry) + labelsHeight + rest.length * space[55] <= height) ?? space[55]
    : undefined;
  const occupiedPodiumHeight = top.length ? Math.max(...order.map(place => podiumStepHeight(place, top.filter(p => p.place === place).length, surfaceHeight, geometry))) : 0;
  const compact = end || grouped;
  // Tighten list spacing in token steps, retaining the fixed row floors.
  const finalGap = [space[8], space[5], 0].find(gap => occupiedPodiumHeight + labelsHeight + space[34] + rest.length * space[55] + Math.max(0, rest.length - 1) * gap <= height) ?? 0;
  const listGap = [space[34], space[21], space[13], space[8], space[5], 0].find(gap => occupiedPodiumHeight + labelsHeight + gap + rest.length * space[55] + Math.max(0, rest.length - 1) * finalGap <= height) ?? 0;
  const regions = podiumLayout(rest.length, height - labelsHeight, finalGap, listGap);
  const podiumHeight = end && top.length ? occupiedPodiumHeight : regions.podiumHeight;
  const bodyHeight = end && !solo ? podiumHeight + (rest.length ? listGap + regions.restHeight + labelsHeight : 0) : height;

  const fit = bodyHeight > height || (end && !solo && podiumFit(top, order.length, podiumHeight, measure, surfaceHeight, geometry) === null) ? 'failed' : end && rest.length && (finalGap < space[8] || listGap < space[34]) ? 'tight' : 'fits';
  return <section data-fit={fit} class="rz-frame rz-results" data-theme="rabakz" data-final={end || undefined} style={inlineStyle({ '--rz-name-fr': `${String(PHI)}fr`, '--rz-edge': cssLength(EDGE_WIDTH), '--rz-podium-line': String(PODIUM_GEOMETRY.line), '--rz-name-padding': cssLength(PODIUM_GEOMETRY.padding), '--rz-player-gap': cssLength(geometry.playerGap), '--rz-member-gap': cssLength(geometry.memberGap), '--rz-column-gap': cssLength(PODIUM_GEOMETRY.columnGap) })}>
    <header class="rz-header"><span>{end ? 'Final results' : <>Scoreboard <span class="rz-round-label">after question {board.round}</span></>}</span><span>{!end && `Leader can continue · automatic after ${String(SCOREBOARD_STEPS * STEP_MS / 1000)} s`}</span></header>
    {board.teams.length > 0 && !end && <div class="rz-team-totals">{board.teams.map(t => <div class="rz-team-panel" key={t.id}><span class="rz-row-team" aria-hidden="true" style={inlineStyle({ background: teamMark(t.id).colour })} /><span>{t.name}</span><span class="rz-total">{t.score}</span><span class="rz-delta" data-chip={t.delta !== 0 || undefined}>+{t.delta}</span></div>)}</div>}
    {!end && <div class="rz-column-headings"><span /><span /><span /><span class="rz-score-area"><span>Points</span><span>Gained</span></span></div>}
    <div class="rz-results-body" style={inlineStyle({ height: cssLength(bodyHeight), ...(end ? { position: 'absolute', width: cssLength(SCREEN.innerWidth), top: cssLength(SCREEN.safe + SCREEN.header + RESULTS_HEADER_GAP + (finalHeight - bodyHeight) / 2), marginTop: '0' } : {}) })}>
      {solo && <div class="rz-solo"><strong class="rz-podium-name"><span class="rz-seat-number" style={inlineStyle({ background: board.players[0]?.colour ?? COLOUR_TOKENS['seat-1'], color: SEAT_NUMERAL })}>{board.players[0]?.seat}</span><span class="rz-rank-name">{board.players[0]?.name}</span></strong><span class="rz-solo-total">{board.players[0]?.score} pts</span>{view.soloBest !== undefined && <SoloBest value={view.soloBest} fresh={view.newBest} reduced={reduced} slow={slow} />}</div>}
      {end && !solo && <div class="rz-podium" data-arrangement={regions.arrangement} data-fit={fit} style={inlineStyle({ height: cssLength(podiumHeight), '--rz-podium-type': cssLength(tvType.title) })}>{order.map(place => {
        const members = top.filter(p => p.place === place);
        const level = place - 1;
        // Occupied steps share a baseline; names and points remain above the surface.
        return <PodiumStep surfaceHeight={surfaceHeight} level={level} reduced={reduced} slow={slow} key={place}>
          <strong class="rz-step-place">{members[0] ? placing(members[0]) : place}</strong>
          <div class="rz-step-members">{members.map(p => <div class="rz-podium-player" key={p.id}><div class="rz-podium-name"><span class={board.teams.length ? "rz-team-mark" : "rz-seat-number"} aria-hidden={board.teams.length ? "true" : undefined} style={inlineStyle({ background: p.colour, color: SEAT_NUMERAL })}>{board.teams.length ? null : p.seat}</span><span class="rz-rank-name" title={p.name}>{p.name}</span></div><span class="rz-total"><Score from={p.before} to={p.score} index={0} reduced={reduced} slow={slow} frozenAt={frozenAt} /> pts</span></div>)}</div>
        </PodiumStep>;
      })}</div>}
      <div class="rz-ranked-region" style={inlineStyle({ position: 'absolute', left: '0', top: cssLength(end && rest.length ? podiumHeight + listGap : 0), width: cssLength(SCREEN.innerWidth), height: cssLength(end ? regions.restHeight + labelsHeight : height) })}>
      {list.map((p, index) => {
        const box = rowPosition(index, compact, end ? finalGap : space[8]);
        if (grouped) box.y += groupStarts.filter(start => start <= index).length * groupHeight;
        if (unteamedStart > 0 && index >= unteamedStart) box.y += unteamedGap;
        return <>{grouped && groupStarts.includes(index) && <div class="rz-group-label" style={inlineStyle({ position: 'absolute', top: cssLength(box.y - groupHeight), height: cssLength(groupHeight) })}>{p.team !== undefined && <span class="rz-row-team" style={inlineStyle({ background: teamMark(p.team).colour })} />}{p.team === undefined ? 'No team' : teamMark(p.team).name}</div>}<PlayerRow key={p.id} player={p} index={index} box={box} reduced={reduced} slow={slow} frozenAt={frozenAt} compact={compact} final={end} /></>;
      })}
      </div>
    </div>
  </section>;
}

function SoloBest({ value, fresh, reduced, slow }: { value: number; fresh: boolean; reduced: boolean; slow: number }) {
  const root = useRef<HTMLSpanElement>(null);
  const confirmed = useRef(false);
  useLayoutEffect(() => {
    if (!fresh || confirmed.current) return;
    confirmed.current = true;
    if (reduced) return;
    const motion = pulse({ reduced: false });
    const animation = root.current?.animate(motion.keyframes, { ...motion.options, duration: motion.options.duration * slow, delay: duration.slow * slow });
    return () => animation?.cancel();
  }, [fresh, reduced, slow]);
  return <span ref={root} class="rz-solo-best">{fresh ? 'New best · ' : 'Best '}{value}</span>;
}
