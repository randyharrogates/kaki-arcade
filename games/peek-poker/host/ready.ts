import { fontStack, space } from '../../../packages/ui/src/index';
import { must } from '../src/rules/invariant';
import type { CardDeck } from './assets';

/** Match CSS body/display and the canvas seat numerals and Swapped band. */
export const TABLE_FONTS = [
  `400 ${String(space[34])}px ${fontStack.body}`,
  `700 ${String(space[34])}px ${fontStack.body}`,
  `700 ${String(space[55])}px ${fontStack.body}`,
  `400 ${String(space[89])}px ${fontStack.display}`,
] as const;
export const TABLE_GLYPHS = '0123456789 Swapped Picked Picking Next round Memorise the cards Watch the swap The reveal Round of Shared cards Three of a kind · pts…';

/** Deck creation has already awaited every atlas decode. Upload every restored
 * sprite/face and load every screen font before exercising mounted phase paint. */
export async function prepareTable(deck:CardDeck, warm:()=>Promise<void>) {
  await Promise.all(TABLE_FONTS.map(font=>document.fonts.load(font,TABLE_GLYPHS)));
  await document.fonts.ready;
  const canvas=document.createElement('canvas');
  const ctx=must(canvas.getContext('2d'));
  for(const image of [...deck.frames.values(),...deck.faces.values()]) {
    canvas.width=image.width;canvas.height=image.height;
    ctx.drawImage(image,0,0);
    // Flush deferred canvas draws before resizing/reusing the warm-up surface.
    ctx.getImageData(0,0,1,1);
  }
  for(const font of TABLE_FONTS) {ctx.font=font;ctx.fillText(TABLE_GLYPHS,0,space[89]);}
  await warm();
}

/** Keep the dev marker behind the same awaited preparation used by real hosts. */
export async function signalTableReady(prepare:()=>Promise<void>,dataset:DOMStringMap) {
  delete dataset.ppReady;
  await prepare();
  dataset.ppReady='1';
}
