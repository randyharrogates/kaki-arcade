import { expect, it } from 'vitest';
import { EMPTY_SETUP } from '@kaki/platform';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker } from './game';
it.each([3,5,7] as const)('PP-021 public views carry the configured %i total rounds throughout the match',rounds=>{
  const initial=peekPoker.init(42,makePlayers(1,false),{rounds},EMPTY_SETUP);
  for(const phase of ['memorise','swap','pick','reveal','scoreboard','over'] as const) expect(peekPoker.publicView({...initial,phase}).totalRounds).toBe(rounds);
});
