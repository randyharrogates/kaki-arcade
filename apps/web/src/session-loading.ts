import { defaultSettings, settingsSchema } from '@kaki/platform';
import type { InitContext, JsonValue } from '@kaki/platform';
import { loadGame, sessionRegistrations } from './game-registry';
import type { LoadedGame } from './session-adapter';

export async function loadSessionGame(id: string, loader: typeof loadGame = loadGame) {
  const [game, Screen, viewKey] = await Promise.all([loader(id), sessionRegistrations[id]?.screen?.(), sessionRegistrations[id]?.viewKey?.()]);
  // Erase simulation internals only here; registered data and screen exports remain checked.
  return { game: game as unknown as LoadedGame, finalScreen: sessionRegistrations[id]?.finalScreen ?? false, ...(Screen ? { Screen } : {}), ...(viewKey ? { viewKey } : {}) };
}
/** Resolve the module's declared preload keys before and after its settings are known. */
export async function prepareSession(game: LoadedGame, seed: number) {
  const data: Record<string, JsonValue> = {};
  const context: InitContext = { data, saved: null, teams: false };
  async function resolve(settings: object | null) {
    for (const item of game.preload?.(settings) ?? []) {
      const resolver = sessionRegistrations[game.meta.id]?.data[item.key];
      if (!resolver || item.kind !== 'data') throw new Error('No data loader registered');
      data[item.key] = await resolver(context, settings, seed);
    }
  }
  await resolve(null);
  const settings = defaultSettings(settingsSchema(game, context));
  await resolve(settings);
  return { context, settings };
}
/** No installed module currently declares non-data assets. Fail closed until a resolver exists. */
export async function loadSessionAssets(game: LoadedGame, state: unknown): Promise<void> {
  if (game.assets(state).length) throw new Error('No asset resolver registered');
  await document.fonts.ready;
}
