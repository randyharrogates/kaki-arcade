import { createHostDeviceStore } from '@kaki/platform';
import type { JsonValue } from '@kaki/platform';
import { sessionRegistrations } from './game-registry';
import type { LoadedGame } from './session-adapter';

export async function readSaved(id: string): Promise<JsonValue> {
  const schema = await sessionRegistrations[id]?.record?.();
  if (!schema) return null;
  const status = { unreadable: false };
  const store = createHostDeviceStore({ backend: () => localStorage, report: problem => { if (problem === 'unavailable') status.unreadable = true; } });
  const value = store.open({ game: id }, 'progress-v1', schema).read();
  return status.unreadable ? null : value ?? schema.empty();
}
export async function saveSession(game: LoadedGame, state: unknown, view: unknown, writable = true): Promise<unknown> {
  const schema = await sessionRegistrations[game.meta.id]?.record?.();
  if (!writable || !schema || !game.save) return view;
  const record = game.save(state);
  const result = createHostDeviceStore({ backend: () => localStorage }).open({ game: game.meta.id }, 'progress-v1', schema).savePoint(record);
  return result.saved ? schema.savedView(view, state) : view;
}
