import { CLOSED_ROOM_REASON } from './team-setup';
import { checkLayout, checkPrivateView } from '@kaki/platform';
import type { PrivateView } from '@kaki/platform';
import { phoneThemes } from './phone-themes';
import type { Layout, LayoutOutput } from '@kaki/controller-kit';
import { teamSetupView } from './team-setup';
import type { TeamSetupView } from './team-setup';
import type { JsonValue } from '@kaki/platform';
import type { ThemeName, SeatNumber } from '@kaki/ui';
import { createPhoneReconnect, createPhoneSeatStore } from '@kaki/platform';
import type { PhoneReconnectDial, PhoneReconnectOptions, PhoneReconnectState, ReconnectClock, ReconnectStorage } from '@kaki/platform';
import { CODE_ALPHABET, CODE_LENGTH, checkNickname } from '@kaki/protocol';
import type { HostMessage, PhoneMessage, RoomPhase, PickerState, PickerInput } from '@kaki/protocol';
import { normaliseCode } from './join-link';

/** The host helper also accepts legacy wire codes; new phone joins use C-01's alphabet. */
export function normaliseJoinCode(code: string): string {
  let value = code;
  try { value = new URL(code).searchParams.get('code') ?? code; } catch { /* A manually typed code. */ }
  const clean = normaliseCode(value);
  return clean.length === CODE_LENGTH && Array.from(clean).every(char => CODE_ALPHABET.includes(char)) ? clean : '';
}

/** Host-private identities never enter the console's public player menu. */
function roomPlayers(value: JsonValue): NonNullable<PhoneView['players']> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.kind !== 'room-players' || !Array.isArray(value.players)) return null;
  const players: { seat: number; name: string }[] = [];
  for (const player of value.players) {
    if (!player || typeof player !== 'object' || Array.isArray(player) || typeof player.seat !== 'number' || typeof player.name !== 'string') return null;
    players.push({ seat: player.seat, name: player.name });
  }
  return players;
}

export const phoneCopy = {
  removed: ['You were removed from this game', "You can’t rejoin this room."],
  rename: ['Change your name', ''],
  'name-not-sent': ['Your name could not be sent', 'Try again when connected.'],
  entry: ['Join the room on the TV', 'Enter the room code and your name.'],
  'invalid-code': ['Check the room code', 'Use the 8-character code on the TV.'],
  blank: ['Enter your name', 'Use 1 to 12 visible characters.'],
  'too-long': ['Your name is too long', 'Use 1 to 12 visible characters.'],
  'bad-characters': ['Check your name', 'Remove hidden characters or unsupported marks.'],
  connecting: ['Joining the room…', 'Connecting to the host.'],
  'could-not-connect': ['This phone could not connect to the big screen.', 'Connect it to the same Wi-Fi as the big screen and scan again.'],
  lobby: ["You’re in.", 'Waiting for the leader to pick a game.'],
  'name-taken': ['Name taken', 'The room has added a number to your name.'],
  'name-replaced': ['Your name was changed', 'The room has given you a neutral name.'],
  'room-full': ['This room is full', 'All 8 seats are taken. Try another room.'],
  'room-not-found': ['Room not found', 'Check the code on the TV and try again.'],
  'room-gone': ['This room has closed', 'Join the new room on the TV.'],
  unreachable: ['Can’t reach the room', 'We’ll keep trying.'],
  'host-disconnected': ['Host disconnected', 'We’ll rejoin your seat when the host returns.'],
  replaced: ['You’re connected in another tab', 'Use that tab to stay in your seat.'],
  'hold-over': ['Your seat hold has ended', 'We’re still trying. You can also join again.'],
  'seat-expired': ['Your seat has expired', 'Join again to take a new seat.'],
  'waiting-for-lobby': ['Waiting for the lobby', 'You can join when the current game ends.'],
  'out-of-date': ['This page needs updating', 'Reload to use the current version.'],
  'cannot-connect': ['Cannot connect to this room', 'Check the code and try again.'],
  left: ['You’ve left the room', 'Enter a code to join a room.'],
} as const;
export type PhoneState = keyof typeof phoneCopy;
export interface PhoneView {
  players?: readonly { seat: number; name: string }[] | undefined;
  resultStats?: { label: string; value: string | number }[];
  gamePrivateView: PrivateView | null; gameLayout?: Layout | undefined; gameViewRevision?: number | undefined; teamSetup: TeamSetupView | null; layout: boolean; theme: ThemeName; picker: PickerState | null; phase: RoomPhase; state: PhoneState; title: string; detail: string; code: string; name: string;
  seat: number | null; colour: string; leader: boolean; connected: boolean;
  notice: string; renaming: boolean; action: 'Try again' | 'Join' | 'Join another room' | 'Join again' | 'Reload' | null;
}
export function phoneView(state: PhoneState, input: Partial<Pick<PhoneView, 'code' | 'name' | 'seat' | 'colour' | 'leader' | 'notice' | 'phase'>> = {}): PhoneView {
  if (['removed', 'seat-expired', 'room-gone', 'waiting-for-lobby', 'left'].includes(state)) input = { ...input, seat: null, colour: '', leader: false };
  return { gamePrivateView: null, teamSetup: null, layout: false, theme: 'console', picker: null, phase: 'lobby', renaming: state === 'rename', code: '', name: '', seat: null, colour: '', leader: false, notice: '', ...input,
    state, title: phoneCopy[state][0], detail: state === 'lobby' && (input.phase === 'playing' || input.phase === 'paused') ? 'Watch the TV.' : state === 'lobby' && input.leader ? "Pick a game when everyone’s in." : phoneCopy[state][1], connected: state === 'lobby' || state === 'name-taken' || state === 'name-replaced' || (input.seat !== null && input.seat !== undefined && ['entry', 'invalid-code', 'blank', 'too-long', 'bad-characters', 'rename', 'name-not-sent'].includes(state)),
    action: ['entry', 'invalid-code', 'blank', 'too-long', 'bad-characters', 'left'].includes(state) ? 'Join'
      : ['removed', 'room-full', 'room-not-found', 'room-gone', 'cannot-connect'].includes(state) ? 'Join another room'
      : state === 'could-not-connect' ? 'Try again' : state === 'hold-over' || state === 'seat-expired' ? 'Join again' : state === 'out-of-date' ? 'Reload' : null };
}
export interface PhoneDependencies {
  browserId?: string | undefined;
  clock: ReconnectClock; storage: ReconnectStorage;
  dial(options: PhoneReconnectDial, feedback: { unreachable(): void; retryAfter(ms: number): void }): { stop(): void };
  lifecycle?: PhoneReconnectOptions['lifecycle'];
}
/** Credentials remain in C-05's closure/store; the view contains only public seat details. */
export function createPhone(deps: PhoneDependencies, codeQuery: string | null, changed: (view: PhoneView) => void) {
  const store = createPhoneSeatStore(deps.storage);
  let view = phoneView('entry', { code: codeQuery ?? '' });
  let connectingTimer: unknown;
  function cancelConnecting(): void { deps.clock.cancel(connectingTimer); connectingTimer = undefined; }
  let driver: ReturnType<typeof createPhoneReconnect> | undefined;
  let stopped = false;
  let generation = 0;
  let failures = 0;
  let allowedAt = 0;
  let requestedName = '';
  let everSeated = false;
  let unavailable = false;
  let naming = false;
  let peer: { sendPhone(message: PhoneMessage): boolean } | undefined;
  function publish(state: PhoneState, input: Partial<PhoneView> = {}): void {
    if (stopped) return;
    // Signalling retries must not hide the advice; a host seat still proceeds normally.
    if (state === 'connecting' && view.state === 'could-not-connect') state = 'could-not-connect';
    if (state !== 'connecting') cancelConnecting();
    else if (connectingTimer === undefined) connectingTimer = deps.clock.schedule(() => {
      connectingTimer = undefined;
      if (view.state === 'connecting') publish('could-not-connect');
    }, 15000);
    const next = phoneView(state, { ...view, ...input });
    if (!next.connected) naming = false;
    view = { ...next, players: next.connected ? view.players : undefined, teamSetup: next.connected ? (input.teamSetup === undefined ? view.teamSetup : input.teamSetup) : null, layout: next.seat !== null && (input.layout ?? view.layout), picker: next.connected ? (input.picker ?? view.picker) : null, renaming: naming, gameLayout: input.gameLayout ?? view.gameLayout, gameViewRevision: input.gameViewRevision ?? view.gameViewRevision };
    if (view.seat === null || !view.connected) { view.gamePrivateView = null; view.resultStats = []; }
    view.theme = view.connected && !view.teamSetup && (view.picker?.screen === 'starting' || view.phase === 'playing' || view.phase === 'paused') ? phoneThemes[view.picker?.game?.id ?? ''] ?? 'console' : 'console';
    changed(view);
  }
  function message(message: HostMessage): void {
    if (message.t === 'view' && roomPlayers(message.view)) { view = { ...view, players: roomPlayers(message.view) ?? [] }; changed(view); }
    else if (message.t === 'seat') {
      naming = false; everSeated = true; failures = 0; allowedAt = 0; unavailable = false;
      const notice = message.nameReplaced ? 'Your name was changed by the room.' : !message.resumed && message.name !== requestedName ? 'Name taken. The room added a number to your name.' : '';
      publish(message.nameReplaced ? 'name-replaced' : notice ? 'name-taken' : 'lobby', { seat: message.seat, colour: `var(--ka-seat-${String(message.colour + 1)})`, name: message.name, notice });
    } else if (message.t === 'view') {
      const setup = teamSetupView(message.view);
      if (setup) publish(view.state, { gamePrivateView: null, gameViewRevision: message.rev, teamSetup: { ...setup, revision: message.rev } });
      else if (message.view === null) publish(view.state, { gamePrivateView: null, gameViewRevision: message.rev, teamSetup: null });
      else if (checkPrivateView(message.view).length === 0 && (!view.gamePrivateView || message.rev > view.gamePrivateView.revision)) {
        publish(view.state, { gamePrivateView: { ...message.view as unknown as PrivateView, revision: message.rev }, gameViewRevision: message.rev, teamSetup: null });
      }
    }
    else if (message.t === 'layout' && checkLayout(message.layout).length === 0) publish(view.state, { layout: true, gameLayout: message.layout as unknown as Layout });
    else if (message.t === 'picker-state' && message.screen === 'lobby' && message.reason === CLOSED_ROOM_REASON) publish('room-gone', { layout: false, picker: null });
    else if (message.t === 'picker-state') publish(view.state, { picker: message, ...(message.screen === 'picker' || message.screen === 'lobby' || message.screen === 'start' ? { layout: false, gamePrivateView: null } : {}) });
    else if (message.t === 'room') publish(view.state, { resultStats: message.phase === 'results' ? view.gamePrivateView?.blocks.flatMap(block => block.kind === 'stat' && (block.label === 'Place' || block.label === 'Score') ? [{ label: block.label, value: block.value }] : []) ?? (view.phase === 'results' ? view.resultStats ?? [] : []) : [], leader: message.leader, phase: message.phase, ...(message.phase === 'lobby' || message.phase === 'results' ? { layout: false, gamePrivateView: null } : {}) });
    else if (message.t === 'name-refused') {
      if (view.seat === null) { generation++; driver?.stop(); } else naming = true;
      publish(message.reason);
    }
  }
  function begin(code: string, name: string | null, restoring: boolean): void {
    cancelConnecting();
    generation++; driver?.stop(); naming = false; peer = undefined; const current = generation;
    requestedName = name ?? ''; unavailable = false;
    // A deliberate retry starts a new 15-second window, unlike automatic retries.
    view = { ...view, state: 'entry' };
    publish('connecting', { code, ...(restoring ? {} : { phase: 'lobby', name: name ?? '', seat: null, colour: '', leader: false, notice: '' }) });
    const created = createPhoneReconnect({ browserId: deps.browserId, store, clock: deps.clock, attemptDelayMs: () => allowedAt - deps.clock.now(), initial: { code, nickname: name },
      ...(deps.lifecycle ? { lifecycle: deps.lifecycle } : {}),
      state(state: PhoneReconnectState) {
        if (current !== generation) return;
        if (state === 'back-in-seat') { if (view.seat !== null) publish('lobby'); return; } // Seat message supplies the public identity.
        // No host has answered a fresh join yet: keep its connecting window running.
        // A phone that never had a seat has no hold to end: keep (or show) the advice instead (D-267).
        const mapped = state === 'hold-over' && !everSeated ? 'could-not-connect' : state === 'host-disconnected' && !everSeated ? 'connecting' : state === 'connecting' && unavailable ? 'unreachable' : state === 'connecting' && everSeated ? 'host-disconnected' : state === 'room-gone' && !everSeated ? 'room-not-found' : state;
        publish(mapped, state === 'left' ? { seat: null, colour: '', leader: false } : {});
      }, message: input => { if (current === generation) message(input); },
      dial(options) {
        let cancelled = false; let link: { stop(): void } | undefined; let timer: unknown;
        const start = (): void => {
          if (cancelled || current !== generation) return;
          link = deps.dial({ ...options, onPeer(next) { peer = next; options.onPeer(next); } }, {
            unreachable() {
              if (cancelled || current !== generation) return;
              unavailable = true;
              allowedAt = Math.max(allowedAt, deps.clock.now() + Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)));
              publish('unreachable');
            },
            retryAfter(ms) { if (cancelled || current !== generation) return; if (Number.isFinite(ms) && ms > 0) allowedAt = Math.max(allowedAt, deps.clock.now() + Math.min(30000, ms)); },
          });
        };
        const wait = allowedAt - deps.clock.now();
        if (wait > 0) { publish('unreachable'); timer = deps.clock.schedule(start, wait); } else start();
        return { stop() { cancelled = true; deps.clock.cancel(timer); link?.stop(); } };
      },
    });
    if (current === generation) driver = created; else created.stop();
  }
  const saved = store.read();
  const query = codeQuery === null ? '' : normaliseJoinCode(codeQuery);
  if (saved && (codeQuery === null || query === saved.code)) {
    everSeated = true; begin(saved.code, saved.nickname, true);
  } else {
    if (query && saved && query !== saved.code) store.clear();
    publish(codeQuery !== null && !query ? 'invalid-code' : 'entry', { code: query || (codeQuery ?? '') });
  }
  return {
    removePlayer(seat: number): void {
      if (view.connected && view.leader && seat !== view.seat) peer?.sendPhone({ v: 1, t: 'action', rev: 0, viewRev: null, data: { control: 'remove-player', seat } });
    },
    sessionCommand(action?: 'quit'): void {
      if (!view.connected || !view.layout || (view.phase !== 'playing' && !(view.phase === 'paused' && view.leader))) return;
      peer?.sendPhone({ v: 1, t: 'action', rev: view.gameLayout?.revision ?? 0, viewRev: view.gameViewRevision ?? 0, data: { control: action === 'quit' ? 'console-quit' : view.phase === 'paused' ? 'console-resume' : 'console-pause' } });
    },
    controllerInput(output: LayoutOutput): void {
      if (!view.connected || view.phase !== 'playing' || !view.layout || view.teamSetup || view.gameViewRevision === undefined || output.phase === 'release') return;
      const value = output.value;
      if (typeof value !== 'string' && typeof value !== 'number') return;
      peer?.sendPhone({ v: 1, t: 'action', rev: output.revision, viewRev: view.gameViewRevision, data: { control: output.control, value } });
    },
    teamInput(control: string, value?: string): void {
      if (view.connected && view.teamSetup) peer?.sendPhone({ v: 1, t: 'action', rev: 0, viewRev: view.teamSetup.revision, data: { control, ...(value === undefined ? {} : { value }) } });
    },
    settingInput(id: string, value: unknown): void {
      if (view.connected && view.leader && view.teamSetup) peer?.sendPhone({ v: 1, t: 'action', rev: 0, viewRev: view.teamSetup.revision, data: { control: 'setting', id, value: value as JsonValue } });
    },
    pickerInput(input: PickerInput): void {
      if (view.connected && view.leader && view.picker && !naming) peer?.sendPhone({ v: 1, t: 'picker-input', revision: view.picker.revision, input });
    },
    join(code: string, name: string): void {
      if (naming) return;
      const clean = normaliseJoinCode(code);
      if (!clean) { publish('invalid-code', { code, name }); return; }
      // The host trims before counting; the same validator warns here.
      const nickname = name.trim();
      const problem = checkNickname(nickname);
      if (problem !== 'ok') { publish(problem, { code: clean, name }); return; }
      if (store.read()?.code !== clean) store.clear();
      begin(clean, nickname, false);
    },
    changeName(): void { if (view.connected) { naming = true; publish('rename'); } },
    saveName(name: string): void {
      if (!naming) return;
      const nickname = name.trim();
      const problem = checkNickname(nickname);
      if (problem !== 'ok') { publish(problem); return; }
      requestedName = nickname;
      if (!peer?.sendPhone({ v: 1, t: 'set-name', name: nickname })) {
        publish('name-not-sent');
      }
    },
    cancelName(): void { if (naming) { naming = false; publish('lobby'); } },
    edit(): void { generation++; driver?.stop(); store.clear(); everSeated = false; publish('entry', { seat: null, colour: '', leader: false, notice: '' }); },
    retry(): void { if (view.state === 'could-not-connect') { failures = 0; allowedAt = 0; begin(view.code, requestedName || null, false); } },
    rejoin(): void { driver?.rejoin(); },
    leave(): void { driver?.leave(); },
    stop(): void { cancelConnecting(); stopped = true; generation++; driver?.stop(); },
  };
}

/** A disconnected held seat keeps its controller and shows reconnecting until the seat expires. */
export function phoneController(view: PhoneView) {
  return !view.teamSetup && view.layout && view.seat !== null ? { seat: view.seat as SeatNumber, name: view.name, theme: view.theme, link: view.connected ? 'connected' as const : view.state === 'host-disconnected' || view.state === 'unreachable' ? 'reconnecting' as const : 'lost' as const } : null;
}

export function offersTeamChoice(view: PhoneView): boolean {
  return view.leader && view.teamSetup?.screen === 'choice' && view.teamSetup.teamsOffered;
}
