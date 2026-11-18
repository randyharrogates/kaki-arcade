/* eslint-disable @typescript-eslint/prefer-for-of -- Indexed marker hot loops avoid iterator allocation. */
import { THEMES } from '../../../packages/ui/src/themes';
import { duration, PULSE_SCALE } from '../../../packages/ui/src/motion-tokens';
import { TILE, DEPTH, projectX, projectY } from './model';
import type { Frame } from './assets';
import { processing } from './text';
export interface Box {x:number;y:number;width:number;height:number}
export interface CueLayout {plaque:Box;bar:Box}
const palette=THEMES.console;
// Placeholder art for the A-05 cue sprite: A-05's art palette gold (station_geometry.py PALETTE.gold,
// equal to Peek Poker's accent); replaced by the packed sprite when A-05 lands.
const gold=THEMES['peek-poker'].accent.fill;
/** A-05 uses 120 pixels per tile; root is the station body's centre. */
export function cueLayout(anchors?:Frame['anchors'],width=TILE):CueLayout {
  const scale=width/120, root=anchors?.root, cue=anchors?.cue, progress=anchors?.progress;
  return {plaque:{x:width/2+((cue?.[0] ?? 96)-(root?.[0] ?? 96)-22)*scale,y:width*DEPTH/2+((cue?.[1] ?? 24)-(root?.[1] ?? 128)-22)*scale,width:44*scale,height:44*scale},bar:{x:width/2+((progress?.[0] ?? 96)-(root?.[0] ?? 96)-45)*scale,y:width*DEPTH/2+((progress?.[1] ?? 58)-(root?.[1] ?? 128)-7)*scale,width:90*scale,height:14*scale}};
}
export function cuePulse(elapsed:number,reduced:boolean):number{return reduced||elapsed<0||elapsed>=duration.base?1:1+(PULSE_SCALE-1)*Math.sin(elapsed/duration.base*Math.PI);}
/** Raster-local origin is the plaque's top; reserve the maximum pulse when clamping. */
export function placeCue(out:CueLayout,geometry:CueLayout,x:number,y:number,bounds:Box){
  const p=geometry.plaque,b=geometry.bar,cx=(b.x+b.width/2),cy=(b.y+b.height+p.y)/2;
  const halfWidth=b.width/2*PULSE_SCALE,halfHeight=(b.y+b.height-p.y)/2*PULSE_SCALE;
  const centerX=Math.max(bounds.x+halfWidth,Math.min(x+cx,bounds.x+bounds.width-halfWidth));
  const centerY=Math.max(bounds.y+halfHeight,Math.min(y+cy,bounds.y+bounds.height-halfHeight));
  out.plaque.x=centerX+p.x-cx;out.plaque.y=centerY+p.y-cy;out.plaque.width=p.width;out.plaque.height=p.height;
  out.bar.x=centerX+b.x-cx;out.bar.y=centerY+b.y-cy;out.bar.width=b.width;out.bar.height=b.height;
}
/** Shared north-wall band: lowest bar-cell bottom. */
export function markerBand(stations:readonly {tile:number;worldCue:CueLayout;type:string}[],columns:number):number {
  let bottom=-Infinity;
  for(let i=0;i<stations.length;i++){
    const station=stations[i];if(!station||!hasCue(station.type,1)||station.tile>=columns)continue;
    const b=station.worldCue.bar;
    bottom=Math.max(bottom,b.y+b.height-3*b.width/90);
  }
  return bottom;
}
/** Fallback cap is feet - 62, above every packed body head socket.
 * X remains the cook's x; the shared clamp is continuous and independent of x. */
export function markerPosition(normalY:number,band:number):number{return Math.min(normalY+54.5,Math.max(normalY,band+5+21));}
export function filledCells(status:string,progress:number):number{return status==='empty'||status==='burnt'?0:status==='done'?8:Math.floor(Math.max(0,Math.min(1,progress))*8);}
export function hasCue(type:string,total:number):boolean {
  return !['serving','dish-rack','return-counter','ingredient-crate'].includes(type)&&(processing.has(type)||total>0);
}
/** D-215 / TR-031: no text or ring. Paths distinguish completed, fire and burnt. */
export function drawCue(ctx:CanvasRenderingContext2D,layout:CueLayout,status:string,fire:boolean,progress:number){
  const p=layout.plaque,b=layout.bar,s=p.width/44;
  ctx.clearRect(0,0,TILE,TILE*DEPTH);ctx.save();ctx.translate(0,-p.y);
  ctx.fillStyle=palette.panel.to;ctx.fillRect(p.x,p.y,p.width,p.height);
  ctx.fillStyle=palette.panel.ink;ctx.fillRect(p.x+s,p.y+s,42*s,42*s);
  ctx.fillStyle=palette.panel.to;ctx.fillRect(p.x+5*s,p.y+5*s,34*s,34*s);
  ctx.fillStyle=palette.panel.ink;ctx.fillRect(b.x,b.y,b.width,b.height);
  const filled=filledCells(status,progress);
  for(let i=0;i<8;i++){
    const x=b.x+(4+i*10.5)*s;
    ctx.fillStyle=palette.panel.to;ctx.fillRect(x,b.y+3*s,8*s,8*s);
    ctx.fillStyle=i<filled?gold:palette.panel.ink;
    if(i<filled)ctx.fillRect(x,b.y+3*s,8*s,8*s);
    else ctx.fillRect(x+2*s,b.y+5*s,4*s,4*s);
  }
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);ctx.lineWidth=4;ctx.strokeStyle=palette.panel.ink;ctx.beginPath();
  if(fire){
    ctx.fillStyle=THEMES['tabao-rush'].accent.fill;
    ctx.moveTo(8,35);ctx.bezierCurveTo(2,27,12,23,10,14);ctx.lineTo(18,23);ctx.bezierCurveTo(16,15,26,12,24,5);ctx.bezierCurveTo(34,13,28,21,31,25);ctx.lineTo(36,16);ctx.bezierCurveTo(45,32,35,39,22,39);ctx.bezierCurveTo(15,39,10,38,8,35);ctx.closePath();ctx.fill();
  }else if(status==='burnt'){
    ctx.moveTo(12,36);ctx.bezierCurveTo(28,28,5,25,20,15);ctx.moveTo(25,36);ctx.bezierCurveTo(42,26,19,23,31,8);ctx.stroke();
  }else if(status==='empty'){
    ctx.moveTo(10,11);ctx.lineTo(10,33);ctx.lineTo(34,33);ctx.lineTo(34,11);ctx.stroke();
  }else if(status==='working'){
    ctx.moveTo(13,11);ctx.lineTo(31,11);ctx.lineTo(13,33);ctx.lineTo(31,33);ctx.lineTo(13,11);ctx.stroke();
  }else if(status==='done'){
    ctx.moveTo(10,23);ctx.lineTo(19,32);ctx.lineTo(35,12);ctx.stroke();
  }
  ctx.restore();ctx.restore();
}
export function intersects(a:Box,b:Box):boolean{return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
export function levelBox(width:number,height:number):Box{return {x:projectX(0,width),y:projectY(0,height),width:width*TILE,height:height*TILE*DEPTH};}
/** Prefer the floor side, then scan nearby clear space. Obstacles include the worker. */
export function rejectionBox(out:Box,level:Box,tile:number,columns:number,rows:number,width:number,height:number,obstacles:readonly Box[]){
  const column=tile%columns,row=Math.floor(tile/columns),x=level.x+column*TILE,y=level.y+row*TILE*DEPTH;
  const preferredX=column===0?x+TILE+5:column===columns-1?x-width-5:x+TILE+5;
  const preferredY=row===0?y+TILE*DEPTH+5:row===rows-1?y-height-5:y;
  out.width=width;out.height=height;
  let bestX=Math.max(level.x,Math.min(preferredX,level.x+level.width-width)),bestY=Math.max(level.y,Math.min(preferredY,level.y+level.height-height));
  out.x=bestX;out.y=bestY;let best=Infinity,blocked=false;
  for(const obstacle of obstacles)if(intersects(out,obstacle)){blocked=true;break;}
  if(!blocked)return;
  for(let cy=level.y;cy<=level.y+level.height-height;cy+=5)for(let cx=level.x;cx<=level.x+level.width-width;cx+=5){
    const distance=(cx-preferredX)**2+(cy-preferredY)**2;if(distance>=best)continue;
    out.x=cx;out.y=cy;blocked=false;for(const obstacle of obstacles)if(intersects(out,obstacle)){blocked=true;break;}
    if(!blocked){best=distance;bestX=cx;bestY=cy;}
  }
  out.x=bestX;out.y=bestY;
}
