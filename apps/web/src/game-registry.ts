import { settingsSchema, validateSettings } from '@kaki/platform';
import type { GameModule, JsonValue } from '@kaki/platform';
// The registry is the sole app-level knowledge of installed modules (PLAT-020).
import { meta as tabaoRush } from '../../../games/tabao-rush/src/meta';
import { meta as peekPoker } from '../../../games/peek-poker/src/meta';
import { meta as rabakz } from '../../../games/rabakz/src/meta';
export const gameMetas = [tabaoRush, peekPoker, rabakz];
const selectionChecks = new Map<string, (id: string, settings: JsonValue) => boolean>();
/** Called only by the host start adapter; phones and the picker import metadata alone. */
export async function loadGame(id: string) {
  switch (id) {
    case 'tabao-rush': return register((await import('../../../games/tabao-rush/src/index')).tabaoRush);
    case 'peek-poker': return register((await import('../../../games/peek-poker/src/index')).peekPoker);
    case 'rabakz': return register((await import('../../../games/rabakz/src/index')).rabakz);
    default: throw new Error('Unknown game');
  }
}
function register<State, Settings extends object, View>(game: GameModule<State, Settings, View>) {
  selectionChecks.set(game.meta.id, selectionCheck(game));
  return game;
}

function selectionCheck<State, Settings extends object, View>(game: GameModule<State, Settings, View>) {
  return (id: string, settings: JsonValue): boolean => {
    if (id !== game.meta.id) return false;
    try { return validateSettings(settingsSchema(game, { data: {}, saved: null, teams: false }), settings).ok; }
    catch { return false; }
  };
}
// C-09 persists no selection. Unloaded settings fail closed on room restoration.
export function validGameSelection(id: string, settings: JsonValue): boolean {
  return selectionChecks.get(id)?.(id, settings) ?? false;
}
