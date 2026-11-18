import type { AssetManifest } from '../../../tools/assets/manifest';
import { Rectangle, Texture } from 'pixi.js';
export interface Layer {frame:string;slot?:string;anchor?:[number,number];scale?:number;order:number}
export interface Frame {
  rect: [number, number, number, number]; trim: [number, number]; sourceSize: [number, number]; anchor: [number, number];
  anchors: Record<string, [number, number]>; metadata: { handsInFront?: boolean; reducedMotionFrame?: string; portionScales?: Record<string, number>; contentCompositions?: Record<string,Layer[]>; servedComposition?: {container:string;variants:Record<string,Layer[]>} };
}
export interface Animation { action: string; releaseFrame?:number; fps: number; loop: boolean; strideTiles?: number; directions?: Record<string, string[]>; frames?: string[] }
export interface Packed { frame: Frame; texture: Texture }
export async function preload(detail: 'full' | 'half') {
  const url = new URL('../../../assets/dist/manifest.json', import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Tabao Rush manifest unavailable');
  const manifest = await response.json() as AssetManifest;
  const frames = new Map<string, Packed>(), animations = new Map<string, Animation>(), pages: Texture[] = [];
  const divisor = detail === 'half' ? 2 : 1;
  for (const atlas of manifest.atlases) {
    if (!atlas.set.startsWith('tabao-rush-')) continue;
    const image = new Image(); image.src = new URL(atlas[detail].file, url).href; await image.decode();
    const page = Texture.from(image); pages.push(page);
    for (const [id, frame] of Object.entries(atlas.frames)) {
      const [x,y,w,h] = frame.rect;
      frames.set(id, { frame, texture: new Texture({ source: page.source, frame: new Rectangle(x/divisor,y/divisor,w/divisor,h/divisor) }) });
    }
  }
  for (const [set, data] of Object.entries(manifest.sets)) if (set.startsWith('tabao-rush-')) for (const animation of data.animations) animations.set(`${set}:${animation.action}`, animation as Animation);
  if (!frames.has('head-cap-e') || !frames.has('idle-e-0') || !frames.has('fire-0')) throw new Error('Incomplete Tabao Rush atlas');
  return { frames, animations, divisor, destroy() { for (const f of frames.values()) f.texture.destroy(); for (const p of pages) p.destroy(true); } };
}
export type Assets = Awaited<ReturnType<typeof preload>>;
