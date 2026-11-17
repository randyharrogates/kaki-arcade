import { lineHeight, space, EDGE_WIDTH } from '@kaki/ui';
import { PHONE } from './layout';
import { placeLayout, packLayout } from './phone-placement';
import type { Size,Layout,PanelBlock,PrivateView } from './phone-placement-types';
export const PRIVATE_TEXT_STEPS = [34,21,13] as const;
export const PRIVATE_STAT_STEPS = [89,55,34,21] as const;
export const PRIVATE_CARD_FLOOR = PHONE.tappable;
export const PRIVATE_CARD_MAX = PHONE.optionWidth;
export const PRIVATE_LINE_HEIGHT = lineHeight.body;
export function privateBlocks(view:PrivateView | null | undefined, leader:boolean):readonly PanelBlock[] {
  return view?.blocks.filter(b => !b.audience || b.audience === 'everyone' || (b.audience === 'leader') === leader) ?? [];
}
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
function gridLabelFits(cells:readonly { readonly label?:string; readonly faceDown?:boolean; readonly face?:unknown }[],width:number,height:number,steps:readonly number[],glyphs = false):boolean {
  return cells.every(cell => cell.faceDown === true || steps.some(step => textHeight(cell.label ?? '',step,width-12-(glyphs && cell.face ? (step === 34 ? 55 : 21)+13 : 0),true) <= height-12));
}
/** Reserve every floor, independently grow each block, then share remaining space.
 * Grid geometry keeps square cells inside its box; labels are measured inside each cell. */
export function panelMetrics(blocks:readonly PanelBlock[],width:number,height:number,gap:number) {
  const gridGap = gap === 5 ? 5 : 8;
  const steps: number[] = blocks.map(b => b.kind === 'stat' ? 21 : 13);
  const need = (b:PanelBlock,step:number) => {
    if (b.kind === 'text') return textHeight(b.text,step,width,true);
    if (b.kind === 'stat') return textHeight(b.label,13,width,true)+(textWidth(String(b.value),step) <= width ? Math.ceil(step*PRIVATE_LINE_HEIGHT) : Infinity);
    if (b.kind === 'cards') return PRIVATE_CARD_FLOOR*PHONE.card.height/PHONE.card.width;
    // CSS cells use space-5 padding and panel-edge on both sides. Reserve
    // 10% glyph headroom so estimated whole words also fit the real font.
    const cell = Math.max(PHONE.cellShown,...b.cells.filter(c => !c.faceDown).flatMap(c => (c.label ?? '').split(/\s+/).map(word => Math.ceil(textWidth(word,13)*1.1)+2*(space[5]+EDGE_WIDTH))));
    if (b.cols*cell+(b.cols-1)*gridGap > width) return Infinity;
    return gridLabelFits(b.cells,cell,cell,[13]) ? b.rows*cell+(b.rows-1)*gridGap : Infinity;
  };
  const heights = blocks.map((b,i) => need(b,steps[i] ?? 13));
  const total = () => heights.reduce((a,b) => a+b,0)+Math.max(0,blocks.length-1)*gap;
  const fits = width > 0 && total() <= height && blocks.every(b => b.kind === 'cards' ? b.cards.length*PRIVATE_CARD_FLOOR+Math.max(0,b.cards.length-1)*gap <= width : b.kind !== 'grid' || b.cols*PHONE.cellShown+(b.cols-1)*gridGap <= width);
  if (!fits) return { fits:false,step:13,steps,heights };
  // Fair rounds allow figures to use 89 -> 55 -> 34 -> 21 without coupling text.
  for (const level of [21,34,55,89]) blocks.forEach((b,i) => {
    if (b.kind !== 'text' && b.kind !== 'stat' || b.kind === 'text' && level > 34) return;
    const options:readonly number[] = b.kind === 'stat' ? PRIVATE_STAT_STEPS : PRIVATE_TEXT_STEPS;
    const next = options.filter(s => s <= level && s > (steps[i] ?? 13)).sort((a,b) => b-a)[0];
    if (!next) return;
    const h = need(b,next);
    if (total()-(heights[i] ?? 0)+h <= height) { heights[i] = h; steps[i] = next; }
  });
  const slack = Math.max(0,height-total())/Math.max(1,blocks.length);
  blocks.forEach((b,i) => {
    const available = (heights[i] ?? 0)+slack;
    if (b.kind === 'cards') heights[i] = Math.min(PRIVATE_CARD_MAX*PHONE.card.height/PHONE.card.width, (width-Math.max(0,b.cards.length-1)*gap)/Math.max(1,b.cards.length)*PHONE.card.height/PHONE.card.width,available);
    else if (b.kind === 'grid') {
      heights[i] = Math.min(available, (width-(b.cols-1)*gridGap)/b.cols*b.rows+(b.rows-1)*gridGap);
      const cell = ((heights[i] ?? 0)-(b.rows-1)*gridGap)/b.rows;
      steps[i] = PRIVATE_TEXT_STEPS.find(step => gridLabelFits(b.cells,cell,cell,[step])) ?? 13;
    }
    else heights[i] = available;
  });
  return { fits:true,step:Math.min(34,...steps),steps,heights };
}
/** Content floor shared by conformance and the renderer. Insets include both borders. */
export function controlContentFits(parts:ReturnType<typeof packLayout>['parts'],gap:number):boolean {
  return parts.every(({ control:c,width,height }) => {
    if (c.kind === 'text') return textHeight(c.text,{ title:34,body:21,note:13 }[c.tone ?? 'body'],width,true,1) <= height;
    if (c.kind === 'grid') {
      const gridGap = gap === 5 ? 5 : 8;
      return gridLabelFits(c.cells,(width-(c.cols-1)*gridGap)/c.cols,(height-(c.rows-1)*gridGap)/c.rows,[34,21],true);
    }
    if (c.kind !== 'options') return true;
    const columns = Math.min(2,c.options.length), rows = Math.ceil(c.options.length/2);
    return c.options.every(o => optionLabelStep(o.label,(width-(columns-1)*gap)/columns,(height-(rows-1)*gap)/rows,Boolean(o.face),c.options.length === 1) !== null);
  });
}
/** D-132: reserve pure control content floors before allocating the private panel. */
export function placeController(layout:Layout,view:PrivateView | null | undefined,area:Size,leader:boolean,widths:Readonly<Record<string,number>>,viewport:Size) {
  const blocks = privateBlocks(view,leader);
  if (!blocks.length) return { ...placeLayout(layout,area,leader,widths,viewport),panel:null,metrics:null };
  const hasControls = layout.controls.some(c => !c.audience || c.audience === 'everyone' || (c.audience === 'leader') === leader);
  const pack = (margin:13|8,gap:13|8|5) => {
    const contentWidths:Record<string,number> = {};
    for (const c of layout.controls) {
      if (c.kind !== 'text' && c.kind !== 'options') continue;
      let low = c.kind === 'text' ? 1 : PHONE.optionWidth, high = Math.ceil(area.width);
      const fits = (width:number) => {
        if (c.kind === 'text') return textHeight(c.text,{ title:34,body:21,note:13 }[c.tone ?? 'body'],width,true,1) <= area.height-2*margin;
        const rows = Math.ceil(c.options.length/2);
        const h = c.options.length === 1 ? (c.size === 'large' ? PHONE.optionWidth : PHONE.inPlay.height) : (area.height-2*margin-(rows-1)*gap)/rows;
        return c.options.every(o => optionLabelStep(o.label,width,h,Boolean(o.face),c.options.length === 1) !== null);
      };
      while (low < high) { const mid = Math.floor((low+high)/2); if (fits(mid)) high = mid; else low = mid+1; }
      contentWidths[c.id] = high;
    }
    const controlsAt = (width:number) => {
      const packed = packLayout(layout,{ width,height:area.height },leader,{},margin,gap,viewport,contentWidths);
      return { ...packed,fits:packed.fits && controlContentFits(packed.parts,gap) };
    };
    let low = 0,high = Math.floor(area.width);
    if (hasControls) while (low < high) {
      const mid = Math.floor((low+high)/2);
      if (controlsAt(mid).fits) high = mid; else low = mid+1;
    }
    const controlWidth = hasControls ? high : 0;
    const controls = controlsAt(hasControls ? controlWidth : area.width);
    const left = hasControls ? controlWidth-margin+gap : margin;
    const panel = { left,top:margin,width:Math.max(0,area.width-margin-left),height:Math.max(0,area.height-2*margin) };
    const metrics = panelMetrics(blocks,panel.width,panel.height,gap);
    return { ...controls,panel,metrics,fits:controls.fits && metrics.fits };
  };
  let result = pack(13,13);
  for (const [margin,gap] of [[8,8],[8,5]] as const) {
    if (result.fits && result.metrics.step === 34) break;
    const candidate = pack(margin,gap);
    if (!result.fits || candidate.fits && candidate.metrics.step > result.metrics.step) result = candidate;
  }
  return result;
}
