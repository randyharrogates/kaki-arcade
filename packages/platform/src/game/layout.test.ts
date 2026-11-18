import { describe, expect, it } from 'vitest';
import {
  BUTTON,
  PAD_BUTTON_BIT,
  PHONE,
  PHONE_LIMITS,
  checkLayout,
  checkPhoneFit,
  checkPrivateView,
  footprintOf,
  jsonSize,
  tapSignature,
} from './kit';
import type { ControllerLayout, GridCell, LayoutControl, PrivateView } from './kit';
// The three v1 games, as their specs describe their phones. If the schema could not say
// these, it would not fit the games (PLAT-033).
const tabaoRush: ControllerLayout = {
  revision: 1,
  controls: [
    { kind: 'stick', id: 'move' },
    { kind: 'button', id: 'carry', button: 'face-bottom', label: 'Pick up' },
    { kind: 'button', id: 'act', button: 'face-right', label: 'Chop' },
    { kind: 'button', id: 'dash', button: 'face-left', label: 'Dash' },
    { kind: 'button', id: 'throw', button: 'face-top', label: 'Throw', disabled: true },
    { kind: 'shake', id: 'toss', button: 'face-right' },
  ],
};
const rabakzQuestion: ControllerLayout = {
  revision: 12,
  controls: [
    {
      kind: 'options',
      id: 'answer',
      options: [
        { id: 'a', label: 'The Merlion spouts water from its mouth', face: 'face-bottom' },
        {
          id: 'b',
          label: 'An option can be up to forty characters.',
          face: 'face-right',
          state: 'disabled',
        },
        { id: 'c', label: 'Kaya', face: 'face-left' },
        { id: 'd', label: 'Teh tarik', face: 'face-top' },
      ],
    },
    {
      kind: 'options',
      id: 'skip',
      audience: 'leader',
      options: [{ id: 'go', label: 'Skip question' }],
    },
  ],
};
const rabakzReveal: PrivateView = {
  revision: 0,
  blocks: [
    { kind: 'text', text: 'Right!', tone: 'title' },
    { kind: 'stat', label: 'Points', value: 150 },
    { kind: 'stat', label: 'Streak', value: 3 },
    { kind: 'stat', label: 'Total', value: '1,250' },
  ],
};
const faceDown: GridCell[] = Array.from({ length: 16 }, (_, index) =>
  index === 5 || index === 11 ? { state: 'selected' } : {},
);
const peekPokerPick: ControllerLayout = {
  revision: 7,
  controls: [
    { kind: 'text', id: 'ask', text: 'Pick 2 cards' },
    { kind: 'grid', id: 'cards', rows: 4, cols: 4, cells: faceDown },
    { kind: 'options', id: 'lock', size: 'large', options: [{ id: 'go', label: 'Lock in' }] },
  ],
};
const peekPokerHand: PrivateView = {
  revision: 0,
  blocks: [
    {
      kind: 'cards',
      cards: [
        { id: 'c1', label: 'Q', mark: 'spade' },
        { id: 'c2', label: '10', mark: 'heart', colour: 'shape-circle' },
        { id: 'c3', label: 'Q', mark: 'club' },
        { id: 'c4', label: '4', mark: 'diamond' },
        { id: 'c5', label: 'A', mark: 'spade' },
      ],
    },
    { kind: 'text', text: 'Pair of queens' },
    { kind: 'stat', label: 'Points', value: 2 },
  ],
};
describe('the schema fits the three games', () => {
  it.each([
    ['Tabao Rush', tabaoRush, null],
    ['Rabakz question', rabakzQuestion, null],
    [
      'Rabakz reveal',
      {
        revision: 13,
        controls: [{ kind: 'text', id: 'look', text: 'Look at the TV' }],
      } satisfies ControllerLayout,
      rabakzReveal,
    ],
    ['Peek Poker pick', peekPokerPick, null],
    ['Peek Poker reveal', { revision: 8, controls: [] } satisfies ControllerLayout, peekPokerHand],
  ])('%s is sound, within the caps and fits a phone', (_name, layout, view) => {
    expect(checkLayout(layout)).toEqual([]);
    expect(checkPrivateView(view)).toEqual([]);
    expect(checkPhoneFit(layout, view)).toEqual([]);
    expect(jsonSize(layout)).toBeLessThan(PHONE_LIMITS.layoutBytes);
  });
  it('pad buttons are named by position and map to the frame bits', () => {
    expect(PAD_BUTTON_BIT).toEqual({
      'face-bottom': 4,
      'face-right': 5,
      'face-left': 6,
      'face-top': 7,
      'shoulder-left': 8,
      'shoulder-right': 9,
    });
    expect(new Set(Object.values(BUTTON)).size).toBe(Object.keys(BUTTON).length);
    expect(Math.max(...Object.values(BUTTON))).toBeLessThan(32);
  });
});
describe('the stated phone limits', () => {
  const grid = (rows: number, cols: number): LayoutControl => ({
    kind: 'grid',
    id: 'grid',
    rows,
    cols,
    cells: Array.from({ length: rows * cols }, () => ({})),
  });
  const options = (count: number, id = 'answers'): LayoutControl => ({
    kind: 'options',
    id,
    options: Array.from({ length: count }, (_, i) => ({ id: `o${String(i)}`, label: 'Answer' })),
  });
  const fit = (controls: readonly LayoutControl[]) =>
    checkPhoneFit({ revision: 0, controls }, null);
  it('uses real rows and columns at the decided floors', () => {
    expect([PHONE_LIMITS.gridRows, PHONE_LIMITS.gridCols]).toEqual([4, 8]);
    expect(PHONE.play).toEqual({ width: 818, height: 314 });
    expect(footprintOf(grid(4, 4))).toMatchObject({ width: 380, height: 296 });
    expect(footprintOf(grid(5, 12))).toMatchObject({ width: 1156, height: 372 });
    expect(footprintOf({ kind: 'button', id: 'go', button: 'face-bottom', label: 'Go' })).toEqual({
      width: 110,
      height: 110,
    });
    expect(fit(tabaoRush.controls)).toEqual([]);
    expect(fit(peekPokerPick.controls)).toEqual([]);
    expect(fit([options(4)])).toEqual([]);
  });
  it.each([
    ['5 by 12 grid', [grid(5, 12)]],
    [
      'faces, options and grid',
      [...tabaoRush.controls.filter((c) => c.kind === 'button'), options(4), grid(5, 8)],
    ],
    [
      'stick, pad, six buttons, swipe and options',
      [
        ...tabaoRush.controls,
        { kind: 'dpad', id: 'pad' },
        { kind: 'button', id: 'l', button: 'shoulder-left', label: 'Left' },
        { kind: 'button', id: 'r', button: 'shoulder-right', label: 'Right' },
        { kind: 'swipe', id: 'swipe' },
        options(8),
      ],
    ],
    ['twenty options', [options(8, 'one'), options(8, 'two'), options(4, 'three')]],
    [
      'stick, pad and grid',
      [{ kind: 'stick', id: 'move' }, { kind: 'dpad', id: 'pad' }, grid(5, 8)],
    ],
  ] satisfies [string, LayoutControl[]][])('rejects %s', (_name, controls) => {
    expect(fit(controls).length).toBeGreaterThan(0);
  });
});
describe('checkLayout', () => {
  const bad = (layout: unknown): string => checkLayout(layout).join('\n');
  const one = (control: unknown): string => bad({ revision: 1, controls: [control] });
  it('refuses what is not a layout at all', () => {
    expect(bad(null)).toBe('layout: must be an object');
    expect(bad({ revision: 1 })).toBe('layout: controls must be a list');
    expect(bad({ revision: 1.5, controls: [], phase: 'pick' })).toBe(
      'layout: "phase" is not part of the schema\nlayout: revision must ' +
        'be a whole number of at least 0',
    );
    expect(bad({ revision: 1, controls: [new Map()] })).toBe(
      'layout.controls[0] is [object Map], not a plain object or array',
    );
    expect(one('stick')).toBe('control 0: must be an object');
  });
  it('refuses a control or a field that is not in the schema', () => {
    expect(one({ kind: 'slider', id: 'volume' })).toMatch(
      new RegExp(
        'kind "slider" is not in the schema; use one of stick, dpad, ' +
          'button, shake, tilt, swipe, options, grid, cards, text',
        '',
      ),
    );
    expect(one({ kind: 'stick', id: 'move', deadZone: 0.2 })).toBe(
      'control 0 (move): "deadZone" is not part of the schema',
    );
    expect(one({ kind: 'button', id: 'go', button: 'A', label: 'Go' })).toMatch(
      new RegExp(
        'button: must be one of face-bottom, face-right, face-left, ' +
          'face-top, shoulder-left, shoulder-right',
        '',
      ),
    );
    expect(one({ kind: 'text', id: 'x', text: 'Hi', tone: 'shout' })).toMatch(
      /tone: must be one of title, body, note/,
    );
    expect(
      one({ kind: 'options', id: 'o', options: [{ id: 'a', label: 'A', face: 'A' }] }),
    ).toMatch(/option 0 face: must be one of/);
    expect(
      one({ kind: 'options', id: 'o', options: [{ id: 'a', label: 'A', points: 3 }] }),
    ).toMatch(/option 0: "points" is not part of the schema/);
  });
  it('refuses colour values, taking only token names', () => {
    expect(
      one({ kind: 'button', id: 'go', button: 'face-top', label: 'Go', colour: 'seat-3' }),
    ).toBe('');
    for (const colour of [['#', 'D9483B'].join(''), ['rgb', '(1, 2, 3)'].join(''), 'Seat 3', '']) {
      expect(one({ kind: 'button', id: 'go', button: 'face-top', label: 'Go', colour })).toMatch(
        /colour: must be the name of a colour token/,
      );
    }
  });
  it('holds ids, labels and counts to the stated limits', () => {
    expect(one({ kind: 'stick', id: 'Move Stick' })).toMatch(
      /id must be lower-case letters, digits and hyphens, at most 21 characters/,
    );
    expect(
      bad({
        revision: 1,
        controls: [
          { kind: 'stick', id: 'a' },
          { kind: 'dpad', id: 'a' },
        ],
      }),
    ).toMatch(/control 1 \(a\): id is used twice/);
    expect(
      bad({
        revision: 1,
        controls: [
          { kind: 'stick', id: 'a' },
          { kind: 'stick', id: 'b' },
        ],
      }),
    ).toMatch(/layout: has 2 of "stick"; a phone has one/);
    expect(
      bad({
        revision: 1,
        controls: [
          { kind: 'button', id: 'a', button: 'face-top', label: 'A' },
          { kind: 'button', id: 'b', button: 'face-top', label: 'B' },
        ],
      }),
    ).toMatch(/has 2 of "button face-top"; a phone has one/);
    expect(one({ kind: 'button', id: 'go', button: 'face-top', label: 'Fourteen chars' })).toMatch(
      /label: is 14 characters; the most that fits is 13/,
    );
    expect(one({ kind: 'button', id: 'go', button: 'face-top', label: ' ' })).toMatch(
      /label: must not be empty/,
    );
    expect(one({ kind: 'text', id: 'x', text: 'x'.repeat(121) })).toMatch(
      /text: is 121 characters; the most that fits is 120/,
    );
    expect(one({ kind: 'options', id: 'o', options: [] })).toMatch(
      /options must be a list of at least one/,
    );
    expect(
      one({
        kind: 'options',
        id: 'o',
        options: Array.from({ length: 9 }, (_, i) => ({ id: `o${String(i)}`, label: 'x' })),
      }),
    ).toMatch(/has 9 options; the most that fits is 8/);
    expect(
      one({
        kind: 'options',
        id: 'o',
        options: [
          { id: 'a', label: 'x'.repeat(41) },
          { id: 'a', label: 'y' },
        ],
      }),
    ).toMatch(/41 characters; the most that fits is 40[\s\S]*id "a" is used twice/);
    expect(one({ kind: 'grid', id: 'g', rows: 13, cols: 13, cells: [] })).toMatch(
      new RegExp(
        'rows must be a whole number from 1 to 4[\\s\\S]*cols must be a ' +
          'whole number from 1 to 8',
        '',
      ),
    );
    expect(one({ kind: 'grid', id: 'g', rows: 2, cols: 2, cells: [{}, {}, {}] })).toMatch(
      /has 3 cells; rows times cols is 4/,
    );
    expect(
      one({ kind: 'grid', id: 'g', rows: 1, cols: 1, cells: [{ label: 'four', state: 'lit' }] }),
    ).toMatch(
      new RegExp(
        'cell 0 label: is 4 characters[\\s\\S]*cell 0 state: must be one of ' +
          'plain, selected, disabled',
        '',
      ),
    );
    expect(
      one({
        kind: 'cards',
        id: 'c',
        cards: Array.from({ length: 9 }, (_, i) => ({ id: `c${String(i)}`, label: 'Q' })),
      }),
    ).toMatch(/has 9 cards; a row holds 8/);
    expect(
      one({ kind: 'cards', id: 'c', cards: [{ id: 'a', faceDown: true }, { id: 'b' }] }),
    ).toMatch(/^control 0 \(c\) card 1 label: must be text$/);
    expect(
      bad({
        revision: 1,
        controls: Array.from({ length: 14 }, (_, i) => ({
          kind: 'text',
          id: `t${String(i)}`,
          text: 'x',
        })),
      }),
    ).toMatch(/has 14 controls; the most is 13/);
    expect(one({ kind: 'shake', id: 'toss', button: 'face-right' })).toMatch(
      new RegExp(
        'needs button face-right in the layout too, for players who cannot ' +
          'shake \\(CTRL-007\\)',
        '',
      ),
    );
    expect(one({ kind: 'stick', id: 'move', audience: 'yes' })).toMatch(/audience: must be one of/);
  });
  it('counts characters, not code units, so Tamil and emoji labels are not cut short', () => {
    expect(one({ kind: 'button', id: 'go', button: 'face-top', label: '🤷🤷🤷🤷🤷🤷🤷' })).toBe('');
  });
  it('enforces the 4,096-byte cap', () => {
    const cells = Array.from({ length: 60 }, () => ({
      label: 'abc',
      colour: 'shape-triangle',
      focus: true,
      state: 'selected',
    }));
    expect(
      bad({ revision: 1, controls: [{ kind: 'grid', id: 'g', rows: 5, cols: 12, cells }] }),
    ).toMatch(/layout: is \d{4} bytes; the most the protocol carries is 4096$/);
  });
});
describe('checkPrivateView', () => {
  const bad = (view: unknown): string => checkPrivateView(view).join('\n');
  it('accepts nothing to show', () => {
    expect(bad(null)).toBe('');
    expect(bad({ revision: 0, blocks: [] })).toBe('');
  });
  it('refuses what is outside the schema or the limits', () => {
    expect(bad('hello')).toBe('private view: must be an object or null');
    expect(bad({ revision: 0, blocks: [], hand: [] })).toBe(
      'private view: "hand" is not part of the schema',
    );
    expect(bad({ cards: [] })).toMatch(/blocks must be a list/);
    expect(bad({ revision: 0, blocks: [{ kind: 'video', src: 'x' }] })).toMatch(
      /block 0: kind "video" is not in the schema; use one of text, cards, stat, grid/,
    );
    expect(
      bad({ revision: 0, blocks: [{ kind: 'stat', label: 'Points', value: 'x'.repeat(14) }] }),
    ).toMatch(/value: is 14 characters; the most that fits is 13/);
    expect(bad({ revision: 0, blocks: [{ kind: 'stat', label: 'Points', value: true }] })).toMatch(
      /value: must be text/,
    );
    expect(bad({ revision: 0, blocks: [{ kind: 'text', text: 'Hi', id: 'x' }] })).toMatch(
      /"id" is not part of the schema/,
    );
    expect(bad({ revision: 0, blocks: [{ kind: 'grid', rows: 1, cols: 2, cells: [{}] }] })).toMatch(
      /has 1 cells; rows times cols is 2/,
    );
    expect(
      bad({ revision: 0, blocks: Array.from({ length: 9 }, () => ({ kind: 'text', text: 'x' })) }),
    ).toMatch(/has 9 blocks; the most is 8/);
    expect(bad({ revision: 0, blocks: [{ kind: 'stat', label: 'n', value: Number.NaN }] })).toMatch(
      /NaN, which JSON cannot carry/,
    );
  });
  it('enforces the 8,192-byte cap', () => {
    const cells = Array.from({ length: 60 }, () => ({
      label: 'abc',
      colour: 'shape-triangle',
      focus: true,
      state: 'selected',
    }));
    const grid = { kind: 'grid', rows: 5, cols: 12, cells };
    expect(bad({ revision: 0, blocks: [grid] })).toBe('');
    expect(bad({ revision: 0, blocks: [grid, grid] })).toMatch(
      /private view: is \d+ bytes; the most the protocol carries is 8192$/,
    );
  });
});
describe('tapSignature', () => {
  const base: ControllerLayout = {
    revision: 1,
    controls: [
      { kind: 'text', id: 't', text: '20 s' },
      {
        kind: 'options',
        id: 'answer',
        options: [
          { id: 'a', label: 'Kaya' },
          { id: 'b', label: 'Otah' },
        ],
      },
    ],
  };
  const withOptions = (
    options: {
      id: string;
      label: string;
      state?: 'selected' | 'disabled';
    }[],
    text = '20 s',
  ): ControllerLayout => ({
    revision: 1,
    controls: [
      { kind: 'text', id: 't', text },
      { kind: 'options', id: 'answer', options },
    ],
  });
  it('does not change for a countdown, a selection or an option greyed out', () => {
    expect(
      tapSignature(
        withOptions(
          [
            { id: 'a', label: 'Kaya' },
            { id: 'b', label: 'Otah' },
          ],
          '19 s',
        ),
      ),
    ).toBe(tapSignature(base));
    expect(
      tapSignature(
        withOptions([
          { id: 'a', label: 'Kaya', state: 'selected' },
          { id: 'b', label: 'Otah', state: 'disabled' },
        ]),
      ),
    ).toBe(tapSignature(base));
  });
  it('changes when a tap would mean something else', () => {
    expect(
      tapSignature(
        withOptions([
          { id: 'a', label: 'Laksa' },
          { id: 'b', label: 'Otah' },
        ]),
      ),
    ).not.toBe(tapSignature(base));
    expect(tapSignature(withOptions([{ id: 'a', label: 'Kaya' }]))).not.toBe(tapSignature(base));
    expect(tapSignature({ revision: 1, controls: [] })).not.toBe(tapSignature(base));
    const grid = (label: string): ControllerLayout => ({
      revision: 1,
      controls: [{ kind: 'grid', id: 'g', rows: 1, cols: 1, cells: [{ label }] }],
    });
    expect(tapSignature(grid('1'))).not.toBe(tapSignature(grid('2')));
    const cards = (tappable: boolean): ControllerLayout => ({
      revision: 1,
      controls: [{ kind: 'cards', id: 'c', tappable, cards: [{ id: 'a', label: 'Q' }] }],
    });
    expect(tapSignature(cards(true))).not.toBe(tapSignature(cards(false)));
  });
});
it(
  'supports audience on controls and panels, focus independent of ' +
    'selection, and only the decided colour tokens',
  async () => {
    const { FACE_SHAPE, layoutFor, privateViewFor } = await import('./index');
    expect(FACE_SHAPE).toEqual({
      'face-bottom': 'cross',
      'face-right': 'circle',
      'face-left': 'square',
      'face-top': 'triangle',
    });
    const layout: ControllerLayout = {
      revision: 1,
      controls: [
        {
          kind: 'grid',
          id: 'g',
          audience: 'not-leader',
          rows: 1,
          cols: 1,
          cells: [{ state: 'selected', focus: true, colour: 'shape-cross' }],
        },
      ],
    };
    expect(checkLayout(layout)).toEqual([]);
    expect(layoutFor(layout, true).controls).toEqual([]);
    const panel: PrivateView = {
      revision: 0,
      blocks: [{ kind: 'text', audience: 'leader', text: 'Choose' }],
    };
    expect(checkPrivateView(panel)).toEqual([]);
    expect(privateViewFor(panel, false)?.blocks).toEqual([]);
    for (const colour of ['seat-0', 'seat-9', 'shape-bottom', 'brand-red', 'button-a']) {
      expect(
        checkLayout({
          revision: 0,
          controls: [{ kind: 'button', id: 'go', button: 'face-bottom', label: 'Go', colour }],
        }).join(),
      ).toMatch(/colour token/);
    }
    // The console's Menu is in the reserved bar: 55 square at y=8 ends at play y=63.
    expect(8 + PHONE_LIMITS.menu).toBe(63);
    expect(63 + PHONE.play.height + 13).toBe(PHONE.height);
  },
);
it('round 2 measures unbreakable words and the entire options block', async () => {
  const { footprintOf } = await import('./index');
  const options: LayoutControl = {
    kind: 'options',
    id: 'answers',
    options: Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      label: 'Short answer',
    })),
  };
  expect(footprintOf(options)).toEqual({ width: 301, height: 311 });
  const long: LayoutControl = {
    kind: 'options',
    id: 'answers',
    options: Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      label: 'Supercalifragilisticexpialidocious',
      face: 'face-bottom',
    })),
  };
  expect(footprintOf(long).width).toBeGreaterThan(818);
});

it('CTRL-004 D-164 accepts face-down grid flags and rejects leaked faces', () => {
  const layout = (cell:unknown) => ({ revision:1,controls:[{ kind:'grid',id:'g',rows:1,cols:1,cells:[cell] }] });
  const cell:GridCell = { faceDown:true,state:'selected' };
  expect(checkLayout(layout(cell))).toEqual([]);
  expect(checkLayout(layout({ faceDown:false,label:'Ace' }))).toEqual([]);
  for (const face of [{ label:'Ace' },{ label:'' },{ mark:'spade' }])
    expect(checkLayout(layout({ faceDown:true,...face })).join('\n')).toContain('face-down cell must not carry a label or mark');
  expect(checkLayout(layout({ faceDown:'yes' })).join('\n')).toMatch(/faceDown.*true or false/);
});
