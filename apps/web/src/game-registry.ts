import { THEMES } from '@kaki/ui';
import { createRng, nextFloat } from '@kaki/sim-core';
import { settingsSchema, validateSettings } from '@kaki/platform';
import type { GameModule, JsonValue, InitContext, SoundCue } from '@kaki/platform';
// The registry is the sole app-level knowledge of installed modules (PLAT-020).
import { meta as tabaoRush } from '../../../games/tabao-rush/src/meta';
import { meta as peekPoker } from '../../../games/peek-poker/src/meta';
// Metadata has no package subpath yet; retain the existing metadata-only picker import.
import { meta as rabakz } from '../../../games/rabakz/src/meta';
import type { HostScreen } from './session-adapter';
export const consoleE2eEnabled = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('fixture') === 'console-e2e';
export const gameMetas = consoleE2eEnabled ? [{ id: 'console-e2e', name: 'Console test', blurb: 'Development console integration fixture.', players: { min: 1, max: 8 }, teams: 'none' as const, coop: true, solo: true }] : [tabaoRush, peekPoker, rabakz];
const selectionChecks = new Map<string, (id: string, settings: JsonValue) => boolean>();
/** Called only by the host start adapter; phones and the picker import metadata alone. */
export async function loadGame(id: string) {
  switch (id) {
    case 'console-e2e': if (consoleE2eEnabled) return register((await import('./console-e2e.fixture')).consoleE2e); throw new Error('Fixture disabled');
    case 'tabao-rush': return register((await import('../../../games/tabao-rush/src/index')).tabaoRush);
    case 'peek-poker': return register((await import('../../../games/peek-poker/src/index')).peekPoker);
    case 'rabakz': {
      const module = await import('@kaki/game-rabakz');
      return register(module.rabakz);
    }
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

interface SessionRegistration {
  finalHintTheme?: typeof THEMES.console;
  finalScreen?: boolean;
  screen?: () => Promise<HostScreen>;
  viewKey?: () => Promise<(view: unknown) => unknown>;
  data: Record<string, (context: InitContext, settings: object | null, seed: number) => Promise<JsonValue>>;
}
/** Only the registry knows each game's host renderer and declared preload resolvers. */
export const sessionRegistrations: Record<string, SessionRegistration> = {
  ...(consoleE2eEnabled ? { 'console-e2e': { screen: async () => (await import('./console-e2e.fixture')).ConsoleE2eScreen as HostScreen, data: {} } } : {}),
  'tabao-rush': { finalHintTheme: THEMES['tabao-rush'], data: {} },
  'peek-poker': {
    finalHintTheme: THEMES['peek-poker'], data: {},
    screen: async () => (await import('../../../games/peek-poker/host')).ConsoleScreen,
    viewKey: async () => (await import('../../../games/peek-poker/host')).publicViewKey,
  },
  rabakz: {
    finalHintTheme: THEMES.rabakz,
    finalScreen: true,
    viewKey: async () => { const { publicViewKey } = await import('@kaki/game-rabakz/host'); return view => publicViewKey(view as Parameters<typeof publicViewKey>[0]); },
    screen: async () => (await import('@kaki/game-rabakz/host')).RabakzScreen,
    data: {
      'categories.json': async () => (await import('@kaki/content-rabakz/session')).categories(),
      'selected-questions.json': async (context, settings, seed) => {
        const { rabakz, questionData } = await import('@kaki/game-rabakz');
        const checked = validateSettings(settingsSchema(rabakz, context), settings);
        if (!checked.ok) throw new Error('Invalid Rabakz settings');
        const { length, categories, difficulty } = checked.settings;
        const rng = createRng(seed);
        return questionData(await (await import('@kaki/content-rabakz/session')).questions({ count: length, categories: categories?.length ? categories : 'mixed', difficulty, region: 'mixed' }, () => nextFloat(rng)));
      },
    },
  },
};

export async function loadSoundDemo(): Promise<(cue: { kind: 'unlock' | 'correct' | 'wrong' } | { kind: 'answer'; seat: number }) => SoundCue> { return (await import('@kaki/game-rabakz/host')).scheduleCue; }
