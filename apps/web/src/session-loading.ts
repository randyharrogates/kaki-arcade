import { defaultSettings, settingsSchema, validateSettings } from '@kaki/platform';
import type { InitContext, JsonValue } from '@kaki/platform';
import { loadGame, sessionRegistrations } from './game-registry';
import type { LoadedGame } from './session-adapter';

export async function loadSessionGame(id: string, loader: typeof loadGame = loadGame) {
  const [game, Screen, viewKey] = await Promise.all([loader(id), sessionRegistrations[id]?.screen?.(), sessionRegistrations[id]?.viewKey?.()]);
  // Erase simulation internals only here; registered data and screen exports remain checked.
  return { game: game as unknown as LoadedGame, finalScreen: sessionRegistrations[id]?.finalScreen ?? false, ...(Screen ? { Screen } : {}), ...(viewKey ? { viewKey } : {}) };
}
/** Resolve setup data before asking the module for its contextual schema. */
export async function prepareSetup(game: LoadedGame, teams = false) {
  const context: InitContext = { data: {}, saved: null, teams };
  await resolveData(game, context, null, 0);
  return { context, schema: settingsSchema(game, context) };
}
async function resolveData(game: LoadedGame, context: InitContext, settings: object | null, seed: number) {
  for (const item of game.preload?.(settings) ?? []) {
    const resolver = sessionRegistrations[game.meta.id]?.data[item.key];
    if (!resolver || item.kind !== 'data') throw new Error('No data loader registered');
    (context.data as Record<string, JsonValue>)[item.key] = await resolver(context, settings, seed);
  }
}
export async function prepareMatch(game: LoadedGame, seed: number, setup: { context: InitContext }, settings: object) {
  const checked = validateSettings(settingsSchema(game, setup.context), settings);
  if (!checked.ok) throw new Error(checked.errors.join('. '));
  const context = { ...setup.context, data: { ...setup.context.data } };
  await resolveData(game, context, checked.settings, seed);
  return { context, settings: checked.settings };
}
/** Compatibility for callers that have no start-screen selection. */
export async function prepareSession(game: LoadedGame, seed: number, teams = false) {
  const setup = await prepareSetup(game, teams);
  return prepareMatch(game, seed, setup, defaultSettings(setup.schema));
}
/** No installed module currently declares non-data assets. Fail closed until a resolver exists. */
export async function loadSessionAssets(game: LoadedGame, state: unknown): Promise<void> {
  if (game.assets(state).length) throw new Error('No asset resolver registered');
  await document.fonts.ready;
}
