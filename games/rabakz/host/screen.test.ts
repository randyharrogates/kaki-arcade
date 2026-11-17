import { inlineStyle, revealTransition, animateBlockWipe, needsBlockWipe, blockMasks, layoutIdentity, successFrames, loadScreenFonts } from './Screen';
import * as ts from 'typescript';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { motionGeometry, blend, GHOST_OPACITY, contrastRatio, COLOUR_TOKENS, PLAYER_COLOURS, SEAT_NUMERAL, THEMES, tvType } from '@kaki/ui';
import { rabakz } from '../src/index';
import { advance, answer, LONG_OPTION, LONG_PROMPT, scenario, SCENARIOS } from './scenarios';
import { questionFit, SCREEN, screenModel, screenScale, viewportStyle, textLines, fallbackMeasure, createFitCache } from './view-model';

function model(name: typeof SCENARIOS[number]) {
  const result = screenModel(rabakz.publicView(scenario(name)));
  if (!result) throw new Error('Expected question/reveal');
  return result;
}

describe('R-03 public screen model', () => {
  for (const name of SCENARIOS) it(`RZ-003 RZ-031 ${name} uses a stepped real rule state`, () => {
    const m = model(name);
    expect(m.heading).toBe((name === 'next-question' || name === 'perf-next-question') ? 'Question 2 of 10' : 'Question 1 of 10');
    expect(m.options.map(o => o.shape)).toEqual(['cross', 'circle', 'square', 'triangle']);
    expect(m.options).toHaveLength(4);
    expect(JSON.stringify(m)).not.toMatch(/timer|countdown|time left|progress|elapsed|fastest|seconds/iu);
    expect(m.players).toHaveLength(name === 'one-player' ? 1 : ['departed-winner', 'departed-during-reveal'].includes(name) ? 7 : 8);
    expect(m.fit.fits).toBe(true);
  });
  it('RZ-005 RZ-031 wrong options and lock-out have explicit symbols and words', () => {
    const m = model('wrong-marked');
    expect(m.options.filter(o => o.wrong)).toHaveLength(1);
    expect(m.players[0]?.status).toBe('Locked out');
    expect(m.players[0]?.lockedOut).toBe(true);
    expect(m.options.every(o => o.chosenBy.length === 0)).toBe(true);
    expect(model('some-answered').players[0]?.status).toBe('Thinking');
    let s = scenario('open');
    const wrong = ((s.questions[0]?.correct ?? 0) + 1) % 4;
    s = advance(s, s.players.map((_, i) => answer(s, i, wrong)));
    expect(screenModel(rabakz.publicView(s))?.players.every(p => p.status === 'Thinking')).toBe(true);
  });
  it('RZ-006 names equals, one winner and nobody', () => {
    expect(model('reveal-one-winner').outcome).toBe('Mei got it');
    expect(model('reveal-tie').outcome).toBe('Mei and Ravi both got it');
    expect(model('reveal-tie').players.slice(0, 2).map(p => p.gained)).toEqual([100, 100]);
    expect(model('reveal-nobody').outcome).toBe('Nobody got it right');
    expect(model('reveal-nobody').options.filter(o => o.correct)).toHaveLength(1);
    expect(model('reveal-one-winner').options.find(o => o.correct)?.chosenBy.map(p => p.seat)).toEqual([1]);
  });
  it('RZ-006 a departed winner remains named; waiting joiners are separate', () => {
    let s = scenario('some-answered');
    s = rabakz.leave(s, s.players[0]?.info.id ?? '');
    while (s.phase === 'question') s = advance(s);
    expect(screenModel(rabakz.publicView(s))?.outcome).toBe('Mei got it');
    s = rabakz.join(scenario('some-answered'), { id: 'new', name: 'New', seat: 8, colour: 'seat-8' });
    expect(screenModel(rabakz.publicView(s))?.players.at(-1)?.status).toBe('Next question');
  });
  it('RZ-030 NFR-A11Y schema maxima fit all target sizes, including wide capitals', () => {
    const schema = readFileSync('content/rabakz/src/schema.ts', 'utf8');
    expect(schema).toContain('prompt: 120'); expect(schema).toContain('option: 40');
    expect(LONG_PROMPT).toHaveLength(120); expect(LONG_OPTION).toHaveLength(40);
    for (const picture of [false, true]) {
      for (const reveal of [false, true]) {
        const fit = questionFit(LONG_PROMPT, Array.from({ length: 4 }, () => LONG_OPTION), picture, reveal);
        expect(fit.fits).toBe(true);
        expect(fit.options.every(o => o.size === tvType.body)).toBe(true);
        for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160]]) {
          const scale = screenScale(width ?? 0, height ?? 0);
          expect(fit.needed * scale).toBeLessThanOrEqual(fit.available * scale);
          expect(SCREEN.width * scale).toBeLessThanOrEqual(width ?? 0);
          expect(SCREEN.height * scale).toBeLessThanOrEqual(height ?? 0);
        }
      }
    }
    expect(model('open').options.every(o => o.size === tvType.title)).toBe(true);
  });
  it('RZ-003 two-option legacy content is refused, and other issue phases belong to their owners', () => {
    const view = rabakz.publicView(scenario('open'));
    if (!view.question) throw new Error('Missing question');
    expect(screenModel({ ...view, question: { ...view.question, options: ['True', 'False'] } })).toBeNull();
    for (const phase of ['over', 'scoreboard', 'final'] as const) expect(screenModel({ ...view, phase })).toBeNull();
  });
  it('RZ-005 RZ-006 public additions reveal no picks, answer or winners before reveal', () => {
    for (const name of ['open', 'some-answered', 'wrong-marked', 'locked-out'] as const) {
      const s = scenario(name);
      const v = rabakz.publicView(s);
      expect(v.correct).toBeNull(); expect(v.winners).toEqual([]);
      expect(v.players.every(p => p.pick === null && p.answers === null)).toBe(true);
      for (let salt = 0; salt < 8; salt++) {
        const scrambled = rabakz.scrambleSecrets?.(s, null, salt);
        if (!scrambled) throw new Error('Missing secrets hook');
        expect(rabakz.publicView(scrambled)).toEqual(v);
        expect(screenModel(rabakz.publicView(scrambled))).toEqual(screenModel(v));
      }
    }
  });
  it('RZ-003 has no runtime rules-state dependency, HTML sink or time-pressure element', () => {
    const component = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
    const vm = readFileSync('games/rabakz/host/view-model.ts', 'utf8');
    expect(vm).toContain("import type { publicView }");
    expect(component).not.toMatch(/from ['"].*rules|innerHTML|dangerouslySetInnerHTML|<progress|<time\b|countdown|timer/iu);
    expect(vm).not.toMatch(/\bState\b|\.questions\b|\.elapsed\b|\.tick\b|\.firstCorrect\b/u);
    expect(component).toContain('clipPath'); expect(component).toContain('GHOST_OPACITY');
  });
});

it('NFR-A11Y every text/shape/seat pair clears large-text and graphical contrast', () => {
  const theme = THEMES.rabakz;
  for (const paint of [theme.background.colour, ...theme.background.treatment.paints]) {
    for (const ink of [theme.background.ink, theme.background.secondary]) expect(contrastRatio(ink, paint)).toBeGreaterThanOrEqual(3);
  }
  for (const paint of theme.panel.treatment.paints.flatMap(paint => [paint, blend(theme.panel.ink, GHOST_OPACITY, paint)])) {
    expect(contrastRatio(theme.panel.ink, paint)).toBeGreaterThanOrEqual(3);

  }
  for (const paint of theme.panel.treatment.paints.flatMap(paint => [paint, blend(theme.panel.ink, GHOST_OPACITY, paint)])) {
    for (const shape of model('reveal-nobody').options) expect(contrastRatio(shape.dimColour, paint)).toBeGreaterThanOrEqual(3);
  }
  for (const paint of theme.panel.treatment.paints) {
    for (const option of model('open').options) expect(contrastRatio(option.symbol.colour, paint)).toBeGreaterThanOrEqual(3);
  }
  for (const seat of PLAYER_COLOURS) {
    expect(contrastRatio(SEAT_NUMERAL, seat.colour)).toBeGreaterThanOrEqual(3);
    expect(COLOUR_TOKENS[seat.token]).toBe(seat.colour);
  }
});

it('RZ-030 CSS length boundary always supplies units to Preact', () => {
  for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160]] as const) {
    for (const value of Object.values(viewportStyle(width, height))) expect(value).toMatch(/^\d+px$/u);
  }
  for (const name of SCENARIOS) {
    const m = model(name);
    for (const value of [m.fit.fontSize, m.fit.promptHeight, ...m.options.map(o => o.fontSize)]) expect(value).toMatch(/^[\d.]+px$/u);
  }
  const component = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(component).not.toMatch(/(?:width|height|fontSize):\s*(?:\d|width\b|height\b|.*\.size\b)/u);
  expect(component).toContain('style={viewportStyle(width, height)}');
  expect(component).toContain('Record<string, string>');
  expect(component).not.toContain('style={{');
  expect(component).toContain('loadScreenFonts(document.fonts');
});
it('RZ-030 measurements decide stepping; CSS receives unbroken text', () => {
  const measured = (text: string, size: number) => text.length * size * 0.4;
  expect(textLines('Which shape has three sides?', 1810, 89, measured)).toHaveLength(1);
  expect(questionFit('Short prompt', ['Tokyo', 'Seoul', 'Hanoi', 'Bangkok'], false, false, measured).size).toBe(89);
  for (const picture of [false, true]) {
    const open = questionFit(LONG_PROMPT, [LONG_OPTION], picture, false);
    const reveal = questionFit(LONG_PROMPT, [LONG_OPTION], picture, true);
    expect(open.fontSize).toBe(reveal.fontSize);
    expect(open.promptHeight).toBe(reveal.promptHeight);
  }
  const component = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(component).toContain('{m.prompt}');
  expect(component).toContain('{option.text}');
  expect(component).toContain('⊘ Wrong');
});


it('RZ-030 picture boxes retain a readable golden media panel at every output size', () => {
  for (const name of ['picture', 'longest-text'] as const) {
    const fit = model(name).fit;
    const media = fit.boxes.media;
    expect(media.height).toBeGreaterThanOrEqual(name === 'picture' ? 377 : 144);
    expect(media.width / media.height).toBeCloseTo(1.618, 3);

    for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160]] as const) {
      const scale = screenScale(width, height);
      expect(media.height * scale).toBeGreaterThanOrEqual((name === 'picture' ? 377 : 144) * scale);
      expect((media.x + media.width) * scale).toBeLessThan(width);
      expect(fit.boxes.options.y + fit.boxes.options.height).toBeLessThanOrEqual(1080 - 55 - 377 - 13);
      expect(fit.fits).toBe(true);
    }
  }
});
it('RZ-006 reveal boxes ignore winner count and preceding question state', () => {
  const reference = model('reveal-one-winner').fit.boxes;
  for (const name of ['reveal-tie', 'reveal-nobody'] as const) {
    expect(model(name).fit.boxes.options).toEqual(reference.options);
    expect(model(name).fit.boxes.awards).toEqual(reference.awards);
  }
  let state = scenario('wrong-marked');
  state = advance(state, [answer(state, 1, state.questions[0]?.correct ?? 0)]);
  while (state.phase === 'question') state = advance(state);
  expect(screenModel(rabakz.publicView(state))?.fit.boxes).toEqual(reference);
});
it('RZ-006 only positive question awards get a won label, preserving seat order and totals', () => {
  for (const name of ['reveal-one-winner', 'reveal-tie', 'reveal-nobody'] as const) {
    const players = model(name).players;
    expect(players.map(p => p.seat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const player of players) expect(player.wonLabel).toBe(player.gained > 0 ? `+${String(player.gained)}` : null);
    expect(players.every(p => typeof p.score === 'number')).toBe(true);
  }
});

it('RZ-006 a non-winner retains points earned in an earlier question without a zero award', () => {
  let state = scenario('reveal-one-winner');
  while (state.phase === 'reveal' || state.phase === 'final') state = advance(state);
  state = advance(state, [{ player: state.players[0]?.info.id ?? '', control: 'skip', revision: 0 }]);
  const player = screenModel(rabakz.publicView(state))?.players[0];
  expect(player?.score).toBe(100);
  expect(player?.gained).toBe(0);
  expect(player?.wonLabel).toBeNull();
});

it('RZ-005 answerer identity does not depend on the secret correct index', () => {
  const state = scenario('some-answered');
  const original = rabakz.publicView(state);
  const alternate = rabakz.scrambleSecrets?.(state, null, 2);
  if (!alternate) throw new Error('Missing secrets hook');
  expect(rabakz.publicView(alternate).players).toEqual(original.players);
  expect(screenModel(original)?.players[0]?.status).toBe('Thinking');
  expect(screenModel(rabakz.publicView(alternate))?.players[0]?.status).toBe('Thinking');
});
it('RZ-006 persistent option and seat render keys survive reveal', () => {
  let state = scenario('open');
  const before = screenModel(rabakz.publicView(state));
  state = advance(state, [answer(state, 0, state.questions[0]?.correct ?? 0)]);
  while (state.phase === 'question') state = advance(state);
  const after = screenModel(rabakz.publicView(state));
  expect(after?.options.map(o => o.index)).toEqual(before?.options.map(o => o.index));
  expect(after?.players.map(p => p.id)).toEqual(before?.players.map(p => p.id));
  expect(after?.fit.boxes).toEqual(before?.fit.boxes);
});
it('RZ-030 picture wrong/reveal reserve marks and retain their media box', () => {
  const before = model('picture');
  for (const name of ['picture-wrong', 'picture-reveal'] as const) {
    const m = model(name);
    expect(m.fit.boxes).toEqual(before.fit.boxes);
    expect(m.fit.marksHeight).toBe(before.fit.marksHeight);
    expect(m.fit.marksHeight).toBeGreaterThanOrEqual(2 * 34 * 1.3 + 8);
    expect(m.fit.optionHeight).toBeGreaterThan(55 + 34 * 1.3 + 8 + 16);
    expect(m.fit.fits).toBe(true);
  }
});
it('RZ-030 wide names, long outcome and departed winners fit the reserved strip', () => {
  for (const name of ['wide-names', 'longest-reveal', 'three-winners', 'departed-winner'] as const) {
    const m = model(name);
    const seatWidth = (SCREEN.innerWidth - 3 * 13) / 4 - 55 - 8;
    const row = Math.max(...m.players.map(p => textLines(p.name, seatWidth, 34).length * 34 * 1.3 + 34 * 1.3));
    const needed = 89 + 8 + row * 2 + 13;
    expect(needed).toBeLessThanOrEqual(m.fit.boxes.awards.height);
    expect(textLines(m.outcome, SCREEN.innerWidth, 34).length * 34 * 1.3).toBeLessThanOrEqual(89);
    expect(m.fit.fits).toBe(true);
  }
});

it('RZ-030 fallback measures CJK and emoji as full-width glyphs', () => {
  expect(fallbackMeasure('麗'.repeat(12), 34, 'body')).toBe(408);
  expect(fallbackMeasure('😀'.repeat(12), 34, 'body')).toBe(408);
});

it('RZ-030 every inline property rejects bare numeric lengths at compile time', () => {
  // @ts-expect-error Every property requires a CSS string, including grid rows.
  inlineStyle({ gridAutoRows: 34 });
  // @ts-expect-error Offsets have the same boundary as width and font size.
  inlineStyle({ marginLeft: 34 });
  // @ts-expect-error Gap cannot silently become a unitless value.
  inlineStyle({ gap: 13 });
  expect(inlineStyle({ gridAutoRows: '34px', marginLeft: '34px', gap: '13px' }).gap).toBe('13px');
});

it('RZ-030 picture maximum copy, eight wide names and three winners fit beside media at every viewport', () => {
  const before = model('longest-reveal');
  const fit = before.fit;
  expect(fit.boxes.media.height).toBe(144);
  expect(fit.size).toBeGreaterThanOrEqual(34);
  expect(fit.options.every(o => o.size === 34)).toBe(true);
  const open = screenModel({ ...rabakz.publicView(scenario('longest-reveal')), phase: 'question' });
  expect(open?.fit.boxes).toEqual(fit.boxes);
  expect(open?.fit.options).toEqual(fit.options);
  for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160]] as const) {
    const scale = screenScale(width, height);
    expect(fit.boxes.media.height * scale).toBe(144 * scale);
    expect(fit.boxes.media.x + fit.boxes.media.width).toBeLessThan(fit.boxes.prompt.x);
    expect(fit.boxes.options.x).toBe(SCREEN.safe);
    expect(fit.boxes.prompt.y + fit.boxes.prompt.height).toBeLessThan(fit.boxes.options.y);
    for (const box of Object.values(fit.boxes)) {
      expect((box.x + box.width) * scale).toBeLessThanOrEqual(width);
      expect((box.y + box.height) * scale).toBeLessThanOrEqual(height - 55 * scale);
    }
    for (const option of fit.options) {
      expect(option.lines.length * option.size * 1.3 + 55 + 5 + 16).toBeLessThanOrEqual(fit.optionHeight);
    }
    expect(fit.boxes.options.y + fit.boxes.options.height).toBeLessThan(fit.boxes.awards.y);
  }
});
it('RZ-030 preferred media uses a secondary-to-primary golden split and stays above 377px', () => {
  const fit = model('picture').fit;
  expect(fit.width / fit.boxes.media.width).toBeCloseTo(1.618, 3);
  expect(fit.boxes.options.y + fit.boxes.options.height + 13).toBe(fit.boxes.awards.y);
  expect(fit.boxes.media.height).toBeGreaterThanOrEqual(377);
  expect(fit.boxes.media.width / fit.boxes.media.height).toBeCloseTo(1.618, 3);
});
it('RZ-030 D-102 answers use the largest fitting step within one step of the prompt', () => {
  const before = model('open').fit;
  const after = model('reveal-one-winner').fit;
  expect(before.options.every(o => o.size === 55)).toBe(true);
  expect(before.boxes).toEqual(after.boxes);
  expect(before.options).toEqual(after.options);
  expect(before.optionHeight).toBeGreaterThan(55 * 1.3 + 55 + 24);
  expect(before.boxes.options.y + before.boxes.options.height + 13).toBe(before.boxes.awards.y);
  expect(model('longest-reveal').fit.options.every(o => o.size === 34)).toBe(true);
});
it('RZ-005 locked-out copy has one visible and accessible status', () => {
  expect(model('locked-out').players[0]?.status).toBe('Locked out');
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(source).not.toContain('Answered, locked out');
  expect(source).not.toContain("' ⊘ Locked out'");
  expect(source).toContain("p.status === 'Locked out' ? '⊘ '");
});

it('RZ-005 every public field and visible seat field hides a correct answer until reveal', () => {
  const before = rabakz.publicView(scenario('open'));
  for (let seat = 0; seat < 8; seat++) {
    const state = scenario('open');
    const after = rabakz.publicView(advance(state, [answer(state, seat, state.questions[0]?.correct ?? 0)]));
    expect(after).toEqual(before);
    expect(screenModel(after)).toEqual(screenModel(before));
  }
  expect(readFileSync('games/rabakz/host/Screen.tsx', 'utf8')).not.toContain('Answered');
});
it('RZ-030 fit cache measures once per question, measure and font epoch, independent of viewport', () => {
  const fit = createFitCache();
  const q = rabakz.publicView(scenario('open')).question;
  if (!q) throw new Error('Missing question');
  let calls = 0;
  const measure = (...args: Parameters<typeof fallbackMeasure>) => { calls++; return fallbackMeasure(...args); };
  const first = fit(q, 1920, 1080, measure, 0);
  const count = calls;
  expect(fit(q, 1280, 720, measure, 0)).toBe(first);
  expect(fit({ ...q }, 1920, 1080, measure, 0)).toBe(first);
  expect(calls).toBe(count);
  const alternateMeasure = (...args: Parameters<typeof fallbackMeasure>) => measure(...args);
  fit(q, 1920, 1080, alternateMeasure, 0);
  expect(calls).toBeGreaterThan(count);

  for (const [question, width, epoch] of [[q, 1280, 1], [{ ...q, id: 'another' }, 1280, 1]] as const) {
    const previous = calls;
    fit(question, width, 1080, measure, epoch);
    expect(calls).toBeGreaterThan(previous);
  }
});
it('RZ-006 departed winners retain numbered chooser markers before and during reveal', () => {
  for (const name of ['departed-winner', 'departed-during-reveal'] as const) {
    const m = model(name);
    expect(m.players.map(p => p.seat)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(m.options.find(o => o.correct)?.chosenBy.map(p => p.seat)).toEqual([1]);
  }
  expect(model('reveal-nobody').options.every(o => !o.success)).toBe(true);
});

it('RZ-030 layout demo fixtures change question identity and retain open question phases', () => {
  const plain = model('non-picture-question');
  const picture = model('picture-question');
  expect(plain.reveal).toBe(false);
  expect(picture.reveal).toBe(false);
  expect(plain.picture).toBe(false);
  expect(picture.picture).toBe(true);
  expect(plain.identity).not.toBe(picture.identity);
  expect(model('open').identity).not.toBe(model('longest-text').identity);
  expect(plain.fit.boxes).not.toEqual(picture.fit.boxes);
});

it('RZ-030 final-geometry animation keyframes never animate layout properties', () => {
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  const ast = ts.createSourceFile('Screen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let arrays = 0;
  const visit = (node: ts.Node) => {
    if (ts.isArrayLiteralExpression(node)) {
      for (const frame of node.elements) if (ts.isObjectLiteralExpression(frame)) {
        arrays++;
        for (const property of frame.properties) if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
          expect(property.name.getText(ast).replace(/^['"]|['"]$/gu, '')).not.toMatch(/^(?:width|height|top|left|grid.*)$/iu);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  expect(arrays).toBeGreaterThan(10);
  expect(source).not.toMatch(/gridTemplateRows/u);
});
it('RZ-030 D-102 typical picture uses equally sized 55px prompt and answers', () => {
  const fit = model('picture').fit;
  expect(fit.size).toBe(55);
  expect(fit.options.every(option => option.size === 55)).toBe(true);
});

it('RZ-031 reveal and mid-question wrong marks change mask identity', () => {
  expect(model('open').identity).not.toBe(model('reveal-one-winner').identity);
  expect(model('open').identity).not.toBe(model('wrong-marked').identity);
  for (const field of ['heading', 'category', 'prompt'] as const) {
    expect(model('open')[field]).toBe(model('wrong-marked')[field]);
    expect(model('open')[field]).toBe(model('reveal-one-winner')[field]);
  }
});

it('RZ-030 rejected font loads preserve the current fit without an unhandled rejection', async () => {
  let refreshed = false;
  await expect(loadScreenFonts({ ready: Promise.resolve(), load: () => Promise.reject(new Error('Face unavailable')) }, { display: 'Display', body: 'Body' }, () => { refreshed = true; })).resolves.toBeUndefined();
  expect(refreshed).toBe(false);
  const loaded: string[] = [];
  await loadScreenFonts({ ready: Promise.resolve(), load: name => { loaded.push(name); return Promise.resolve(); } }, { display: 'Display', body: 'Body' }, () => { refreshed = true; });
  expect(loaded).toEqual(['89px Display', '700 55px Body']);
  expect(refreshed).toBe(true);
});

it('RZ-031 D-105 success edge is invisible at rest and after its pulse, absent with reduced motion', () => {
  const css = readFileSync('games/rabakz/host/screen.css', 'utf8');
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(css).toMatch(/\.rz-pulse-ring \{[^}]*inset: 0; opacity: 0; border-radius: inherit; box-shadow: inset/u);
  expect(source).toContain('correct && !reduced && <div class="rz-pulse-ring"');
  expect(successFrames().map(frame => frame.opacity)).toEqual([0, 1, 0]);
  expect(source).toContain("duration: duration.slow, delay: duration.slow - STAGGER_MS");
});

it('RZ-030 D-105 layout changes have one outgoing and one incoming shared boundary, with no translations', () => {
  for (const [from, to] of [['picture-question', 'non-picture-question'], ['non-picture-question', 'picture-question'], ['open', 'longest-text']] as const) {
    expect(layoutIdentity(model(from))).not.toBe(layoutIdentity(model(to)));
  }
  expect(layoutIdentity(model('open'))).toBe(layoutIdentity(model('reveal-one-winner')));
  const masks = blockMasks();
  expect(Object.keys(masks)).toEqual(['incoming', 'outgoing']);
  expect(masks.incoming).toEqual([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }]);
  expect(masks.outgoing).toEqual([{ clipPath: 'inset(0)' }, { clipPath: 'inset(0 0 0 100%)' }]);
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  const block = source.slice(source.indexOf('function QuestionBlock'), source.indexOf('function OptionGrid'));
  expect(source.slice(source.indexOf('export function animateBlockWipe'), source.indexOf('function QuestionBlock')).match(/\.animate\(/gu)).toHaveLength(2);
  expect(source).toContain('animate(frames.incoming, options)');
  expect(source).toContain('animate(frames.outgoing, options)');
  expect(block).toContain('if (!old || reduced) return');
  expect(source.slice(0, source.indexOf('export function RabakzScreen'))).not.toMatch(/transform:.*translate\(/u);
});

it('RZ-006 D-105 winner tick follows the final name character in a nonbreaking tail', () => {
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(source).toContain('{Array.from(p.name).at(-1)}<span class="rz-winner">');
  expect(readFileSync('games/rabakz/host/screen.css', 'utf8')).toContain('.rz-name-tail { white-space: nowrap; }');
  expect(readFileSync('games/rabakz/host/demo.tsx', 'utf8')).toContain("document.documentElement.dataset.rzReady = '1'");
});

it('RZ-030 D-106 only changed questions with changed geometry wipe', () => {
  const before = model('open');
  const relayout = { ...model('picture-question'), questionId: before.questionId };
  expect(needsBlockWipe(before, relayout)).toBe(false);
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(source).toContain('identity={m.prompt}');
  expect(source).toContain('identity={option.text}');
  expect(source).not.toContain('key={identity}');
  expect(needsBlockWipe(before, { ...before, questionId: 'new-question' })).toBe(false);
  expect(needsBlockWipe(before, model('picture-question'))).toBe(true);
});
it('RZ-031 D-106 pulse uses shape colour, token width and peak', () => {
  expect(successFrames()).toEqual([{ opacity: 0 }, { opacity: 1, offset: motionGeometry.pulsePeak }, { opacity: 0 }]);
  expect(readFileSync('games/rabakz/host/Screen.tsx', 'utf8')).toContain("'--rz-success-colour': option.symbol.colour");
  expect(readFileSync('games/rabakz/host/screen.css', 'utf8')).toContain('var(--ka-space-8) var(--rz-success-colour)');
});
it('RZ-030 reduced-motion cleanup discards the outgoing block and reveal resumes after the wipe', () => {
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  let clears = 0, cancels = 0;
  const animation = { onfinish: null, cancel: () => { cancels++; } };
  const element = { animate: () => animation as unknown as Animation };
  const cleanup = animateBlockWipe(element, element, 1, () => { clears++; });
  cleanup();
  expect(cancels).toBe(2);
  expect(clears).toBe(1);
  expect(source).toContain('if (blocked) return null;');
  expect(source).toContain('[active, reduced, slow, blocked, questionId]');
  expect(source).toContain('[option.correct, option.success, reduced, slow, blocked, questionId]');
});
it('RZ-030 a second question during a wipe keeps its own snapshot when the first wipe is cancelled', () => {
  let clears = 0;
  const animation = { onfinish: null, cancel: () => undefined };
  const element = { animate: () => animation as unknown as Animation };
  animateBlockWipe(element, element, 1, () => { clears++; }, () => false)();
  expect(clears).toBe(0);
  animateBlockWipe(element, element, 1, () => { clears++; }, () => true)();
  expect(clears).toBe(1);
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(source).toContain('() => reducedNow.current !== reduced');
});
it('RZ-030 D-105 a copy inside a wiping block changes with the block, not by its own mask', () => {
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  const copy = source.slice(source.indexOf('function Copy('), source.indexOf('export function loadScreenFonts'));
  expect(copy).toContain('useContext(BlockMotion)');
  expect(copy).toContain("!reduced && !blocked");
});
it('RZ-006 D-106 tick always reserves its trailing width and token margin', () => {
  const source = readFileSync('games/rabakz/host/Screen.tsx', 'utf8');
  expect(source).toContain('}>✓</span>');
  expect(source).not.toContain('> ✓</span>');
  expect(readFileSync('games/rabakz/host/screen.css', 'utf8')).toContain('.rz-winner { margin-left: var(--ka-space-5); }');
});

it('RZ-030 perf next question changes question identity with identical geometry', () => {
  expect(model('perf-next-question').questionId).not.toBe(model('open').questionId);
  expect(layoutIdentity(model('perf-next-question'))).toBe(layoutIdentity(model('open')));
});

it('RZ-031 early reveal runs once after its question wipe, including consecutive correct options', () => {
  const previous = { questionId: 'old', active: true };
  expect(revealTransition(previous, 'new', false, true)).toBeNull();
  expect(revealTransition(previous, 'new', true, true)).toBeNull();
  expect(revealTransition(previous, 'new', true, false)).toEqual({ was: false });
  expect(revealTransition(previous, 'new', true, false)).toBeNull();
});
