import { blend, GHOST_OPACITY, THEMES, COLOUR_TOKENS, PHI, SHAPE_BUTTONS, SHAPE_NAMES, space, tv, tvType, lineHeight } from '@kaki/ui';
import { categoryTitle } from './categories';
import type { publicView } from '../src/rules/views';

export type RabakzPublicView = ReturnType<typeof publicView>;

export type MeasureText = (text: string, size: number, face: 'display' | 'body' | 'mono') => number;
export const cssLength = (value: number): `${number}px` => `${String(value)}px` as `${number}px`;
export const viewportStyle = (width: number, height: number) => ({ width: cssLength(width), height: cssLength(height) });
/** Deterministic conservative fallback; the browser supplies actual face measurements. */
export const fallbackMeasure: MeasureText = (text, size) => Array.from(text).reduce((sum, glyph) =>
  sum + size * (/\s/u.test(glyph) ? 0.33 : /[ilI.,'!]/u.test(glyph) ? 0.35 : /[WM@\p{Extended_Pictographic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(glyph) ? 1 : 0.65), 0);

export function textLines(text: string, width: number, size: number, measure: MeasureText = fallbackMeasure, face: 'display' | 'body' = 'body'): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/(\s+)/u)) {
    if (measure(line + word, size, face) <= width) { line += word; continue; }
    if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
    for (const glyph of Array.from(word.trimStart())) {
      if (line && measure(line + glyph, size, face) > width) { lines.push(line); line = ''; }
      line += glyph;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [''];
}

export const SCREEN = {
  width: tv.width, height: tv.height, safe: tv.safeMargin,
  innerWidth: tv.width - 2 * tv.safeMargin,
  innerHeight: tv.height - 2 * tv.safeMargin,
  headerGap: space[21], sectionGap: space[13], header: space[55], footer: space[233] + space[55], gap: space[21],
  shape: space[55], padding: space[8],
};

/** Same 1080p artboard at all three output sizes; no scrolling or responsive reflow. */
export function screenScale(width: number, height: number): number {
  return Math.min(width / tv.width, height / tv.height);
}

export function questionFit(prompt: string, options: readonly string[], picture: boolean, reveal = false, measure: MeasureText = fallbackMeasure) {
  const footer = space[377];
  const top = SCREEN.safe + SCREEN.header + SCREEN.headerGap;
  const available = SCREEN.innerHeight - SCREEN.header - SCREEN.headerGap;
  const contentHeight = available - footer - SCREEN.sectionGap;
  // Prefer secondary media : primary copy = 1 : φ. Only maximum copy may
  // shrink the media at the 34px floor. Maximum copy uses a 144px-high
  // panel beside the prompt and full-width answers below both.
  const preferredMediaWidth = (SCREEN.innerWidth - SCREEN.sectionGap) / (1 + PHI);
  const mediaWidths = picture ? [preferredMediaWidth, space[377] * PHI, space[233] * PHI, space[144] * PHI] : [0];
  const candidates = mediaWidths.flatMap(mediaWidth => {
    const width = SCREEN.innerWidth - (picture ? mediaWidth + SCREEN.sectionGap : 0);
    const compact = picture && mediaWidth === space[144] * PHI;
    const optionsWidth = compact ? SCREEN.innerWidth : width;
    const textWidth = (optionsWidth - SCREEN.gap) / 2 - 2 * SCREEN.padding - (SCREEN.shape + space[13]);
    return [space[13], space[8], space[5], 0].flatMap(promptGap => [tvType.display, tvType.title, tvType.body].flatMap(size => {
      const lines = textLines(prompt, width, size, measure, 'display');
      // Reserve both font edges inside the prompt's clipped copy mask.
      const promptHeadroom = size === tvType.display ? space[21] : size === tvType.title ? space[13] : space[8];
      const promptDescenders = promptHeadroom;
      const promptHeight = lines.length * size * lineHeight.display + promptHeadroom + promptDescenders;
      return (size === tvType.display ? [tvType.title] : size === tvType.title ? [tvType.title, tvType.body] : [tvType.body]).map(optionSize => {
        const fitted = options.map(text => ({ size: optionSize, fontSize: cssLength(optionSize), lines: textLines(text, textWidth, optionSize, measure) }));
        const textHeight = Math.max(SCREEN.shape, ...fitted.map(o => o.lines.length * o.size * lineHeight.body));
        // Correct/Wrong plus all eight numbered picks must also fit together.
        const marksWidth = (optionsWidth - SCREEN.gap) / 2 - 2 * SCREEN.padding;
        const picksWidth = 8 * space[55] + 7 * space[8];
        const labelWidth = Math.max(measure('✓ Correct', tvType.body, 'body'), measure('⊘ Wrong', tvType.body, 'body'));
        const marksHeight = space[55] + (marksWidth < picksWidth + space[13] + labelWidth ? tvType.body * lineHeight.body + space[8] : 0);
        const minimumRow = textHeight + 2 * SCREEN.padding + marksHeight + space[5];
        const used = Math.max(promptHeight, compact ? mediaWidth / PHI : 0) + promptGap + 2 * minimumRow + SCREEN.gap;
        return { promptHeadroom, promptDescenders, promptGap, compact, optionsWidth, width, mediaWidth, mediaHeight: mediaWidth / PHI, size, lines, promptHeight, fitted, marksHeight, minimumRow, used };
      });
    }));
  });
  // Media size wins first, then prompt size, then answer size. All decisions
  // reserve reveal marks, the two-line outcome and eight wide-name seats.
  candidates.sort((a, b) => b.mediaWidth - a.mediaWidth || b.size - a.size ||
    (b.fitted[0]?.size ?? 0) - (a.fitted[0]?.size ?? 0) || b.promptGap - a.promptGap);
  const chosen = candidates.find(c => Math.max(c.used, c.mediaHeight) <= contentHeight) ?? candidates[candidates.length - 1];
  if (!chosen) throw new Error('Missing fit candidate');
  const { width, mediaWidth, mediaHeight, size, lines, promptHeight, fitted } = chosen;
  // D-102: choose the largest fitting answer step; spare height pads equal rows.
  const optionHeight = Math.max(chosen.minimumRow, (contentHeight - Math.max(promptHeight, chosen.compact ? mediaHeight : 0) - chosen.promptGap - SCREEN.gap) / 2);
  const mainTop = top + Math.max(promptHeight, chosen.compact ? mediaHeight : 0) + chosen.promptGap;
  const copyX = SCREEN.safe + (picture ? mediaWidth + SCREEN.sectionGap : 0);
  const boxes = {
    prompt: { x: copyX, y: top, width, height: promptHeight },
    media: { x: SCREEN.safe, y: top, width: mediaWidth, height: mediaHeight },
    options: { x: chosen.compact ? SCREEN.safe : copyX, y: mainTop, width: chosen.optionsWidth, height: 2 * optionHeight + SCREEN.gap },
    awards: { x: SCREEN.safe, y: top + contentHeight + SCREEN.sectionGap, width: SCREEN.innerWidth, height: footer },
  };
  const needed = Math.max(chosen.used, mediaHeight) + SCREEN.sectionGap + footer;
  return { reveal, boxes, width, size, fontSize: cssLength(size), promptHeight: cssLength(promptHeight), promptHeadroom: cssLength(chosen.promptHeadroom), promptDescenders: cssLength(chosen.promptDescenders), lines, options: fitted, marksHeight: chosen.marksHeight, optionHeight, needed, available, fits: needed <= available };

}

export function screenModel(view: RabakzPublicView, measure: MeasureText = fallbackMeasure, cachedFit?: ReturnType<typeof questionFit>) {
  if (view.phase !== 'question' && view.phase !== 'reveal') return null;
  const q = view.question;
  if (q?.options.length !== 4) return null;
  const reveal = view.phase === 'reveal';
  // Persistent option indices and player IDs are the render keys in both phases.
  const picture = q.type === 'picture';
  const fit = cachedFit ?? questionFit(q.prompt, q.options, picture, false, measure);
  const players = [...view.players].sort((a, b) => a.seat - b.seat).map(p => ({
    id: p.id, seat: p.seat, name: p.name, colour: COLOUR_TOKENS[p.colour],
    status: p.waiting ? 'Next question' : p.lockedOut ? 'Locked out' : 'Thinking',
    lockedOut: p.lockedOut,
    score: p.score, gained: p.gained, wonLabel: p.gained > 0 ? `+${String(p.gained)}` : null, streak: p.streak,
    picks: reveal ? p.answers ?? [] : [],
  }));
  return {
    questionId: q.id, identity: `${q.id}:${view.phase}:${view.wrong.join(',')}`, reveal, category: categoryTitle(q.category), heading: `Question ${String(view.round)} of ${String(view.length)}`,
    prompt: q.prompt, fit, picture,
    pictureLabel: 'Picture slot',
    outcome: !reveal ? '' : view.winners.length === 0 ? 'Nobody got it right' :
      view.winners.length > 3 ? `${String(view.winners.length)} players got it` :
      view.winners.map(p => p.name).join(' and ') + (view.winners.length === 1 ? ' got it' : view.winners.length === 2 ? ' both got it' : ' all got it'),
    winners: view.winners.map(p => p.id), players,
    options: q.options.map((text, index) => ({
      index, text, shape: SHAPE_NAMES[index] ?? 'cross',
      symbol: SHAPE_BUTTONS[SHAPE_NAMES[index] ?? 'cross'],
      dimColour: blend(THEMES.rabakz.panel.ink, GHOST_OPACITY, SHAPE_BUTTONS[SHAPE_NAMES[index] ?? 'cross'].colour),
      wrong: view.wrong.includes(index), correct: reveal && view.correct === index,
      chosenBy: reveal ? [...new Map([...players.filter(p => p.picks.includes(index)).map(p => [p.seat, { seat: p.seat, colour: p.colour }] as const), ...(view.correct === index ? view.winners.map(p => [p.seat, { seat: p.seat, colour: COLOUR_TOKENS[p.colour] }] as const) : [])]).values()].sort((a, b) => a.seat - b.seat) : [],
      success: reveal && view.correct === index && view.winners.length > 0,
      fontSize: fit.options[index]?.fontSize ?? cssLength(tvType.body),
      size: fit.options[index]?.size ?? tvType.body,
      lines: fit.options[index]?.lines ?? [text],
    })),
  };
}
export type ScreenModel = NonNullable<ReturnType<typeof screenModel>>;

/** Per-screen cache: reveal and seat updates never measure question copy again. */
export function createFitCache() {
  let last: { id: string; measure: MeasureText; epoch: number; fit: ReturnType<typeof questionFit> } | undefined;
  return (q: NonNullable<RabakzPublicView['question']>, _width: number, _height: number, measure: MeasureText, epoch: number) => {
    if (last?.id === q.id && last.measure === measure && last.epoch === epoch) return last.fit;
    const fit = questionFit(q.prompt, q.options, q.type === 'picture', false, measure);
    last = { id: q.id, measure, epoch, fit };
    return fit;
  };
}
