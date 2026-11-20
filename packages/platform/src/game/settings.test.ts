import { describe, expect, it } from 'vitest';
import { checkSettingsSchema, defaultSettings, mergeSettings, validateSettings } from './kit';
import type { SettingsSchema, SetupContext } from './kit';
interface Demo {
  length: 10 | 30 | 50;
  difficulty: 'easy' | 'mixed' | 'hard';
  categories: string[];
  bots: boolean;
  pickSeconds: number;
}
const schema: SettingsSchema<Demo> = {
  fields: [
    {
      kind: 'choice',
      id: 'length',
      label: 'Questions',
      options: [
        { value: 10, label: '10' },
        { value: 30, label: '30' },
        { value: 50, label: '50' },
      ],
      default: 10,
    },
    {
      kind: 'choice',
      id: 'difficulty',
      label: 'Difficulty',
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'hard', label: 'Hard' },
      ],
      default: 'mixed',
    },
    {
      kind: 'multi',
      id: 'categories',
      label: 'Categories',
      options: [
        { value: 'food', label: 'Food' },
        { value: 'places', label: 'Places' },
        { value: 'sport', label: 'Sport' },
      ],
      default: [],
      min: 0,
    },
    { kind: 'toggle', id: 'bots', label: 'Add bots', default: false },
    {
      kind: 'number',
      id: 'pickSeconds',
      label: 'Time to pick',
      min: 10,
      max: 30,
      step: 5,
      default: 20,
      unit: 's',
    },
  ],
  check: (settings) =>
    settings.length === 50 && settings.difficulty === 'easy'
      ? 'There are not 50 easy questions'
      : null,
};
describe('settings schema', () => {
  it('is sound, and its defaults validate', () => {
    expect(checkSettingsSchema(schema)).toEqual([]);
    const defaults = defaultSettings(schema);
    expect(defaults).toEqual({
      length: 10,
      difficulty: 'mixed',
      categories: [],
      bots: false,
      pickSeconds: 20,
    });
    expect(validateSettings(schema, defaults)).toEqual({ ok: true, settings: defaults });
  });
  it('hands out a fresh copy each time, lists included', () => {
    const a = defaultSettings(schema);
    a.categories.push('food');
    expect(defaultSettings(schema).categories).toEqual([]);
    const given = { ...a, categories: ['sport'] };
    const result = validateSettings(schema, given);
    expect(result.ok && result.settings.categories).toEqual(['sport']);
    expect(result.ok && result.settings.categories).not.toBe(given.categories);
  });
  it('refuses each kind of wrong value in words the leader can read', () => {
    const wrong = (changes: Record<string, unknown>): string[] => {
      const result = validateSettings(schema, { ...defaultSettings(schema), ...changes });
      return result.ok ? [] : result.errors;
    };
    expect(wrong({ length: 20 })).toEqual(['Questions: must be one of the listed options']);
    expect(wrong({ difficulty: 'Easy' })).toEqual([
      'Difficulty: must be one of the listed options',
    ]);
    expect(wrong({ bots: 'yes' })).toEqual(['Add bots: must be on or off']);
    expect(wrong({ pickSeconds: 12 })).toEqual([
      'Time to pick: must be 10 plus a whole number of steps of 5',
    ]);
    expect(wrong({ pickSeconds: 35 })).toEqual(['Time to pick: must be from 10 to 30']);
    expect(wrong({ pickSeconds: Number.NaN })).toEqual(['Time to pick: must be a number']);
    expect(wrong({ categories: ['food', 'maths'] })).toEqual([
      'Categories: must contain only listed options',
    ]);
    expect(wrong({ categories: ['food', 'food'] })).toEqual([
      'Categories: must not list an option twice',
    ]);
    expect(wrong({ categories: 'food' })).toEqual(['Categories: must be a list']);
    expect(wrong({ volume: 11 })).toEqual(['"volume" is not a setting of this game']);
    expect(wrong({ length: 50, difficulty: 'easy' })).toEqual(['There are not 50 easy questions']);
    const missing = validateSettings(schema, { length: 10 });
    expect(missing.ok ? [] : missing.errors).toHaveLength(4);
    expect(validateSettings(schema, null)).toEqual({
      ok: false,
      errors: ['settings must be an object'],
    });
    expect(validateSettings(schema, [])).toEqual({
      ok: false,
      errors: ['settings must be an object'],
    });
  });
  it('lays changes over the defaults', () => {
    expect(mergeSettings(schema, { length: 30 })).toEqual({
      ...defaultSettings(schema),
      length: 30,
    });
  });
  it('accepts fractional steps', () => {
    const fine: SettingsSchema<{
      speed: number;
    }> = {
      fields: [
        { kind: 'number', id: 'speed', label: 'Speed', min: 0.5, max: 2, step: 0.1, default: 1.2 },
      ],
    };
    expect(checkSettingsSchema(fine)).toEqual([]);
    expect(validateSettings(fine, { speed: 0.7 }).ok).toBe(true);
    expect(validateSettings(fine, { speed: 0.75 }).ok).toBe(false);
  });
  it('finds what is wrong with a schema', () => {
    const problems = checkSettingsSchema({
      fields: [
        {
          kind: 'choice',
          id: 'Length',
          label: '',
          options: [{ value: 1, label: 'One' }],
          default: 2,
        },
        {
          kind: 'choice',
          id: 'mode',
          label: 'Mode',
          options: [
            { value: 'a', label: 'A' },
            { value: 'a', label: '' },
          ],
          default: 'a',
        },
        { kind: 'toggle', id: 'mode', label: 'Again', default: true },
        { kind: 'number', id: 'time', label: 'Time', min: 10, max: 5, step: 1, default: 7 },
        { kind: 'number', id: 'pace', label: 'Pace', min: 0, max: 10, step: 3, default: 3 },
        { kind: 'number', id: 'zero', label: 'Zero', min: 0, max: 10, step: 0, default: 0 },
        {
          kind: 'multi',
          id: 'sets',
          label: 'Sets',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
          default: ['a'],
          min: 2,
        },
        {
          kind: 'multi',
          id: 'more',
          label: 'More',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
          default: [],
          min: 3,
        },
      ],
    });
    expect(problems).toEqual([
      'settings field "Length": id must start with a lower-case letter ' +
        'and hold only letters and digits',
      'settings field "Length": needs a label',
      'settings field "Length": needs at least two options',
      'settings field "Length": the default must be one of the listed options',
      'settings field "mode": option "a" is listed twice',
      'settings field "mode": option "a" needs a label',
      'settings field "mode": id is used twice',
      'settings field "time": max must be more than min',
      'settings field "time": the default must be from 10 to 5',
      'settings field "pace": max must be min plus a whole number of steps',
      'settings field "zero": step must be more than 0',
      'settings field "zero": the default must be 0 plus a whole number of steps of 0',
      'settings field "sets": the default needs at least 2 chosen',
      'settings field "more": min must be a whole number from 0 to the number of options',
      'settings field "more": the default needs at least 3 chosen',
    ]);
  });
  it('accepts grouped options and a label for choosing none (D-157)', () => {
    expect(
      checkSettingsSchema({
        fields: [
          {
            kind: 'multi',
            id: 'topics',
            label: 'Categories',
            noneLabel: 'Mixed',
            options: [
              { value: 'art', label: 'Arts', group: 'Around the world' },
              { value: 'sgFood', label: 'Food', group: 'Singapore' },
            ],
            default: [],
          },
        ],
      }),
    ).toEqual([]);
  });
  it('finds what is wrong with groups and the none label (D-157)', () => {
    expect(
      checkSettingsSchema({
        fields: [
          {
            kind: 'multi',
            id: 'half',
            label: 'Half',
            noneLabel: ' ',
            options: [
              { value: 'a', label: 'A', group: 'One' },
              { value: 'b', label: 'B' },
            ],
            default: [],
          },
          {
            kind: 'multi',
            id: 'blank',
            label: 'Blank',
            noneLabel: 'Any',
            min: 1,
            options: [
              { value: 'a', label: 'A', group: '' },
              { value: 'b', label: 'B', group: 'Two' },
            ],
            default: ['a'],
          },
        ],
      }),
    ).toEqual([
      'settings field "half": either every option names a group or none does',
      'settings field "half": noneLabel must not be empty',
      'settings field "blank": option "a" has an empty group',
      'settings field "blank": noneLabel needs min 0, since choosing none must be allowed',
    ]);
  });
  it('ties each field to a key of the settings type', () => {
    const bad: SettingsSchema<Demo> = {
      fields: [
        // @ts-expect-error -- `bots` is a boolean, so it cannot be a number field
        { kind: 'number', id: 'bots', label: 'Bots', min: 0, max: 4, step: 1, default: 0 },
        // @ts-expect-error -- there is no setting called `speed`
        { kind: 'toggle', id: 'speed', label: 'Speed', default: true },
        {
          kind: 'choice',
          id: 'length',
          label: 'Questions',
          // @ts-expect-error -- 20 is not one of the lengths
          options: [{ value: 20, label: '20' }],
          default: 20,
        },
      ],
    };
    expect(bad.fields).toHaveLength(3);
  });
});
it('builds settings from loaded data, saved progress and the teams switch', async () => {
  const { settingsSchema } = await import('./index');
  const dynamic = {
    settings: (
      context: SetupContext,
    ): SettingsSchema<{
      category: string;
      teamsOnly?: boolean;
    }> => ({
      fields: [
        {
          kind: 'choice',
          id: 'category',
          label: 'Category',
          options: (context.data.categories as string[]).map((value) => ({ value, label: value })),
          default: (
            context.saved as {
              category: string;
            }
          ).category,
        },
        ...(context.teams
          ? [
              {
                kind: 'toggle' as const,
                id: 'teamsOnly' as const,
                label: 'Team bonus',
                default: true,
              },
            ]
          : []),
      ],
    }),
  };
  const context = { firstInRoom: false,
    data: { categories: ['Food', 'Places'] },
    saved: { category: 'Places' },
    teams: false,
  };
  expect(defaultSettings(settingsSchema(dynamic, context))).toEqual({ category: 'Places' });
  expect(defaultSettings(settingsSchema(dynamic, { ...context, teams: true }))).toEqual({
    category: 'Places',
    teamsOnly: true,
  });
});
