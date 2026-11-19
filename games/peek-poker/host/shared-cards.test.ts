import { expect, it } from 'vitest';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker } from '../src';
import { scenario } from './scenarios';
import { drawTable } from './Screen';
import { screenModel } from './view-model';
import { duration } from '../../../packages/ui/src';
import type { CardDeck } from './assets';

it('PP-004 PP-020 hides shared faces from public and every private view, including stale hands and joiners', () => {
  for (const rows of [false, true]) {
    const state = scenario('memorise', 3, rows);
    const reveal = scenario('reveal', 3, rows);
    state.players = reveal.players; // Even stale picks/hand data cannot escape during memorise.
    const joiner = makePlayers(4,false)[3];if(!joiner) throw Error('Missing joiner');
    const joined = peekPoker.join({...state,ticks:1}, joiner);
    const newcomer = joined.players.find(p=>p.waiting);
    expect(newcomer).toBeDefined();if(!newcomer) throw Error('Missing newcomer');
    expect(peekPoker.privateView(joined,newcomer.info.id)).toBeNull();
    expect(peekPoker.publicView(joined).shared).toBeNull();
    const changed = { ...state, shared: [0, 1, 2] };
    expect(peekPoker.publicView(state)).toEqual(peekPoker.publicView(changed));
    for (const p of state.players) {
      expect(peekPoker.privateView(state, p.info.id)).toEqual(peekPoker.privateView(changed, p.info.id));
      expect(peekPoker.privateView(state, p.info.id)?.blocks.every(b => b.kind !== 'cards')).toBe(true);
      p.waiting = true;
      expect(peekPoker.privateView(state, p.info.id)).toBeNull();
    }
    const paused = peekPoker.pause?.(state);
    expect(paused && peekPoker.publicView(paused).shared).toBeNull();
    for (const phase of ['swap', 'picking', 'reveal'] as const) {
      const view = peekPoker.publicView(scenario(phase, 3, rows));
      expect(view.shared).toHaveLength(3);
      expect(view.sharedFaceDown).toBe(false);
    }
    for (const phase of ['scoreboard','over'] as const) {
      const view = peekPoker.publicView({...reveal,phase});
      expect(view.shared).toHaveLength(3);
      expect(view.sharedFaceDown).toBe(false);
    }
  }
});

it('PP-004 PP-031 draws shared backs then the reverse grid flip, or immediate faces for reduced motion', () => {
  const previous = screenModel(peekPoker.publicView(scenario('memorise')));
  const model = screenModel(peekPoker.publicView(scenario('picking')));
  const frames = new Map([...previous.shared, ...model.shared, ...model.grid.map(c => c.frame), ...previous.grid.map(c => c.frame), ...Array.from({length:5}, (_,i) => `card-flip-${String(i)}`)].map(id => [id, {id} as unknown as HTMLCanvasElement]));
  const deck = { frames, faces: frames } as CardDeck;
  const layout = {grid:{x:0,y:0},shared:[{x:0,y:0},{x:1,y:0},{x:2,y:0}],edge:'',shadow:''};
  const images:string[] = [];
  const ctx = new Proxy({}, {get:(_, key) => key === 'drawImage' ? (image:{id:string}) => images.push(image.id) : () => undefined}) as CanvasRenderingContext2D;
  drawTable(ctx, previous, previous, deck, 0, false, layout);
  expect(images.slice(0,3)).toEqual(['card-back','card-back','card-back']);
  for (const [elapsed, frame] of [[0,4],[duration.slow/2,2]] as const) {
    images.length=0;drawTable(ctx,model,previous,deck,elapsed,false,layout);
    expect(images.slice(0,3)).toEqual(Array(3).fill(`card-flip-${String(frame)}`));
  }
  for (const reduced of [false,true]) {
    images.length=0;drawTable(ctx,model,previous,deck,reduced ? 0 : duration.slow,reduced,layout);
    expect(images.slice(0,3)).toEqual(model.shared);
    expect(images.slice(3)).toEqual(Array(16).fill('card-back'));
  }
});
