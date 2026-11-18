import { defaultSettings, validateSettings } from '@kaki/platform';
import type { AnySettingField, SettingsSchema, SetupContext } from '@kaki/platform';
export interface PreparedSetup { context: SetupContext; schema: SettingsSchema<object> }
export interface OptionView { value: string | number; label: string; group?: string; chosen: boolean; reason: string | null }
interface BaseView { id: string; label: string; help: string | null }
export type FieldView = BaseView & (
  { kind: 'choice' | 'multi'; options: OptionView[]; noneLabel?: string } |
  { kind: 'toggle'; value: boolean } |
  { kind: 'number'; value: number; min: number; max: number; step: number; unit?: string }
);
export interface SettingsView { loading: boolean; problem: string | null; fields: FieldView[] }
export type SettingsValues = Record<string, unknown>;
export function reconcileSettings(schema: SettingsSchema<object>, previous: SettingsValues = {}): SettingsValues {
  const next = defaultSettings(schema) as SettingsValues;
  for (const field of schema.fields as readonly AnySettingField[]) {
    if (validateSettings({ fields: [field] } as unknown as SettingsSchema<object>, { [field.id]: previous[field.id] }).ok) next[field.id] = previous[field.id];
  }
  return next;
}
export function settingChange(schema: SettingsSchema<object>, current: SettingsValues, id: string, value: unknown): { settings: SettingsValues; reason: string | null } {
  const field = (schema.fields as readonly AnySettingField[]).find(f => f.id === id);
  if (!field) return { settings: current, reason: 'Unknown setting' };
  const next = { ...current, [id]: value };
  const checked = field.kind === 'multi' ? validateSettings({ fields: [field] } as unknown as SettingsSchema<object>, { [id]: value }) : validateSettings(schema, next);
  return checked.ok ? { settings: next, reason: null } : { settings: current, reason: checked.errors[0] ?? 'Invalid setting' };
}
export function settingsView(schema: SettingsSchema<object>, settings: SettingsValues): SettingsView {
  const checked = validateSettings(schema, settings);
  return { loading: false, problem: checked.ok ? null : checked.errors[0] ?? 'Invalid settings', fields: (schema.fields as readonly AnySettingField[]).map(field => {
    const base = { id: field.id, label: field.label, help: field.help ?? null };
    if (field.kind === 'choice' || field.kind === 'multi') return { ...base, kind: field.kind, ...(field.kind === 'multi' && field.noneLabel ? { noneLabel: field.noneLabel } : {}), options: field.options.map(option => ({ value: option.value, label: option.label, ...(option.group ? { group: option.group } : {}), chosen: field.kind === 'multi' ? (settings[field.id] as unknown[]).includes(option.value) : settings[field.id] === option.value, reason: field.kind === 'choice' && settings[field.id] !== option.value ? settingChange(schema, settings, field.id, option.value).reason : null })) };
    if (field.kind === 'toggle') return { ...base, kind: field.kind, value: settings[field.id] as boolean };
    return { ...base, kind: field.kind, value: settings[field.id] as number, min: field.min, max: field.max, step: field.step, ...(field.unit ? { unit: field.unit } : {}) };
  }) };
}
export function groupSelection(field: Extract<FieldView, { kind: 'choice' | 'multi' }>, group: string): (string | number)[] {
  const members = field.options.filter(o => o.group === group);
  const clear = members.every(o => o.chosen);
  return field.options.filter(o => o.group === group ? !clear : o.chosen).map(o => o.value);
}
export function fieldSummary(field: FieldView): string {
  if (field.kind === 'toggle') return field.value ? 'On' : 'Off';
  if (field.kind === 'number') return `${String(field.value)}${field.unit ?? ''}`;
  if (field.kind === 'choice') return field.options.find(o => o.chosen)?.label ?? 'None';
  const chosen = field.options.filter(o => o.chosen);
  if (!chosen.length) return field.noneLabel ?? 'None';
  const groups = [...new Set(chosen.map(o => o.group).filter((g): g is string => Boolean(g)))];
  const complete = groups.filter(g => field.options.filter(o => o.group === g).every(o => o.chosen));
  const names = [...complete.map(g => `${g} (all)`), ...chosen.filter(o => !o.group || !complete.includes(o.group)).map(o => chosen.some(other => other !== o && other.label === o.label) && o.group ? `${o.group === 'Around the world' ? 'World' : o.group} ${o.label}` : o.label)];
  return names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${String(names.length - 3)} more` : '');
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function textOrNull(value: unknown): boolean { return value === null || typeof value === 'string'; }
function validOption(value: unknown): boolean {
  return record(value) && (typeof value.value === 'string' || typeof value.value === 'number' && Number.isFinite(value.value)) && typeof value.label === 'string' && (value.group === undefined || typeof value.group === 'string') && typeof value.chosen === 'boolean' && textOrNull(value.reason);
}
function validField(value: unknown): boolean {
  if (!record(value) || typeof value.id !== 'string' || typeof value.label !== 'string' || !textOrNull(value.help)) return false;
  switch (value.kind) {
    case 'choice': case 'multi': return (value.noneLabel === undefined || typeof value.noneLabel === 'string') && Array.isArray(value.options) && value.options.every(validOption);
    case 'toggle': return typeof value.value === 'boolean';
    case 'number': return [value.value, value.min, value.max, value.step].every(n => typeof n === 'number' && Number.isFinite(n)) && typeof value.step === 'number' && value.step > 0 && (value.unit === undefined || typeof value.unit === 'string');
    default: return false;
  }
}
export function validSettingsView(value: unknown): value is SettingsView {
  return record(value) && typeof value.loading === 'boolean' && textOrNull(value.problem) && Array.isArray(value.fields) && value.fields.every(validField);
}
