import { readFileSync } from 'node:fs';
import type { Frame } from './assets';
import { expect, it } from 'vitest';
import { cueLayout, drawCue, hasCue, intersects, levelBox, rejectionBox, placeCue, markerBand, markerPosition, cuePulse } from './station-cue';
import { THEMES } from '../../../packages/ui/src/themes';
import { PLAYER_COLOURS } from '../../../packages/ui/src/colour';
import { duration, PULSE_SCALE } from '../../../packages/ui/src/motion-tokens';
import { MARKER_RADIUS, MARKER_LINE_WIDTH, MARKER_OUTER_RADIUS, MARKER_NUMERAL_SIZE, CARD_LAYOUT, hudPanelBox, hudPanelWidth } from './panels';
import { TILE, DEPTH, projectX, projectY } from './model';
import { displayName, nameInset, nameText } from './text';
import { FULL_KITCHEN, LEVELS } from '../src/levels/catalogue';
import { loadLevel } from '../src/levels/loader';
import { COOK_RADIUS, MIN_SEPARATION } from '../src/rules/state';
import type { Box } from './station-cue';
const fixture=loadLevel(FULL_KITCHEN,707,[{id:'a',name:'A',seat:1,colour:'seat-1'}]).state;
if(!fixture)throw new Error('Fixture');
const level=fixture.level;
function inside(a:Box,b:Box){expect(a.x).toBeGreaterThanOrEqual(b.x);expect(a.y).toBeGreaterThanOrEqual(b.y);expect(a.x+a.width).toBeLessThanOrEqual(b.x+b.width);expect(a.y+a.height).toBeLessThanOrEqual(b.y+b.height);}
it('keeps every D-215 cue and D-257 name inside the level, with head-height marker clearance (TR-030, TR-031)',()=>{
  for(const definition of LEVELS){
  const state=loadLevel(definition,707,[{id:'a',name:'A',seat:1,colour:'seat-1'}]).state;if(!state)throw new Error('Level');
  const level=state.level,cue=cueLayout(),boxes:Box[]=[],bounds={x:0,y:0,width:level.width*TILE,height:level.height*TILE*DEPTH};
  for(let tile=0;tile<level.tiles.length;tile++){
    const entry=level.tiles[tile];if(entry?.kind!=='station')continue;
    const x=tile%level.width*TILE,y=Math.floor(tile/level.width)*TILE*DEPTH;
    if(hasCue(entry.stationType ?? '',0)){
      const world=cueLayout();placeCue(world,cue,x,y,bounds);
      for(const box of [world.plaque,world.bar])inside(box,bounds);

    }
    const left=nameInset(level,tile,-1),right=nameInset(level,tile,1),name=displayName(entry.ingredient ?? entry.stationType ?? '');
    const drawn:string[]=[];const ctx={font:'',measureText(value:string){return {width:value.length*parseFloat(this.font)*0.47};},fillText(value:string,dx:number,dy:number){drawn.push(value);boxes.push({x:x+dx,y:y+dy-parseFloat(this.font),width:this.measureText(value).width,height:parseFloat(this.font)});}};
    nameText(ctx as unknown as CanvasRenderingContext2D,name,left,entry.ingredient?34:100,TILE-left-right,entry.ingredient?2:1);
    expect(drawn.join(' ')).toBe(name);
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a&&b)expect(intersects(a,b)).toBe(false);}
  }
});
it('uses packed cue/progress centres and the 192 px fallback geometry (TR-030)',()=>{
  const fallback=cueLayout(undefined,120);
  expect(fallback.plaque).toEqual({x:38,y:120*DEPTH/2-126,width:44,height:44});
  expect(fallback.bar).toEqual({x:15,y:120*DEPTH/2-77,width:90,height:14});
  const packed=cueLayout({root:[94,126],cue:[100,26],progress:[98,60]},120);
  expect(packed.plaque.x-fallback.plaque.x).toBe(6);expect(packed.plaque.y-fallback.plaque.y).toBe(4);
  expect(packed.bar.x-fallback.bar.x).toBe(4);expect(packed.bar.y-fallback.bar.y).toBe(4);
  for(const type of ['serving','dish-rack','return-counter','ingredient-crate','bin'])expect(hasCue(type,0)).toBe(false);
  for(const type of ['chop','sink','plating'])expect(hasCue(type,0)).toBe(true);
});
it('snapshots five distinct shape command streams, without drawing text (TR-031)',()=>{
  const snapshots:Record<string,string[]>={};
  for(const [state,status,fire,progress] of [['empty','empty',false,0],['working','working',false,0],['early-working','working',false,0.01],['done','done',false,1],['fire','working',true,0.5],['burnt','burnt',false,1]] as const){
    const commands:string[]=[];const ctx=new Proxy({}, {set(target,key,value){commands.push(`${String(key)}=${String(value)}`);return Reflect.set(target,key,value);},get(_target,key){return (...args:unknown[])=>commands.push(`${String(key)}(${args.join(',')})`);}});
    drawCue(ctx as CanvasRenderingContext2D,cueLayout(undefined,120),status,fire,progress);
    expect(commands.some(c=>c.startsWith('fillText')||c.startsWith('strokeText')||c.startsWith('arc('))).toBe(false);
    snapshots[state]=commands;
  }
  expect(new Set(Object.values(snapshots).map(c=>c.join('\n'))).size).toBe(5);
  expect(snapshots).toMatchSnapshot();
});
it('keeps a rejection at every fixture station inside the level and away from cards, HUD and the worker (TR-004, TR-061)',()=>{
  const safe={x:5,y:5,width:1910,height:1070},bounds=levelBox(level.width,level.height),obstacles:Box[]=[];
  for(let i=0;i<6;i++)obstacles.push({...CARD_LAYOUT,x:CARD_LAYOUT.x+i*(CARD_LAYOUT.width+CARD_LAYOUT.gap)});
  const metrics={font:'',measureText(value:string){return {width:value.length*parseFloat(this.font)*0.47};}};
  let right=1865;for(const [value,label] of [['★★★','Stars'],['120','Score'],['3:28','Time']]){
    const width=hudPanelWidth(metrics as unknown as CanvasRenderingContext2D,value ?? '',label ?? '');
    const box={x:0,y:0,width:0,height:0};hudPanelBox(box,right,width);obstacles.push(box);right=box.x-13;
  }
  for(let tile=0;tile<level.tiles.length;tile++){
    const entry=level.tiles[tile];if(entry?.kind!=='station')continue;
    obstacles.push({x:projectX(tile%level.width+0.5,level.width)+21-34,y:projectY(Math.floor(tile/level.width)+0.5,level.height)-68,width:68,height:68});
    if(!hasCue(entry.stationType ?? '',1))continue;
    const world=cueLayout();placeCue(world,cueLayout(),bounds.x+tile%level.width*TILE,bounds.y+Math.floor(tile/level.width)*TILE*DEPTH,tile<level.width?safe:bounds);
    const p=world.plaque,b=world.bar,cx=b.x+b.width/2,cy=(p.y+b.y+b.height)/2;
    obstacles.push({x:cx-b.width*PULSE_SCALE/2,y:cy-(b.y+b.height-p.y)*PULSE_SCALE/2,width:b.width*PULSE_SCALE,height:(b.y+b.height-p.y)*PULSE_SCALE});
  }
  const worker={x:0,y:0,width:68,height:144};obstacles.push(worker);
  for(let tile=0;tile<level.tiles.length;tile++){
    if(level.tiles[tile]?.kind!=='station')continue;
    const column=tile%level.width,row=Math.floor(tile/level.width);
    worker.x=bounds.x+(column===0?1.5:column===level.width-1?column-0.5:column+0.5)*TILE-34;
    worker.y=bounds.y+(row===0?1.5:row===level.height-1?row-0.5:row+0.5)*TILE*DEPTH-144;
    const note={x:0,y:0,width:0,height:0};rejectionBox(note,bounds,tile,level.width,level.height,377,102,obstacles);
    inside(note,bounds);for(const obstacle of obstacles)expect(intersects(note,obstacle),`tile ${String(tile)}`).toBe(false);
  }
});

it('pulses a completed cue once over the base duration, with no reduced motion (TR-062)',()=>{
  expect([0,duration.base/2,duration.base,duration.base*2].map(t=>cuePulse(t,false))).toEqual([1,PULSE_SCALE,1,1]);
  expect([0,60,117,175,233].map(t=>cuePulse(t,true))).toEqual([1,1,1,1,1]);
});

it('sweeps every reachable cook against both pulse sizes with head socket clearance (TR-030, TR-061)',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../../../assets/dist/manifest.json',import.meta.url),'utf8')) as {atlases:{set:string;frames:Record<string,Frame>}[]};
  const packed=new Map(manifest.atlases.flatMap(a=>Object.entries(a.frames)));
  const bodies=manifest.atlases.filter(a=>a.set==='tabao-rush-cook-body').flatMap(a=>Object.values(a.frames));
  const head=Math.min(...bodies.map(f=>(f.anchors.head?.[1] ?? 0)-(f.anchors.root?.[1] ?? 0)));
  const hands=Math.min(...bodies.map(f=>(f.anchors.hands?.[1] ?? 0)-(f.anchors.root?.[1] ?? 0)));
  expect(markerPosition(-116.5,Infinity)).toBeLessThanOrEqual(head);
  expect(head).toBeGreaterThan(-62);expect(Number.isFinite(hands)).toBe(true);
  const carry=packed.get('carry-walk-e-0');expect(carry?.anchors.hands?.[1]).toBeGreaterThan(carry?.anchors.head?.[1] ?? Infinity);
  for(const definition of LEVELS){
    const state=loadLevel(definition,707,[{id:'a',name:'A',seat:1,colour:'seat-1'}]).state;if(!state)throw new Error('Level');
    const level=state.level,bounds=levelBox(level.width,level.height),safe={x:5,y:5,width:1910,height:1070};
    const cues=level.tiles.flatMap((tile,index)=>{
      if(tile.kind!=='station'||!hasCue(tile.stationType ?? '',1))return [];
      const geometry=cueLayout(packed.get(`station-${tile.stationType ?? ''}`)?.anchors);
      const worldCue=cueLayout();placeCue(worldCue,geometry,projectX(index%level.width,level.width),projectY(Math.floor(index/level.width),level.height),index<level.width?safe:bounds);
      return [{worldCue,type:tile.stationType ?? '',tile:index}];
    });
    const band=markerBand(cues,level.width);
    expect(markerPosition(projectY(1.2,level.height)-116.5,band)-(projectY(1.2,level.height)-116.5)).toBeLessThanOrEqual(5);
    // Retain the r11b/c full-width 1 px continuity/locked-x sweep.
    for(let y=projectY(1.2,level.height)-116.5;y<=projectY(2.2,level.height)-116.5;y++)for(let x=bounds.x;x<=bounds.x+bounds.width;x++){
      const marker={x,y:markerPosition(y,band)};
      if(marker.x!==x||Math.abs(markerPosition(y+1,band)-marker.y)>1)throw new Error('Pixel continuity/lock');
    }
    // 0.01 tile steps include y=1.2; the square collision footprint matches level.ts.
    for(let yi=20;yi<=level.height*100-20;yi++)for(let xi=20;xi<=level.width*100-20;xi++){
      const x=xi/100,y=yi/100;
      let legal=true;
      for(let row=Math.floor(y-COOK_RADIUS);row<=Math.floor(y+COOK_RADIUS);row++)for(let col=Math.floor(x-COOK_RADIUS);col<=Math.floor(x+COOK_RADIUS);col++)if(level.tiles[row*level.width+col]?.kind!=='floor')legal=false;
      if(!legal)continue;
      const mx=projectX(x,level.width),feet=projectY(y,level.height),normal=feet-116.5,my=markerPosition(normal,band);
      if(my>feet+head||Math.abs(markerPosition(normal+1,band)-my)>1)throw new Error('Head/continuity');
      for(const scale of [1,PULSE_SCALE])for(const {worldCue:{plaque:p,bar:b}} of cues){
        const cx=b.x+b.width/2,cy=(p.y+b.y+b.height)/2;
        for(const box of [p,{x:b.x+2,y:b.y+3,width:b.width-4,height:b.height-6}]){
          const bx=cx+(box.x-cx)*scale,by=cy+(box.y-cy)*scale;
          if(Math.hypot(Math.max(bx-mx,0,mx-bx-box.width*scale),Math.max(by-my,0,my-by-box.height*scale))<MARKER_OUTER_RADIUS-1e-8)throw new Error('Cue intersection');
        }
      }
    }
    // Circular movement separation permits every diagonal, not just vertical pairs.
    // SFNS bold 34 digits are 16–22 px wide: use the conservative 11 px half-width.
    // The DOM font check bounds glyph height at 25 px; centre it as production does.
    const glyphHalfWidth=11,glyphHalfHeight=25/2;
    for(const y of [1.2,3]){
      const firstX=projectX(2,level.width);
      const firstY=markerPosition(projectY(y,level.height)-144+55/2,band);
      let worstOverlap=0,overlapAngle=0,worstCover=0,coverAngle=0;
      // 0.01° steps refine the extrema well beyond the required 1° sweep.
      for(let step=0;step<=9000;step++){
        const angle=step/100,radians=angle*Math.PI/180;
        const secondX=projectX(2+MIN_SEPARATION*Math.cos(radians),level.width);
        const secondY=markerPosition(projectY(y+MIN_SEPARATION*Math.sin(radians),level.height)-144+55/2,band);
        const dx=secondX-firstX,dy=secondY-firstY;
        const overlap=Math.max(0,2*MARKER_OUTER_RADIUS-Math.hypot(dx,dy));
        // Nearest point of the far numeral's axis-aligned glyph box to the
        // nearer disc centre: radial penetration bounds how much it is covered.
        const cover=Math.max(0,MARKER_OUTER_RADIUS-Math.hypot(Math.max(0,dx-glyphHalfWidth),Math.max(0,dy-glyphHalfHeight)));
        expect(overlap).toBeLessThanOrEqual(9);
        expect(cover).toBeLessThanOrEqual(2);
        if(overlap>worstOverlap){worstOverlap=overlap;overlapAngle=angle;}
        if(cover>worstCover){worstCover=cover;coverAngle=angle;}
      }
      expect(worstOverlap).toBeCloseTo(y===1.2?8.3448:4.5888,4);
      expect(overlapAngle).toBe(90);
      expect(worstCover).toBeCloseTo(y===1.2?1.91687:0,5);
      expect(coverAngle).toBe(y===1.2?65.28:0);
    }
  }
},20000); // Review measured 6.05 s under contention; allow over three times that.

it('gives the 3 px marker edge at least 3:1 contrast against caps, measured review-7 samples and floor (TR-061)',()=>{
  const luminance=(channels:readonly number[])=>{
    const rgb=channels.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    return (rgb[0]??0)*0.2126+(rgb[1]??0)*0.7152+(rgb[2]??0)*0.0722;
  };
  const channels=(hex:string)=>[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16));
  const edge=luminance(channels(THEMES.console.panel.ink));
  // Review 7's measured cap/disc RGB samples are evidence, not drawing colours.
  const measuredReview7Samples=[[214,73,55],[226,69,64]];
  for(const colour of [...PLAYER_COLOURS.map(c=>channels(c.colour)),channels(THEMES.console.panel.to),...measuredReview7Samples]){
    const surface=luminance(colour);expect((Math.max(edge,surface)+0.05)/(Math.min(edge,surface)+0.05)).toBeGreaterThanOrEqual(3);
  }
});

it('retains marker geometry and numeral size (TR-061)',()=>{
  expect(MARKER_OUTER_RADIUS).toBe(21);
  expect(MARKER_OUTER_RADIUS).toBe(MARKER_RADIUS+MARKER_LINE_WIDTH/2);
  expect(MARKER_LINE_WIDTH).toBeGreaterThanOrEqual(3);
  expect(MARKER_NUMERAL_SIZE).toBe(34);
});
