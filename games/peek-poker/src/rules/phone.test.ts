import { expect, it } from 'vitest';
import { createTick, driveStep, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import { makePlayers } from '@kaki/platform/kit';
import { peekPoker as game } from './game';
import { reveal, startPicking } from './round';
import { cardCode, rankOf, suitOf } from './cards';
import { scrambleSecrets } from './views';
import type { State } from './state';

const init = (count = 2) => game.init(42, makePlayers(count, false), { rounds: 3 }, EMPTY_SETUP);
function tap(s: State, id: string, control: string, value: string | number) {
  return driveStep(game, s, createTick({ actions: [{ player: id, control, value,
    revision: game.controllerLayout(s, id).revision }] }), STEP_MS);
}
it('PP-005 phone phases use plain copy and seconds only during memorising', () => {
  const s = init();
  expect(game.controllerLayout(s, 'p1').controls).toEqual([{ kind: 'text', id: 'watch', text: 'Watch the TV', tone: 'title' }]);
  expect(game.privateView(s, 'p1')?.blocks).toEqual([{ kind: 'stat', label: 'Seconds', value: 20 }]);
  for (const [phase, text] of [['swap', 'Watch the TV'], ['scoreboard', 'Scores on the TV'], ['over', 'Match over']] as const) {
    const state = { ...reveal(s), phase };
    expect(game.controllerLayout(state, 'p1').controls).toContainEqual({ kind: 'text', id: 'watch', text, tone: 'title' });
    expect(game.privateView(state, 'p1')).toBeNull();
  }
});
it('PP-005 face-down grid toggles two picks and enables the large shapeless Lock in', () => {
  let s = startPicking(init());
  const layout = () => game.controllerLayout(s, 'p1');
  const cells = () => { const grid = layout().controls[0]; if (grid?.kind !== 'grid') throw Error('grid'); return grid.cells; };
  expect(cells()).toEqual(Array.from({ length: 16 }, () => ({ faceDown: true, state: 'plain' })));
  const lock = () => layout().controls[1];
  expect(lock()).toMatchObject({ kind: 'options', size: 'large', options: [{ id: 'go', label: 'Lock in', state: 'disabled' }] });
  const revision = layout().revision;
  s = tap(s, 'p1', 'grid', 3); expect(layout().revision).toBe(revision);
  s = tap(s, 'p1', 'grid', 9); s = tap(s, 'p1', 'grid', 12);
  expect(cells().flatMap((c, i) => c.state === 'selected' ? [i] : [])).toEqual([3, 9]);
  expect(lock()).toMatchObject({ options: [{ state: 'plain' }] });
  expect(JSON.stringify(lock())).not.toContain('face');
  s = tap(s, 'p1', 'grid', 3); expect(cells()[3]?.state).toBe('plain');
  s = tap(s, 'p1', 'grid', 5); s = tap(s, 'p1', 'lock', 'go');
  expect(game.controllerLayout(s, 'p1').controls[0]).toMatchObject({ text: 'Locked in' });
  expect(game.privateView(s, 'p1')?.blocks).toEqual([{ kind: 'text', text: 'Watch the TV for the reveal' }]);
  s = reveal(s);
  expect(game.privateView(s, 'p1')?.blocks[0]?.kind).toBe('cards');
  const hand = game.privateView(s, 'p1')?.blocks[0];
  expect(hand?.kind === 'cards' && hand.cards).toEqual([9, 5].map(i => s.grid[i]).concat(s.shared).map((card, i) => {
    if (card === undefined) throw Error('Missing card');
    return { id: `card-${String(i)}`, label: rankOf(card) === 10 ? '10' : cardCode(card).charAt(0),
      mark: ['club', 'diamond', 'heart', 'spade'][suitOf(card)] };
  }));
  expect(JSON.stringify(game.privateView(s, 'p1'))).not.toContain('random');
  expect(game.privateView(s, 'p2')?.blocks).toContainEqual({ kind: 'text', text: 'Missing picks were filled at random', tone: 'note' });
});
it.each([1, 2, 8])('PP-020 every outgoing view at every step of a scripted round with %i phones is independent of other picks', count => {
  let s = init(count);
  let sent = 0;
  for (let step = 0; step < 4000 && s.phase !== 'reveal'; step++) {
    if (s.phase === 'pick') {
      for (const [index, p] of s.players.entries()) {
        if (p.picks.length < 2) s = tap(s, p.info.id, 'grid', index + p.picks.length * 8);
      }
    }
    const pub = game.publicView(s);
    expect(pub.players.every(p => p.picks === null)).toBe(true);
    expect(pub.hands).toEqual([]);
    for (const viewer of [null, ...s.players.map(p => p.info.id)]) {
      const changed = scrambleSecrets(s, viewer, step);
      expect(game.publicView(changed)).toEqual(pub);
      if (viewer) {
        expect(game.privateView(changed, viewer)).toEqual(game.privateView(s, viewer));
        expect(game.controllerLayout(changed, viewer)).toEqual(game.controllerLayout(s, viewer));
      }
      sent++;
    }
    s = driveStep(game, s, createTick(), STEP_MS);
  }
  expect(s.phase).toBe('reveal'); expect(sent).toBeGreaterThan(2000);
});
