import { describe, expect, it } from 'vitest';
import { peekPoker } from '../src/index';
import { scenario } from './scenarios';
import { frameId, screenModel, swapDestination } from './view-model';
describe('P-04 public table (PP-003, PP-004, PP-008, PP-021, PP-030, PP-031)',()=>{
  it('shows faces only during memorise and reveal, shared throughout',()=>{
    for(const phase of ['memorise','picking','locked','swap','reveal'] as const){
      const model=screenModel(peekPoker.publicView(scenario(phase)));
      expect(model.shared).toHaveLength(3);
      expect(model.grid.every(c=>c.frame === 'card-back')).toBe(!['memorise','reveal'].includes(phase));
    }
    expect(frameId('TH')).toBe('card-10h');
  });
  it('does not expose private picks before reveal, even to the view model',()=>{
    const state=scenario('locked'); const view=peekPoker.publicView(state);
    expect(view.players.every(p=>p.picks === null)).toBe(true);
    const model=screenModel(view);
    expect(model.grid.every(c=>c.marks.length === 0)).toBe(true);
    expect(model.hands).toEqual([]);
    const poisoned={...view,players:view.players.map(p=>({...p,picks:[5,6]}))};
    expect(screenModel(poisoned).grid.every(c=>c.marks.length === 0)).toBe(true);
    expect(model.players[0]?.status).toBe('Picked');
    expect(model.players[1]?.status).toBe('Picking');
    const altered={...state,players:state.players.map(p=>({...p,picks:[1,2]}))};
    expect(peekPoker.publicView(altered)).toEqual(view);
  });
  it('keeps all eight overlapping seat marks ordered and hands ranked',()=>{
    const model=screenModel(peekPoker.publicView(scenario('reveal',8)));
    expect(model.grid[5]?.marks.map(p=>p.seat)).toEqual([1,2,3,4,5,6,7,8]);
    expect(model.hands).toHaveLength(8);
  });
  it('maps both directions of card and row swaps without moving other cells',()=>{
    expect(swapDestination(5,{kind:'cards',from:5,to:10})).toBe(10);
    expect(swapDestination(10,{kind:'cards',from:5,to:10})).toBe(5);
    expect(swapDestination(6,{kind:'cards',from:5,to:10})).toBe(6);
    for(let col=0;col<4;col++) expect(swapDestination(4+col,{kind:'rows',from:1,to:3})).toBe(12+col);
  });
});
it('PP-021 publishes match length and phase-specific picking status',()=>{
  const state=scenario('memorise');expect(peekPoker.publicView(state).totalRounds).toBe(5);
  expect(screenModel(peekPoker.publicView(state)).players.every(p=>p.status === '')).toBe(true);
  const player=state.players[0];if(!player) throw Error('player');player.waiting=true;expect(screenModel(peekPoker.publicView(state)).players[0]?.status).toBe('Next round');
});
