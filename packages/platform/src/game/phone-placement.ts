import { textWidth,optionLabelStep,SINGLE_OPTION_INSET } from './option-metrics';
import { PHONE } from './layout';
import { visibleParts } from './phone-placement-types';
import type { Layout,LayoutPart,Rect,Size } from './phone-placement-types';
// Floors come from the platform phone contract. No DOM or rendering dependency.
const floor = { inPlayWidth:PHONE.inPlay.width,inPlayHeight:PHONE.inPlay.height };
const space = { 5:5,8:8,13:13,144:PHONE.optionWidth } as const;
const faceFloor = (viewport:Size) => Math.max(PHONE.inPlay.width,PHONE.face*Math.min(1,Math.max(viewport.width,viewport.height)/PHONE.width));
export interface PlacedPart extends Rect { readonly control: LayoutPart }
export interface Placement { readonly parts: readonly PlacedPart[]; readonly fits: boolean; readonly margin: 13 | 8; readonly gap: 13 | 8 | 5; readonly required: Size }

/** Board 4 1A: equal 95 px centre steps for 110 px circular faces. */
export function diamondSpan(size: number): number { return size * (1 + 2 * 95 / 110); }
/** Pure packing. Never compress floors. Impossible combinations return fits:false and their
 * required canvas; the caller must supply a simpler layout or a larger play area. */
export function placeLayout(layout: Layout, area: Size, leader: boolean, optionWidths: Readonly<Record<string, number>>, viewport: Size): Placement {
  const preferred = packLayout(layout, area, leader, optionWidths, space[13], space[13], viewport);
  if (preferred.fits) {
    // Content pressure reduces gaps without changing the chosen margins.
    let result = preferred;
    for (const gap of [8,5] as const) {
      if (optionLabelsFit(result)) break;
      result = packLayout(layout,area,leader,optionWidths,result.margin,gap,viewport);
    }
    return result;
  }
  const compact = packLayout(layout, area, leader, optionWidths, space[8], space[8], viewport);
  return compact.fits && optionLabelsFit(compact) ? compact : packLayout(layout, area, leader, optionWidths, space[8], space[5], viewport);
}
function optionLabelsFit(placement:Placement):boolean {
  return placement.parts.every(({ control:c,width,height }) => {
    if (c.kind !== 'options') return true;
    const columns = Math.min(2,c.options.length), rows = Math.ceil(c.options.length/2);
    return c.options.every(o => optionLabelStep(o.label,(width-(columns-1)*placement.gap)/columns,(height-(rows-1)*placement.gap)/rows,Boolean(o.face),c.options.length === 1) !== null);
  });
}
export function packLayout(layout: Layout, area: Size, leader: boolean, optionWidths: Readonly<Record<string, number>>, margin: 13 | 8, gap: 13 | 8 | 5 = space[13], viewport: Size = area, contentWidths:Readonly<Record<string,number>> = {}): Placement {
  const gridGap = gap === space[5] ? gap : space[8];
  const controls = visibleParts(layout, leader).filter(c => !(c.id === 'header-heading' && c.kind === 'text' || c.id === 'header-action' && c.kind === 'options' && c.options.length === 1));
  const parts: PlacedPart[] = [];
  const put = (control: LayoutPart, left: number, top: number, width: number, height: number) => { parts.push({ control, left, top, width, height }); };
  const w = Math.max(0, area.width - 2 * margin), h = Math.max(0, area.height - 2 * margin);
  const faces = controls.filter(c => c.kind === 'button' && c.button.startsWith('face'));
  const shoulders = controls.filter(c => c.kind === 'button' && c.button.startsWith('shoulder'));
  const moving = controls.filter(c => c.kind === 'stick' || c.kind === 'dpad' || c.kind === 'swipe');
  const panels = controls.filter(c => ['options', 'grid', 'cards', 'text'].includes(c.kind));
  // A picture grid beside its instructions follows the board's primary/secondary split.
  const pictures = panels.find(c => c.kind === 'grid' && c.cells.every(cell => cell.image));
  if (pictures?.kind === 'grid' && controls.every(c => ['grid', 'text', 'options'].includes(c.kind))) {
    const heading = controls.filter(c => c.kind === 'text').length > 2 ? controls.find(c => c.kind === 'text' && c.tone === 'note') : undefined;
    const info = controls.filter(c => c !== pictures && c !== heading);
    const headerHeight = heading ? PHONE.line.note + gap : 0;
    const top = margin + headerHeight;
    const bodyHeight = h - headerHeight;
    const leftWidth = (w - PHONE.columnGap) * 1.618 / 2.618;
    const rightWidth = w - PHONE.columnGap - leftWidth;
    if (heading) put(heading, margin, margin, w, PHONE.line.note);
    put(pictures, margin, top, leftWidth, bodyHeight);
    const heights = info.map(c => c.kind === 'options' ? PHONE.inPlay.height : c.kind === 'text' && c.tone === 'title' ? PHONE.line.title : PHONE.line.note * 2);
    const total = heights.reduce((a,b) => a+b,0) + (info.length-1)*gap;
    let y = top + (bodyHeight-total)/2;
    info.forEach((c,i) => { const height = heights[i] ?? 0; put(c, margin+leftWidth+PHONE.columnGap, y, rightWidth, height); y += height+gap; });
    const fits = (leftWidth-(pictures.cols-1)*gridGap)/pictures.cols >= PHONE.tappable && (bodyHeight-(pictures.rows-1)*gridGap)/pictures.rows >= PHONE.tappable && total <= bodyHeight;
    return { parts, margin, gap, required: { width: area.width, height: area.height }, fits };
  }
  const header = 0;
  const shoulderWidth = shoulders.length ? floor.inPlayWidth + gap : 0;
  const bodyH = h - header;
  const movingMin = moving.map(c => c.kind === 'dpad' ? 3 * floor.inPlayWidth + 2 * gap : 2 * floor.inPlayWidth);
  const columnsInRow = moving.length + panels.length + (faces.length ? 1 : 0) + (shoulders.length ? 1 : 0);
  const fixedOption = (c:LayoutPart) => c.kind === 'options' && c.options.length === 1 && columnsInRow > 1;
  // Standard lone targets reserve the compact label step; large targets retain 34 px.
  // The renderer can retain 34 px in either size when it fits.
  // Kit measurements are natural 34 px widths, including a 55 px face and 13 px gap.
  const loneWidth = (c:LayoutPart) => {
    if (c.kind !== 'options') return 0;
    const option = c.options[0], measured = optionWidths[c.id], step = c.size === 'large' ? 34 : 21;
    const label = measured === undefined ? textWidth(option?.label ?? '',step)
      : Math.max(0,measured-SINGLE_OPTION_INSET-(option?.face ? 68 : 0))*step/34;
    return Math.max(c.size === 'large' ? space[144] : floor.inPlayWidth,Math.ceil(label+SINGLE_OPTION_INSET+(option?.face ? step === 34 ? 68 : 34 : 0)));
  };
  const panelMin = panels.map(c => c.kind === 'grid' ? c.cols * floor.inPlayWidth + (c.cols - 1) * gridGap : fixedOption(c) ? loneWidth(c) : c.kind === 'options' ? Math.min(2, c.options.length) * (contentWidths[c.id] ?? PHONE.optionWidth) + (c.options.length > 1 ? gap : 0) : c.kind === 'cards' ? c.cards.length * floor.inPlayWidth + Math.max(0, c.cards.length - 1) * gap : (contentWidths[c.id] ?? space[144]));
  const columnCount = moving.length + panels.length + (faces.length ? 1 : 0);
  const availableFaceWidth = w - shoulderWidth - movingMin.reduce((a,b) => a+b,0) - panelMin.reduce((a,b) => a+b,0) - Math.max(0,columnCount-1)*gap;
  const faceSize = Math.max(faceFloor(viewport), Math.min(space[144], bodyH/(1+2*95/110), availableFaceWidth/(1+2*95/110)));
  const span = faces.length ? diamondSpan(faceSize) : 0;
  const grid = panels.find(c => c.kind === 'grid');
  const action = panels.find(c => c.kind === 'options' && c.options.length === 1);
  if (grid?.kind === 'grid' && action?.kind === 'options' && controls.length === 2) {
    const gw = grid.cols*floor.inPlayWidth+(grid.cols-1)*gridGap;
    const gh = grid.rows*floor.inPlayHeight+(grid.rows-1)*gridGap;
    // Large labels may wrap within the available column, retaining their target floor.
    const bw = action.size === 'large' ? Math.max(space[144],Math.min(loneWidth(action),contentWidths[action.id] ?? w-gw-gap)) : loneWidth(action), bh = action.size === 'large' ? space[144] : floor.inPlayHeight;
    const gx = Math.max(margin,Math.min((area.width-gw)/2,area.width-margin-bw-gap-gw));
    // Keep the fixed grid clear of the note even when the surrounding margins cannot fit.
    // `required` still reports the missing margin, so this never claims a false fit.
    const gy = Math.max(0,Math.min(margin+Math.max(0,(h-gh)/2),area.height-gh));
    put(grid,gx,gy,gw,gh);
    put(action,Math.max(gx+gw+gap,area.width-margin-bw),margin+Math.max(0,(h-bh)/2),bw,bh);
    const required = { width:Math.max(...parts.map(p => p.left+p.width+margin)),height:Math.max(...parts.map(p => p.top+p.height+margin)) };
    return { parts,required,margin,gap,fits:required.width <= area.width && required.height <= area.height && parts.every(p => p.top >= margin && p.left >= margin) };
  }
  if (controls.length && controls.every(c => c.kind === 'text')) {
    const textH = (c: LayoutPart) => c.kind === 'text' ? (optionWidths[c.id] ?? Math.ceil(c.text.length / Math.max(1,Math.floor(w / 17))) * ({ title:55,body:34,note:21 }[c.tone ?? 'body'])) : 0;
    const total = controls.reduce((sum,c) => sum+textH(c),0) + (controls.length - 1) * gap;
    const ordered = [...controls].sort((a,b) => {
      const rank = (c: LayoutPart) => c.kind === 'text' ? ({ title:0,body:1,note:2 }[c.tone ?? 'body']) : 0;
      return rank(a)-rank(b);
    });
    let y = margin+(h-total)/2;
    ordered.forEach(c => { const height = textH(c); put(c,margin,y,w,height); y += height+gap; });
    return { parts,margin,gap,required:{ width:area.width,height:total+2*margin },fits:total <= h };
  }
  const columns = moving.length + (faces.length ? 1 : 0) + panels.length;
  const minimum = movingMin.reduce((a,b) => a+b,0) + panelMin.reduce((a,b) => a+b,0) + span + shoulderWidth + Math.max(0, columns - 1) * gap;
  const extra = Math.max(0, w - minimum) / Math.max(1, moving.length + panels.filter(c => !fixedOption(c)).length);
  let x: number = margin;
  for (const [i, c] of moving.entries()) {
    const width = (movingMin[i] ?? 0) + extra;
    if (c.kind === 'dpad') {
      const scale = Math.max(1,Math.min((width-2*gap)/(3*floor.inPlayWidth),(bodyH-2*gap)/(3*floor.inPlayHeight)));
      const cellW = floor.inPlayWidth*scale, cellH = floor.inPlayHeight*scale;
      const dw = 3 * cellW + 2 * gap, dh = 3 * cellH + 2 * gap;
      put(c, x + (width-dw)/2, margin + header + (bodyH-dh)/2, dw, dh);
    } else put(c, x, margin + header, width, Math.max(2 * floor.inPlayWidth, bodyH));
    x += width + gap;
  }
  for (const [i, c] of panels.entries()) {
    const width = (panelMin[i] ?? 0) + (fixedOption(c) ? 0 : extra);
    let height = bodyH;
    if (c.kind === 'grid') height = c.rows * floor.inPlayHeight + (c.rows-1) * gridGap;
    if (c.kind === 'options') height = c.options.length > 1 ? Math.max(bodyH,Math.ceil(c.options.length/2)*floor.inPlayHeight+(Math.ceil(c.options.length/2)-1)*gap) : c.size === 'large' ? space[144] : floor.inPlayHeight;
    if (c.kind === 'cards') height = Math.max(c.tappable ? PHONE.cardTappable.height : PHONE.card.height,((width-Math.max(0,c.cards.length-1)*gap)/Math.max(1,c.cards.length))*(c.tappable ? PHONE.cardTappable.height/PHONE.cardTappable.width : PHONE.card.height/PHONE.card.width)); // Board 4 card aspect, not spacing.
    if (c.kind === 'cards') height = Math.max(c.tappable ? PHONE.cardTappable.height : PHONE.card.height,Math.min(height,bodyH));
    const actualW = c.kind === 'grid' ? (panelMin[i] ?? width) : c.kind === 'cards' ? c.cards.length*height*(c.tappable ? PHONE.cardTappable.width/PHONE.cardTappable.height : PHONE.card.width/PHONE.card.height)+Math.max(0,c.cards.length-1)*gap : width;
    put(c, x + (width-actualW)/2, margin + header + Math.max(0,(bodyH-height)/2), actualW, height);
    x += width + gap;
  }
  if (faces.length && moving.length === 0 && panels.length === 0) x = Math.max(margin,area.width-margin-span-shoulderWidth);
  for (const c of faces) {
    if (c.kind !== 'button') continue;
    const step = faceSize * 95/110;
    const diamondH = diamondSpan(faceSize);
    const offset = { 'face-top': [step,0], 'face-left': [0,step], 'face-right': [2*step,step], 'face-bottom': [step,2*step] }[c.button as 'face-top' | 'face-left' | 'face-right' | 'face-bottom'];
    put(c, x + (offset[0] ?? 0), margin + header + Math.max(0,(bodyH-diamondH)/2) + (offset[1] ?? 0), faceSize, faceSize);
  }
  for (const c of shoulders) {
    if (c.kind === 'button') put(c, Math.max(x + (faces.length ? span + gap : 0), area.width-margin-floor.inPlayWidth), margin + (c.button === 'shoulder-right' ? floor.inPlayHeight+gap : 0), floor.inPlayWidth, floor.inPlayHeight);
  }
  const required = { width: Math.max(2*margin, ...parts.map(p => p.left+p.width+margin)), height: Math.max(2*margin,...parts.map(p => p.top+p.height+margin)) };
  return { parts, required, margin, gap, fits: minimum <= w + 0.001 && required.width <= area.width + 0.001 && required.height <= area.height + 0.001 && parts.every(p => p.top >= margin && p.left >= margin) };
}
