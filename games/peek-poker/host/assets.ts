import { must } from '../src/rules/invariant';
import type { AssetManifest, Frame } from '../../../tools/assets/manifest';
export interface CardDeck { divisor?: number; frames: Map<string, HTMLCanvasElement>; faces: Map<string, HTMLCanvasElement> }
/** Prepares every face, back and turn frame before the caller can start a round. */
export async function preloadCards(manifestUrl: string, detail: 'full' | 'half' = 'full'): Promise<CardDeck> {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error('Card manifest unavailable');
  const manifest = await response.json() as AssetManifest;
  const frames = new Map<string, HTMLCanvasElement>();
  for (const atlas of manifest.atlases.filter(a => a.set === 'peek-poker-cards')) {
    const image = new Image(); image.src = new URL(atlas[detail].file, new URL(manifestUrl, location.href)).href;
    await image.decode();
    for (const [id, frame] of Object.entries(atlas.frames)) frames.set(id, restoreFrame(image, frame, detail === 'half' ? 2 : 1));
  }
  const required = ['card-back', ...Array.from({length:5}, (_, i) => `card-flip-${String(i)}`), ...'a23456789tjqk'.split('').flatMap(r => 'shdc'.split('').map(s => `card-${r === 't' ? '10' : r}${s}`))];
  for (const id of required) if (!frames.has(id)) throw new Error(`Missing card frame: ${id}`);
  const neutral = must(frames.get('card-flip-0'));
  const mask = document.createElement('canvas'); mask.width = neutral.width; mask.height = neutral.height;
  const context = must(mask.getContext('2d')); context.drawImage(neutral, 0, 0);
  const pixels = context.getImageData(0, 0, mask.width, mask.height);
  for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = must(pixels.data[i]) >= 243 ? 255 : 0;
  context.putImageData(pixels, 0, 0);
  const faces = new Map<string, HTMLCanvasElement>();
  for (const [id, source] of frames) if (!id.includes('flip') && id !== 'card-back') {
    const face = document.createElement('canvas'); face.width = source.width; face.height = source.height;
    const ctx = must(face.getContext('2d')); ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0); faces.set(id, face);
  }
  return { frames, faces, divisor: detail === 'half' ? 2 : 1 };
}
function restoreFrame(image: HTMLImageElement, frame: Frame, divisor: number) {
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil(frame.sourceSize[0]/divisor); canvas.height = Math.ceil(frame.sourceSize[1]/divisor);
  const [x,y,w,h] = frame.rect;
  // Manifest geometry is full-resolution; half detail keeps both source and restored canvases at native half size.
  must(canvas.getContext('2d')).drawImage(image, x/divisor, y/divisor, w/divisor, h/divisor,
    (frame.trim[0] + frame.sourceSize[0]/2 - (frame.anchors.centre ?? frame.anchor)[0])/divisor,
    (frame.trim[1] + frame.sourceSize[1]/2 - (frame.anchors.centre ?? frame.anchor)[1])/divisor, w/divisor, h/divisor);
  return canvas;
}
