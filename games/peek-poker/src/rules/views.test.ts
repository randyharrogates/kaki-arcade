import { expect, it } from 'vitest';
import { EMPTY_SETUP } from '@kaki/platform';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker } from './game';
it.each([3,5,7] as const)('PP-021 public views carry the configured %i total rounds throughout the match',rounds=>{
  const initial=peekPoker.init(42,makePlayers(1,false),{rounds},EMPTY_SETUP);
  for(const phase of ['memorise','swap','pick','reveal','scoreboard','over'] as const) expect(peekPoker.publicView({...initial,phase}).totalRounds).toBe(rounds);
});

// RZ-003 / RZ-005 shared placement must preserve untitled Peek Poker panels.
import { placeController } from '@kaki/platform/private-placement';
it('RZ-003 RZ-005 keeps the real Peek Poker hand name at 34 px', () => {
  const initial = peekPoker.init(42,makePlayers(1,false),{rounds:3},EMPTY_SETUP);
  const state = {...initial,phase:'reveal' as const,players:initial.players.map(p => ({...p,picks:[0,1],hand:{category:0,kickers:[],strength:0}}))};
  const view = peekPoker.privateView(state,state.players[0]?.info.id ?? '');
  for (const width of [667,844]) {
    const result = placeController({revision:1,controls:[]},view,{width,height:307},false,{}, {width,height:375});
    expect(result.fits).toBe(true);
    expect(result.metrics?.steps[1]).toBe(34);
  }
});
