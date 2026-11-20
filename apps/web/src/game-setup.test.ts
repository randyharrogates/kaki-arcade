import { expect, it, vi } from 'vitest';
import type { HostMessage } from '@kaki/protocol';
import type { AnySettingField, SettingsSchema } from '@kaki/platform';
import { EMPTY_SETUP } from '@kaki/platform';
import type { PreparedSetup } from './game-setup';
import { fieldSummary, groupSelection, reconcileSettings, settingChange, settingsView } from './game-setup';
import { createHost } from './host';
import { localPlayer } from './local-player';
import { hostKeyboard } from './host-keyboard';
import type { DialCallbacks } from './host';
import { CODE, SECRET, Clock, MemoryStorage } from './testing.fixture';
import { prepareSetup, prepareMatch } from './session-loading';
import type { LoadedGame } from './session-adapter';
import { teamSetupView } from './team-setup';
import { gameMetas, sessionRegistrations } from './game-registry';
const fields: AnySettingField[] = [
  { id: 'size', label: 'Size', kind: 'choice', default: 3, options: [3, 5, 7].map(value => ({ value, label: String(value) })) },
  { id: 'items', label: 'Items', kind: 'multi', default: [], noneLabel: 'Mixed', options: [{ value: 'a', label: 'Alpha', group: 'First' }, { value: 'b', label: 'Beta', group: 'First' }, { value: 'c', label: 'Gamma', group: 'Second' }] },
  { id: 'extra', label: 'Extra', kind: 'toggle', default: false },
  { id: 'time', label: 'Time', kind: 'number', default: 10, min: 5, max: 20, step: 5, unit: 's' },
];
const schema = { fields, check: (s: Record<string, unknown>) => s.size === 7 || (s.items as unknown[]).length === 1 || s.extra === true || s.time === 20 ? 'Choose a larger pool' : null } as unknown as SettingsSchema<object>;
it('PLAT-006 validates all four kinds, refuses cross-field changes and permits multi stranding', () => {
  const defaults = reconcileSettings(schema);
  expect(settingChange(schema, defaults, 'size', 7).reason).toBe('Choose a larger pool');
  expect(settingChange(schema, defaults, 'extra', true).reason).toBe('Choose a larger pool');
  expect(settingChange(schema, defaults, 'time', 20).reason).toBe('Choose a larger pool');
  expect(settingChange(schema, defaults, 'time', 11).reason).toContain('steps');
  expect(settingChange(schema, defaults, 'items', ['unknown']).settings).toBe(defaults);
  const stranded = settingChange(schema, defaults, 'items', ['a']);
  expect(stranded.reason).toBeNull();
  expect(settingsView(schema, stranded.settings).problem).toBe('Choose a larger pool');
  expect(settingsView(schema, stranded.settings).fields[0]).toMatchObject({options:[{chosen:true,reason:null}, {}, {}]});
  const view = settingsView(schema, defaults);
  expect(view.fields[0]).toMatchObject({ options: [{ reason: null }, { reason: null }, { reason: 'Choose a larger pool' }] });
  const multi = view.fields[1];
  if (multi?.kind !== 'multi') throw new Error('Missing multi');
  expect(groupSelection(multi, 'First')).toEqual(['a', 'b']);
  const all = settingsView(schema, { ...defaults, items: ['a', 'b'] }).fields[1];
  if (all?.kind !== 'multi') throw new Error('Missing multi');
  expect(groupSelection(all, 'First')).toEqual([]);
  expect(fieldSummary(all)).toBe('First (all)');
  expect(fieldSummary(multi)).toBe('Mixed');
  expect(settingChange(schema, stranded.settings, 'items', []).settings.items).toEqual([]);
  expect(reconcileSettings(schema, { ...defaults, size: 99, time: 15 })).toMatchObject({ size: 3, time: 15 });
});
async function hostFixture(index = 0) {
  const clock = new Clock(); const storage = new MemoryStorage(); let cb: DialCallbacks | undefined; let serial = 0;
  let resolve: ((value: PreparedSetup) => void) | undefined;
  const session = { setup: vi.fn<(id: string, teams: boolean) => Promise<PreparedSetup>>(() => new Promise<PreparedSetup>(done => { resolve = done; })), start: vi.fn(() => Promise.resolve()) };
  const host = createHost({ clock, storage, session, mintToken: () => String(++serial).padStart(32, '0'), dial: (_c, callbacks) => { cb = callbacks; return Promise.resolve({ credentials: { code: CODE, hostToken: SECRET }, reopened: false, stop() { /* Fixture. */ } }); } }, () => undefined);
  await host.start();
  const messages: HostMessage[] = [];
  for (const id of ['one', 'two']) { cb?.peer(id, { sendHost(message) { messages.push(message); return true; }, bindIdentity() { /* Fixture. */ }, close() { /* Fixture. */ } }); cb?.control(id, { v: 1, t: 'hello', name: id }); }
  const input = (action: 'open' | 'select' | 'start' | 'back' | 'next') => { clock.advance(150); host.leaderInput('one', action); };
  input('open'); for (let step = 0; step < index; step++) input('next'); input('select');
  const finish = async (nextSchema = schema) => { resolve?.({ context: { ...EMPTY_SETUP, teams: session.setup.mock.calls.at(-1)?.[1] ?? false }, schema: nextSchema }); await Promise.resolve(); await Promise.resolve(); };
  const edit = (id: string, value: unknown, who = 'one', revision = host.teamSetup?.revision) => { cb?.control(who, { v: 1, t: 'action', rev: 0, viewRev: revision, data: { control: 'setting', id, value } }); };
  return { host, clock, storage, session, cb, messages, input, finish, edit };
}
it('PLAT-006 fences loading, stale and non-leader edits and starts with chosen settings', async () => {
  const f = await hostFixture();
  expect(f.host.teamSetup?.settings).toMatchObject({ loading: true, fields: [] });
  f.input('start'); expect(f.session.start).not.toHaveBeenCalled();
  await f.finish();
  const rev = f.host.teamSetup?.revision;
  f.edit('size', 5, 'two'); expect(f.host.teamSetup?.revision).toBe(rev);
  f.edit('size', 5); f.edit('size', 3, 'one', rev);
  expect(f.host.teamSetup?.settings?.fields[0]).toMatchObject({ options: [{ chosen: false }, { chosen: true }, { chosen: false }] });
  f.edit('size', 7); expect(JSON.stringify(f.messages.at(-1))).toContain('Choose a larger pool');
  f.input('start'); expect(f.session.start).toHaveBeenCalledWith(gameMetas[0]?.id, expect.anything(), expect.objectContaining({ size: 5 }), expect.objectContaining({ firstInRoom: true, assignTeam: expect.any(Function) as unknown }));
  expect(JSON.stringify([...f.storage.data.values()])).not.toContain('"size"');
  f.host.stop();
});
it('PLAT-006 retains values across picker, results, handover and phone reauthentication', async () => {
  const f = await hostFixture(); await f.finish(); f.edit('size', 5);
  f.input('back'); f.input('select'); await f.finish();
  expect(f.host.teamSetup?.settings?.fields[0]).toMatchObject({ options: [{ chosen: false }, { chosen: true }, { chosen: false }] });
  f.input('start'); await Promise.resolve();
  f.host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  await f.finish(); f.host.continueResults();
  expect(f.host.teamSetup?.settings?.fields[0]).toMatchObject({ options: [{ chosen: false }, { chosen: true }, { chosen: false }] });
  f.cb?.dropped('one'); f.clock.advance(10000);
  expect(f.host.room.leader).toBe(2);
  expect(f.host.teamSetup?.settings?.fields[0]).toMatchObject({ options: [{ chosen: false }, { chosen: true }, { chosen: false }] });
  f.host.stop();
});

it('PLAT-006 drops a setup result after leaving the start screen', async () => {
  const f = await hostFixture(); f.input('back'); await f.finish();
  expect(f.host.teamSetup).toBeNull(); expect(f.host.picker.screen).toBe('picker');
  f.host.stop();
});
it('PLAT-006 reuses the selected settings for Play again', async () => {
  const f = await hostFixture(); await f.finish(); f.edit('size', 5); f.input('start'); await Promise.resolve();
  f.host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  f.host.playAgain();
  expect(f.session.start).toHaveBeenCalledTimes(2);
  expect(f.session.start.mock.calls.at(-1)).toEqual([gameMetas[0]?.id, expect.anything(), expect.objectContaining({ size: 5 }), expect.objectContaining({ firstInRoom: true, assignTeam: expect.any(Function) as unknown })]);
  f.host.stop();
});

it('PLAT-006 resolves registry preload data before deriving the setup schema, then validates match settings', async () => {
  let release: ((value: string) => void) | undefined;
  const gate = new Promise<string>(done => { release = done; });
  const old = sessionRegistrations.fixture;
  sessionRegistrations.fixture = { data: { 'index.json': () => gate, 'match.json': (_context, settings, seed) => Promise.resolve({ settings: settings as { ready: boolean }, seed }) } };
  const game = { meta: { id: 'fixture' }, preload: (settings: object | null) => [{ key: settings === null ? 'index.json' : 'match.json', kind: 'data' }],
    settings: (context: typeof EMPTY_SETUP) => ({ fields: [{ id: 'ready', label: context.data['index.json'], kind: 'toggle', default: false }] }) } as unknown as LoadedGame;
  try {
    let ready = false;
    const pending = prepareSetup(game, true).then(value => { ready = true; return value; });
    await Promise.resolve(); expect(ready).toBe(false);
    release?.('Loaded label'); const setup = await pending;
    expect(setup.schema.fields[0]).toMatchObject({ label: 'Loaded label' });
    expect(setup.context.teams).toBe(true);
    await expect(prepareMatch(game, 19, setup, { ready: 'invalid' })).rejects.toThrow('must be on or off');
    expect((await prepareMatch(game, 19, setup, { ready: true })).context.data['match.json']).toEqual({ settings: { ready: true }, seed: 19 });
    expect(setup.context.data).not.toHaveProperty('match.json');
  } finally { if (old) sessionRegistrations.fixture = old; else delete sessionRegistrations.fixture; }
});
it('PLAT-006 validates every settings view member before accepting a phone view', () => {
  const base = { kind: 'team-setup', revision: 1, screen: 'choice', enabled: false, teamsOffered: true, teamsReason: null, players: [], error: null, settings: settingsView(schema, reconcileSettings(schema)) };
  expect(teamSetupView(base)).not.toBeNull();
  expect(teamSetupView({ ...base, teamsOffered: 'yes' })).toBeNull();
  expect(teamSetupView({ ...base, settings: { ...base.settings, fields: [{ id: 'bad', kind: 'toggle', label: 'Bad', help: null, value: 1 }] } })).toBeNull();
  expect(teamSetupView({ ...base, settings: { ...base.settings, problem: 1 } })).toBeNull();
});

it('PLAT-006 resends the retained choice after a leader phone resumes its seat', async () => {
  const f = await hostFixture(); await f.finish(); f.edit('size', 5);
  const seat = f.messages.find(message => message.t === 'seat' && message.seat === 1);
  if (seat?.t !== 'seat') throw new Error('Missing seat');
  f.cb?.dropped('one');
  const messages: HostMessage[] = [];
  f.cb?.peer('reloaded', { sendHost(message) { messages.push(message); return true; }, bindIdentity() { /* Fixture. */ }, close() { /* Fixture. */ } });
  f.cb?.control('reloaded', { v: 1, t: 'resume', seatToken: seat.seatToken });
  const view = messages.filter(message => message.t === 'view').at(-1);
  expect(view?.t === 'view' ? teamSetupView(view.view)?.settings?.fields[0] : null).toMatchObject({ options: [{ chosen: false }, { chosen: true }, { chosen: false }] });
  expect(f.host.room.leader).toBe(1); f.host.stop();
});

it('PLAT-025 rebuilds the schema for Teams and retains only values still valid for their fields', async () => {
  const f = await hostFixture(2); await f.finish(); f.edit('size', 5);
  f.host.teamInput('one', 'teams-toggle');
  expect(f.session.setup).toHaveBeenLastCalledWith(gameMetas[2]?.id, true, true);
  expect(f.host.teamSetup?.settings?.loading).toBe(true); f.input('start'); expect(f.session.start).not.toHaveBeenCalled();
  const changed = { fields: fields.map(field => field.id === 'size' && field.kind === 'choice' ? { ...field, options: field.options.filter(option => option.value !== 5) } : field) } as unknown as SettingsSchema<object>;
  await f.finish(changed);
  expect(f.host.teamSetup?.settings?.fields[0]).toMatchObject({ options: [{ value: 3, chosen: true }, { value: 7, chosen: false }] });
  expect(f.host.teamSetup?.settings?.fields[3]).toMatchObject({ value: 10 });
  f.host.stop();
});

it('PLAT-006/025 mirrors unavailable and check refusals, clears on acceptance and the existing timeout', async () => {
  const f = await hostFixture(); await f.finish();
  const initial = f.host.teamSetup?.settings;
  for (const [field, value] of [['size', 7], ['extra', true]] as const) {
    f.edit(field, value);
    expect(f.host.teamSetup?.refusal).toEqual({ field, sentence: 'Choose a larger pool', revision: f.host.teamSetup?.revision });
    expect(f.host.teamSetup?.settings).toEqual(initial);
    expect(JSON.stringify(f.messages.at(-1))).toContain(JSON.stringify(f.host.teamSetup?.refusal));
    f.edit('size', 3);
    expect(f.host.teamSetup?.refusal).toBeNull();
  }
  f.edit('size', 7); f.clock.advance(2999);
  expect(f.host.teamSetup?.refusal?.field).toBe('size');
  f.clock.advance(1);
  expect(f.host.teamSetup?.refusal).toBeNull();
  expect(JSON.stringify(f.messages.at(-1))).toContain('"refusal":null');
  expect(f.host.teamSetup?.settings).toEqual(initial);
  f.host.stop();
});


it('PLAT-006/025 PLAT-024 drives setup with Enter and Escape and retains selected settings', async () => {
  const f = await hostFixture();
  const keyboard = hostKeyboard({
    state: () => ({ phase: f.host.room.phase, teams: f.host.teamSetup?.screen === 'teams', picker: f.host.picker.screen }),
    controls: () => [], active: () => null,
    join() { /* Fixture. */ }, leave() { /* Fixture. */ },
    command: action => { f.host.keyboard(action); },
  });
  const key = (key: string) => {
    f.clock.advance(150);
    keyboard.key({ key, code: key, preventDefault() { /* Fixture. */ } } as KeyboardEvent);
  };
  key('Enter'); expect(f.session.start).not.toHaveBeenCalled();
  await f.finish(); f.edit('size', 5);
  key('Escape'); expect(f.host.picker.screen).toBe('picker');
  key('Enter'); await f.finish();
  expect(f.host.teamSetup?.settings?.fields[0]).toMatchObject({ options: [{ chosen: false }, { chosen: true }, { chosen: false }] });
  f.edit('items', ['a']); key('Enter'); expect(f.session.start).not.toHaveBeenCalled();
  f.edit('items', []); key('Enter');
  expect(f.session.start).toHaveBeenCalledWith(gameMetas[0]?.id, expect.anything(), expect.objectContaining({ size: 5 }), expect.objectContaining({ firstInRoom: true, assignTeam: expect.any(Function) as unknown }));
  f.host.stop();
});

it('PLAT-006 qualifies selected labels that clash across groups', () => {
  expect(fieldSummary({id:'categories',label:'Categories',help:null,kind:'multi',options:[
    {value:'world-history',label:'History',group:'Around the world',chosen:true,reason:null},
    {value:'world-other',label:'Other',group:'Around the world',chosen:false,reason:null},
    {value:'sg-history',label:'History',group:'Singapore',chosen:true,reason:null},
    {value:'sg-other',label:'Other',group:'Singapore',chosen:false,reason:null},
  ]})).toBe('World History, Singapore History');
});
it('PLAT-025 allows Teams off after the second player leaves and refuses turning it on', async () => {
  const f = await hostFixture(2); await f.finish();
  f.host.teamInput('one', 'teams-toggle'); await f.finish();
  f.cb?.control('two', {v:1,t:'leave'});
  expect(f.host.teamSetup).toMatchObject({enabled:true,teamsReason:'Teams need 2 players'});
  f.host.teamInput('one', 'teams-toggle'); await f.finish();
  expect(f.host.teamSetup?.enabled).toBe(false);
  f.host.teamInput('one', 'teams-toggle');
  expect(f.host.teamSetup?.enabled).toBe(false);
  f.host.stop();
});

it('CTRL-009 PLAT-006 keeps Rabakz teams on after load failure with a watching TV seat', async () => {
  const f = await hostFixture(2); await f.finish();
  f.host.joinLocal(localPlayer());
  f.host.teamInput('one', 'teams-toggle'); await f.finish();
  expect(f.host.teamSetup?.enabled).toBe(true);
  f.session.start.mockRejectedValueOnce(new Error('offline'));
  f.input('start');
  expect(f.host.teamSetup?.screen).toBe('teams');
  f.host.teamInput('one', 'teams-start');
  await Promise.resolve(); await Promise.resolve();
  expect(f.host.picker.error).toContain('Could not load');
  expect(f.host.teamSetup?.enabled).toBe(true);
  expect(f.session.setup).toHaveBeenLastCalledWith('rabakz', true, true);
  f.host.stop();
});

it('PP-033 leader difficulty choice round-trips through setup to the session', async () => {
  const f = await hostFixture(1);
  try {
    const { peekPoker } = await import('../../../games/peek-poker/src');
    const { settingsSchema } = await import('@kaki/platform');
    await f.finish(settingsSchema(peekPoker, EMPTY_SETUP) as SettingsSchema<object>);
    expect(f.host.teamSetup?.settings?.fields[1]).toMatchObject({
      id: 'difficulty', label: 'Difficulty', options: [
        { value: 'rising', label: 'Rising', chosen: true },
        { value: 'steady', label: 'Steady', chosen: false },
      ],
    });
    f.edit('difficulty', 'steady');
    expect(JSON.stringify(f.messages.at(-1))).toContain('steady');
    expect(f.host.teamSetup?.settings?.fields[1]).toMatchObject({ options: [{ chosen: false }, { chosen: true }] });
    f.input('start');
    expect(f.session.start).toHaveBeenCalledWith('peek-poker', expect.anything(), { rounds: 5, difficulty: 'steady' }, expect.anything());
  } finally { f.host.stop(); }
});
