import { useLayoutEffect, useRef } from 'preact/hooks';
import { FINAL_HINT_BAND, COLOUR_TOKENS, PHI, tvType, lineHeight, duration, easing, space, STAGGER_MS, SEAT_NUMERAL, enter, pulse, EDGE_WIDTH } from '@kaki/ui';
import { Score, inlineStyle } from './Screen';
import { cssLength, SCREEN } from './view-model';
import type { ComponentChildren } from 'preact';
import type { RabakzPublicView } from './view-model';
import { STEP_MS } from '@kaki/platform';
import { SCOREBOARD_STEPS } from '../src/rules/flow';
import { finalPodiumModel } from './standings';
import type { StandingPlayer, Standings } from './standings';

/** Chromium fallback face content extends 10 px below a 55 px title line. */
export const TITLE_DESCENDER_RATIO = 10 / 55;
export const RESULTS_HEADER_GAP = SCREEN.headerGap;
export const RESULTS_HEIGHT = SCREEN.innerHeight - SCREEN.header - RESULTS_HEADER_GAP;
/** Fixed rows end naturally, regardless of player count. */
export function rowPosition(index: number, final = false, finalGap: number = space[8]) {
  return { x: 0, y: index * (final ? space[55] + finalGap : space[89] + space[8]), width: SCREEN.innerWidth, height: final ? space[55] : space[89] };
}
export const teamMark = (team: number) => ({ colour: COLOUR_TOKENS[team === 0 ? 'team-red' : 'team-blue'], name: team === 0 ? 'Red team' : 'Blue team' });
export const stepHeight = (place: number) => place === 1 ? space[89] + space[55] : place === 2 ? space[89] : space[55];
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
export function ResultsFrame({ view, board, reduced, slow, frozenAt }: {
  view: RabakzPublicView; board: Standings; reduced: boolean; slow: number; frozenAt?: number | undefined;
}) {
  const end = view.phase === 'over';
  const solo = end && board.players.length === 1 && board.teams.length === 0;
  if (end && !solo) return FinalPodium({ board, reduced, slow, frozenAt });
  const teamHeight = board.teams.length && !end ? tvType.title * lineHeight.body + space[5] : 0;
  // Budget against the shell reserve before selecting the row/podium rhythm.
  // Retain one row-entrance distance below the body while rows settle into place.
  const finalHeight = RESULTS_HEIGHT - (FINAL_HINT_BAND - SCREEN.safe) - space[13];
  const height = end ? finalHeight : RESULTS_HEIGHT - teamHeight - tvType.body * lineHeight.body - space[5];
  const list = end ? [] : board.ordered;
  const grouped = board.teams.length > 0;
  const groupStarts = list.flatMap((p, i) => p.team !== undefined && (i === 0 || p.team !== list[i - 1]?.team) ? [i] : []);
  const groupHeight = tvType.body * lineHeight.body + space[5];
  const unteamedStart = grouped ? list.findIndex(p => p.team === undefined) : -1;
  const unteamedGap = unteamedStart > 0 ? space[5] : 0;
  const bodyHeight = height;
  return <section data-fit="fits" class="rz-frame rz-results" data-theme="rabakz" data-final={end || undefined} style={inlineStyle({ '--rz-name-fr': `${String(PHI)}fr`, '--rz-edge': cssLength(EDGE_WIDTH), '--rz-podium-line': String(lineHeight.body) })}>
    <header class="rz-header"><h1>{end ? 'Final results' : <>Scoreboard <span class="rz-round-label">after question {board.round}</span></>}</h1><span>{!end && `Leader can continue · automatic after ${String(SCOREBOARD_STEPS * STEP_MS / 1000)} s`}</span></header>
    {board.teams.length > 0 && !end && <div class="rz-team-totals">{board.teams.map(t => <div class="rz-team-panel" key={t.id}><span class="rz-row-team" aria-hidden="true" style={inlineStyle({ background: teamMark(t.id).colour })} /><span>{t.name}</span><span class="rz-total">{t.score}</span><span class="rz-delta" data-chip={t.delta !== 0 || undefined}>+{t.delta}</span></div>)}</div>}
    {!end && <div class="rz-column-headings"><span /><span /><span /><span class="rz-score-area"><span>Points</span><span>Gained</span></span></div>}
    <div class="rz-results-body" style={inlineStyle({ height: cssLength(bodyHeight), ...(end ? { position: 'absolute', width: cssLength(SCREEN.innerWidth), top: cssLength(SCREEN.safe + SCREEN.header + RESULTS_HEADER_GAP + (finalHeight - bodyHeight) / 2), marginTop: '0' } : {}) })}>
      {solo && <div class="rz-solo"><strong class="rz-podium-name"><span class="rz-seat-number" style={inlineStyle({ background: board.players[0]?.colour ?? COLOUR_TOKENS['seat-1'], color: SEAT_NUMERAL })}>{board.players[0]?.seat}</span><span class="rz-rank-name">{board.players[0]?.name}</span></strong><span class="rz-solo-total">{board.players[0]?.score} pts</span>{view.soloBest !== undefined && <SoloBest value={view.soloBest} fresh={view.newBest} reduced={reduced} slow={slow} />}</div>}
      <div class="rz-ranked-region" style={inlineStyle({ position: 'absolute', left: '0', top: cssLength(0), width: cssLength(SCREEN.innerWidth), height: cssLength(height) })}>
      {list.map((p, index) => {
        const box = rowPosition(index, grouped);
        if (grouped) box.y += groupStarts.filter(start => start <= index).length * groupHeight;
        if (unteamedStart > 0 && index >= unteamedStart) box.y += unteamedGap;
        return <>{grouped && groupStarts.includes(index) && <div class="rz-group-label" style={inlineStyle({ position: 'absolute', top: cssLength(box.y - groupHeight), height: cssLength(groupHeight) })}>{p.team !== undefined && <span class="rz-row-team" style={inlineStyle({ background: teamMark(p.team).colour })} />}{p.team === undefined ? 'No team' : teamMark(p.team).name}</div>}<PlayerRow key={p.id} player={p} index={index} box={box} reduced={reduced} slow={slow} frozenAt={frozenAt} compact={grouped} final={end} /></>;
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

/** The C-18 artboard and hint reserve stay fixed; member rows use the TV body floor. */
function FinalPodium({ board, reduced, slow, frozenAt }: {
  board: Standings; reduced: boolean; slow: number; frozenAt?: number | undefined;
}) {
  const steps = finalPodiumModel(board);
  const rest = board.teams.length ? board.players.filter(p => p.team === undefined) : board.players.filter(p => p.place > 3);
  // One body line plus its two 5px font-clearance pads; the seat is 55px.
  const rowHeight = Math.max(space[55], tvType.body * lineHeight.body + space[5] * 2);
  const teamHeaderHeight = space[55] * 2 + space[13];
  const contentHeight = Math.max(...steps.map(step => {
    const rows = step.teams.length ? Math.max(...step.teams.map(t => t.players.length)) : step.players.length;
    return stepHeight(step.place) + space[13] + rows * rowHeight + (step.teams.length ? teamHeaderHeight : 0);
  }));
  const restHeight = rest.length ? space[34] + rest.length * rowHeight : 0;
  const bodyHeight = contentHeight + restHeight;
  const height = RESULTS_HEIGHT - (FINAL_HINT_BAND - SCREEN.safe) - space[13];
  const player = (p: StandingPlayer) => <div class="rz-podium-player" data-final-member key={p.id} data-player={p.id}>
    <span class="rz-seat-number" style={inlineStyle({ background: p.colour, color: SEAT_NUMERAL })}>{p.seat}</span>
    <span class="rz-rank-name" title={p.name}>{p.name}</span>
    <span class="rz-total" aria-label={`${String(p.score)} points`}><Score from={p.before} to={p.score} index={0} reduced={reduced} slow={slow} frozenAt={frozenAt} /></span>
  </div>;
  return <section class="rz-frame rz-results" data-team-podium data-final="true" data-theme="rabakz" data-fit={bodyHeight <= height ? 'fits' : 'failed'} style={inlineStyle({ '--rz-name-fr': `${String(PHI)}fr`, '--rz-podium-line': String(lineHeight.body), '--rz-edge': cssLength(EDGE_WIDTH), '--rz-member-gap': cssLength(space[13]), '--rz-column-gap': cssLength(space[21]) })}>
    <header class="rz-header"><h1>Final results</h1><span /></header>
    <div class="rz-results-body" style={inlineStyle({ position: 'absolute', width: cssLength(SCREEN.innerWidth), height: cssLength(bodyHeight), top: cssLength(SCREEN.safe + SCREEN.header + RESULTS_HEADER_GAP + (height - bodyHeight) / 2), marginTop: '0' })}>
      <div class="rz-podium" style={inlineStyle({ height: cssLength(contentHeight) })}>{steps.map(step => <PodiumStep key={step.place} level={step.place - 1} reduced={reduced} slow={slow}>
        <strong class="rz-step-place">{step.label}</strong>
        <div class="rz-step-members" data-columns={step.teams.length || 1}>
          {step.teams.length ? step.teams.map(team => <div data-final-team key={team.id} data-team={team.id}>
            <div class="rz-group-label" data-final-team-title><span class="rz-team-mark" aria-hidden="true" style={inlineStyle({ background: teamMark(team.id).colour })} />{team.name}</div>
            <div class="rz-total" data-final-team-total><Score from={team.before} to={team.score} index={0} reduced={reduced} slow={slow} frozenAt={frozenAt} /> pts</div>
            {team.players.map(player)}
          </div>) : step.players.map(player)}
        </div>
      </PodiumStep>)}</div>
      {rest.length > 0 && <div class="rz-ranked-region" style={inlineStyle({ position: 'absolute', top: cssLength(contentHeight + space[34]), width: cssLength(SCREEN.innerWidth), height: cssLength(rest.length * rowHeight) })}>{rest.map((p, index) => board.teams.length
        ? <div key={p.id} data-final-unassigned>No team · {player(p)}</div>
        : <PlayerRow key={p.id} player={p} index={index} box={rowPosition(index, true, 0)} reduced={reduced} slow={slow} frozenAt={frozenAt} compact final />)}</div>}
    </div>
  </section>;
}
