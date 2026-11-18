import type { View } from './model';
/** Tick drives pose and effect sampling. Same-tick publications compare every
 * other drawn field; controller-only action previews do not force a redraw. */
export function sameDrawing(a:View|undefined,b:View):boolean {
  if(!a)return false;
  if(a.tick!==b.tick||a.level!==b.level||a.timer.remaining!==b.timer.remaining||a.cooks.length!==b.cooks.length||a.items.length!==b.items.length||a.players.length!==b.players.length||a.stations.length!==b.stations.length||a.kitchens.length!==b.kitchens.length||a.orderEvents!==b.orderEvents)return false;
  for(let i=0;i<a.cooks.length;i++){const c=a.cooks[i],d=b.cooks[i];if(!c)return false;if(c.id!==d?.id||c.x!==d.x||c.y!==d.y||c.vx!==d.vx||c.vy!==d.vy||c.facing!==d.facing||c.targetTile!==d.targetTile)return false;}
  for(let i=0;i<a.items.length;i++)if(a.items[i]!==b.items[i])return false;
  for(let i=0;i<a.players.length;i++){const p=a.players[i],q=b.players[i];if(!p)return false;if(p.id!==q?.id||p.seat!==q.seat||p.colour!==q.colour)return false;}
  for(let i=0;i<a.stations.length;i++){const s=a.stations[i],t=b.stations[i];if(!s)return false;if(s.id!==t?.id||s.tile!==t.tile||s.type!==t.type||s.status!==t.status||s.progress!==t.progress||s.total!==t.total||s.fire!==t.fire||s.warning!==t.warning||s.worker!==t.worker||s.rejection!==t.rejection)return false;}
  for(let i=0;i<a.kitchens.length;i++){const k=a.kitchens[i],l=b.kitchens[i];if(!k)return false;if(k.id!==l?.id||k.score!==l.score||k.tips!==l.tips||k.stars!==l.stars||k.orders!==l.orders)return false;}
  return true;
}
export function createPublicViewKey() {
  let previous:View|undefined,revision=0;
  return (view:unknown):number => {const next=view as View;if(!sameDrawing(previous,next)){previous=next;revision++;}return revision;};
}
/** Stateless compatibility key. Mounts use createPublicViewKey. */
export function publicViewKey(view:unknown):number { return (view as View).tick; }
