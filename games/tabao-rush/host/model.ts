/* eslint-disable @typescript-eslint/prefer-for-of -- Hot action selection uses indexed loops. */
import type { Cook, Item, Level, Participant } from '../src/rules/state';
import type { Kitchen, OrderEvent } from '../src/rules/orders';
import type { stationViews } from '../src/rules/stations';
/** The simulation's GameModule intentionally erases its public return to unknown. */
export interface View {
  readonly level: Level;
  readonly cooks: readonly Cook[];
  readonly players: readonly Participant[];
  readonly items: readonly Item[];
  readonly stations: ReturnType<typeof stationViews>;
  readonly kitchens: readonly (Pick<Kitchen,'id'|'orders'|'score'|'tips'> & { readonly stars: number })[];
  readonly orderEvents: readonly OrderEvent[];
  readonly timer: { readonly remaining: number; readonly total: number };
  readonly tick: number;
}
export const DIRECTIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export const TILE = 120;
export const DEPTH = 0.866;
export const HUD = 144;
export const PROP = 120;
/** Eight held items, floor cap 24, four tiles of flight per cook, all level counters,
 * station contents/supplies and composed portions. Refuse overflow rather than grow. */
export const ITEM_CAP = 512;
export function lerp(a: number, b: number, alpha: number): number { return a + (b - a) * Math.max(0, Math.min(1, alpha)); }
export function cookPosition(previous: number, latest: number, alpha: number, controlled = true): number {
  return controlled ? latest : lerp(previous, latest, alpha);
}
export function arcHeight(progress: number): number { const p = Math.max(0, Math.min(1, progress)); return 4 * p * (1 - p) * TILE; }
export function flightProgress(item: Item, tick: number): number {
  return item.place.kind === 'flight' ? Math.max(0, Math.min(1, (tick - item.place.startStep) / item.place.duration)) : 1;
}
export function itemFrame(item: Item): string {
  if (item.kind === 'extinguisher') return 'item-extinguisher';
  if (item.container || item.kind === 'plate' || item.kind === 'dirty-plate') return `container-${item.container ?? 'plate'}-${item.kind === 'dirty-plate' ? 'dirty' : 'clean'}`;
  return `item-${item.ingredient ?? 'rice'}-${item.kind}`;
}
export function action(view: View, index: number): string {
  const cook = view.cooks[index];
  if (!cook) return 'idle';
  let held=false;
  for(let i=0;i<view.items.length;i++){const item=view.items[i];if(!item)continue;if(item.place.kind==='flight' && item.place.thrower===cook.id && view.tick-item.place.startStep<15)return 'throw';if(item.place.kind==='held' && item.place.cook===cook.id)held=true;}
  for(let i=0;i<view.orderEvents.length;i++){const event=view.orderEvents[i];if(event?.type==='served'&&event.cook===cook.id)return 'serve';}
  let seat=-1;for(let i=0;i<view.players.length;i++){const player=view.players[i];if(player?.id===cook.id){seat=player.seat;break;}}
  for(let i=0;i<view.stations.length;i++){const station=view.stations[i];if(station?.worker===seat)return station.fire?'extinguish':station.type==='sink'?'wash':station.type==='chop'?'chop':'stir';}
  return Math.hypot(cook.vx,cook.vy)>0?held?'carry-walk':'walk':held?'carry-walk':'idle';
}
/** Fixed backing store used by the mounted scene; publication may replace its entries. */
export class FixedPool<T> {
  readonly entries: T[];
  used = 0;
  overflow = 0;
  constructor(capacity: number, make: () => T) { this.entries = Array.from({ length: capacity }, make); }
  reset(): void { this.used = 0; }
  take(): T | undefined { const entry = this.entries[this.used]; if (entry === undefined) { this.overflow++; return undefined; } this.used++; return entry; }
}

// TODO(A-06): consume the shared level look-at Y0 when its level contract lands.
/** D-044 camera, with grid south increasing down screen. */
export function projectX(x:number,width:number):number { return 960+(x-width/2)*TILE; }
export const HUD_TOP=1080-55-144;
/** Centre the level above the HUD with a 55 px gap; D-044 tilt and tile scale remain intact. */
export function cameraCentreY(height:number):number { return Math.min(540,HUD_TOP-55-height*DEPTH*TILE/2); }
export function projectY(y:number,height:number,z=0):number { return cameraCentreY(height)-((height/2-y)*DEPTH+z*0.5)*TILE; }

/** TR-001 urgency follows remaining time, independently of raster quantisation. */
export function orderUrgency(remaining:number,total:number):number { return remaining<=total/4?2:remaining<=total/2?1:0; }
