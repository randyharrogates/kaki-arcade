import { PeekPokerScreen } from './Screen';
import { preloadCards } from './assets';
import { signalTableReady } from './ready';
import { peekPoker } from '../src/index';
import { PHASES, scenario } from './scenarios';
import type { DemoPhase } from './scenarios';
import '../../../packages/ui/tokens.css';
if ((import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV) {
  const query=new URLSearchParams(location.search);
  const count=[1,4,8].includes(Number(query.get('players'))) ? Number(query.get('players')) : 8;
  let phase:DemoPhase=PHASES.find(p=>p === query.get('state')) ?? 'memorise';
  let at:number|undefined;
  void preloadCards(query.get('manifest') ?? new URL('../../../assets/dist/manifest.json',import.meta.url).href).then(async deck=>{
    const screen=PeekPokerScreen(document.body,deck);
    const draw=()=>{ screen.update({view:peekPoker.publicView(scenario(phase,count,query.get('swap') === 'rows')),width:innerWidth,height:innerHeight,...(at === undefined ? {} : {at}),...(query.get('reduced') === '1' ? {reduced:true} : {})}); };
    Object.assign(window,{__ppState(next:DemoPhase,time?:number){phase=next;at=time;draw();}});
    addEventListener('keydown',e=>{if(e.key === 'n'){phase=PHASES[(PHASES.indexOf(phase)+1)%PHASES.length] ?? 'memorise';at=undefined;draw();}});
    await signalTableReady(()=>screen.ready({view:peekPoker.publicView(scenario(phase,count,query.get('swap') === 'rows')),width:innerWidth,height:innerHeight,...(query.get('reduced') === '1' ? {reduced:true} : {})}),document.documentElement.dataset);
    addEventListener('resize',draw);draw();
  }).catch((error:unknown)=>{document.body.textContent=String(error);document.documentElement.dataset.ppError='1';});
}
