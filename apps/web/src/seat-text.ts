import { tvType } from '@kaki/ui';
/** Explicit grapheme boundaries keep compound emoji and combining marks together. */
export function nameLines(name: string): string[] {
  const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name), part => part.segment);
  if (graphemes.length <= 6) return [name];
  return [graphemes.slice(0, 6).join(''), graphemes.slice(6, 12).join('')];
}
export function countdownLabel(seconds: number | null): string { return `${String(seconds ?? 0)} s left`; }

/** Prefer two balanced lines, then three, always at the reading size. */
export function namePresentation(name: string, width: number, measure: (text: string, size: number) => number, singleLine = false) {
  const parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name), part => part.segment);
  const size = tvType.body;
  if (measure(name, size) <= width) return { lines: [name], size };
  if (singleLine) return { lines: [name], size: size * Math.min(1, width / measure(name, size)) };
  for (const count of [2, 3]) {
    const candidates: string[][] = [];
    for (let i = 1; i < parts.length; i++) {
      if (count === 2) candidates.push([parts.slice(0, i).join(''), parts.slice(i).join('')]);
      else for (let j = i + 1; j < parts.length; j++) candidates.push([parts.slice(0, i).join(''), parts.slice(i, j).join(''), parts.slice(j).join('')]);
    }
    const fits = candidates.map(lines => lines.map(line => line.trim())).filter(lines => lines.every(line => measure(line, size) <= width));
    fits.sort((a, b) => Number(!name.includes((a[0] ?? '') + ' ')) - Number(!name.includes((b[0] ?? '') + ' ')) || Math.max(...a.map(line => measure(line, size))) - Math.max(...b.map(line => measure(line, size))));
    if (fits[0]) return { lines: fits[0], size };
  }
  return { lines: nameLines(name), size };
}
