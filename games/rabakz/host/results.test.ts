import { expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { readFileSync } from 'node:fs';
import { rabakz } from '../src/index';
import { SCREEN } from './view-model';
import { SCENARIOS, scenario } from './scenarios';
import { scoreboardModel } from './standings';
import { ResultsFrame, PlayerRow, rowPosition, RESULTS_HEIGHT, RESULTS_HEADER_GAP, TITLE_DESCENDER_RATIO } from './Results';
import { FINAL_HINT_BAND, COLOUR_TOKENS, duration, STAGGER_MS, easing, PHI, space, tvType, lineHeight, enter, pulse } from '@kaki/ui';


const hooks = vi.hoisted((): { current: unknown; run: boolean; cleanup: undefined | (() => void) } => ({ current: null, run: false, cleanup: undefined }));
vi.mock('preact/hooks', () => ({
  useRef: () => ({ current: hooks.current }),
  useLayoutEffect: (effect: () => (() => void) | undefined) => { if (hooks.run) hooks.cleanup = effect(); },
}));

function nodes(value: unknown): VNode<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, unknown>>;
  return [node, ...nodes(node.props.children)];
}

it('RZ-032 screen renders exactly one full-width ranked list for every scoreboard', () => {
  for (const state of ['scoreboard', 'scoreboard-next', 'scoreboard-teams', 'scoreboard-ties'] as const) {
    for (const count of [1, 2, 4, 8]) {
      const view = rabakz.publicView(scenario(state, count));
      const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
      const lists = tree.filter(node => node.props.class === 'rz-ranked-region');
      expect(lists).toHaveLength(1);
      expect(tree.some(node => node.type === 'aside')).toBe(false);
      const rows = nodes(lists[0]?.props.children).filter(node => node.type === PlayerRow);
      expect(rows).toHaveLength(count);
      for (const row of rows) expect(row.props.box).toMatchObject({ x: 0, width: 1810 });
    }
  }
  for (const file of ['Results.tsx', 'demo.tsx']) {
    expect(readFileSync(`games/rabakz/host/${file}`, 'utf8')).not.toMatch(/layout=|query.get\('layout'\)|rz-leader|data-stacked/u);
  }
});

function rowTree(score: number, delta: number, place: number) {
  const player = scoreboardModel(rabakz.publicView(scenario('scoreboard', 1))).players[0];
  if (!player) throw new Error('Missing fixture player');
  return nodes(PlayerRow({ player: { ...player, score, delta, place }, index: 2, box: rowPosition(2), reduced: true, slow: 1 }));
}
it('RZ-032 D-114 only leaders have panels, including every tied leader; zero has no chip', () => {
  for (const place of [1, 1, 3, 4]) {
    const tree = rowTree(100, 100, place);
    expect(tree[0]?.props['data-leader']).toBe(place === 1 ? true : undefined);
    expect(tree.find(n => n.props.class === 'rz-delta')?.props['data-chip']).toBe(true);
  }
  const zero = rowTree(100, 0, 1).find(n => n.props.class === 'rz-delta');
  expect(zero?.props['data-chip']).toBeUndefined();
  expect(zero?.props.children).toEqual(['+', 0]);
});
it('RZ-032 D-114 name/score columns share the golden split and headings align with totals', () => {
  const view = rabakz.publicView(scenario('scoreboard', 8));
  const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
  expect(tree[0]?.props.style).toMatchObject({ '--rz-name-fr': `${String(PHI)}fr` });
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).toContain('var(--ka-space-144) var(--ka-space-55) minmax(0, var(--rz-name-fr)) minmax(0, 1fr)');
  expect(tree.filter(n => n.props.children === 'Points')).toHaveLength(1);
  expect(tree.filter(n => n.props.children === 'Gained')).toHaveLength(1);
  expect(css).toContain('grid-template-columns: var(--ka-golden-columns)');
});
it('RZ-032 D-114 leading team panel comes first for either team and stable ties', () => {
  for (const scores of [[100, 200], [200, 100], [100, 100]]) {
    const view = { ...rabakz.publicView(scenario('scoreboard-teams', 8)), teamScores: scores };
    const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    const panels = tree.filter(n => n.props.class === 'rz-team-panel');
    expect(panels).toHaveLength(2);
    expect(nodes(panels[0]).some(n => n.props.children === ((scores[1] ?? 0) > (scores[0] ?? 0) ? 'Blue team' : 'Red team'))).toBe(true);
  }
});
it('RZ-032 D-114 row entrance and chip pulse use token timing; reduced motion animates nothing', () => {
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  const chipAnimate = vi.fn(() => ({ cancel: vi.fn() }));
  hooks.current = { closest: () => null, animate, querySelector: () => ({ animate: chipAnimate }) };
  hooks.run = true;
  const player = scoreboardModel(rabakz.publicView(scenario('scoreboard', 1))).players[0];
  if (!player) throw new Error('Missing fixture player');
  const props = { player, index: 3, box: rowPosition(3), reduced: false, slow: 2 };
  try {
    PlayerRow(props);
    const entrance = enter({ kind: 'row', index: 3, reduced: false });
    expect(animate).toHaveBeenCalledWith(entrance.keyframes, { ...entrance.options, delay: 3 * STAGGER_MS * 2, duration: duration.base * 2 });
    expect(entrance.keyframes[0]).toEqual({ opacity: 0, transform: `translateY(${String(space[13])}px)` });
    expect(entrance.options.easing).toBe(easing.out);
    expect(chipAnimate).toHaveBeenCalledWith(pulse({ reduced: false }).keyframes, expect.objectContaining({ delay: (3 * STAGGER_MS + duration.base) * 2, duration: duration.slow * 2 }));
    hooks.cleanup?.();
    animate.mockClear(); chipAnimate.mockClear();
    PlayerRow({ ...props, reduced: true });
    expect(animate).not.toHaveBeenCalled();
    expect(chipAnimate).not.toHaveBeenCalled();
  } finally { hooks.run = false; hooks.current = null; }
});

it('RZ-032 D-114 eight fixed team rows fit the remaining height at every target scale', () => {
  const view = rabakz.publicView(scenario('scoreboard-teams', 8));
  const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
  const body = tree.find(n => n.props.class === 'rz-results-body');
  const height = Number.parseFloat((body?.props.style as Record<string, string>).height ?? '0');
  const last = rowPosition(7, true);
  expect(last.y + last.height + 2 * (tvType.body * lineHeight.body + space[5])).toBeLessThanOrEqual(height);
});

it('RZ-032 placing glyphs have inline headroom without clipping or smaller type', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  const rule = /\.rz-place \{([^}]+)\}/u.exec(css)?.[1];
  expect(rule).toContain('padding-inline: var(--ka-space-13)');
  expect(rule).toContain('padding-block: var(--ka-space-5)');
  expect(rule).not.toMatch(/overflow|font-size/u);
});

it('RZ-034 solo final includes the coloured seat number beside its name', () => {
  const view = rabakz.publicView(scenario('podium', 1));
  const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
  const seat = tree.find(n => n.props.class === 'rz-seat-number');
  expect(seat?.props.children).toBe(1);
  expect(seat?.props.style).toMatchObject({ background: COLOUR_TOKENS['seat-1'] });
});
it('RZ-032 null team from a runtime late join is normalised and retained after both groups', () => {
  const original = rabakz.publicView(scenario('scoreboard-teams', 8));
  const view = { ...original, players: original.players.map((p, i) => i === 7 ? { ...p, team: null } : p) } as unknown as typeof original;
  const board = scoreboardModel(view);
  expect(board.ordered).toHaveLength(8);
  expect(board.ordered.at(-1)).toMatchObject({ seat: 8, team: undefined, teamView: true });
});

it('RZ-032 round 9 unteamed final placing is a dash after both teams', () => {
  const view = rabakz.publicView(scenario('podium-teams-late', 8));
  const board = scoreboardModel(view);
  const player = board.ordered.at(-1);
  if (!player) throw new Error('Missing late joiner');
  const tree = nodes(PlayerRow({ player, index: 7, box: rowPosition(7, true), reduced: true, slow: 1, final: true }));
  expect(tree.find(n => n.props.class === 'rz-place')?.props.children).toBe('–');
  expect(tree.some(n => n.props.children === 'No team')).toBe(true);
  expect(tree[0]?.props['data-leader']).toBeUndefined();
});

it('RZ-032 podium name flex rows bound the ellipsis around the fixed badge', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).toContain('.rz-podium-name { width: 100%; max-width: 100%; line-height: var(--rz-podium-line); }');
  expect(css).toContain('.rz-podium-name > .rz-rank-name { flex: 0 1 auto; }');
  expect(css).toContain('.rz-rank-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }');
  expect(css).toContain('.rz-podium-name > .rz-seat-number, .rz-podium-name > .rz-team-mark { flex-shrink: 0; }');
});

it('RZ-032 one-player team scoreboard renders an empty zero team with unclipped zero delta', () => {
  const view = rabakz.publicView(scenario('scoreboard-teams', 1));
  const board = scoreboardModel(view);
  const empty = board.teams.find(t => t.players.length === 0);
  expect(empty).toMatchObject({ score: 0, delta: 0, players: [] });
  expect(board.ordered).toHaveLength(1);
  const tree = nodes(ResultsFrame({ view, board, reduced: true, slow: 1 }));
  const panel = tree.find(n => n.props.class === 'rz-team-panel' && nodes(n).some(child => child.props.children === empty?.name));
  expect(nodes(panel).find(n => n.props.class === 'rz-total')?.props.children).toBe(0);
  expect(nodes(panel).find(n => n.props.class === 'rz-delta')?.props['data-chip']).toBeUndefined();
  // Unchipped +0 otherwise inherits the panel's tight display line height;
  // the body line box contains the mono font without moving its centre.
  expect(readFileSync('games/rabakz/host/screen.css', 'utf8')).toContain('.rz-team-panel .rz-delta:not([data-chip]) { line-height: var(--ka-line-body); }');
});


it('RZ-032 score font padding fits unchanged scoreboard and final row heights', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).toContain('.rz-rank .rz-total, .rz-rank .rz-delta { padding-block: var(--ka-space-5); }');
  for (const final of [false, true]) {
    const row = rowPosition(0, final);
    const height = final ? 55 : 89;
    expect(row.height).toBe(height);
    const type = final ? 34 : 55;
    expect(type * lineHeight.body + 2 * space[5]).toBeLessThan(height);
    expect(rowPosition(1, final).height).toBe(height);
  }
});

it('RZ-032 unteamed scoreboard rows never lead and group leaders are overall leaders', () => {
  const view = rabakz.publicView(scenario('scoreboard-teams-late', 8));
  const board = scoreboardModel(view);
  const frame = nodes(ResultsFrame({ view, board, reduced: true, slow: 1 }));
  expect(frame.filter(n => n.props.class === 'rz-group-label')).toHaveLength(2);
  for (const player of board.ordered) {
    const row = nodes(PlayerRow({ player, index: 0, box: rowPosition(0), reduced: true, slow: 1 }));
    expect(Boolean(row[0]?.props['data-leader'])).toBe(player.team !== undefined && player.overallLeader);
    if (player.team === undefined) expect(row.find(n => n.props.class === 'rz-place')?.props.children).toBe('–');
  }
});

it('RZ-032 matrix fixtures include tied teams, solo and CJK/emoji results', () => {
  for (const state of ['podium-teams-tie', 'podium-solo', 'podium-unicode', 'scoreboard-unicode'] as const) {
    const view = rabakz.publicView(scenario(state));
    if (state === 'podium-solo') expect(view.players).toHaveLength(1);
    if (state === 'podium-teams-tie') expect(view.teamScores[0]).toBe(view.teamScores[1]);
    if (state.endsWith('unicode')) expect(view.players.map(p => p.name)).toEqual(expect.arrayContaining(['陈美玲', '🦊Fox']));
  }
});

it('RZ-032 round 17 header gap clears measured title descenders at every target scale', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).toContain('.rz-results .rz-header { align-items: baseline; margin-bottom: var(--ka-space-21); }');
  expect(RESULTS_HEADER_GAP).toBe(space[21]);
  expect(RESULTS_HEIGHT).toBe(SCREEN.innerHeight - SCREEN.header - RESULTS_HEADER_GAP);
  for (const scale of [2 / 3, 1, 2]) {
    const overhang = tvType.title * lineHeight.display * TITLE_DESCENDER_RATIO * scale;
    expect(RESULTS_HEADER_GAP * scale).toBeGreaterThanOrEqual(overhang);
    for (const state of ['scoreboard', 'scoreboard-teams', 'podium', 'podium-solo'] as const) {
      const view = rabakz.publicView(scenario(state, 8));
      const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
      const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
      if (view.phase === 'over') expect(Number.parseFloat(body.top ?? '0') * scale).toBeGreaterThanOrEqual((SCREEN.safe + SCREEN.header + RESULTS_HEADER_GAP) * scale);
      else {
        const teamHeight = state === 'scoreboard-teams' ? tvType.title * lineHeight.body + space[5] : 0;
        expect(Number.parseFloat(body.height ?? '0')).toBeCloseTo(RESULTS_HEIGHT - teamHeight - tvType.body * lineHeight.body - space[5]);
      }
    }
  }
});

it('RZ-032 compact team scoreboard rows retain nonzero gained chips', () => {
  for (const state of ['scoreboard-teams', 'scoreboard-teams-late'] as const) {
    const view = rabakz.publicView(scenario(state, 8));
    const frame = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    const rows = frame.filter(n => n.type === PlayerRow);
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      const props = row.props as unknown as Parameters<typeof PlayerRow>[0];
      const tree = nodes(PlayerRow(props));
      expect(tree[0]?.props['data-compact']).toBe(true);
      const delta = tree.find(n => n.props.class === 'rz-delta');
      if (view.phase === 'over') expect(delta).toBeUndefined();
      else expect(delta?.props['data-chip']).toBe(props.player.delta !== 0 || undefined);
    }
    if (view.phase !== 'over') expect(rows.some(row => (row.props.player as { delta: number }).delta !== 0)).toBe(true);
  }
});

it('RZ-032 leader panels follow positive raw overall scores, excluding unteamed players in team mode', () => {
  for (const teams of [false, true]) for (const scores of [[100, 40, 80, 20, 10, 5, 0, 200], [200, 40, 80, 20, 10, 5, 0, 100], Array<number>(8).fill(0)]) {
    const base = rabakz.publicView(scenario(teams ? 'scoreboard-teams-late' : 'scoreboard', 8));
    const view = { ...base, players: base.players.map((p, i) => ({ ...p, score: scores[i] ?? 0 })) };
    const max = Math.max(...view.players.map(p => p.score));
    const board = scoreboardModel(view);
    for (const player of board.ordered) {
      const raw = view.players.find(p => p.id === player.id);
      const expected = max > 0 && raw?.score === max && (!teams || raw.team === 0 || raw.team === 1);
      const tree = nodes(PlayerRow({ player, index: 0, box: rowPosition(0), reduced: true, slow: 1 }));
      expect(Boolean(tree[0]?.props['data-leader'])).toBe(expected);
    }
  }
});

it('RZ-032 Jack Ü prompt and matrix fit fields remain available to integration', () => {
  const view = rabakz.publicView(scenario('jack-u', 8));
  expect(JSON.stringify(view)).toContain('Jack Ü');
  const matrix = readFileSync('games/rabakz/dev/overflow.html', 'utf8');
  expect(matrix).toContain('results.push({ fit,');
  expect(matrix).toContain('window.__rzMatrix = results');
  expect(matrix).toContain("r.fit.includes('tight')");
});


it('PLAT-022 PLAT-024 RZ-032 2/4/8-player finals budget every ranked row above the shared band at all TV scales', () => {
  for (const count of [2, 4, 8]) for (const split of [0, count / 2, count - 1]) for (const tied of [false, true]) {
    const base = rabakz.publicView(scenario(split ? tied ? 'podium-teams-tie' : 'podium-teams' : 'podium-ties', count));
    const view = { ...base, ...(split ? { teamScores: tied ? [300, 300] : [1000, 100] } : {}), players: base.players.map((p, i) => split ? { ...p, team: i < split ? 0 as const : 1 as const } : p) };
    const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
    const region = tree.find(n => n.props.class === 'rz-ranked-region')?.props.style as Record<string, string> | undefined;
    expect(body.transform).toBeUndefined();
    expect(Number.parseFloat(body.top ?? '0') + Number.parseFloat(body.height ?? '0') + space[13]).toBeLessThanOrEqual(SCREEN.height - FINAL_HINT_BAND);
    const rows = tree.filter(n => n.type === PlayerRow);
    expect(rows).toHaveLength(0);
    expect(tree.filter(n => typeof n.props['data-player'] === 'string')).toHaveLength(count);
    expect(tree.filter(n => n.props['data-final-team-title'] === true)).toHaveLength(split ? 2 : 0);
    for (const scale of [720 / 1080, 1, 2]) for (const row of rows) {
      const box = row.props.box as { y: number; height: number };
      const bottom = Number.parseFloat(body.top ?? '0') + (Number.parseFloat(region?.top ?? '0') + box.y + box.height);
      // Include the row's full token entrance travel, not just its settled rectangle.
      expect((bottom + space[13]) * scale).toBeLessThanOrEqual((SCREEN.height - FINAL_HINT_BAND) * scale);
    }
  }
});

it('RZ-012 RZ-016 RZ-032 final places contain all members once, without individual team ranks', () => {
  for (const count of [2, 4, 8]) for (const state of ['podium', 'podium-ties', 'podium-tie-first', 'podium-teams', 'podium-teams-tie', 'podium-teams-late'] as const) {
    const view = rabakz.publicView(scenario(state, count));
    const board = scoreboardModel(view);
    const tree = nodes(ResultsFrame({ view, board, reduced: true, slow: 1 }));
    const members = tree.filter(n => typeof n.props['data-player'] === 'string');
    const rows = tree.filter(n => n.type === PlayerRow);
    expect([...members.map(n => n.props['data-player']), ...rows.map(n => (n.props.player as typeof board.players[number]).id)].sort()).toEqual(view.players.map(p => p.id).sort());
    if (board.teams.length) {
      expect(rows).toHaveLength(0);
      expect(tree.filter(n => n.props.class === 'rz-place')).toHaveLength(0);
      expect(tree.filter(n => typeof n.props.level === 'number')).toHaveLength(state === 'podium-teams-tie' ? 1 : new Set(board.teams.map(t => t.place)).size);
    }
    if (state === 'podium-ties' || state === 'podium-teams-tie') expect(tree.filter(n => n.props.class === 'rz-step-place').map(n => n.props.children)).toEqual(['Tied for first']);
    const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
    expect(Number.parseFloat(body.height ?? '0')).toBeLessThanOrEqual(847);
    expect(tree[0]?.props['data-fit']).toBe('fits');
    const start = SCREEN.safe + SCREEN.header + RESULTS_HEADER_GAP;
    expect(Number.parseFloat(body.top ?? '0') - start).toBeCloseTo(847 - Number.parseFloat(body.height ?? '0') - (Number.parseFloat(body.top ?? '0') - start));
  }
});

it('RZ-032 final steps retain C-18 stagger, ease-out and reduced-motion state', () => {
  const view = rabakz.publicView(scenario('podium-teams', 4));
  const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: false, slow: 1 }));
  const steps = tree.filter(n => typeof n.props.level === 'number');
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  hooks.current = { closest: () => null, animate };
  hooks.run = true;
  try {
    for (const step of steps) {
      const renderStep = step.type as (props: Record<string, unknown>) => unknown;
      renderStep(step.props);
      expect(animate).toHaveBeenLastCalledWith(expect.any(Array), expect.objectContaining({ delay: Number(step.props.level) * STAGGER_MS, duration: duration.slow, easing: easing.out }));
      hooks.cleanup?.();
      animate.mockClear();
      const reduced = nodes(renderStep({ ...step.props, reduced: true }));
      expect(animate).not.toHaveBeenCalled();
      expect(reduced.some(n => n.props.class === 'rz-step')).toBe(true);
    }
  } finally { hooks.run = false; hooks.current = null; }
});

it('RZ-032 every existing results fixture fits above the shell band at 1/2/4/8 players', () => {
  for (const state of SCENARIOS.filter(name => name.startsWith('podium') || name.startsWith('scoreboard'))) for (const count of [1, 2, 4, 8]) {
    const view = rabakz.publicView(scenario(state, count));
    const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    expect(tree[0]?.props['data-fit'], `${state}:${String(count)}`).not.toBe('failed');
    const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
    if (view.phase === 'over') expect(Number.parseFloat(body.top ?? '0') + Number.parseFloat(body.height ?? '0') + space[13]).toBeLessThanOrEqual(SCREEN.height - FINAL_HINT_BAND);
  }
});


it('RZ-032 eight-player podium budgets a single column for all six third-place members', () => {
  const view = rabakz.publicView(scenario('podium', 8));
  const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
  const groups = tree.filter(n => n.props.class === 'rz-step-members');
  expect(groups).toHaveLength(3);
  expect(groups.every(n => n.props['data-columns'] === 1)).toBe(true);
  const podium = tree.find(n => n.props.class === 'rz-podium')?.props.style as Record<string, string>;
  expect(Number.parseFloat(podium.height ?? '0')).toBe(space[55] + space[13] + 6 * space[55]);
});

it('RZ-016 single-winner podium team fixtures conserve member scores', () => {
  for (const name of SCENARIOS.filter(name => name.startsWith('podium') && name.includes('teams'))) for (const count of [4, 8]) {
    const state = scenario(name, count);
    for (const team of [0, 1]) expect(state.teamScores[team], `${name}:${String(count)}:${String(team)}`).toBe(state.players.filter(p => p.info.team === team).reduce((sum, p) => sum + p.score, 0));
    if (name === 'podium-teams-tie') expect(state.teamScores[0]).toBe(state.teamScores[1]);
  }
});

it('RZ-016 final team count-up starts at the standings baseline', () => {
  const view = rabakz.publicView(scenario('podium-teams', 4));
  view.previousTeamScores = [123, 234];
  const board = scoreboardModel(view);
  const tree = nodes(ResultsFrame({ view, board, reduced: false, slow: 1 }));
  for (const team of board.teams) {
    const column = tree.find(n => n.props['data-team'] === team.id);
    const total = nodes(column).find(n => n.props['data-final-team-total'] === true);
    expect(nodes(total).find(n => n.props.to === team.score)?.props.from).toBe(team.before);
  }
});


it('RZ-032 every results header reserves display-font scroll clearance, not only finals', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).toContain('.rz-results .rz-header > :first-child { padding-bottom: var(--ka-space-13); }');
  expect(css).not.toContain('.rz-results[data-final] .rz-header > :first-child');
  // Round-3 Chromium: 65px scroll content in the unpadded 55px line.
  expect(SCREEN.header + space[13]).toBeGreaterThanOrEqual(65);
  for (const state of ['scoreboard', 'scoreboard-teams', 'scoreboard-ties', 'podium', 'podium-teams', 'podium-solo'] as const) {
    const view = rabakz.publicView(scenario(state, 8));
    const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    expect(String(tree[0]?.props.class).split(' ')).toContain('rz-results');
    const header = tree.find(n => n.props.class === 'rz-header');
    expect(header?.type).toBe('header');
    expect(nodes(header?.props.children)[0]?.type).toBe('h1');
  }
});
