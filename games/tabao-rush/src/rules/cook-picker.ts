import { tutorialKitchen } from './tutorial';
import type { ControllerLayout, StepInputs } from '@kaki/platform';
import type { TabaoState } from './state';
export const HEADS = ['cap', 'uncle', 'auntie', 'makcik', 'bun', 'specs', 'turban', 'songkok'] as const;
export interface CookPick { readonly player: string; readonly head: number; readonly ready: boolean }
export function pickStep(state: TabaoState, inputs: StepInputs): TabaoState {
  let picks = state.picks ?? [];
  const seen = new Set<string>();
  for (const action of inputs.actions) {
    const key = `${action.player}:${action.control}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const current = picks.find(p => p.player === action.player);
    if (!current || inputs.disconnected.includes(current.player)) continue;
    if (action.control === 'ready') picks = picks.map(p => p === current ? { ...p, ready: !p.ready } : p);
    else if (action.control === 'cooks' && action.value !== current.head && !current.ready && typeof action.value === 'number' && Number.isInteger(action.value) && action.value >= 0 && action.value < HEADS.length && !picks.some(p => p.player !== current.player && p.head === action.value)) {
      picks = picks.map(p => p === current ? { ...p, head: action.value as number } : p);
    }
  }
  const allReady = picks.some(p => !inputs.disconnected.includes(p.player)) && picks.every(p => p.ready || inputs.disconnected.includes(p.player));
  const next: TabaoState = { ...state, picks, pickSteps: (state.pickSteps ?? 0) + 1, pickRevision: (state.pickRevision ?? 0) + (picks === state.picks && !allReady ? 0 : 1), phase: allReady ? 'play' : 'pick' };
  return allReady && state.tutorial ? tutorialKitchen(next) : next;
}
export function pickLayout(state: TabaoState, id: string): ControllerLayout {
  const own = state.picks?.find(p => p.player === id);
  const viewer = state.players.find(p => p.id === id);
  return { revision: state.pickRevision ?? 0, controls: [
    { kind: 'text', id: 'pick-title', text: 'Pick your cook', tone: 'note' },
    { kind: 'grid', id: 'cooks', rows: 2, cols: 4, cells: HEADS.map((head, index) => {
      const pick = state.picks?.find(p => p.head === index);
      const player = state.players.find(p => p.id === pick?.player);
      const apron = player ?? viewer;
      return { image: `cook-${head}`, ...(apron ? { colour: apron.team === undefined ? apron.colour : apron.team === 0 ? 'team-red' as const : 'team-blue' as const } : {}), label: head.charAt(0).toUpperCase() + head.slice(1),
        state: pick?.player === id ? 'selected' : pick ? 'disabled' : 'plain',
        ...(player ? { badge: { colour: player.colour, text: String(player.seat), tick: pick?.ready === true } } : {}) };
    }) },
    { kind: 'text', id: 'pick-prompt', text: 'Tap a cook', tone: 'title' },
    { kind: 'text', id: 'pick-note', text: `Faded ones are taken. Your apron stays your ${state.players.some(p => p.team !== undefined) ? 'team' : 'seat'} colour.`, tone: 'note' },
    { kind: 'options', id: 'ready', options: [{ id: 'ready', label: own?.ready ? 'Ready ✓' : 'Ready', state: own?.ready ? 'selected' : 'plain' }] },
  ] };
}
