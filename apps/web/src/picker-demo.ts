import './picker-demo.css';
// DEV import only. Names intentionally covered by the production fixture scan.
import { demoInput } from './demo';
import type { LobbyInput } from './view-model';
import { gameMetas } from './game-registry';
import { initialPicker } from '@kaki/platform';
export function pickerDemo(params: URLSearchParams): Omit<LobbyInput, 'origin'> {
  const count = Number(params.get('players') ?? 4);
  const input = demoInput(Number.isFinite(count) ? count : 4);
  const focus = gameMetas.find(game => game.id === params.get('focus'))?.id ?? gameMetas[0]?.id ?? '';
  const state = params.get('state');
  return { ...input, room: { ...input.room, players: input.room.players.map(p => ({ ...p, name: params.get('names') === 'wide' ? 'WWWWWWWWWWWW' : p.name, disconnectedAt: null })) }, picker: { ...initialPicker(gameMetas), focus, error: params.has('failure') ? `Could not load ${gameMetas.find(game => game.id === focus)?.name ?? 'the game'}. Try again.` : undefined, screen: state === 'start' || state === 'starting' ? state : 'picker' } };
}
export function pickerDemoChange(input: Omit<LobbyInput, 'origin'>, params: URLSearchParams): Omit<LobbyInput, 'origin'> {
  const picker = input.picker ?? initialPicker(gameMetas);
  const change = params.get('change');
  const index = gameMetas.findIndex(game => game.id === picker.focus);
  return { ...input, picker: { ...picker, revision: picker.revision + 1,
    screen: change === 'expand' ? 'start' : change === 'collapse' ? 'picker' : picker.screen,
    focus: change === 'focus' ? gameMetas[(index + 1) % gameMetas.length]?.id ?? picker.focus : picker.focus } };
}
