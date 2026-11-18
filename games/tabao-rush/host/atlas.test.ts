/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Animation, Frame } from './assets';
import { DIRECTIONS } from './model';
interface Manifest {atlases:{set:string;frames:Record<string,Frame>}[];sets:Record<string,{animations:Animation[]}>}
const manifest=JSON.parse(readFileSync(new URL('../../../assets/dist/manifest.json',import.meta.url),'utf8')) as Manifest;
const frames=new Map(manifest.atlases.flatMap(a=>Object.entries(a.frames)));
describe('T-07 packed cap socket and actions (TR-061, TR-062)',()=>{
  it('packs all eight cap directions and masks',()=>{for(const direction of DIRECTIONS){expect(frames.get(`head-cap-${direction}`)?.anchors.head).toHaveLength(2);expect(frames.has(`head-cap-${direction}-mask`)).toBe(true);}});
  it('every body animation frame has root, head and hands sockets plus its mask',()=>{
    const animations=manifest.sets['tabao-rush-cook-body']?.animations ?? [];
    expect(animations.filter(a=>!a.action.endsWith('-mask'))).toHaveLength(9);
    for(const animation of animations.filter(a=>!a.action.endsWith('-mask')))for(const direction of DIRECTIONS)for(const id of animation.directions?.[direction] ?? []){
      const frame=frames.get(id);expect(frame?.anchors.root).toHaveLength(2);expect(frame?.anchors.head).toHaveLength(2);expect(frame?.anchors.hands).toHaveLength(2);expect(frames.has(`${id}-mask`)).toBe(true);
    }
  });
  it('uses A-07 fire frames and keeps the reduced-motion still',()=>{for(let i=0;i<4;i++)expect(frames.has(`fire-${String(i)}`)).toBe(true);expect(frames.get('fire-0')?.metadata.reducedMotionFrame).toBe('fire-0');});
});
