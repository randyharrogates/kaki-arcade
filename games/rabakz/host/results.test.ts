import { expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import { readFileSync } from 'node:fs';
import { rabakz } from '../src/index';
import { SCREEN } from './view-model';
import { SCENARIOS, scenario } from './scenarios';
import { scoreboardModel } from './standings';
import { podiumFit, podiumSteps, placing, ResultsFrame, PlayerRow, rowPosition, stepHeight, PODIUM_PLAYER_HEIGHT, podiumStepHeight, RESULTS_HEIGHT, RESULTS_HEADER_GAP, TITLE_DESCENDER_RATIO } from './Results';
import { COLOUR_TOKENS, duration, STAGGER_MS, easing, PHI, space, tvType, lineHeight, enter, pulse } from '@kaki/ui';

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

it('RZ-032 team finals retain every player below the team podium, including late joiners', () => {
  for (const state of ['podium-teams', 'podium-teams-late', 'scoreboard-teams-late'] as const) {
    const view = rabakz.publicView(scenario(state, 8));
    const board = scoreboardModel(view);
    const tree = nodes(ResultsFrame({ view, board, reduced: true, slow: 1 }));
    const rows = tree.filter(n => n.type === PlayerRow);
    expect(rows.map(n => (n.props.player as typeof board.players[number]).id).sort()).toEqual(view.players.map(p => p.id).sort());
    if (state.endsWith('late')) {
      expect(board.ordered.at(-1)?.seat).toBe(8);
      const player = board.ordered.at(-1);
      if (!player) throw new Error('Missing late joiner');
      const row = nodes(PlayerRow({ player, index: 7, box: rowPosition(7), reduced: true, slow: 1 }));
      expect(row.some(n => n.props.children === 'No team')).toBe(true);
    }
    for (const team of board.teams) expect(team.players.map(p => p.place)).toEqual(team.players.map(p => 1 + team.players.filter(other => other.score > p.score).length));
  }
});
it('RZ-032 partial ties keep the correct steps, cap each step at two, and preserve every placing', () => {
  for (const count of [4, 8]) for (const state of ['podium-tie-first', 'podium-tie-second', 'podium-partial-ties', 'podium-ties'] as const) {
    const board = scoreboardModel(rabakz.publicView(scenario(state, count)));
    const partition = podiumSteps(board.players);
    expect([...partition.top, ...partition.rest].map(p => p.id).sort()).toEqual(board.players.map(p => p.id).sort());
    for (const place of partition.order) expect(partition.top.filter(p => p.place === place).length).toBeLessThanOrEqual(2);
    expect(partition.order).toEqual(state === 'podium-tie-first' || state === 'podium-partial-ties' ? [1, 3] : state === 'podium-tie-second' ? [2, 1] : [1]);
    expect(partition.top.map(placing)).toEqual(state === 'podium-tie-second' ? ['1', '=2', '=2'] : state === 'podium-ties' ? ['=1', '=1'] : ['=1', '=1', '3']);
    if (state === 'podium-ties') expect(partition.rest.every(p => placing(p) === '=1')).toBe(true);
    expect(podiumFit(partition.top, partition.order.length, 500)).toBe(55);
    expect(podiumFit(partition.top, partition.order.length, 1)).toBeNull();
    expect(podiumFit(partition.top, 1000, 500)).toBeNull();
  }
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

it('RZ-032 final podium and eight team rows fit the frame, including a tied team podium', () => {
  const base = rabakz.publicView(scenario('podium-teams', 8));
  for (const teamScores of [[300, 200], [300, 300]]) {
    const view = { ...base, teamScores };
    const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    const podium = tree.find(n => n.props.class === 'rz-podium');
    expect(podium?.props['data-fit']).toBe(tree[0]?.props['data-fit']);
    const body = tree.find(n => n.props.class === 'rz-results-body');
    const height = Number.parseFloat((body?.props.style as Record<string, string>).height ?? '0');
    // 970 px safe height minus the 55 px header and 5 px separation.
    expect(tree[0]?.props['data-fit'] === 'failed').toBe(height > RESULTS_HEIGHT);
    const region = tree.find(n => n.props.class === 'rz-ranked-region');
    const top = Number.parseFloat((region?.props.style as Record<string, string>).top ?? '0');
    const last = tree.filter(n => n.type === PlayerRow).at(-1)?.props.box as ReturnType<typeof rowPosition>;
    expect(top + last.y + last.height).toBeCloseTo(height);
  }
});

it('RZ-032 tied third place uses =3 on both rows and the shared step', () => {
  const base = rabakz.publicView(scenario('podium', 4));
  const view = { ...base, players: base.players.map((p, i) => ({ ...p, score: [300, 200, 100, 100][i] ?? 0 })) };
  const board = scoreboardModel(view);
  const tree = nodes(ResultsFrame({ view, board, reduced: true, slow: 1 }));
  expect(tree.filter(n => n.props.class === 'rz-step-place').map(n => n.props.children)).toContain('=3');
  const third = board.players[2];
  if (!third) throw new Error('Missing third place');
  expect(nodes(PlayerRow({ player: third, index: 2, box: rowPosition(2), reduced: true, slow: 1 })).find(n => n.props.class === 'rz-place')?.props.children).toBe('=3');
});


it('RZ-032 round 9 final block centres below the shared header at 720p, 1080p and 4K', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).not.toContain('justify-content: end; }\n.rz-results[data-final]');
  expect(css).toContain('.rz-podium { display: flex; align-items: end; gap: var(--rz-column-gap); }');
  for (const state of ['podium', 'podium-teams', 'podium-ties', 'podium-partial-ties'] as const) for (const count of [2, 4, 8]) {
    const view = rabakz.publicView(scenario(state, count));
    const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
    const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
    const height = Number.parseFloat(body.height ?? '0');
    const top = Number.parseFloat(body.top ?? '0');
    const region = tree.find(n => n.props.class === 'rz-ranked-region')?.props.style as Record<string, string>;
    const podium = tree.find(n => n.props.class === 'rz-podium')?.props.style as Record<string, string>;
    if (Number.parseFloat(region.height ?? '0')) expect(Number.parseFloat(region.top ?? '0') - Number.parseFloat(podium.height ?? '0')).toBe(34);
    expect(tree.find(n => n.type === 'header')?.props.class).toBe('rz-header');
    expect(tree[0]?.props.style).not.toHaveProperty('top');
    const start = SCREEN.safe + SCREEN.header + RESULTS_HEADER_GAP;
    const bottom = SCREEN.height - SCREEN.safe;
    expect(top - start).toBeCloseTo(bottom - top - height);
    expect(tree[0]?.props['data-fit'] === 'failed').toBe(height > RESULTS_HEIGHT);

  }
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

it('RZ-032 round 13 budgets real padded podium lines and keeps every final block below the header', () => {
  const nameHeight = tvType.title * lineHeight.body + 2 * space[5];
  const pointsHeight = tvType.body * lineHeight.body;
  const memberHeight = nameHeight + space[5] + pointsHeight;
  expect(PODIUM_PLAYER_HEIGHT).toBe(memberHeight);
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  expect(css).toContain('.rz-podium-player { display: grid; row-gap: var(--rz-player-gap);');
  expect(css).not.toContain('margin-top: calc(-2 * var(--ka-space-5))');
  for (const state of ['podium', 'podium-ties', 'podium-tie-first', 'podium-tie-second', 'podium-partial-ties', 'podium-teams', 'podium-teams-late'] as const) {
    for (const count of [2, 4, 8]) {
      const view = rabakz.publicView(scenario(state, count));
      const board = scoreboardModel(view);
      const tree = nodes(ResultsFrame({ view, board, reduced: true, slow: 1 }));
      const steps = tree.filter(n => typeof n.props.level === 'number');
      const required = Math.max(...steps.map(step => {
        const members = nodes(step.props.children).filter(n => n.props.class === 'rz-podium-player').length;
        const place = Number(step.props.level) + 1;
        const surface = typeof step.props.surfaceHeight === 'number' ? step.props.surfaceHeight : stepHeight(place);
        expect(surface).toBeGreaterThanOrEqual(space[55]);
        const height = surface + space[13] + members * memberHeight + (members - 1) * space[13];
        expect(podiumStepHeight(place, members, surface)).toBeCloseTo(height);
        return height;
      }));
      const podium = tree.find(n => n.props.class === 'rz-podium');
      expect(podium?.props['data-fit']).toBe(tree[0]?.props['data-fit']);
      expect(Number.parseFloat((podium?.props.style as Record<string, string>).height ?? '0')).toBeCloseTo(required);
      const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
      expect(tree[0]?.props['data-fit'] === 'failed').toBe(Number.parseFloat(body.height ?? '0') > RESULTS_HEIGHT);
      // The previous 55 px display-line assumption must fail this boundary.
      const oldHeight = Math.max(...steps.map(step => {
        const members = nodes(step.props.children).filter(n => n.props.class === 'rz-podium-player').length;
        return stepHeight(Number(step.props.level) + 1) + space[13] + members * (tvType.title * lineHeight.display + pointsHeight) + (members - 1) * space[13];
      }));
      const top = podiumSteps(board.players);
      if (!board.teams.length) expect(podiumFit(top.top, top.order.length, oldHeight)).toBeNull();
    }
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

it('RZ-032 round 17 tied-team final fits 893.8 px in 894 px and excess body height still fails', () => {
  const view = rabakz.publicView(scenario('podium-teams-tie', 8));
  const board = scoreboardModel(view);
  const render = (value: typeof board) => nodes(ResultsFrame({ view, board: value, reduced: true, slow: 1 }));
  const tree = render(board);
  const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
  const region = tree.find(n => n.props.class === 'rz-ranked-region')?.props.style as Record<string, string>;
  const podium = tree.find(n => n.props.class === 'rz-podium')?.props.style as Record<string, string>;
  expect(RESULTS_HEIGHT).toBe(894);
  expect(Number.parseFloat(body.height ?? '0')).toBeCloseTo(893.8);
  expect(Number.parseFloat(region.top ?? '0') - Number.parseFloat(podium.height ?? '0')).toBe(space[13]);
  expect(tree[0]?.props['data-fit']).toBe('tight');
  const excess = render({ ...board, ordered: [...board.ordered, ...board.ordered] });
  const excessBody = excess.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
  expect(Number.parseFloat(excessBody.height ?? '0')).toBeGreaterThan(RESULTS_HEIGHT);
  expect(excess[0]?.props['data-fit']).toBe('failed');
});


it('RZ-032 round 18 keeps the compressed podium surface content within its floor at 720p', () => {
  // Screen.tsx lays out once at 1080p, then transforms the entire artboard.
  const view = rabakz.publicView(scenario('podium-teams-tie', 8));
  const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
  const podium = tree.find(n => n.props.class === 'rz-podium')?.props.style as Record<string, string>;
  const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
  const step = tree.find(n => typeof n.type === 'function' && n.type.name === 'PodiumStep');
  expect(step?.props.surfaceHeight).toBe(55);
  const placingHeight = tvType.body * lineHeight.body + 2 * space[5];
  expect(placingHeight).toBeCloseTo(54.2);
  expect(placingHeight).toBeLessThanOrEqual(55);
  const source = readFileSync('games/rabakz/host/Results.tsx', 'utf8');
  expect(source).toContain("'--rz-step-type': cssLength(tvType.body)");
  for (const scale of [720 / 1080, 1, 2]) {
    expect(Number.parseFloat(podium.height ?? '0') * scale).toBeCloseTo(342.4 * scale);
    expect(Number.parseFloat(body.height ?? '0') * scale).toBeCloseTo(893.8 * scale);
    expect(Number.parseFloat(body.height ?? '0') * scale).toBeLessThanOrEqual(894 * scale);
  }
});

it('RZ-032 every results scenario fits at 1, 2, 4 and 8 players', () => {
  const maxima = new Map<string, number>();
  for (const state of SCENARIOS.filter(name => name.startsWith('podium') || name.startsWith('scoreboard'))) {
    for (const count of [1, 2, 4, 8]) {
      const view = rabakz.publicView(scenario(state, count));
      const tree = nodes(ResultsFrame({ view, board: scoreboardModel(view), reduced: true, slow: 1 }));
      expect(tree[0]?.props['data-fit'], state + ':' + String(count)).not.toBe('failed');
      const body = tree.find(n => n.props.class === 'rz-results-body')?.props.style as Record<string, string>;
      if (state === 'podium-teams-late' && count === 8) expect(Number.parseFloat(body.height ?? '0')).toMatchInlineSnapshot(`893.8`);
      if (view.phase === 'over' && scoreboardModel(view).teams.length) {
        const region = tree.find(n => n.props.class === 'rz-ranked-region')?.props.style as Record<string, string>;
        const rows = tree.filter(n => n.type === PlayerRow);
        const last = rows.at(-1)?.props.box as { y: number; height: number };
        const occupied = Number.parseFloat(region.top ?? '0') + last.y + last.height;
        expect(Number.parseFloat(body.height ?? '0')).toBeCloseTo(occupied);
        expect(occupied).toBeLessThanOrEqual(RESULTS_HEIGHT);
        const unteamed = rows.findIndex(n => (n.props.player as { team?: number }).team === undefined);
        if (unteamed > 0) {
          const previous = rows[unteamed - 1]?.props.box as { y: number; height: number };
          const next = rows[unteamed]?.props.box as { y: number };
          expect(next.y - previous.y - previous.height).toBeGreaterThanOrEqual(space[5]);
        }
      }
      maxima.set(state, Math.max(maxima.get(state) ?? 0, Number.parseFloat(body.height ?? '0')));
    }
  }
  expect(Object.fromEntries(maxima)).toMatchInlineSnapshot(`
    {
      "podium": 894,
      "podium-partial-ties": 894,
      "podium-solo": 894,
      "podium-teams": 860.0999999999999,
      "podium-teams-late": 894,
      "podium-teams-tie": 893.8,
      "podium-tie-first": 894,
      "podium-tie-second": 894,
      "podium-ties": 894,
      "podium-unicode": 894,
      "scoreboard": 844.8,
      "scoreboard-next": 844.8,
      "scoreboard-teams": 768.3,
      "scoreboard-teams-late": 844.8,
      "scoreboard-ties": 844.8,
      "scoreboard-unicode": 844.8,
    }
  `);
});

it('RZ-032 compact team scoreboard rows retain nonzero gained chips; finals hide them', () => {
  for (const state of ['scoreboard-teams', 'scoreboard-teams-late', 'podium-teams'] as const) {
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
