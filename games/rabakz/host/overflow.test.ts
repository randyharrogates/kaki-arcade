import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { OVERFLOW_SELECTORS, detectOverflow, swapPartners } from './overflow';

beforeEach(() => { vi.stubGlobal('getComputedStyle', () => ({ overflow: 'hidden' })); });

it('RZ-032 detector covers every results surface and all its content, plus question cards', () => {
  for (const selector of ['.rz-option', '.rz-question', '.rz-question h1', '.rz-question .rz-copy']) expect(OVERFLOW_SELECTORS).toContain(selector);
  const source = readFileSync('games/rabakz/host/Results.tsx', 'utf8');
  const classes = [...source.matchAll(/class="([^"]+)"/gu)].flatMap(match => (match[1] ?? '').split(' '));
  const inherited = new Set(['rz-frame', 'rz-header', 'rz-seat-number']);
  for (const name of classes.filter(name => !inherited.has(name))) expect(OVERFLOW_SELECTORS).toContain(`.${name}`);
  expect(readFileSync('games/rabakz/host/demo.tsx', 'utf8')).toContain('__rzOverflow: detectOverflow');
});

it('RZ-032 detector catches podium and lower-region child, text and scroll overflow', () => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
  const outside = { ...bounds, bottom: 110 };
  const card = (className: string, bad: boolean) => ({ className, classList: { contains: () => false }, closest: () => null,
    getBoundingClientRect: () => bounds, clientWidth: 100, scrollWidth: 100,
    clientHeight: 100, scrollHeight: bad ? 110 : 100,
    children: [], querySelectorAll: () => bad ? [{ className: 'child', getBoundingClientRect: () => outside }] : [] });
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  vi.stubGlobal('document', {
    createTreeWalker: () => { let first = true; return { nextNode: () => { const result = first ? {} : null; first = false; return result; } }; },
    createRange: () => ({ selectNodeContents: () => undefined, getClientRects: () => [outside] }),
  });
  try {
    for (const name of ['rz-results-body', 'rz-podium', 'rz-ranked-region']) {
      const failures = detectOverflow({ children: [], querySelectorAll: () => [card(name, true)] } as unknown as ParentNode);
      expect(failures.map(f => f.reason)).toEqual(['child outside bounds', 'text outside bounds', 'scroll overflow']);
      expect(failures[1]?.element).toBe(name);
      for (const failure of failures) {
        expect(failure.comparisons.length).toBeGreaterThan(0);
        expect(failure.comparisons).toContainEqual(expect.objectContaining({ measured: outside, bounds }));
      }
    }
    vi.stubGlobal('document', { createTreeWalker: () => ({ nextNode: () => null }) });
    expect(detectOverflow({ children: [], querySelectorAll: () => [card('rz-podium', false), card('rz-ranked-region', false)] } as unknown as ParentNode)).toEqual([]);
  } finally { vi.unstubAllGlobals(); }
});

it.each(['rz-rank-name', 'rz-podium-name'])('RZ-032 only installed %s ellipsis may clip text; other overflow remains a failure', className => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
  const name = { classList: { contains: (value: string) => value === className } };
  const card = { ...name, className, closest: () => null,
    getBoundingClientRect: () => bounds, clientWidth: 100, scrollWidth: 200,
    clientHeight: 100, scrollHeight: 100, children: [], querySelectorAll: () => [] };
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  vi.stubGlobal('document', {
    createTreeWalker: () => { let first = true; return { nextNode: () => { const result = first ? { parentElement: { classList: { contains: () => false }, closest: () => name } } : null; first = false; return result; } }; },
    createRange: () => ({ selectNodeContents: () => undefined, getClientRects: () => [{ ...bounds, right: 200 }] }),
  });
  const root = { children: [], querySelectorAll: () => [card] } as unknown as ParentNode;
  try {
    vi.stubGlobal('getComputedStyle', () => ({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }));
    expect(detectOverflow(root)).toEqual([expect.objectContaining({ kind: 'truncated', reason: 'name ellipsised' })]);
    card.scrollHeight = 102;
    expect(detectOverflow(root).some(f => f.reason === 'scroll overflow')).toBe(true);
    card.scrollHeight = 100;
    // Hidden horizontal name ranges must not bubble up through the podium.
    const ancestors = ['rz-podium-name', 'rz-podium-player', 'rz-step-members', 'rz-step', 'rz-podium', 'rz-results-body']
      .map(className => ({ ...card, className, classList: { contains: () => false }, scrollWidth: 100,
        children: [], querySelectorAll: () => [card] }));
    expect(detectOverflow({ children: [], querySelectorAll: () => [card, ...ancestors] } as unknown as ParentNode))
      .toEqual([expect.objectContaining({ kind: 'truncated', reason: 'name ellipsised' })]);
    vi.stubGlobal('getComputedStyle', () => ({ overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }));
    expect(detectOverflow(root).map(f => f.reason)).toEqual(['text outside bounds', 'scroll overflow']);
  } finally { vi.unstubAllGlobals(); }
});

it('RZ-032 detector checks the frame against the artboard', () => {
  const card = { className: 'rz-frame', classList: { contains: (name: string) => name === 'rz-frame' },
    closest: (selector: string) => selector === '.rz-artboard' ? { getBoundingClientRect: () => ({ left: 0, top: 0, right: 1920, bottom: 1080 }) } : null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 1920, bottom: 1085 }),
    children: [], querySelectorAll: () => [], clientWidth: 1920, scrollWidth: 1920, clientHeight: 1085, scrollHeight: 1085 };
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  vi.stubGlobal('document', { createTreeWalker: () => ({ nextNode: () => null }) });
  try { expect(detectOverflow({ children: [], querySelectorAll: () => [card] } as unknown as ParentNode)).toEqual([expect.objectContaining({ reason: 'frame outside artboard' })]); }
  finally { vi.unstubAllGlobals(); }
});

it('RZ-032 scaled frames retain at least one viewport pixel of tolerance but still detect real overflow', () => {
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  try {
    for (const scale of [0.667, 1, 2]) {
      const bounds = { left: 20, top: 30, right: 20 + 100 * scale, bottom: 30 + 100 * scale };
      const frame = { offsetWidth: 1920, querySelectorAll: () => [], getBoundingClientRect: () => ({ width: 1920 * scale }) };
      let excess = 0.8;
      const ink = () => ({ ...bounds, bottom: bounds.bottom + excess * scale });
      const card = { className: 'rz-total', classList: { contains: () => false },
        closest: (selector: string) => selector === '.rz-frame' ? frame : null,
        getBoundingClientRect: () => bounds, clientWidth: 100, scrollWidth: 100,
        clientHeight: 100, scrollHeight: 100,
        children: [], querySelectorAll: () => [{ className: 'score', getBoundingClientRect: ink }] };
      vi.stubGlobal('document', {
        createTreeWalker: () => { let first = true; return { nextNode: () => { const result = first ? {} : null; first = false; return result; } }; },
        createRange: () => ({ selectNodeContents: () => undefined, getClientRects: () => [ink()] }),
      });
      const root = { children: [], querySelectorAll: () => [card] } as unknown as ParentNode;
      expect(detectOverflow(root)).toEqual([]);
      excess = scale < 1 ? 1.4 : 0.8;
      expect(detectOverflow(root)).toEqual([]);
      excess = 2;
      expect(detectOverflow(root).map(f => f.reason)).toEqual(['child outside bounds', 'text outside bounds']);
      excess = 0;
      card.scrollWidth = 102;
      expect(detectOverflow(root).map(f => f.reason)).toEqual(['scroll overflow']);
    }
  } finally { vi.unstubAllGlobals(); }
});

it('RZ-032 detector reports overlapping siblings inside rows, steps and podiums', () => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  vi.stubGlobal('document', { createTreeWalker: () => ({ nextNode: () => null }) });
  try {
    for (const className of ['rz-rank', 'rz-step', 'rz-podium']) {
      const child = { className: 'child', getBoundingClientRect: () => bounds };
      const card = { className, classList: { contains: (name: string) => name === className }, closest: () => null,
        getBoundingClientRect: () => bounds, children: [child, child], querySelectorAll: () => [],
        clientWidth: 100, scrollWidth: 100, clientHeight: 100, scrollHeight: 100 };
      expect(detectOverflow({ querySelectorAll: () => [card] } as unknown as ParentNode)).toEqual([expect.objectContaining({ reason: 'sibling overlap' })]);
    }
  } finally { vi.unstubAllGlobals(); }
});


it.each(['empty', 'sibling', 'cousin', 'clipped', 'copy', 'old', 'copy-clipped', 'copy-horizontal', 'copy-excess', 'copy-padded', 'ellipsis', 'padding', 'artboard-padding', 'artboard-edge', 'frame-edge', 'hidden-peer', 'ancestor', 'descendant', 'decoration', 'aria-hidden'])('RZ-032 display line-height-1 overhang: %s', scenario => {
  const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom } as DOMRect);
  const titleBounds = box(55, 55, 321, 110);
  const glyphs = box(55, scenario === 'copy-excess' ? 30 : 45, scenario === 'copy-horizontal' ? 340 : 321, 120); // 75 px font content area around a 55 px line box.
  const clippingAncestor = { parentElement: null, classList: { contains: () => false }, getBoundingClientRect: () => titleBounds };
  const parent = { parentElement: scenario === 'copy-clipped' ? clippingAncestor : null,
    classList: { contains: (name: string) => name === (scenario === 'old' ? 'rz-old' : ['copy', 'copy-clipped', 'copy-horizontal', 'copy-excess', 'copy-padded'].includes(scenario) ? 'rz-copy' : '') },
    contains: () => false, getBoundingClientRect: () => scenario === 'copy-padded' ? box(55, 42, 321, 123) : ['clipped', 'copy', 'old', 'copy-clipped', 'copy-horizontal', 'copy-excess'].includes(scenario) ? titleBounds : box(0, 0, 1920, 1080) };
  const title = { className: 'rz-header', parentElement: parent, classList: { contains: () => false },
    closest: (selector: string) => selector === '.rz-frame' ? frame : selector === '.rz-artboard' && scenario.startsWith('artboard-') ? artboard : null,
    contains: () => false, getBoundingClientRect: () => titleBounds,
    clientWidth: 266, scrollWidth: 266, clientHeight: 55, scrollHeight: 65,
    children: [], querySelectorAll: () => [] };
  const peer = { childNodes: [{ nodeType: 3, textContent: 'Body text' }], getAttribute: (name: string) => name === 'aria-hidden' && scenario === 'aria-hidden' ? 'true' : null, parentElement: scenario === 'descendant' ? title : scenario === 'cousin' ? {} : parent, contains: () => false,
    getBoundingClientRect: () => scenario === 'decoration' ? box(0, 0, 1920, 1080) : box(55, 111, 321, 166) };
  const artboard = { getBoundingClientRect: () => box(0, scenario === 'artboard-edge' ? 47 : 0, 1920, 1080) };
  const frame = { offsetWidth: 1920, parentElement: null, getBoundingClientRect: () => ({ left: 0, top: scenario === 'frame-edge' ? 47 : scenario.startsWith('artboard-') ? 55 : 0, right: 1920, bottom: 1080, width: 1920 }),
    querySelectorAll: () => scenario === 'ancestor' ? [title, parent] : ['sibling', 'cousin', 'hidden-peer', 'descendant', 'decoration', 'aria-hidden'].includes(scenario) ? [title, peer] : [title] };
  vi.stubGlobal('getComputedStyle', (element: unknown) => ({ overflow: (element === parent && ['clipped', 'copy', 'old', 'copy-clipped', 'copy-horizontal', 'copy-excess', 'copy-padded'].includes(scenario)) || (element === clippingAncestor && scenario === 'copy-clipped') ? 'hidden' : 'visible',
    textOverflow: element === parent && scenario === 'ellipsis' ? 'ellipsis' : 'clip',
    display: element === peer && scenario === 'hidden-peer' ? 'none' : 'block',
    fontSize: '55px', paddingTop: element === frame ? '55px' : '0px' }));
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  vi.stubGlobal('document', {
    createTreeWalker: () => { let first = true; return { nextNode: () => { const node = first ? { parentElement: title } : null; first = false; return node; } }; },
    createRange: () => ({ selectNodeContents: () => undefined, getClientRects: () => [glyphs] }),
  });
  try {
    const findings = detectOverflow({ querySelectorAll: () => [title] } as unknown as ParentNode);
    expect(findings.map(f => f.reason)).toEqual(['text outside bounds', 'scroll overflow']);
    expect(findings.every(f => f.kind === (['empty', 'copy-padded', 'padding', 'artboard-padding', 'hidden-peer', 'ancestor', 'descendant', 'decoration', 'aria-hidden'].includes(scenario) ? 'overhang' : 'overflow'))).toBe(true);
  } finally { vi.unstubAllGlobals(); }
});

it.each([1280, 1920, 3840])('RZ-032 real header content geometry at %s rejects 3px ink clipping despite 10px half-leading', width => {
  const scale = width / 1920;
  const box = (top: number, bottom: number) => ({ left: 55 * scale, right: 421 * scale, top: top * scale, bottom: bottom * scale });
  const line = box(55, 110);
  let range = box(45, 120);
  // Simulate the fractional viewport coordinates that broke the exact 10px allowance.
  range = { ...range, top: range.top - 0.4, bottom: range.bottom + 0.4 };
  const frame = { offsetWidth: 1920, getBoundingClientRect: () => ({ ...box(0, 1080), width }), querySelectorAll: () => [] };
  let inkRight = 366;
  let inkDescent = 8;
  let prompt = false;
  let padded = false;
  const copy = { className: 'rz-copy', classList: { contains: (name: string) => name === 'rz-copy' }, parentElement: null,
    getBoundingClientRect: () => prompt ? box(55, padded ? 191 : 178) : line };
  const incoming = { className: '', tagName: 'DIV', textContent: 'Question', parentElement: copy,
    closest: (selector: string) => selector === '.rz-header' && !prompt ? header : null };
  const header = { className: 'rz-header', classList: { contains: () => false },
    closest: (selector: string) => selector === '.rz-frame' ? frame : null,
    getBoundingClientRect: () => line, querySelectorAll: () => [], children: [],
    clientWidth: 366, scrollWidth: 366, clientHeight: 55, scrollHeight: 55 };
  vi.stubGlobal('getComputedStyle', (element: unknown) => ({ overflow: element === copy ? 'hidden' : 'visible', fontSize: '55px', lineHeight: '55px', fontFamily: 'measured fallback' }));
  vi.stubGlobal('NodeFilter', { SHOW_TEXT: 4 });
  vi.stubGlobal('document', {
    // The measured 75px font content area around a 55px line: 10px half-leading.
    createElement: () => ({ getContext: () => ({ measureText: () => ({ fontBoundingBoxAscent: 60, fontBoundingBoxDescent: 15, actualBoundingBoxAscent: 50, actualBoundingBoxDescent: inkDescent, actualBoundingBoxLeft: 0, actualBoundingBoxRight: inkRight }) }) }),
    createTreeWalker: () => { let first = true; return { nextNode: () => { const node = first ? { parentElement: incoming } : null; first = false; return node; } }; },
    createRange: () => ({ selectNodeContents: () => undefined, getClientRects: () => prompt ? [box(58, 133), box(113, 188)] : [range] }),
  });
  try {
    const root = { querySelectorAll: () => [header] } as unknown as ParentNode;
    const findings = detectOverflow(root);
    expect(findings.some(f => f.kind === 'overflow')).toBe(true);
    expect(findings[0]?.comparisons).toContainEqual(expect.objectContaining({ boundsElement: 'rz-copy', verticalAllowance: 0 }));
    // Baseline = Range top + 60; ink bottom = baseline + 8.
    // At every scale, 113 overruns the mask at 110 by exactly 3 design px.
    range = box(45, 120);
    expect(detectOverflow(root).some(f => f.kind === 'overflow')).toBe(true);
    // Ink bottom 109 sits one design px inside the same unpadded mask.
    inkDescent = 4;
    expect(detectOverflow(root).every(f => f.kind === 'overhang')).toBe(true);
    inkDescent = 8;
    // Padded header contains the ink at 118 as well.
    range = box(50, 125);
    copy.getBoundingClientRect = () => prompt ? box(55, padded ? 191 : 178) : box(55, 123);
    expect(detectOverflow(root).every(f => f.kind === 'overhang')).toBe(true);
    inkRight += 3;
    expect(detectOverflow(root).some(f => f.kind === 'overflow')).toBe(true);
    inkRight = 366;
    range = box(45, 120);
    prompt = true;
    // Round 22 Jack Ü: two 55px lines + 13px headroom, but no bottom padding.
    // The last content rectangle ends at 188, below the unpadded mask at 178.
    expect(detectOverflow(root).some(f => f.kind === 'overflow')).toBe(true);
    padded = true;
    expect(detectOverflow(root).every(f => f.kind === 'overhang')).toBe(true);
    expect(readFileSync('games/rabakz/host/screen.css', 'utf8')).not.toContain('.rz-header > span > .rz-copy');
  } finally { vi.unstubAllGlobals(); }
});


it('RZ-034 only exempts the two branches of the same copy swap from collisions', () => {
  const mask = {} as Element;
  const otherMask = {} as Element;
  const branch = (old: boolean, parent = mask) => ({ parentElement: parent,
    closest: () => parent, classList: { contains: (name: string) => old && name === 'rz-old' } }) as unknown as Element;
  const outgoing = branch(true), incoming = branch(false);
  expect(swapPartners(outgoing, incoming)).toBe(true);
  expect(swapPartners(incoming, outgoing)).toBe(true);
  expect(swapPartners(incoming, branch(false))).toBe(false);
  expect(swapPartners(outgoing, branch(false, otherMask))).toBe(false);
});
