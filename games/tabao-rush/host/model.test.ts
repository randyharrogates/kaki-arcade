import { describe, expect, it } from 'vitest';
import { action, arcHeight, cookPosition, FixedPool, flightProgress, ITEM_CAP, lerp } from './model';
import type { View } from './model';
import type { Item } from '../src/rules/state';
describe('T-07 motion and fixed pools (TR-062, PERF-001)',()=>{
  it('controlled positions track latest without interpolation lag',()=>{expect(cookPosition(1,9,0)).toBe(9);expect(cookPosition(1,9,0.5,false)).toBe(5);});
  it('interpolates without overshoot and clamps long/negative frame gaps',()=>{expect(lerp(3,8,-1)).toBe(3);expect(lerp(3,8,2)).toBe(8);expect(lerp(3,8,0.5)).toBe(5.5);});
  it('throws rise and land on the straight path endpoints',()=>{
    expect(arcHeight(0)).toBe(0);expect(arcHeight(1)).toBe(0);expect(arcHeight(0.5)).toBe(120);
    const item:Item={id:1,kind:'raw',place:{kind:'flight',start:{x:1,y:1},end:{x:5,y:1},rest:{kind:'floor',tile:5},startStep:10,duration:20,thrower:'a'}};
    expect(flightProgress(item,20)).toBe(0.5);expect(flightProgress(item,100)).toBe(1);
  });
  it('retains the same pool objects and backing store over 3600 frames',()=>{
    const pool=new FixedPool(ITEM_CAP,()=>({x:0})), entries=pool.entries, first=entries[0];
    for(let frame=0;frame<3600;frame++){pool.reset();for(let i=0;i<ITEM_CAP;i++){const entry=pool.take();if(entry)entry.x=frame;};}
    expect(pool.entries).toBe(entries);expect(pool.entries[0]).toBe(first);expect(pool.entries).toHaveLength(ITEM_CAP);expect(pool.take()).toBeUndefined();expect(pool.overflow).toBe(1);
  });
});

describe('T-07 publication keys',()=>{
  it('keeps equal drawn snapshots and publishes motion, tint, and orders',async()=>{
    const {tabaoRush}=await import('../src/rules/game');
    const {createPublicViewKey}=await import('./view-key');const publicViewKey=createPublicViewKey();
    const {EMPTY_SETUP}=await import('@kaki/platform');
    const state=tabaoRush.init(7,[{id:'a',name:'A',seat:1,colour:'seat-1'}],{},EMPTY_SETUP);
    const view=tabaoRush.publicView(state) as View;
    const first=publicViewKey(view);expect(publicViewKey({...view})).toBe(first);
    expect(publicViewKey({...view,tick:view.tick+1})).toBeGreaterThan(first);
    const recoloured={...view,players:view.players.map(p=>({...p,colour:'seat-2' as const}))};
    const recolour=publicViewKey(recoloured);expect(recolour).toBeGreaterThan(first);
    expect(publicViewKey({...recoloured,cooks:recoloured.cooks.map(c=>({...c,x:c.x+1}))})).toBeGreaterThan(recolour);
  });
});

describe('T-07 pure view-model and D-044 camera',()=>{
  it('centres the look-at depth and projects height with the decided camera',async()=>{
    const {projectX,projectY,cameraCentreY,HUD_TOP,DEPTH,TILE}=await import('./model');
    expect(projectX(8,16)).toBe(960);expect(projectY(4,8)).toBe(cameraCentreY(8));
    expect(projectY(8,8)).toBeLessThanOrEqual(HUD_TOP-55);expect(projectY(8,8)-projectY(0,8)).toBeCloseTo(8*DEPTH*TILE);
    expect(projectY(3,8,1)).toBeCloseTo(cameraCentreY(8)-(0.866+0.5)*120);
  });
  it('isolates publication revision state between mounts',async()=>{
    const {createPublicViewKey}=await import('./view-key');const {tabaoRush}=await import('../src/rules/game');const {EMPTY_SETUP}=await import('@kaki/platform');
    const view=tabaoRush.publicView(tabaoRush.init(7,[],{},EMPTY_SETUP)) as View;const a=createPublicViewKey(),b=createPublicViewKey();expect(a(view)).toBe(1);expect(a({...view,tick:99})).toBe(2);expect(b(view)).toBe(1);
  });
});

it('keeps a still cook holding food in the carry pose (TR-061, TR-062)',async()=>{
  const {tabaoRush}=await import('../src/rules/game');const {EMPTY_SETUP}=await import('@kaki/platform');
  const view=tabaoRush.publicView(tabaoRush.init(7,[{id:'a',name:'A',seat:1,colour:'seat-1'}],{},EMPTY_SETUP)) as View;
  const held:Item={id:500,kind:'raw',ingredient:'chicken',place:{kind:'held',cook:'a'}};
  expect(action({...view,items:[held],cooks:view.cooks.map(c=>({...c,vx:0,vy:0}))},0)).toBe('carry-walk');
});

it('reserves the HUD gap for the full review kitchen and uses exact urgency boundaries (TR-001)',async()=>{
  const {projectX,projectY,HUD_TOP,orderUrgency}=await import('./model');
  expect(projectX(0,15)).toBeGreaterThanOrEqual(55);expect(projectX(15,15)).toBeLessThanOrEqual(1920-55);
  expect(projectY(0,6)).toBeGreaterThanOrEqual(55);expect(projectY(6,6)).toBeLessThanOrEqual(HUD_TOP-55);
  expect(orderUrgency(100,100)).toBe(0);expect(orderUrgency(51,100)).toBe(0);expect(orderUrgency(50,100)).toBe(1);expect(orderUrgency(26,100)).toBe(1);expect(orderUrgency(25,100)).toBe(2);
});
