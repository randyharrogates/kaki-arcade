import { tutorialFixture, tutorialFixtureTick } from './tutorial.fixture';
import { servedDishes } from './served-dishes.fixture';
import { ConsoleScreen } from '../host';
import { tabaoRush } from '../src/rules/game';
import { FULL_KITCHEN } from '../src/levels/catalogue';
import { loadLevel } from '../src/levels/loader';
import { inventory } from '../src/rules/state';
import type { Item, TabaoState } from '../src/rules/state';
import { PLAYER_COLOURS } from '../../../packages/ui/src/colour';
import { createTick } from '@kaki/platform';
import type { SampledInput } from '@kaki/sim-core';
type Options=Parameters<typeof ConsoleScreen.mount>[1];
type Mounted=ReturnType<typeof ConsoleScreen.mount>;
export async function startRenderer(mount:(root:HTMLElement,options:Options)=>Mounted|Promise<Mounted>=(root,options)=>ConsoleScreen.mount(root,options)){
const params=new URLSearchParams(location.search);
const tutorial=params.get('tutorial')==='1';
const detail=params.get('detail')==='half'?'half' as const:'full' as const;
const count=Math.max(1,Math.min(8,Number(params.get('players') ?? 8)));
const players=Array.from({length:count},(_,i)=>({id:`cook-${String(i)}`,seat:i+1,name:`Cook ${String(i+1)}`,colour:PLAYER_COLOURS[i]?.token ?? 'seat-1' as const}));
const loaded=loadLevel(FULL_KITCHEN,707,players);if(!loaded.state)throw new Error(loaded.problems.join('\n'));
let state:TabaoState=tutorial?tutorialFixture(players):loaded.state, running=false;
const root=document.createElement('main');document.body.append(root);
const options=()=>({view:tabaoRush.publicView(state),width:innerWidth,height:innerHeight,detail});
const screen=await mount(root,options());
function publish(){screen.update(options());if(tutorial)document.documentElement.dataset.trPhase=state.phase;}
function advance(){
  const frames=new Map<string,SampledInput>(players.map((p,i)=>[p.id,{held:0,pressed:0,released:0,age:0,seq:state.tick,axes:[Math.sin(state.tick/120+i),Math.cos(state.tick/120+i),0,0]}]));
  state=tabaoRush.step(state,(tutorial?tutorialFixtureTick(state,frames):createTick({frames})),1/60);
  publish();
}
/** Real rules continue running for performance. Named review states seed station/item
 * conditions first, then pass through publicView; no alternate renderer or mock view. */
let fixtureName="";
function fixture(name:string,at=0){
  const northSeat5=name==='north-seat5';
  if(northSeat5)name='north';
  const northFacing=name==='north-east'?0:name==='north-west'?4:name==='north-south'?2:6;
  if(name==='north-east'||name==='north-west'||name==='north-south')name='north';
  const previousLevel=state.level, same=fixtureName===name||name==='exit'||name==='done';fixtureName=name;
  running=false;
  const base=loadLevel(FULL_KITCHEN,707,players).state;if(!base)throw new Error('Invalid fixture');state=same?{...base,level:previousLevel}:base;
  const items:Item[]=[];
  state={...state,tick:120+at,cooks:state.cooks.map((c,i)=>({...c,x:2+i*1.3+((name==='walk'||name==='carry-walk')?at/60*3:0),y:name==='showcase'&&i===1?2:3,facing:((name==='walk'||name==='carry-walk')?0:i%8) as 0|1|2|3|4|5|6|7,vx:name==='walk'?3:0,vy:0}))};
  if(name==='carry-walk'||name==='showcase')for(const c of state.cooks)items.push({id:items.length+100,kind:'raw',ingredient:'chicken',place:{kind:'held',cook:c.id}});
  if(name==='throw'||name==='showcase')items.push({id:200,kind:'chopped',ingredient:'cucumber',place:{kind:'flight',start:{x:2,y:3},end:{x:6.5,y:3.5},rest:{kind:'floor',tile:3*state.level.width+6},startStep:120,duration:23,thrower:players[0]?.id ?? ''}});
  if(name==='carry-walk')state={...state,cooks:state.cooks.map(c=>({...c,vx:3}))};
  const stations={...state.stations};
  const station=Object.values(stations).find(s=>s.type===(name==='serve'||name==='entrance'||name==='rejection'?'serving':name==='wash'?'sink':name==='chop'||name==='done'||name==='north'?'chop':'wok'));
  if(station && ['chop','stir','wash','serve','extinguish','done','rejection','north'].includes(name))state={...state,cooks:state.cooks.map((c,i)=>i===0?{...c,x:station.tile%state.level.width+0.5+(station.tile%state.level.width===0?1:station.tile%state.level.width===state.level.width-1?-1:0),y:Math.floor(station.tile/state.level.width)+0.5+(Math.floor(station.tile/state.level.width)===0?1:Math.floor(station.tile/state.level.width)===state.level.height-1?-1:0),facing:Math.floor(station.tile/state.level.width)===0?6:Math.floor(station.tile/state.level.width)===state.level.height-1?2:station.tile%state.level.width===0?4:0,targetTile:station.tile}:c)};
  if(name==='north'&&station){state={...state,cooks:state.cooks.map((c,i)=>i===0?{...c,y:2-Math.min(at,48)/60,vx:northFacing===0?1:northFacing===4?-1:0,vy:northFacing===6?-1:0,facing:northFacing}:c)};items.push({id:205,kind:'raw',ingredient:'chicken',place:{kind:'held',cook:players[0]?.id ?? ''}});}
  if(name==='extinguish')items.push({id:201,kind:'extinguisher',place:{kind:'held',cook:players[0]?.id ?? ''}});
  if(name==='serve')items.push({id:202,kind:'plate',container:'plate',contents:[{id:203,kind:'cooked',ingredient:'rice'},{id:204,kind:'chopped',ingredient:'chicken'}],place:{kind:'held',cook:players[0]?.id ?? ''}});
  if(station && ['chop','stir','wash','extinguish','showcase','done','rejection','north'].includes(name)){stations[station.tile]={...station,worker:name==='north'?null:players[0]?.seat ?? 1,workedAt:state.tick-1,fire:name==='extinguish'||name==='showcase',progress:name==='done'?60:15,total:60,...(name==='rejection'?{rejection:{reason:{code:'dirty' as const},until:state.tick+60}}:{}),content:{id:300,kind:'raw',ingredient:'chicken',place:{kind:'counter',tile:station.tile}}};}
  if(name==='served-dishes'||name==='served-dishes-teh'||name==='held-dish'){
    if(name==='held-dish')state={...state,cooks:state.cooks.map((c,i)=>i===0?{...c,facing:0}:c)};
    const dishes=servedDishes(name==='served-dishes-teh'?'teh':'kopi');
    const counters=Object.values(stations).filter(s=>s.type!=='serving');
    for(let i=0;i<dishes.length;i++){const dish=dishes[i],counter=counters[i];if(dish&&counter)items.push({...dish,place:{kind:'counter',tile:counter.tile}});}
    const first=dishes[0],serving=Object.values(stations).find(s=>s.type==='serving');
    if(first){
      items.push({...first,id:900,contents:first.contents?.slice(0,1) ?? [],place:{kind:'floor',tile:3*state.level.width+5}});
      items.push({...first,id:901,place:{kind:'held',cook:players[0]?.id ?? ''}});
      if(serving)stations[serving.tile]={...serving,content:{...first,id:902,place:{kind:'counter',tile:serving.tile}}};
    }
  }
  state={...state,players:state.players.map((player,i)=>i===0&&northSeat5?{...player,colour:'seat-5'}:player),stations,inventory:inventory(items),kitchens:state.kitchens?.map(k=>({...k,score:120,tips:20,thresholds:[50,100,200],orders:Array.from({length:6},(_,i)=>({arrivalStep:name==='entrance'?120:state.tick-60,remaining:i===1?1200:i===2?300:2400,total:3600,warning:i===2,id:i,dish:FULL_KITCHEN.allowedDishes[i%FULL_KITCHEN.allowedDishes.length] ?? 'chicken-rice'}))})) ?? []};
  if(name==='showcase'||name==='burning'){
    let index=0;
    const varied={...state.stations};
    for(const station of Object.values(varied).filter(s=>['chop','wok','pot','grill'].includes(s.type))){
      const status=index++%4;
      varied[station.tile]={...station,content:status===0?null:{id:400+station.tile,kind:status===3?'burnt':'cooked',ingredient:'rice',place:{kind:'counter',tile:station.tile}},progress:status>=1?station.total:15,fire:status===3&&name==='showcase',warning:status===1};
    }
    state={...state,stations:varied};
  }
  if(name==='exit')state={...state,kitchens:state.kitchens?.map(k=>({...k,orders:k.orders.slice(1)})) ?? []};
  if(name==='serve')state={...state,orderEvents:[{type:'served',kitchen:'coop',order:0,dish:'chicken-rice',step:120,cook:players[0]?.id ?? '',seat:1,points:100,tip:12,delta:112}]};
  publish();
}
Object.assign(window,{__trClock(ms:number|undefined){const target=root.querySelector('canvas')?.parentElement as (HTMLElement&{__trClock?:(ms:number|undefined)=>void})|null;target?.__trClock?.(ms);},__trState:fixture,__trRun(){running=true;},__trAdvance:advance});
void screen.ready.then(()=>{document.documentElement.dataset.trReady='1';if(tutorial)publish();else fixture('showcase');if(tutorial?!params.has('perf'):params.has('perf'))running=true;});
const timer=setInterval(()=>{if(running)advance();},1000/60);
addEventListener('resize',publish);addEventListener('pagehide',()=>{clearInterval(timer);screen.destroy();},{once:true});


}
