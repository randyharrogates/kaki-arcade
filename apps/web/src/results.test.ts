import { readFileSync } from 'node:fs';
import type { VNode } from 'preact';
import { afterEach, expect, it, vi } from 'vitest';
import { applyPhoneEvent, createRoom } from '@kaki/platform';
import { Results, headlineInkFits } from './results';
const effects = vi.hoisted(() => [] as (() => void)[]);
const dependencies = vi.hoisted(() => [] as unknown[][]);
const refs = vi.hoisted<{ current: unknown }>(() => ({ current: null }));
vi.mock('preact/hooks', () => ({ useLayoutEffect(effect: () => void, deps: unknown[]) { effects.push(effect); dependencies.push(deps); }, useRef() { return refs; }, useState() { return [false, () => undefined]; } }));
afterEach(() => { effects.length = 0; dependencies.length = 0; refs.current = null; vi.unstubAllGlobals(); });
function nodes(value: unknown): VNode<{ class?: string }>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (value && typeof value === 'object' && 'props' in value) { const node = value as VNode<{ class?: string }>; return [node, ...nodes(node.props.children)]; }
  return [];
}
it('PLAT-022/024 console results contain rankings and phone hints, with keyboard actions and no TV buttons', () => {
  const back = vi.fn(); const again = vi.fn();
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  vi.stubGlobal('window', { addEventListener(name: string, listener: (event: KeyboardEvent) => void) { listeners.set(name, listener); }, removeEventListener: vi.fn() });
  const room = applyPhoneEvent(createRoom(), { deviceId: 'd', connectionId: 'a' }, { type: 'join', name: 'Fern', seatToken: 'a'.repeat(32) }, 0).state;
  const props = { room, back, again, session: { gameId: 'test', view: null, results: { mode: 'players' as const, players: [{ id: 'seat-1', score: 10, place: 1, joinedMidGame: false }] } } };
  const tree = Results({ ...props, keyboard: false });
  expect(nodes(tree).some(node => node.type === 'button')).toBe(false);
  expect(nodes(tree).find(node => node.type === 'h1')?.props.children).toBe('Fern wins!');
  expect(nodes(tree).filter(node => node.type === 'li')).toHaveLength(1);
  expect(nodes(tree).filter(node => node.type === 'p').map(node => node.props.children)).not.toContain('Enter: play again · Esc: game picker');
  expect(nodes(Results({ ...props, keyboard: true })).filter(node => node.type === 'p').map(node => node.props.children)).toContain('Enter: play again · Esc: game picker');
  effects[0]?.();
  const press = (key: string, repeat = false) => listeners.get('keydown')?.({ key, repeat, preventDefault: vi.fn() } as unknown as KeyboardEvent);
  press('x'); press('Enter', true); expect(again).not.toHaveBeenCalled(); expect(back).not.toHaveBeenCalled();
  press('Enter'); expect(again).toHaveBeenCalledOnce();
  press('Escape'); expect(back).toHaveBeenCalledOnce();
});

it.each([
  { scores: [10, 0], headline: 'Fern wins!', score: '10 points', badges: 1 },
  { scores: [1, 0], headline: 'Fern wins!', score: '1 point', badges: 1 },
  { scores: [10, 10], headline: 'Fern and Moss share first', score: '10 points', badges: 2 },
  { scores: [0, 0], headline: 'Fern and Moss share first', score: '0 points', badges: 2 },
  { scores: [5, 5, 5], headline: '3 players share first', score: '5 points', badges: 3 },
  { scores: [0, 0, 0, 0], headline: '4 players share first', score: '0 points', badges: 4 },
  { scores: [0, 0, 0, 0, 0], headline: '5 players share first', score: '0 points', badges: 4 },
  { scores: [0, 0, 0, 0, 0, 0, 0, 0], headline: '8 players share first', score: '0 points', badges: 4 },
  { scores: [0, 0, 0, 0, 0, 0], headline: '6 players share first', score: '0 points', badges: 4 },
])('PLAT-024 results announce $headline with separate winner badges and $score', ({ scores, headline, score, badges }) => {
  let room = createRoom();
  for (const [index, name] of ['Fern', 'Moss', 'Leaf', 'Rain', 'Cloud', 'Sky', 'Sun', 'Dew'].slice(0, scores.length).entries()) {
    room = applyPhoneEvent(room, { deviceId: `d${String(index)}`, connectionId: `c${String(index)}` }, { type: 'join', name, seatToken: String(index).repeat(32) }, 0).state;
  }
  const players = scores.map((value, index) => ({ id: `seat-${String(index + 1)}`, score: value, place: value === scores[0] ? 1 : 2, joinedMidGame: false }));
  const tree = Results({ session: { gameId: 'test', view: null, results: { mode: 'players', players } }, room, back: vi.fn(), again: vi.fn(), keyboard: false });
  expect(nodes(tree).find(node => node.type === 'h1')?.props.children).toBe(headline);
  const summary = nodes(tree).find(node => node.props.class === 'winner-score');
  expect(nodes(summary).find(node => node.type === 'strong')?.props.children).toBe(score);
  const group = nodes(summary).find(node => node.props.class === 'winner-badges');
  expect(group?.props).toMatchObject({ role: 'group', 'aria-label': 'First-place players' });
  expect(nodes(group).filter(node => node.props.class === 'seat-number')).toHaveLength(badges);
  if (scores.length > 4) {
    const aggregate = nodes(group).find(node => node.type === 'span' && Array.isArray(node.props.children));
    expect(nodes(aggregate).find(node => 'aria-hidden' in node.props)?.props).toMatchObject({ 'aria-hidden': 'true', children: ['+', scores.length - 3] });
    expect(nodes(aggregate).find(node => node.props.class === 'announcements')?.props.children).toBe(`${String(scores.length - 3)} more players`);
    expect(aggregate?.props).toMatchObject({ style: { backgroundColor: 'var(--ka-chip)', color: 'var(--ka-chip-ink)' } });
  }
});

it('PLAT-024 winner score keeps a 21 px gap, mono points and independently sized badges', () => {
  const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  expect((/\.winner-score \{([^}]+)\}/.exec(css))?.[1]).toContain('gap: var(--ka-space-21)');
  const scoreRule = (/\.winner-score strong \{([^}]+)\}/.exec(css))?.[1];
  expect(scoreRule).toContain('font-family: var(--ka-font-mono)');
  expect(scoreRule).toContain('font-size: var(--ka-type-89)');
  expect(scoreRule).toContain('font-weight: var(--ka-weight-bold)');
  expect((/\.results-winner h1 \{([^}]+)\}/.exec(css))?.[1]).toContain('font-size: var(--ka-type-144)');
  expect((/\.results-winner \.ka-chip \{([^}]+)\}/.exec(css))?.[1]).toContain('align-self: flex-start');
  expect((/\.seat-number \{([^}]+)\}/.exec(css))?.[1]).toContain('width: var(--ka-space-55)');
  expect((/\.winner-score \.seat-number \{([^}]+)\}/.exec(css))?.[1]).toContain('width: var(--ka-space-144)');
});

it.each([144, 89, 55])('D-126 layout effect measures both column ends and settles at %s before paint', size => {
  let fontSize = '';
  const attempts: string[] = [];
  const fits = () => fontSize === `var(--ka-type-${String(size)})`;
  const first = vi.fn(() => ({ top: fits() ? 55 : 19 }));
  const last = vi.fn(() => ({ bottom: fits() ? 1025 : 1061 }));
  const screen = { clientHeight: 1080, getBoundingClientRect: () => ({ top: 0, bottom: 1080, height: 1080, left: 0, right: 1920 }) };
  refs.current = { setAttribute: vi.fn(), removeAttribute: vi.fn(), firstChild: {}, textContent: 'Match complete', normalize() { return; }, getBoundingClientRect: () => ({ top: 0, left: 55 }), previousElementSibling: { getBoundingClientRect: () => ({ bottom: -34 }) }, nextElementSibling: { getBoundingClientRect: () => ({ top: 200 }) }, style: { set fontSize(value: string) { fontSize = value; attempts.push(value); } }, parentElement: {
    getBoundingClientRect: () => ({ left: 55, right: 700 }), closest: () => screen, firstElementChild: { getBoundingClientRect: first }, lastElementChild: { getBoundingClientRect: last },
  } };
  vi.stubGlobal('getComputedStyle', () => ({ paddingTop: '55px', paddingBottom: '55px', paddingLeft: '55px', paddingRight: '55px', lineHeight: '144px', getPropertyValue: () => '5px' }));
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { createRange: () => ({ setStart() { return; }, setEnd() { return; }, getClientRects() { return [{ top: 0, bottom: 30, left: 55, width: 100 }]; } }), createElement: () => ({ style: {}, getBoundingClientRect: () => ({ top: 0 }), remove() { return; }, getContext: () => ({ measureText: () => ({ fontBoundingBoxDescent: 0, actualBoundingBoxAscent: 20, actualBoundingBoxDescent: 10, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 100 }) }) }), fonts: { ready: new Promise(() => undefined) } });
  const props = { session: { gameId: 'test', view: null }, room: createRoom(), back: vi.fn(), again: vi.fn() };
  Results({ ...props, keyboard: false });
  effects[1]?.();
  const expected = [144, 89, 55].slice(0, [144, 89, 55].indexOf(size) + 1).map(value => `var(--ka-type-${String(value)})`);
  expect(attempts).toEqual(expected);
  expect(first).toHaveBeenCalledTimes(expected.length);
  expect(last).toHaveBeenCalledTimes(expected.length);
  attempts.length = 0;
  Results({ ...props, keyboard: true });
  expect(dependencies[1]).toEqual(['Match complete', false, undefined, 'Match complete']);
  expect(dependencies[3]).toEqual(['Match complete', true, undefined, 'Match complete']);
  effects[3]?.();
  expect(attempts).toEqual(expected);
});
it('PLAT-024 outgoing results attach no keyboard listener', () => {
  const addEventListener = vi.fn(); vi.stubGlobal('window', { addEventListener });
  Results({ active: false, session: { gameId: 'rabakz', view: null }, room: createRoom(), back: vi.fn(), again: vi.fn(), keyboard: false });
  effects[0]?.(); expect(addEventListener).not.toHaveBeenCalled();
});
it.each([false, true])('RZ-032 team totals precede players and headline names teams (tie %s)', tie => {
  const tree = Results({ session: { gameId: 'rabakz', view: null, results: { mode: 'teams', teams: [{ team: 0, score: 10, place: 1 }, { team: 1, score: tie ? 10 : 5, place: tie ? 1 : 2 }], players: [{ id: 'seat-1', score: 5, place: 1, joinedMidGame: false }] } }, room: createRoom(), back: vi.fn(), again: vi.fn(), keyboard: false });
  expect(nodes(tree).find(node => node.type === 'h1')?.props.children).toBe(tie ? 'Red team and Blue team share first' : 'Red team wins!');
  expect(JSON.stringify(tree)).toContain('var(--ka-team-red)');
  expect(JSON.stringify(tree)).toContain('var(--ka-team-blue)');
  const rows = nodes(tree).filter(node => node.type === 'li');
  expect(rows).toHaveLength(3);
  expect(nodes(rows[0]).some(node => node.props.children === 'Red team')).toBe(true);
  expect(nodes(rows[1]).some(node => node.props.children === 'Blue team')).toBe(true);
  expect(nodes(tree).find(node => node.props.class === 'ka-chip')?.props.children).toEqual(['Rabakz', ' · final scores']);
});

it.each([
  { count: 1, fallback: 'Player 3 wins!', fitSize: 144 },
  { count: 2, fallback: '2 players share first', fitSize: 89 },
  { count: 2, fallback: '2 players share first', fitSize: 55 },
])('D-131 refits $fallback from 144 after named 55 fails', ({ count, fallback, fitSize }) => {
  let textContent = ''; let fontSize = ''; let namedFits = false;
  const attempts: [string, string][] = [];
  const fits = () => namedFits || (textContent === fallback && fontSize === `var(--ka-type-${String(fitSize)})`);
  const screen = { clientHeight: 1080, getBoundingClientRect: () => ({ top: 0, bottom: 1080, height: 1080, left: 0, right: 1920 }) };
  refs.current = { setAttribute: vi.fn(), removeAttribute: vi.fn(), firstChild: {}, normalize() { return; }, getBoundingClientRect: () => ({ top: 0, left: 55 }), previousElementSibling: { getBoundingClientRect: () => ({ bottom: -34 }) }, nextElementSibling: { getBoundingClientRect: () => ({ top: 200 }) }, get textContent() { return textContent; }, set textContent(value: string) { textContent = value; },
    style: { set fontSize(value: string) { fontSize = value; attempts.push([textContent, value]); } }, parentElement: {
      getBoundingClientRect: () => ({ left: 55, right: 700 }), closest: () => screen, firstElementChild: { getBoundingClientRect: () => ({ top: 55 }) },
      lastElementChild: { getBoundingClientRect: () => ({ bottom: 1025 }) },
    } };
  const listeners = new Map<string, () => void>();
  vi.stubGlobal('window', { addEventListener: (event: string, listener: () => void) => listeners.set(event, listener), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { createRange: () => ({ setStart() { return; }, setEnd() { return; }, getClientRects() { return [{ top: 0, bottom: 30, left: 55, width: 100 }]; } }), createElement: () => ({ style: {}, getBoundingClientRect: () => ({ top: 0 }), remove() { return; }, getContext: () => ({ measureText: () => ({ fontBoundingBoxDescent: 0, actualBoundingBoxAscent: fits() ? 20 : 1000, actualBoundingBoxDescent: 10, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 100 }) }) }), fonts: { ready: new Promise(() => undefined) } });
  vi.stubGlobal('getComputedStyle', () => ({ paddingTop: '55px', paddingBottom: '55px', paddingLeft: '55px', paddingRight: '55px', lineHeight: '144px', getPropertyValue: () => '5px' }));
  let room = createRoom();
  for (const [index, name] of ['Fern', 'Moss', 'ﷺ'.repeat(12), '𒀱'.repeat(12)].entries()) {
    room = applyPhoneEvent(room, { deviceId: `d${String(index)}`, connectionId: `c${String(index)}` }, { type: 'join', name, seatToken: String(index).repeat(32) }, 0).state;
  }
  const tree = Results({ room, session: { gameId: 'test', view: null, results: { mode: 'players', players: room.players.slice(2, 2 + count).map(p => ({ id: `seat-${String(p.seat)}`, place: 1, score: 10, joinedMidGame: false })) } }, back: vi.fn(), again: vi.fn(), keyboard: true });
  const named = nodes(tree).find(node => node.type === 'h1')?.props.children;
  effects[1]?.();
  expect(textContent).toBe(fallback);
  expect(attempts.slice(0, 3)).toEqual([144, 89, 55].map(size => [named, `var(--ka-type-${String(size)})`]));
  expect(attempts.slice(3)).toEqual([144, 89, 55].slice(0, [144, 89, 55].indexOf(fitSize) + 1).map(size => [fallback, `var(--ka-type-${String(size)})`]));
  const title = nodes(tree).find(node => node.type === 'h1');
  expect(title?.props).not.toHaveProperty('aria-describedby');
  expect((refs.current as { setAttribute: unknown }).setAttribute).toHaveBeenCalledWith('aria-describedby', 'results-headline-description');
  const descriptionId = 'results-headline-description';
  expect(nodes(tree).find(node => (node.props as { id?: string }).id === descriptionId)?.props).toMatchObject({ children: named, 'aria-hidden': 'true' });
  namedFits = true; attempts.length = 0; listeners.get('resize')?.();
  expect(textContent).toBe(named);
  expect((refs.current as { removeAttribute: unknown }).removeAttribute).toHaveBeenCalledWith('aria-describedby');
  expect(attempts).toEqual([[named, 'var(--ka-type-144)']]);
});

it('D-131 accepts 144 px ink past its line box inside the free space', () => {
  const measure = vi.fn(() => ({ actualBoundingBoxAscent: 120, actualBoundingBoxDescent: 30, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 500 }));
  expect(headlineInkFits([{ text: 'Player 1 wins!', baseline: 110 }],
    { top: -29, bottom: 173, left: 0, right: 645 }, measure)).toBe(true);
  expect(measure).toHaveBeenCalledWith('Player 1 wins!');
});
it.each([
  { top: -5, bottom: 173, left: 0, right: 645 },
  { top: -29, bottom: 139, left: 0, right: 645 },
  { top: -29, bottom: 173, left: 0, right: 499 },
])('D-131 rejects ink reaching the chip, badges or inline bounds (%j)', bounds => {
  expect(headlineInkFits([{ text: '𒀱'.repeat(12), baseline: 110 }], bounds,
    () => ({ actualBoundingBoxAscent: 120, actualBoundingBoxDescent: 30, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 500 }))).toBe(false);
});

it('D-131 allows glyph side bearings inside the screen paint margin', () => {
  const measure = () => ({ actualBoundingBoxAscent: 100, actualBoundingBoxDescent: 20, actualBoundingBoxLeft: 6, actualBoundingBoxRight: 500 });
  expect(headlineInkFits([{ text: 'jumpy', baseline: 110, left: 0 }], { top: 0, bottom: 150, left: -8, right: 645 }, measure)).toBe(true);
  expect(headlineInkFits([{ text: 'jumpy', baseline: 110, left: 0 }], { top: 0, bottom: 150, left: -5, right: 645 }, measure)).toBe(false);
});
