import { TEAM_THEMES } from '@kaki/ui';
import { gameMetas } from './game-registry';
import { ChoiceShape } from './choice-shape';
import type { RoomState } from '@kaki/platform';
import type { SessionDisplay } from './session-adapter';
import { useLayoutEffect, useRef } from 'preact/hooks';
// D-131: line-box overshoot is allowed inside the headline's free paint space.
export function headlineInkFits(lines: readonly { text: string; baseline: number; left?: number }[],
  bounds: { top: number; bottom: number; left: number; right: number },
  measure: (text: string) => Pick<TextMetrics, 'actualBoundingBoxAscent' | 'actualBoundingBoxDescent' | 'actualBoundingBoxLeft' | 'actualBoundingBoxRight'>): boolean {
  return lines.every(line => {
    const ink = measure(line.text);
    return line.baseline - ink.actualBoundingBoxAscent >= bounds.top &&
      line.baseline + ink.actualBoundingBoxDescent <= bounds.bottom &&
      (line.left ?? 0) - ink.actualBoundingBoxLeft >= bounds.left && (line.left ?? 0) + ink.actualBoundingBoxRight <= bounds.right;
  });
}
function paintedHeadlineFits(element: HTMLHeadingElement, scale: number): boolean {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return false;
  const style = getComputedStyle(element);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const text = element.textContent;
  const rect = element.getBoundingClientRect();
  const column = element.parentElement;
  const chip = element.previousElementSibling?.getBoundingClientRect();
  const badges = element.nextElementSibling?.getBoundingClientRect();
  if (!column || !chip || !badges) return false;
  const screen = column.closest('.screen');
  if (!screen || !element.firstChild) return false;
  const edges = screen.getBoundingClientRect();
  const gap = parseFloat(style.getPropertyValue('--ka-space-5'));
  const margin = parseFloat(style.getPropertyValue('--ka-space-34'));
  const columnEdges = column.getBoundingClientRect();
  const free = { top: (chip.bottom - rect.top) / scale + gap,
    bottom: (badges.top - rect.top) / scale - gap,
    left: (Math.max(edges.left, columnEdges.left - margin * scale) - rect.left) / scale,
    right: (Math.min(edges.right, columnEdges.right + margin * scale) - rect.left) / scale };
  // The paint boundary and acceptance boundary are identical, including side bearings.
  element.style.clipPath = `inset(${String(free.top)}px ${String(rect.width / scale - free.right)}px ${String(rect.height / scale - free.bottom)}px ${String(free.left)}px)`;
  const lines: { text: string; baseline: number; left?: number }[] = [];
  const range = document.createRange();
  let lineTop = -Infinity;
  for (const { segment, index } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    range.setStart(element.firstChild, index);
    range.setEnd(element.firstChild, index + segment.length);
    const boxes = [...range.getClientRects()];
    const box = boxes.find(box => box.width > 0);
    if (!box) continue;
    const previous = lines.at(-1);
    if (previous && Math.abs(box.top - lineTop) < scale) {
      previous.text += segment;
      previous.left = Math.min(previous.left ?? Infinity, (box.left - rect.left) / scale);
    } else {
      // Range text rects use the font bounding box (including fallback fonts).
      // Its bottom minus the canvas font descent gives the unmodified DOM baseline.
      const metrics = context.measureText(segment);
      lines.push({ text: segment, left: (box.left - rect.left) / scale,
        baseline: (box.bottom - rect.top) / scale - metrics.fontBoundingBoxDescent });
      lineTop = box.top;
    }
  }
  return headlineInkFits(lines, free, value => context.measureText(value));
}
export function Results({ session, room, back, again, keyboard, active = true }: { active?: boolean; session: SessionDisplay; room: RoomState; back: () => void; again: () => void; keyboard: boolean }) {
  useLayoutEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (event.key === 'Enter') { event.preventDefault(); again(); }
      if (event.key === 'Escape') { event.preventDefault(); back(); }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); };
  }, [back, again, active]);
  const players = [...(session.results?.players ?? [])].sort((a, b) => a.place - b.place);
  const winner = players[0];
  const winners = players.filter(player => player.place === winner?.place);
  const seat = (id: string) => room.players.find(p => `seat-${String(p.seat)}` === id);
  const badge = (id: string) => { const p = seat(id); return <span class="seat-number" style={{ backgroundColor: `var(--ka-seat-${String(p?.seat ?? 1)})` }}>{p?.seat}</span>; };
  const name = (id: string) => seat(id)?.name ?? id;
  const playerHeadline = winners.length === 1 && winner ? `${name(winner.id)} wins!`
    : winners.length === 2 ? `${winners.map(player => name(player.id)).join(' and ')} share first`
    : winners.length > 2 ? `${String(winners.length)} players share first` : 'Match complete';
  const teams = session.results?.mode === 'teams' ? [...(session.results.teams ?? [])].sort((a, b) => a.place - b.place) : [];
  const teamTheme = (team: number) => TEAM_THEMES[team === 0 ? 'red' : 'blue'];
  const teamName = (team: number) => teamTheme(team).label;
  const winningTeams = teams.filter(team => team.place === teams[0]?.place);
  const headline = teams.length ? winningTeams.length === 1 ? `${teamName(winningTeams[0]?.team ?? 0)} wins!` : `${TEAM_THEMES.red.label} and ${TEAM_THEMES.blue.label} share first` : playerHeadline;
  const fallbackHeadline = teams.length ? headline : winners.length === 1 && winner
    ? `Player ${String(seat(winner.id)?.seat ?? winner.id.replace('seat-', ''))} wins!`
    : winners.length > 1 ? `${String(winners.length)} players share first` : headline;
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const element = heading.current;
    if (!element) return;
    const fit = () => {
      const column = element.parentElement;
      const screen = column?.closest('.screen');
      if (!column || !screen) return;
      const bounds = screen.getBoundingClientRect();
      const scale = bounds.height / screen.clientHeight;
      const padding = getComputedStyle(screen);
      const top = bounds.top + parseFloat(padding.paddingTop) * scale;
      const bottom = bounds.bottom - parseFloat(padding.paddingBottom) * scale;
      // D-131: exhaust the named sizes, then restart with bounded count/seat text.
      // Each measurement and text change settles synchronously before paint.
      for (const text of headline === fallbackHeadline ? [headline] : [headline, fallbackHeadline]) {
        element.textContent = text;
        for (const size of [144, 89, 55] as const) {
          element.style.fontSize = `var(--ka-type-${String(size)})`;
          const first = column.firstElementChild?.getBoundingClientRect();
          const last = column.lastElementChild?.getBoundingClientRect();
          if (first && last && first.top >= top && last.bottom <= bottom && paintedHeadlineFits(element, scale)) {
            if (text !== headline) element.setAttribute('aria-describedby', 'results-headline-description');
            else element.removeAttribute('aria-describedby');
            return;
          }
        }
      }
      // Nothing fitted: the last candidate stays at 55 px; keep the description in step with it.
      if (element.textContent !== headline) element.setAttribute('aria-describedby', 'results-headline-description');
      else element.removeAttribute('aria-describedby');
    };
    fit(); window.addEventListener('resize', fit);
    let alive = true;
    void document.fonts.ready.then(() => { if (alive) fit(); });
    return () => { alive = false; window.removeEventListener('resize', fit); };
  }, [headline, keyboard, session.results?.mode, fallbackHeadline]);
  const summary = teams[0] ?? winner;
  return <main class="screen console-results" aria-label="Results">
    <span id="results-headline-description" aria-hidden="true" class="announcements">{headline}</span>
    <section class="results-winner"><span class="ka-chip">{gameMetas.find(game => game.id === session.gameId)?.name ?? 'Game'} · final scores</span><h1 ref={heading} style={{ fontSize: 'var(--ka-type-144)' }}>{headline}</h1>
      {summary && <div class="winner-score"><div class="winner-badges" role="group" aria-label={teams.length ? 'First-place teams' : 'First-place players'}>{teams.length ? winningTeams.map(team => <span class="seat-number" key={team.team} style={{ backgroundColor: `var(--ka-${teamTheme(team.team).token})` }}>{team.team === 0 ? 'R' : 'B'}</span>) : winners.slice(0, winners.length > 4 ? 3 : 4).map(player => badge(player.id))}{!teams.length && winners.length > 4 && <span class="seat-number" style={{ backgroundColor: 'var(--ka-chip)', color: 'var(--ka-chip-ink)' }}><span aria-hidden="true">+{winners.length - 3}</span><span class="announcements">{`${String(winners.length - 3)} more players`}</span></span>}</div><strong>{`${summary.score.toLocaleString('en-GB')} ${summary.score === 1 ? 'point' : 'points'}`}</strong></div>}
      <p>The leader chooses on their phone</p><div class="results-hints"><span><ChoiceShape/>Play again</span><span><ChoiceShape circle/>Back to game picker</span></div>
      {keyboard && <p class="results-keyboard">Enter: play again · Esc: game picker</p>}
    </section>
    <ol id="results-ranking" class="results-ranking" aria-label="Final rankings">{teams.map(team => <li class="ka-panel" key={`team-${String(team.team)}`}><span>{team.place}</span><span class="seat-number" style={{ backgroundColor: `var(--ka-${teamTheme(team.team).token})` }}>{team.team === 0 ? 'R' : 'B'}</span><span class="ranking-name" title={teamName(team.team)}>{teamName(team.team)}</span><strong>{team.score.toLocaleString('en-GB')}</strong></li>)}{players.map(player => <li class="ka-panel" key={player.id}><span>{player.place}</span>{badge(player.id)}<span class="ranking-name" title={name(player.id)}>{name(player.id)}</span><strong>{player.score.toLocaleString('en-GB')}</strong></li>)}</ol>
  </main>;
}
