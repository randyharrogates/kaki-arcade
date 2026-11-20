// The settings schema (PLAT-031): what the leader may change before a match, described so
// that the console can draw and check it without knowing the game.
//
// Four kinds of field:
//   choice   one of a short list (match length 10, 30 or 50)
//   multi    any set from a list (question categories)
//   toggle   on or off
//   number   a number between two limits, moved in fixed steps (pick time, 10 to 30 s by 5)
//
// Whether a match is played in teams is NOT a setting. It is the console's question, asked in
// the lobby for a game whose `meta.teams` is `optional`, and a game learns the answer from
// its players (`teamsInUse`).
//
// A schema may be fixed, or built from what is known before the match (`SetupContext`): data
// loaded by `preload(null)`, what the host has saved, and whether the teams switch is on. So
// a list of categories can come from the question bank, a level list can show stars earned,
// and a field can appear only in a team match. `settingsSchema(module, context)` reads either.
import type { SetupContext } from './types';
interface FieldBase<Id extends string> {
  /** The key of this field in the settings object. */
  readonly id: Id;
  /** Shown beside the control. */
  readonly label: string;
  /** One more line of explanation, if the label is not enough. */
  readonly help?: string;
}
export interface ChoiceOption<Value extends string | number> {
  readonly value: Value;
  readonly label: string;
  /**
   * The heading this option is shown under, for long lists (D-157). Options with the same group
   * are drawn together, in the order listed; in a `multi` field a group heading picks or clears
   * all of its options. Omit it on every option for a plain list.
   */
  readonly group?: string;
}
export interface ChoiceField<
  Id extends string = string,
  Value extends string | number = string | number,
> extends FieldBase<Id> {
  readonly kind: 'choice';
  readonly options: readonly ChoiceOption<Value>[];
  readonly default: Value;
}
export interface MultiField<
  Id extends string = string,
  Value extends string | number = string | number,
> extends FieldBase<Id> {
  readonly kind: 'multi';
  readonly options: readonly ChoiceOption<Value>[];
  readonly default: readonly Value[];
  /** Fewest that may be chosen. Default 0. */
  readonly min?: number;
  /**
   * What choosing none means, shown as the first option, for example `Mixed` (D-157). When set,
   * the console draws it pressed exactly when nothing is chosen, and tapping it clears the choice.
   */
  readonly noneLabel?: string;
}
export interface ToggleField<Id extends string = string> extends FieldBase<Id> {
  readonly kind: 'toggle';
  readonly default: boolean;
}
export interface NumberField<Id extends string = string> extends FieldBase<Id> {
  readonly kind: 'number';
  readonly min: number;
  readonly max: number;
  /** The control moves by this much; every allowed value is `min` plus a whole number of steps. */
  readonly step: number;
  readonly default: number;
  /** Written after the number, for example `s`. */
  readonly unit?: string;
}
export type AnySettingField = ChoiceField | MultiField | ToggleField | NumberField;
type FieldFor<Id extends string, Value> = [Value] extends [boolean]
  ? ToggleField<Id>
  : [Value] extends [number]
    ? NumberField<Id> | ChoiceField<Id, Value>
    : [Value] extends [string]
      ? ChoiceField<Id, Value>
      : [Value] extends [readonly (infer Item extends string | number)[]]
        ? MultiField<Id, Item>
        : never;
/** The field that can stand for one key of a settings type. */
export type SettingField<Settings extends object> = {
  [Id in keyof Settings & string]: FieldFor<Id, Exclude<Settings[Id], undefined>>;
}[keyof Settings & string];
export interface SettingsSchema<Settings extends object> {
  /**
   * One field per active key, in console order. Inactive contextual fields may be optional.
   */
  readonly fields: readonly SettingField<Settings>[];
  /**
   * A rule across fields, run after each field has passed on its own. Returns what is wrong,
   * in words the leader can read, or null.
   */
  readonly check?: (settings: Settings) => string | null;
}
export type SettingsResult<Settings> =
  | {
      readonly ok: true;
      readonly settings: Settings;
    }
  | {
      readonly ok: false;
      readonly errors: string[];
    };
/** A context with nothing loaded, nothing saved and teams off. */
export const EMPTY_SETUP: SetupContext = Object.freeze({
  firstInRoom: false,
  data: Object.freeze({}),
  saved: null,
  teams: false,
});
/** The schema of a game for this context, whether the game wrote it fixed or as a function. */
export function settingsSchema<Settings extends object>(
  module: {
    readonly settings:
      SettingsSchema<Settings> | ((context: SetupContext) => SettingsSchema<Settings>);
  },
  context: SetupContext = EMPTY_SETUP,
): SettingsSchema<Settings> {
  return typeof module.settings === 'function' ? module.settings(context) : module.settings;
}
const ID_SHAPE = /^[a-z][A-Za-z0-9]*$/;
function isChoiceValue(value: unknown): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}
/** Is `value` on the field's grid of steps? Tolerant of floating-point steps such as 0.1. */
function onStep(field: NumberField, value: number): boolean {
  const steps = (value - field.min) / field.step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}
/** What is wrong with one value for one field, or null. */
function checkValue(field: AnySettingField, value: unknown): string | null {
  switch (field.kind) {
    case 'toggle':
      return typeof value === 'boolean' ? null : 'must be on or off';
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'must be a number';
      if (value < field.min || value > field.max)
        return `must be from ${String(field.min)} to ${String(field.max)}`;
      return onStep(field, value)
        ? null
        : `must be ${String(field.min)} plus a whole number of steps of ${String(field.step)}`;
    case 'choice':
      return field.options.some((option) => option.value === value)
        ? null
        : 'must be one of the listed options';
    case 'multi': {
      if (!Array.isArray(value)) return 'must be a list';
      const items = value as unknown[];
      for (const item of items) {
        if (!field.options.some((option) => option.value === item))
          return 'must contain only listed options';
      }
      if (new Set(items).size !== items.length) return 'must not list an option twice';
      const min = field.min ?? 0;
      return items.length >= min ? null : `needs at least ${String(min)} chosen`;
    }
  }
}
/**
 * Checks the schema itself: ids, labels, options, limits and that every default is allowed.
 * Returns what is wrong, one line each; empty when the schema is sound.
 */
export function checkSettingsSchema(schema: {
  readonly fields: readonly AnySettingField[];
}): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const field of schema.fields) {
    const at = `settings field "${field.id}"`;
    if (!ID_SHAPE.test(field.id))
      problems.push(
        `${at}: id must start with a lower-case letter and hold only letters and digits`,
      );
    if (seen.has(field.id)) problems.push(`${at}: id is used twice`);
    seen.add(field.id);
    if (typeof field.label !== 'string' || field.label.trim() === '')
      problems.push(`${at}: needs a label`);
    if (field.kind === 'choice' || field.kind === 'multi') {
      if (field.options.length < 2) problems.push(`${at}: needs at least two options`);
      const values = new Set<unknown>();
      for (const option of field.options) {
        if (!isChoiceValue(option.value))
          problems.push(`${at}: option values must be strings or numbers`);
        if (values.has(option.value))
          problems.push(`${at}: option ${JSON.stringify(option.value)} is listed twice`);
        values.add(option.value);
        if (typeof option.label !== 'string' || option.label.trim() === '')
          problems.push(`${at}: option ${JSON.stringify(option.value)} needs a label`);
        if (option.group !== undefined && (typeof option.group !== 'string' || option.group.trim() === ''))
          problems.push(`${at}: option ${JSON.stringify(option.value)} has an empty group`);
      }
      const grouped = field.options.filter((option) => option.group !== undefined).length;
      if (grouped !== 0 && grouped !== field.options.length)
        problems.push(`${at}: either every option names a group or none does`);
      if (
        field.kind === 'multi' &&
        field.noneLabel !== undefined &&
        (typeof field.noneLabel !== 'string' || field.noneLabel.trim() === '')
      )
        problems.push(`${at}: noneLabel must not be empty`);
      if (field.kind === 'multi' && field.noneLabel !== undefined && (field.min ?? 0) > 0)
        problems.push(`${at}: noneLabel needs min 0, since choosing none must be allowed`);
      if (
        field.kind === 'multi' &&
        field.min !== undefined &&
        (!Number.isInteger(field.min) || field.min < 0 || field.min > field.options.length)
      ) {
        problems.push(`${at}: min must be a whole number from 0 to the number of options`);
      }
    }
    if (field.kind === 'number') {
      const numbers = [field.min, field.max, field.step];
      if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n)))
        problems.push(`${at}: min, max and step must be numbers`);
      else if (field.step <= 0) problems.push(`${at}: step must be more than 0`);
      else if (field.max <= field.min) problems.push(`${at}: max must be more than min`);
      else if (!onStep(field, field.max))
        problems.push(`${at}: max must be min plus a whole number of steps`);
    }
    const wrong = checkValue(field, field.default);
    if (wrong !== null) problems.push(`${at}: the default ${wrong}`);
  }
  return problems;
}
/** The settings a match starts from when the leader changes nothing. */
export function defaultSettings<Settings extends object>(
  schema: SettingsSchema<Settings>,
): Settings {
  const settings: Record<string, unknown> = {};
  for (const field of schema.fields as readonly AnySettingField[]) {
    settings[field.id] = field.kind === 'multi' ? [...field.default] : field.default;
  }
  return settings as Settings;
}
/**
 * Checks a settings object that came from outside (the leader's phone, storage). On success
 * returns a fresh copy holding exactly the schema's keys. Unknown keys and missing keys are
 * errors: use `mergeSettings` first to fill gaps from the defaults.
 */
export function validateSettings<Settings extends object>(
  schema: SettingsSchema<Settings>,
  value: unknown,
): SettingsResult<Settings> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return { ok: false, errors: ['settings must be an object'] };
  const source = value as Record<string, unknown>;
  const errors: string[] = [];
  const settings: Record<string, unknown> = {};
  const fields = schema.fields as readonly AnySettingField[];
  for (const field of fields) {
    if (!Object.hasOwn(source, field.id)) {
      errors.push(`${field.label}: missing`);
      continue;
    }
    const given = source[field.id];
    const wrong = checkValue(field, given);
    if (wrong !== null) errors.push(`${field.label}: ${wrong}`);
    else settings[field.id] = Array.isArray(given) ? [...(given as unknown[])] : given;
  }
  for (const key of Object.keys(source)) {
    if (!fields.some((field) => field.id === key))
      errors.push(`"${key}" is not a setting of this game`);
  }
  if (errors.length > 0) return { ok: false, errors };
  const whole = schema.check?.(settings as Settings) ?? null;
  if (whole !== null) return { ok: false, errors: [whole] };
  return { ok: true, settings: settings as Settings };
}
/** The defaults with `changes` laid over them. Not checked: pass the result to `validateSettings`. */
export function mergeSettings<Settings extends object>(
  schema: SettingsSchema<Settings>,
  changes: Partial<Settings>,
): Settings {
  return { ...defaultSettings(schema), ...changes };
}
