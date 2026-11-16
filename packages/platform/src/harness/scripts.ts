import type { PadButton } from '../game/layout';
export type NamedButton = PadButton | 'faceBottom' | 'faceRight' | 'faceLeft' | 'faceTop' | 'shoulderLeft' | 'shoulderRight' | 'up' | 'down' | 'left' | 'right' | 'pause' | 'shake';
/** Paths address the PUBLIC view only; predicates remain plain, saveable data. */
export interface ViewPredicate { path: readonly (string | number)[]; op?: 'eq' | 'ne' | 'gte' | 'lte'; value: unknown }
export function testPredicate(view: unknown, predicate: ViewPredicate): boolean {
  let value = view;
  for (const key of predicate.path) {
    if (value === null || typeof value !== 'object') { value = undefined; break; }
    value = (value as Record<string | number, unknown>)[key];
  }
  switch (predicate.op ?? 'eq') {
    case 'eq': return JSON.stringify(value) === JSON.stringify(predicate.value);
    case 'ne': return JSON.stringify(value) !== JSON.stringify(predicate.value);
    case 'gte': return typeof value === 'number' && typeof predicate.value === 'number' && value >= predicate.value;
    case 'lte': return typeof value === 'number' && typeof predicate.value === 'number' && value <= predicate.value;
  }
}
export type ScriptCommand =
  | { do: 'wait'; steps: number }
  | { do: 'stick'; x: number; y: number; steps: number; evenIfRefused?: boolean }
  | { do: 'press'; button: NamedButton; evenIfRefused?: boolean }
  | { do: 'release'; button: NamedButton; evenIfRefused?: boolean }
  | { do: 'tap' | 'tapIfOffered'; control: string; value?: string | number; evenIfRefused?: boolean; revision?: number }
  | { do: 'until'; predicate?: ViewPredicate; predicates?: readonly ViewPredicate[]; maxSteps: number };
export type PlayerScript = readonly ScriptCommand[];
export interface ScriptCursor { commands: PlayerScript; index: number; elapsed: number }
export function positiveSteps(n: number, name = 'steps'): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
}
export function scriptCursor(commands: PlayerScript): ScriptCursor {
  for (const command of commands) {
    if ('steps' in command) { positiveSteps(command.steps); if (command.steps === 0) throw new RangeError('script duration must be positive'); }
    if (command.do === 'until') {
      positiveSteps(command.maxSteps);
      if (!command.predicate && !command.predicates?.length) throw new Error('until needs at least one public-view condition');
    }
  }
  return { commands, index: 0, elapsed: 0 };
}
