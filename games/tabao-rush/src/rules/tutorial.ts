import type { StepInputs } from '@kaki/platform';
import { advanceStations, prepareStations } from './stations';
import { interactItems, landItems } from './items';
import { moveCooks } from './movement';
import { TEST_LEVEL } from './level';
import { inventory } from './state';
import type { Level, TabaoState, Tile } from './state';
import { targetTile } from './target';

export interface Tutorial { readonly step: number; readonly done: readonly string[] }
export const TUTORIAL_TARGETS = [30, 10, 12, 14] as const;
export const TUTORIAL_STEPS = [
  { title: 'Move', row: 'Move', instruction: 'Walk to the glowing ring', control: 'move' },
  { title: 'Pick up', row: 'Pick up the cucumber', instruction: 'Press cross at the cucumber crate', control: 'cross' },
  { title: 'Act', row: 'Chop it', instruction: "Put it down with cross. Hold circle until it’s done, then pick it up with cross.", control: 'circle' },
  { title: 'Serve', row: 'Serve it', instruction: 'Pick it up. Press cross at the serving counter', control: 'cross' },
] as const;
/** Short counter, eight distinct starts, real crate, chopping board and placement rules. */
export const TUTORIAL_LEVEL: Level = {
  id: 'tutorial', name: 'Tutorial', width: 8, height: 6, firesEnabled: false,
  tiles: Array.from({ length: 48 }, (_, tile): Tile => {
    if (tile === 10) return { kind: 'station', stationId: 'cucumber', ingredient: 'cucumber' };
    if ([11, 12, 13].includes(tile)) return { kind: 'station', stationId: `chop-${String(tile)}`, stationType: 'chop' };
    if (tile === 14) return { kind: 'counter', label: 'Serve' };
    return { kind: tile < 8 || tile >= 40 || tile % 8 === 0 || tile % 8 === 7 ? 'wall' : 'floor' };
  }),
  spawns: Array.from({ length: 8 }, (_, index) => ({ x: 1.5 + index % 4, y: 3.5 + Math.floor(index / 4), facing: 6 as const })),
};
export function tutorialKitchen(state: TabaoState): TabaoState {
  return resetKitchen(state, TUTORIAL_LEVEL, 'tutorial');
}
function resetKitchen(state: TabaoState, level: Level, phase: 'tutorial' | 'play'): TabaoState {
  return { phase, ...(phase === 'tutorial' && state.tutorial ? { tutorial: state.tutorial } : {}),
    picks: state.picks ?? [], pickRevision: (state.pickRevision ?? 0) + (phase === 'play' ? (state.tutorial?.step ?? 0) + 2 : 1), pickSteps: state.pickSteps ?? 0,
    rng: state.rng, level, players: state.players, inventory: inventory(), nextItemId: 0,
    tick: 0, endTick: state.endTick,
    cooks: state.players.filter(p => !p.spectating).map((p, index) => {
      const point = level.spawns[index % level.spawns.length];
      if (!point) throw new Error('Tutorial needs a spawn per cook');
      return { id: p.id, ...point, vx: 0, vy: 0, facing: point.facing ?? 2,
        targetTile: targetTile(level, point.x, point.y, point.facing ?? 2) };
    }),
  };
}
export function startRound(state: TabaoState): TabaoState {
  return resetKitchen(state.phase === 'tutorial' ? { ...state, players: state.players.map(p => ({ ...p, spectating: false })) } : state, TEST_LEVEL, 'play');
}
export function tutorialStep(state: TabaoState, inputs: StepInputs): TabaoState {
  const lesson = state.tutorial;
  if (!lesson) return startRound(state);
  if (inputs.actions.some(a => a.control === 'header-action' && a.value === 'skip-tutorial' && a.player === inputs.leader &&
      state.players.some(p => p.id === a.player && !p.spectating) && !inputs.disconnected.includes(a.player))) return startRound(state);
  const prepared = prepareStations(state);
  const next = landItems({ ...advanceStations(interactItems(prepared, inputs)), tick: state.tick + 1,
    cooks: moveCooks(state.level, state.cooks, inputs, state.tick) });
  const done = new Set(lesson.done);
  for (const cook of next.cooks) {
    if (inputs.disconnected.includes(cook.id)) { done.add(cook.id); continue; }
    if (lesson.step === 0 && Math.floor(cook.y) * state.level.width + Math.floor(cook.x) === TUTORIAL_TARGETS[0]) done.add(cook.id);
    if (lesson.step === 1 && next.inventory.held[cook.id]?.ingredient === 'cucumber') done.add(cook.id);
    const chop = [11, 12, 13].map(tile => next.stations?.[tile]).find(station => station !== undefined && station.worker === state.players.find(p => p.id === cook.id)?.seat && station.workedAt === state.tick);
    if (lesson.step === 2 && chop?.content?.kind === 'chopped' && chop.workedAt === state.tick &&
        chop.worker === state.players.find(p => p.id === cook.id)?.seat) done.add(cook.id);
    const placed = next.inventory.counters[TUTORIAL_TARGETS[3]];
    if (lesson.step === 3 && placed?.kind === 'chopped' && state.inventory.held[cook.id]?.id === placed.id) done.add(cook.id);
  }
  // Clear completed practice portions after a real placement so the next cook can use the counter.
  const cleared = lesson.step === 3 && next.inventory.counters[TUTORIAL_TARGETS[3]]?.kind === 'chopped'
    ? { ...next, inventory: { ...next.inventory, counters: { ...next.inventory.counters, [TUTORIAL_TARGETS[3]]: undefined } } } : next;
  const all = next.cooks.length > 0 && next.cooks.every(c => done.has(c.id));
  if (all && lesson.step === 3) return startRound(cleared);
  return { ...cleared, tutorial: { step: lesson.step + (all ? 1 : 0), done: all ? [] : [...done] } };
}
