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

export const phoneCopy = {
  rename: ['Change your name', ''],
  'name-not-sent': ['Your name could not be sent', 'Try again when connected.'],
  entry: ['Join the room on the TV', 'Enter the room code and your name.'],
  'invalid-code': ['Check the room code', 'Use the 8-character code on the TV.'],
  blank: ['Enter your name', 'Use 1 to 12 visible characters.'],
  'too-long': ['Your name is too long', 'Use 1 to 12 visible characters.'],
  'bad-characters': ['Check your name', 'Remove hidden characters or unsupported marks.'],
  connecting: ['Joining the room…', 'Connecting to the host.'],
  lobby: ["You’re in.", 'Waiting for the leader to pick a game.'],
  'name-taken': ['Name taken', 'The room has added a number to your name.'],
  'name-replaced': ['Your name was changed', 'The room has given you a neutral name.'],
  'room-full': ['This room is full', 'All 8 seats are taken. Try another room.'],
  'room-not-found': ['Room not found', 'Check the code on the TV and try again.'],
  'room-gone': ['This room has closed', 'Ask the host for a new room code.'],
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
  picker: PickerState | null; phase: RoomPhase; state: PhoneState; title: string; detail: string; code: string; name: string;
  seat: number | null; colour: string; leader: boolean; connected: boolean;
  notice: string; renaming: boolean; action: 'Join' | 'Join another room' | 'Join again' | 'Reload' | null;
}
export function phoneView(state: PhoneState, input: Partial<Pick<PhoneView, 'code' | 'name' | 'seat' | 'colour' | 'leader' | 'notice' | 'phase'>> = {}): PhoneView {
  if (['seat-expired', 'room-gone', 'waiting-for-lobby', 'left'].includes(state)) input = { ...input, seat: null, colour: '', leader: false };
  return { picker: null, phase: 'lobby', renaming: state === 'rename', code: '', name: '', seat: null, colour: '', leader: false, notice: '', ...input,
    state, title: phoneCopy[state][0], detail: state === 'lobby' && (input.phase === 'playing' || input.phase === 'paused') ? 'Watch the TV.' : state === 'lobby' && input.leader ? "Pick a game when everyone’s in." : phoneCopy[state][1], connected: state === 'lobby' || state === 'name-taken' || state === 'name-replaced' || (input.seat !== null && input.seat !== undefined && ['entry', 'invalid-code', 'blank', 'too-long', 'bad-characters', 'rename', 'name-not-sent'].includes(state)),
    action: ['entry', 'invalid-code', 'blank', 'too-long', 'bad-characters', 'left'].includes(state) ? 'Join'
      : ['room-full', 'room-not-found', 'room-gone', 'cannot-connect'].includes(state) ? 'Join another room'
      : state === 'hold-over' || state === 'seat-expired' ? 'Join again' : state === 'out-of-date' ? 'Reload' : null };
}
export interface PhoneDependencies {
  clock: ReconnectClock; storage: ReconnectStorage;
  dial(options: PhoneReconnectDial, feedback: { unreachable(): void; retryAfter(ms: number): void }): { stop(): void };
  lifecycle?: PhoneReconnectOptions['lifecycle'];
}
/** Credentials remain in C-05's closure/store; the view contains only public seat details. */
export function createPhone(deps: PhoneDependencies, codeQuery: string | null, changed: (view: PhoneView) => void) {
  const store = createPhoneSeatStore(deps.storage);
  let view = phoneView('entry', { code: codeQuery ?? '' });
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
    const next = phoneView(state, { ...view, ...input });
    if (!next.connected) naming = false;
    view = { ...next, picker: next.connected ? (input.picker ?? view.picker) : null, renaming: naming }; changed(view);
  }
  function message(message: HostMessage): void {
    if (message.t === 'seat') {
      naming = false; everSeated = true; failures = 0; allowedAt = 0; unavailable = false;
      const notice = message.nameReplaced ? 'Your name was changed by the room.' : !message.resumed && message.name !== requestedName ? 'Name taken. The room added a number to your name.' : '';
      publish(message.nameReplaced ? 'name-replaced' : notice ? 'name-taken' : 'lobby', { seat: message.seat, colour: `var(--ka-seat-${String(message.colour + 1)})`, name: message.name, notice });
    } else if (message.t === 'picker-state') publish(view.state, { picker: message });
    else if (message.t === 'room') publish(view.state, { leader: message.leader, phase: message.phase });
    else if (message.t === 'name-refused') {
      if (view.seat === null) { generation++; driver?.stop(); } else naming = true;
      publish(message.reason);
    }
  }
  function begin(code: string, name: string | null, restoring: boolean): void {
    generation++; driver?.stop(); naming = false; peer = undefined; const current = generation;
    requestedName = name ?? ''; unavailable = false;
    publish('connecting', { code, ...(restoring ? {} : { phase: 'lobby', name: name ?? '', seat: null, colour: '', leader: false, notice: '' }) });
    const created = createPhoneReconnect({ store, clock: deps.clock, attemptDelayMs: () => allowedAt - deps.clock.now(), initial: { code, nickname: name },
      ...(deps.lifecycle ? { lifecycle: deps.lifecycle } : {}),
      state(state: PhoneReconnectState) {
        if (current !== generation) return;
        if (state === 'back-in-seat') { if (view.seat !== null) publish('lobby'); return; } // Seat message supplies the public identity.
        const mapped = state === 'connecting' && unavailable ? 'unreachable' : state === 'connecting' && everSeated ? 'host-disconnected' : state === 'room-gone' && !everSeated ? 'room-not-found' : state;
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
    rejoin(): void { driver?.rejoin(); },
    leave(): void { driver?.leave(); },
    stop(): void { stopped = true; generation++; driver?.stop(); },
  };
}
