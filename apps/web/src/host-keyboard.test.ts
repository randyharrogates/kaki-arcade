import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { createHost } from './host';
import type { DialCallbacks } from './host';
import { localPlayer, LOCAL_CONNECTION } from './local-player';

it('PLAT-024 / CTRL-009 honours seats, leader validation, leave and reload', async () => {
  let callbacks: DialCallbacks | undefined;
  const store = new Map<string, string>();
  let now = 1000;
  const host = createHost({
    clock: { now: () => now, schedule: () => 1, cancel: () => undefined },
    storage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); }, removeItem: key => { store.delete(key); } },
    mintToken: () => crypto.randomUUID(),
    dial: (_, cb) => { callbacks = cb; return Promise.resolve({ credentials: { code: 'H7KQ9MXR', hostToken: 'a'.repeat(32) }, reopened: false, stop() { /* fixture */ } }); },
  }, () => undefined);
  await host.start();
  host.keyboard('open'); expect(host.picker.screen).toBe('lobby');
  const sharedLocal = localPlayer();
  expect(host.joinLocal(sharedLocal)).toBe(true);
  const seatBeforePad = host.room.players[0];
  expect(host.joinLocal(sharedLocal)).toBe(true);
  expect(host.room.players).toEqual([seatBeforePad]);
  expect(host.room.leader).toBe(1);
  const seatBeforeQuit = host.room.players[0];
  host.roomInput({ type: 'phase', phase: 'paused', allowRunningJoin: false });
  host.keyboard('quit');
  host.sessionEvent({ type: 'picker' });
  expect(host.room.players).toEqual([seatBeforeQuit]);
  expect(host.room.leader).toBe(1);
  expect(host.picker.screen).toBe('picker');
  host.keyboard('back');
  now += 1000;
  host.leaveLocal();
  expect(host.room.players).toHaveLength(0);
  for (const id of ['phone1', 'phone2']) {
    callbacks?.peer(id, { sendHost: () => true, bindIdentity() { /* fixture */ }, close() { /* fixture */ } });
    callbacks?.control(id, { v: 1, t: 'hello', name: null });
  }
  const local = localPlayer(); host.joinLocal(local); host.joinLocal(local);
  expect(host.room.players.map(p => p.seat)).toEqual([1, 2, 3]);
  expect(host.room.players[2]).toMatchObject({ connectionId: LOCAL_CONNECTION, name: 'Player 3', colour: 2 });
  host.leaderInput(LOCAL_CONNECTION, 'open'); expect(host.picker.screen).toBe('lobby');
  host.keyboard('open'); expect(host.picker.screen).toBe('picker');
  host.leaveLocal(); expect(host.room.players).toHaveLength(2);
  host.leaveLocal(); expect(host.room.players).toHaveLength(2);
  host.joinLocal(local); host.stop();
  expect([...store.values()].join('')).not.toContain(LOCAL_CONNECTION);
});

it('PLAT-024 keeps game implementations out of shared infrastructure', async () => {
  async function inspect(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) await inspect(file);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
        const source = await readFile(file, 'utf8');
        expect(source, file).not.toMatch(/(?:from\s*|import\s*\()['"][^'"]*(?:@kaki\/game-|games\/(?:tabao-rush|peek-poker|rabakz))/);
      }
    }
  }
  for (const name of ['platform', 'netcode', 'controller-kit']) await inspect(resolve('packages', name, 'src'));
});

// The DOM port lets phase publication and rendering be advanced independently.
import { hostKeyboard, hostKeyboardControls, hostResultsKey } from './host-keyboard';
import type { RoomState } from '@kaki/platform';

function keyboardFixture() {
  let phase: RoomState['phase'] = 'playing';
  let active: HTMLElement | null = null;
  let nodes: HTMLElement[] = [];
  const commands: string[] = [];
  const keyboard = hostKeyboard({
    state: () => ({ phase, teams: false, localSeat: true }), controls: () => nodes, active: () => active,
    join() { /* fixture */ }, leave() { /* fixture */ },
    command(action) { commands.push(action); if (action === 'pause') phase = 'paused'; },
  });
  return {
    keyboard, commands,
    phase(value: RoomState['phase']) { phase = value; },
    render(labels: string[]) {
      active = null; // Removing the focused DOM node returns focus to the document.
      nodes = labels.map(textContent => {
        const node = { textContent, focus: () => { active = node as HTMLElement; } };
        return node as HTMLElement;
      });
      keyboard.rendered();
    },
    key(key: string, code = key) { keyboard.key({ type: 'keydown', key, code, preventDefault() { /* fixture */ } } as KeyboardEvent); },
    focus(label: string) { nodes.find(node => node.textContent === label)?.focus(); keyboard.remember(); },
    focused: () => active?.textContent,
    focusedIsCurrent: () => active !== null && nodes.includes(active),
  };
}

it('PLAT-024 reads a paused phase before any render or listener replacement', () => {
  const f = keyboardFixture();
  f.render(['Resume', 'Quit to picker']);
  f.phase('paused'); // The existing listener was created while playing.
  f.key('ArrowRight');
  expect(f.focused()).toBe('Resume');
  expect(f.keyboard.held.size).toBe(0);
  f.key('ArrowRight');
  expect(f.focused()).toBe('Quit to picker');
});

it('PLAT-024 Escape focuses Resume on commit and arrows recover across setup screens', () => {
  const f = keyboardFixture();
  f.key('d', 'KeyD');
  f.key('Escape');
  expect(f.commands).toEqual(['pause']);
  expect(f.keyboard.held.size).toBe(0);
  f.render(['Resume', 'Quit to picker']);
  expect(f.focused()).toBe('Resume');
  f.key('ArrowRight'); expect(f.focused()).toBe('Quit to picker');
  f.phase('lobby');
  f.render(['Back', 'Previous', 'Next', 'Select']);
  f.key('ArrowLeft'); expect(f.focused()).toBe('Back');
  f.key('ArrowLeft'); expect(f.focused()).toBe('Select');
  f.render(['Join host player (J)', 'Pick a game', 'Leave host player (L)']);
  // Player joins update the lobby controls without replacing the listener.
  f.key('ArrowRight'); expect(f.focused()).toBe('Join host player (J)');
  f.key('ArrowRight'); expect(f.focused()).toBe('Pick a game');
  f.render(['Back', 'Previous', 'Next', 'Select', 'Leave host player (L)']);
  for (let i = 0; i < 4; i++) f.key('ArrowRight');
  expect(f.focused()).toBe('Select');
  f.render(['Back', 'Start', 'Leave host player (L)']);
  f.key('ArrowRight'); f.key('ArrowRight');
  expect(f.focused()).toBe('Start');
});

it('PLAT-024 excludes disconnected, hidden, inert and outgoing controls', () => {
  const control = (connected = true, excluded = false, rects = 1, visibility = 'visible') => ({
    isConnected: connected, closest: () => excluded ? { /* fixture */ } : null,
    getClientRects: () => Array.from({ length: rects }), visibility,
  });
  const visible = control();
  vi.stubGlobal('document', { querySelector: () => null, querySelectorAll: () => [visible, control(false), control(true, true), control(true, false, 0), control(true, false, 1, 'hidden')] });
  vi.stubGlobal('getComputedStyle', (node: { visibility: string }) => ({ visibility: node.visibility }));
  try { expect(hostKeyboardControls()).toEqual([visible]); }
  finally { vi.unstubAllGlobals(); }
});

it('PLAT-024 restores a replaced control by label before the next arrow', () => {
  const f = keyboardFixture();
  f.phase('lobby');
  f.render(['Back', 'Start', 'Leave host player (L)']);
  f.key('ArrowRight');
  for (let update = 0; update < 24; update++) {
    f.render(['Back', 'Start', 'Leave host player (L)']);
    expect(f.focused()).toBe('Back');
    expect(f.focusedIsCurrent()).toBe(true);
  }
  f.key('ArrowRight');
  expect(f.focused()).toBe('Start');
});

it('PLAT-024 remembers explicit focus before replacement and preserves a user-selected control', () => {
  const f = keyboardFixture();
  f.phase('lobby');
  f.render(['Back', 'Start', 'Leave host player (L)']);
  f.focus('Start');
  f.render(['Back', 'Start', 'Leave host player (L)']);
  expect(f.focused()).toBe('Start');
  expect(f.focusedIsCurrent()).toBe(true);
  f.focus('Leave host player (L)');
  f.keyboard.rendered();
  expect(f.focused()).toBe('Leave host player (L)');
  f.key('ArrowRight');
  expect(f.focused()).toBe('Back');
});

it.each(['ctrlKey', 'metaKey', 'altKey'])('PLAT-024 ignores %s on down and up', modifier => {
  const f = keyboardFixture();
  const preventDefault = vi.fn();
  for (const type of ['keydown', 'keyup']) f.keyboard.key({ type, key: 'd', code: 'KeyD', [modifier]: true, preventDefault } as unknown as KeyboardEvent);
  expect(f.keyboard.held.size).toBe(0); expect(preventDefault).not.toHaveBeenCalled();
});
it('CTRL-009 captures mapped gameplay codes only', () => {
  const f = keyboardFixture();
  for (const code of ['Tab', 'F5', 'KeyB']) f.key(code);
  expect(f.keyboard.held.size).toBe(0);
  f.key('d', 'KeyD'); expect(f.keyboard.held.has('KeyD')).toBe(true);
  f.keyboard.clear(); expect(f.keyboard.held.size).toBe(0);
});


it('PLAT-024 TV results actions continue and return with every phone disconnected', async () => {
  let callbacks: DialCallbacks | undefined;
  const continued = vi.fn(); let now = 20000;
  const host = createHost({
    clock: { now: () => now, schedule: () => 1, cancel() { /* fixture */ } },
    storage: { getItem: () => null, setItem() { /* fixture */ }, removeItem() { /* fixture */ } }, mintToken: () => crypto.randomUUID(),
    dial: (_, cb) => { callbacks = cb; return Promise.resolve({ credentials: { code: 'H7KQ9MXR', hostToken: 'a'.repeat(32) }, reopened: false, stop() { /* fixture */ } }); },
    session: { start: () => Promise.resolve(), continueResults: continued },
  }, () => undefined);
  await host.start();
  callbacks?.peer('phone', { sendHost: () => true, bindIdentity() { /* fixture */ }, close() { /* fixture */ } });
  callbacks?.control('phone', { v: 1, t: 'hello', name: null });
  host.keyboard('open'); now += 1000; host.keyboard('next'); now += 1000; host.keyboard('next');
  callbacks?.dropped('phone');
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  expect(host.room.players.every(p => p.disconnectedAt !== null)).toBe(true);
  const key = (key: string) => ({ key, preventDefault() { /* fixture */ } }) as KeyboardEvent;
  hostResultsKey(key('Enter'), () => { host.continueResults(); }, () => { host.returnToPicker(); }); expect(continued).toHaveBeenCalledOnce();
  hostResultsKey(key('Escape'), () => { host.continueResults(); }, () => { host.returnToPicker(); }); expect(host.picker.screen).toBe('picker'); expect(host.room.phase).toBe('lobby');
  host.stop();
});

it('CTRL-009 clears held keys when the document becomes hidden', () => {
  const f = keyboardFixture(); f.key('d', 'KeyD');
  f.keyboard.visibility(false); expect(f.keyboard.held.has('KeyD')).toBe(true);
  f.keyboard.visibility(true); expect(f.keyboard.held.size).toBe(0);
});

it.each(['ctrlKey', 'metaKey', 'altKey'])('PLAT-024 modified J and L do not join or leave (%s)', modifier => {
  const join = vi.fn(), leave = vi.fn();
  const keyboard = hostKeyboard({ state: () => ({ phase: 'lobby', teams: false }), controls: () => [], active: () => null, join, leave, command() { /* fixture */ } });
  for (const code of ['KeyJ', 'KeyL']) keyboard.key({ type: 'keydown', key: code, code, [modifier]: true } as unknown as KeyboardEvent);
  expect(join).not.toHaveBeenCalled(); expect(leave).not.toHaveBeenCalled();
});

it('PLAT-024 routes lobby and picker keys without added controls', () => {
  let picker = 'lobby'; const commands: string[] = [];
  const keyboard = hostKeyboard({ state: () => ({ phase: 'lobby', teams: false, picker }), controls: () => [], active: () => null, join() { /* fixture */ }, leave() { /* fixture */ }, command: action => { commands.push(action); } });
  const key = (key: string, code = key) => { keyboard.key({ key, code, preventDefault() { /* fixture */ } } as KeyboardEvent); };
  key('Enter'); picker = 'picker'; key('ArrowLeft'); key('ArrowRight'); key('Enter'); picker = 'start'; key('Enter'); key('t', 'KeyT'); key('Escape');
  expect(commands).toEqual(['open', 'previous', 'next', 'select', 'start', 'teams-toggle', 'back']);
});
it('PLAT-024 focused pause actions own Enter and Space before screen-wide results', () => {
  const click = vi.fn(), again = vi.fn();
  const node = { click, matches: () => true } as unknown as HTMLElement;
  const keyboard = hostKeyboard({ state: () => ({ phase: 'paused', teams: false }), controls: () => [node], active: () => node, join() { /* fixture */ }, leave() { /* fixture */ }, command() { /* fixture */ } });
  vi.stubGlobal('document', { activeElement: node });
  try {
    for (const key of ['Enter', ' ']) {
      let defaultPrevented = false;
      const event = { key, preventDefault() { defaultPrevented = true; }, get defaultPrevented() { return defaultPrevented; } } as KeyboardEvent;
      keyboard.key(event); hostResultsKey(event, again, vi.fn());
    }
    expect(click).toHaveBeenCalledTimes(2); expect(again).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});

it.each(['Back to game picker', 'Play again'])('PLAT-024 focused %s Enter changes authoritative room and picker state', async label => {
  const host = createHost({
    clock: { now: () => 20000, schedule: () => 1, cancel() { /* fixture */ } },
    storage: { getItem: () => null, setItem() { /* fixture */ }, removeItem() { /* fixture */ } }, mintToken: () => crypto.randomUUID(),
    dial: () => Promise.resolve({ credentials: { code: 'H7KQ9MXR', hostToken: 'a'.repeat(32) }, reopened: false, stop() { /* fixture */ } }),
  }, () => undefined);
  await host.start();
  host.sessionEvent({ type: 'results', results: { mode: 'players', players: [] } });
  expect(host.room.phase).toBe('results');
  const node = { click: () => { if (label === 'Play again') host.playAgain(); else host.returnToPicker(); } } as unknown as HTMLElement;
  const keyboard = hostKeyboard({ state: () => ({ phase: host.room.phase, teams: false }), controls: () => [node], active: () => node, join() { /* fixture */ }, leave() { /* fixture */ }, command() { /* fixture */ } });
  const event = { key: 'Enter', preventDefault() { /* fixture */ } } as KeyboardEvent;
  // The Results target handler activates the focused action before window listeners.
  node.click(); keyboard.key(event);
  expect(host.room.phase).toBe('lobby');
  expect(host.picker.screen).toBe(label === 'Play again' ? 'start' : 'picker');
  host.stop();
});

it('PLAT-024 / CTRL-009 leaves results keys untouched and limits L to setup', () => {
  let phase: RoomState['phase'] = 'lobby';
  let seated = false;
  let picker = 'lobby';
  let teams = false;
  const leave = vi.fn();
  const keyboard = hostKeyboard({ state: () => ({ phase, teams, picker, localSeat: seated }), controls: () => [], active: () => null, join() { /* fixture */ }, leave, command() { /* fixture */ } });
  for (const next of ['playing', 'paused', 'results', 'lobby'] as const) {
    phase = next;
    keyboard.key({ key: 'l', code: 'KeyL' } as KeyboardEvent);
  }
  for (const screen of ['picker', 'start']) { picker = screen; keyboard.key({ key: 'l', code: 'KeyL' } as KeyboardEvent); }
  picker = 'starting'; keyboard.key({ key: 'l', code: 'KeyL' } as KeyboardEvent);
  teams = true; keyboard.key({ key: 'l', code: 'KeyL' } as KeyboardEvent); teams = false;
  expect(leave).toHaveBeenCalledTimes(3);
  phase = 'results';
  for (const key of ['Escape', 'Enter']) {
    const preventDefault = vi.fn();
    keyboard.key({ key, code: key, preventDefault } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
  }
  phase = 'playing';
  const preventDefault = vi.fn();
  keyboard.key({ key: 'd', code: 'KeyD', preventDefault } as unknown as KeyboardEvent);
  expect(keyboard.held.size).toBe(0); expect(preventDefault).not.toHaveBeenCalled();
  seated = true;
  keyboard.key({ key: 'd', code: 'KeyD', preventDefault } as unknown as KeyboardEvent);
  expect(keyboard.held.has('KeyD')).toBe(true); expect(preventDefault).toHaveBeenCalledOnce();
});
