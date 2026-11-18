import { lineHeight, space, EDGE_WIDTH } from '@kaki/ui';
export const SINGLE_OPTION_INSET = 2*(space[13]+EDGE_WIDTH);
const PRIVATE_LINE_HEIGHT = lineHeight.body;
/** Approximate DM Sans / DM Serif glyph advances, rather than one em per letter.
 * DOM measurement selects each block's final step after fonts have loaded. */
export function textWidth(text:string,size:number):number {
  let width = 0;
  for (const c of text) width += size*(/\s/.test(c) ? 0.28 : /[ilI.,!':;|]/.test(c) ? 0.28 : /[MW@%]/.test(c) ? 0.9 : /[A-Z0-9]/.test(c) ? 0.65 : 0.53);
  return width;
}
export function textHeight(text:string,size:number,width:number,words = false,overhang = 0):number {
  let lines = 1, advance = 0;
  for (const c of words ? text.match(/\S+|\s/g) ?? [] : text) {
    const glyph = textWidth(c,size);
    if (words && glyph > width+overhang) return Infinity;
    if (c === '\n') { lines++; advance = 0; }
    else { if (advance+glyph > width && advance) { lines++; advance = 0; } advance += glyph; }
  }
  return Math.ceil(lines*size*PRIVATE_LINE_HEIGHT);
}
/** R-10: whole words, glyph, gap and button insets share the same step ladder. */
export function optionLabelStep(label:string,width:number,height:number,face = false,single = false):34|21|null {
  for (const step of [34,21] as const) {
    const available = width-(single ? 28 : 12)-(face ? step === 34 ? 55+13 : 21+13 : 0);
    if (available > 0 && textHeight(label,step,available,true) <= Math.min(Math.ceil(3*step*PRIVATE_LINE_HEIGHT),height-12)) return step;
  }
  return null;
}
