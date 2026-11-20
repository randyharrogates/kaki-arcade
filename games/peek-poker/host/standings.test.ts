import { expect, it } from 'vitest';
import { scoreboardModel } from './standings';
import { scenario } from './scenarios';
import { must } from '../src/rules/invariant';
import { peekPoker, savedView } from '../src';
it('PP-032 tied leaders share first, next place is third, late joiner remains present',()=>{
  const state=scenario('reveal',3);state.players.forEach((p,i)=>{p.score=i<2 ? 20 : 0;});
  expect(scoreboardModel(peekPoker.publicView(state)).map(p=>p.place)).toEqual([1,1,3]);
  for(const phase of ['scoreboard','over'] as const) {
    state.phase=phase;
    expect(peekPoker.privateView(state,'p3')?.blocks).toEqual([{kind:'stat',label:'Place',value:'3'},{kind:'stat',label:'Score',value:0}]);
  }
});
it('PP-012 solo best copy uses strict improvement and disappears in multiplayer',()=>{
  const state=scenario('reveal',1);state.phase='over';state.bestAtStart=20;state.recordable=true;
  must(state.players[0]).score=20;expect(peekPoker.publicView(state).newBest).toBe(false);
  must(state.players[0]).score=21;expect(peekPoker.publicView(state).newBest).toBe(false);expect(savedView(peekPoker.publicView(state),state)).toMatchObject({soloBest:20,newBest:true});
  state.solo=false;expect(peekPoker.publicView(state)).toMatchObject({soloBest:null,newBest:false});
});
it('PP-012 incomplete and previously multiplayer matches cannot persist a best',()=>{
  let state=scenario('reveal',1);
  expect(peekPoker.save?.(state)).toEqual({ bests: { rising: state.bestAtStart, steady: 0 } });
  state.phase='over';expect(peekPoker.save?.(state)).toEqual({ bests: { rising: Math.max(state.bestAtStart,must(state.players[0]).score), steady: 0 } });
  const other=scenario('reveal',2).players[1];if(!other) throw Error('fixture');
  state=peekPoker.leave(peekPoker.join(state,other.info),other.info.id);
  expect(peekPoker.save?.(state)).toEqual({ bests: { rising: state.bestAtStart, steady: 0 } });
});
