import { describe, expect, it } from 'vitest';

import {
  decodeHostMessage,
  decodePhoneMessage,
  encodeHostMessage,
  encodePhoneMessage,
  validateHostMessage,
  validatePhoneMessage,
} from './channel';
import type { HostMessage, PhoneMessage } from './channel';
import type { Json } from './check';
import { canAskToJoin, ROOM_PHASES } from './channel';
import { checkNickname } from './names';
import { utf8Length } from './check';
import {
  MAX_ACTION_BYTES,
  MAX_CANDIDATE_BYTES,
  MAX_CHANNEL_BYTES,
  MAX_ICE_SERVERS,
  MAX_ICE_TEXT_CHARS,
  MAX_ICE_URLS,
  MAX_JSON_DEPTH,
  MAX_LAYOUT_BYTES,
  MAX_SDP_BYTES,
  MAX_SIGNAL_BYTES,
  MAX_VIEW_BYTES,
  PROTOCOL_VERSION,
} from './limits';
import type { Result } from './result';
import {
  decodeHostSignal,
  decodeOpeningSignal,
  decodePhoneSignal,
  decodeToHostSignal,
  decodeToPhoneSignal,
  encodeSignal,
  SIGNAL_PING_TEXT,
  SIGNAL_PONG_TEXT,
  validateHostSignal,
  validateOpeningSignal,
  validatePhoneSignal,
  validateToHostSignal,
  validateToPhoneSignal,
} from './signal';
import type {
  AnySignal,
  HostHandshakeStep,
  HostSignal,
  IceGrant,
  OpeningSignal,
  PhoneHandshakeStep,
  PhoneSignal,
  ToHostSignal,
  ToPhoneSignal,
} from './signal';

const v = PROTOCOL_VERSION;

/** One sample per message type. A type with no sample does not compile. */
type Samples<M extends { t: string }> = { readonly [T in M['t']]: Extract<M, { t: T }> };

const HOST_TOKEN = 'host_0123456789abcdef';
const ROOM_TOKEN = 'room-0123456789ABCDEF';
const SEAT_TOKEN = 'seat-0123456789abcdef';
const SDP = 'v=0\r\no=- 46117317 2 IN IP4 127.0.0.1\r\ns=-\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';

const offer: HostHandshakeStep = { kind: 'offer', sdp: SDP };
const answer: PhoneHandshakeStep = { kind: 'answer', sdp: SDP };
const candidate: HostHandshakeStep = {
  kind: 'candidate',
  candidate: 'candidate:1 1 udp 2122260223 192.168.1.20 54321 typ host',
  mid: '0',
  mLineIndex: 0,
};

const ice: IceGrant = {
  servers: [
    { urls: ['stun:stun.example.test:3478'], username: null, credential: null },
    {
      urls: ['turn:turn.example.test:3478?transport=udp', 'turns:turn.example.test:5349'],
      username: 'user-1',
      credential: 'secret-1',
    },
  ],
  ttlS: 3600,
  relay: 'available',
};

const openingSamples: Samples<OpeningSignal> = {
  create: { v, t: 'create' },
  reopen: { v, t: 'reopen', code: 'K4KI', hostToken: HOST_TOKEN },
  join: { v, t: 'join', code: 'K4KI', roomToken: ROOM_TOKEN },
};

const hostSignalSamples: Samples<HostSignal> = {
  'to-phone': { v, t: 'to-phone', peer: 'p-7', step: offer },
  relay: { v, t: 'relay' },
  drop: { v, t: 'drop', peer: 'p-9', reason: 'room-full' },
  'close-room': { v, t: 'close-room' },
  ping: { v, t: 'ping' },
};

const phoneSignalSamples: Samples<PhoneSignal> = {
  'to-host': { v, t: 'to-host', step: answer },
  relay: { v, t: 'relay' },
  ping: { v, t: 'ping' },
};

const toHostSamples: Samples<ToHostSignal> = {
  created: { v, t: 'created', code: 'K4KI', hostToken: HOST_TOKEN, reopened: false, ice },
  'peer-joined': { v, t: 'peer-joined', peer: 'p-7' },
  'peer-left': { v, t: 'peer-left', peer: 'p-7' },
  'from-phone': { v, t: 'from-phone', peer: 'p-7', step: { kind: 'candidates-done' } },
  ice: { v, t: 'ice', ice: { servers: [], ttlS: 0, relay: 'limit-reached' } },
  error: { v, t: 'error', code: 'rate-limited', retryAfterS: 30 },
  pong: { v, t: 'pong' },
};

const toPhoneSamples: Samples<ToPhoneSignal> = {
  joined: { v, t: 'joined', peer: 'p-7', roomToken: ROOM_TOKEN, hostPresent: true, ice },
  host: { v, t: 'host', present: false },
  'from-host': { v, t: 'from-host', step: candidate },
  ice: { v, t: 'ice', ice },
  dropped: { v, t: 'dropped', reason: 'room-closed' },
  error: { v, t: 'error', code: 'room-not-found', retryAfterS: null },
  pong: { v, t: 'pong' },
};

// For the tests of field rules, where the role is beside the point: whichever role's validator
// knows the message type decides.
function anyOf(validators: ((value: unknown) => Result<AnySignal>)[]): (value: unknown) => Result<AnySignal> {
  return (value) => {
    let last: Result<AnySignal> = { ok: false, error: { code: 'unknown-type', field: 't' } };
    for (const validate of validators) {
      const result = validate(value);
      if (result.ok || result.error.code !== 'unknown-type') return result;
      last = result;
    }
    return last;
  };
}
const validateClientSignal = anyOf([validateOpeningSignal, validateHostSignal, validatePhoneSignal]);
const validateServerSignal = anyOf([validateToHostSignal, validateToPhoneSignal]);
const decodeClientSignal = anyOf([decodeOpeningSignal, decodeHostSignal, decodePhoneSignal]);
const decodeServerSignal = anyOf([decodeToHostSignal, decodeToPhoneSignal]);
const encodeClientSignal = encodeSignal;
const encodeServerSignal = encodeSignal;
type ClientSignal = OpeningSignal | HostSignal | PhoneSignal;
type ServerSignal = ToHostSignal | ToPhoneSignal;

const layout: Json = { parts: ['stick', 'a', 'b', 'start'], panel: null };
const view: Json = { kind: 'cards', cards: ['7♠', 'K♥'], prompt: 'Pick two' };

const phoneSamples: Samples<PhoneMessage> = {
  hello: { v, t: 'hello', name: 'Ah Beng' },
  resume: { v, t: 'resume', seatToken: SEAT_TOKEN },
  'set-name': { v, t: 'set-name', name: 'Mei 🍜' },
  action: { v, t: 'action', rev: 4, viewRev: 9, data: { choice: 2 } },
  control: { v, t: 'control', request: 'pause' },
  leave: { v, t: 'leave' },
};

const hostSamples: Samples<HostMessage> = {
  seat: {
    v,
    t: 'seat',
    seat: 3,
    colour: 2,
    name: 'Ah Beng',
    nameReplaced: false,
    seatToken: SEAT_TOKEN,
    resumed: false,
  },
  refused: { v, t: 'refused', reason: 'room-full' },
  'name-refused': { v, t: 'name-refused', reason: 'too-long' },
  room: { v, t: 'room', phase: 'lobby', players: 5, leader: true, team: { id: 1, name: 'Blue' } },
  layout: { v, t: 'layout', rev: 4, layout },
  view: { v, t: 'view', rev: 9, view },
  link: { v, t: 'link', quality: 'relayed', rttMs: 84 },
  close: { v, t: 'close', reason: 'replaced' },
};

/** More samples: the same types with their optional parts absent or at an edge. */
const moreOpening: OpeningSignal[] = [{ v, t: 'join', code: 'ABCD2345', roomToken: null }];
const moreHostSignal: HostSignal[] = [
  { v, t: 'to-phone', peer: 'p-7', step: { kind: 'candidates-done' } },
  { v, t: 'to-phone', peer: 'p-7', step: candidate },
  { v, t: 'drop', peer: 'p-7', reason: 'room-closed' },
];
const morePhoneSignal: PhoneSignal[] = [
  { v, t: 'to-host', step: { kind: 'candidate', candidate: '', mid: null, mLineIndex: null } },
  { v, t: 'to-host', step: { kind: 'answer', sdp: 'x'.repeat(MAX_SDP_BYTES) } },
];
const moreToHost: ToHostSignal[] = [
  { v, t: 'created', code: 'K4KI', hostToken: HOST_TOKEN, reopened: true, ice: { servers: [], ttlS: 0, relay: 'off' } },
  { v, t: 'error', code: 'room-not-found', retryAfterS: null },
  { v, t: 'from-phone', peer: 'p-7', step: answer },
];
const moreToPhone: ToPhoneSignal[] = [
  { v, t: 'host', present: true },
  { v, t: 'from-host', step: offer },
  { v, t: 'dropped', reason: 'room-full' },
];
const morePhone: PhoneMessage[] = [
  { v, t: 'hello', name: null },
  { v, t: 'hello', name: '' },
  { v, t: 'action', rev: 0, viewRev: null, data: null },
  { v, t: 'action', rev: 0xffff_ffff, viewRev: 0xffff_ffff, data: 'x'.repeat(MAX_ACTION_BYTES - 2) },
];
const moreHost: HostMessage[] = [
  { v, t: 'room', phase: 'paused', players: 1, leader: false, team: null },
  { v, t: 'room', phase: 'lobby', players: 0, leader: false, team: null },
  { v, t: 'name-refused', reason: 'blank' },
  { v, t: 'name-refused', reason: 'bad-characters' },
  { v, t: 'view', rev: 0, view: null },
  { v, t: 'link', quality: 'good', rttMs: null },
  { v, t: 'layout', rev: 1, layout: 'x'.repeat(MAX_LAYOUT_BYTES - 2) },
  { v, t: 'view', rev: 1, view: 'x'.repeat(MAX_VIEW_BYTES - 2) },
];

interface Family<M> {
  readonly name: string;
  readonly samples: readonly M[];
  readonly maxBytes: number;
  readonly encode: (message: M) => string;
  readonly decode: (data: unknown) => Result<M>;
  readonly validate: (value: unknown) => Result<M>;
}

function family<M>(
  name: string,
  samples: readonly M[],
  maxBytes: number,
  encode: (message: M) => string,
  decode: (data: unknown) => Result<M>,
  validate: (value: unknown) => Result<M>,
): Family<unknown> {
  return { name, samples, maxBytes, encode, decode, validate } as unknown as Family<unknown>;
}

const families: Family<unknown>[] = [
  family(
    'signalling: the first message on a socket',
    [...Object.values(openingSamples), ...moreOpening],
    MAX_SIGNAL_BYTES,
    encodeSignal,
    decodeOpeningSignal,
    validateOpeningSignal,
  ),
  family(
    'signalling: host → pairing server',
    [...Object.values(hostSignalSamples), ...moreHostSignal],
    MAX_SIGNAL_BYTES,
    encodeSignal,
    decodeHostSignal,
    validateHostSignal,
  ),
  family(
    'signalling: phone → pairing server',
    [...Object.values(phoneSignalSamples), ...morePhoneSignal],
    MAX_SIGNAL_BYTES,
    encodeSignal,
    decodePhoneSignal,
    validatePhoneSignal,
  ),
  family(
    'signalling: pairing server → host',
    [...Object.values(toHostSamples), ...moreToHost],
    MAX_SIGNAL_BYTES,
    encodeSignal,
    decodeToHostSignal,
    validateToHostSignal,
  ),
  family(
    'signalling: pairing server → phone',
    [...Object.values(toPhoneSamples), ...moreToPhone],
    MAX_SIGNAL_BYTES,
    encodeSignal,
    decodeToPhoneSignal,
    validateToPhoneSignal,
  ),
  family(
    'data channel: phone → host',
    [...Object.values(phoneSamples), ...morePhone],
    MAX_CHANNEL_BYTES,
    encodePhoneMessage,
    decodePhoneMessage,
    validatePhoneMessage,
  ),
  family(
    'data channel: host → phone',
    [...Object.values(hostSamples), ...moreHost],
    MAX_CHANNEL_BYTES,
    encodeHostMessage,
    decodeHostMessage,
    validateHostMessage,
  ),
];

function errorOf(result: Result<unknown>): string {
  return result.ok ? 'accepted' : `${result.error.code}${result.error.field === null ? '' : `:${result.error.field}`}`;
}

function typeOf(message: unknown): string {
  return (message as { t: string }).t;
}

/** A small seeded generator (mulberry32), so a failure can be repeated. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe.each(families)('$name', ({ samples, maxBytes, encode, decode, validate }) => {
  it.each(samples.map((sample) => [typeOf(sample), sample] as const))(
    '%s round-trips',
    (_type, sample) => {
      const text = encode(sample);
      expect(decode(text)).toEqual({ ok: true, value: sample });
      expect(validate(sample)).toEqual({ ok: true, value: sample });
      // And again from the decoded value: encoding is stable.
      const decoded = decode(text);
      expect(decoded.ok && encode(decoded.value)).toBe(text);
    },
  );

  it('returns a copy and drops fields the type does not define', () => {
    for (const sample of samples) {
      const withExtra = { ...(sample as Record<string, unknown>), extra: 'x', secret: { a: 1 } };
      const result = validate(withExtra);
      expect(result).toEqual({ ok: true, value: sample });
      expect(result.ok && result.value).not.toBe(withExtra);
    }
  });

  it('refuses a wrong or missing version', () => {
    for (const sample of samples) {
      for (const version of [0, 2, '1', null, undefined, 1.5]) {
        const changed = { ...(sample as Record<string, unknown>), v: version };
        expect(errorOf(validate(changed))).toBe('bad-version:v');
        expect(errorOf(decode(JSON.stringify(changed)))).toBe('bad-version:v');
      }
    }
  });

  it('refuses an unknown or missing type', () => {
    for (const type of ['nope', '', 'Hello', 'constructor', 'toString', '__proto__', 'hasOwnProperty', 7, null, undefined, {}, ['hello']]) {
      expect(errorOf(validate({ v, t: type }))).toBe('unknown-type:t');
    }
    expect(errorOf(decode(`{"v":${String(v)}}`))).toBe('unknown-type:t');
  });

  it('refuses things that are not message objects', () => {
    for (const value of [null, undefined, 0, 1, 'text', true, [], [{ v, t: 'ping' }], () => 1, Symbol('s')]) {
      expect(errorOf(validate(value))).toBe('not-object');
    }
    for (const text of ['null', '7', '"hello"', '[]', 'true']) {
      expect(errorOf(decode(text))).toBe('not-object');
    }
  });

  it('refuses text that is not JSON, and data that is not text', () => {
    for (const text of ['', '{', '{"v":1,"t":', 'undefined', "{'v':1}", '\u0000', 'NaN']) {
      expect(errorOf(decode(text))).toBe('not-json');
    }
    for (const data of [null, undefined, 7, {}, [], new Uint8Array(4), new ArrayBuffer(4)]) {
      expect(errorOf(decode(data))).toBe('not-text');
    }
  });

  it('refuses a message over the size cap, measured in bytes', () => {
    const first = samples[0];
    const padded = (padding: string): string => JSON.stringify({ ...(first as Record<string, unknown>), pad: padding });
    const base = padded('').length;
    expect(decode(padded('x'.repeat(maxBytes - base))).ok).toBe(true);
    expect(errorOf(decode(padded('x'.repeat(maxBytes - base + 1))))).toBe('too-large');
    // Fewer characters than the cap, more bytes than the cap.
    const wide = padded('漢'.repeat(Math.ceil(maxBytes / 3)));
    expect(wide.length).toBeLessThan(maxBytes);
    expect(errorOf(decode(wide))).toBe('too-large');
    expect(errorOf(decode(' '.repeat(1_000_000)))).toBe('too-large');
  });

  it('refuses a message when any one field is removed or given the wrong kind of value', () => {
    let checked = 0;
    for (const sample of samples) {
      const record = sample as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        if (key === 'v' || key === 't') continue;
        const value = record[key];
        // Removing a field is allowed only where `null` means "absent".
        const without = Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
        const removed = validate(without);
        if (removed.ok) {
          expect((removed.value as Record<string, unknown>)[key], `${typeOf(sample)}.${key}`).toBeNull();
        } else {
          expect(errorOf(removed), `${typeOf(sample)}.${key}`).toBe(`bad-field:${key}`);
        }
        // A value of another kind is refused. Opaque payloads accept any JSON, so they are
        // given something JSON cannot carry.
        const opaque = key === 'data' || key === 'layout' || key === 'view';
        const wrong: unknown[] = opaque
          ? [NaN, () => 1, 10n]
          : [
              // Where `null` is allowed the field may be a string or a number, so no guess here.
              value === null ? true : typeof value === 'string' ? 7 : 'x',
              typeof value === 'boolean' ? 'true' : true,
              [[]],
              { nested: {} },
            ];
        for (const replacement of wrong) {
          const result = validate({ ...record, [key]: replacement });
          expect(errorOf(result), `${typeOf(sample)}.${key} = ${String(replacement)}`).toBe(`bad-field:${key}`);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('survives an object that throws when read', () => {
    const throwing = new Proxy(
      {},
      {
        get: () => {
          throw new Error('trap');
        },
      },
    );
    expect(validate(throwing).ok).toBe(false);
    const first = samples[0] as Record<string, unknown>;
    const getter = { v, t: first.t };
    Object.defineProperty(getter, 'code', {
      enumerable: true,
      get: () => {
        throw new Error('getter');
      },
    });
    expect(() => validate(getter)).not.toThrow();
  });
});

describe('signalling: field rules', () => {
  it('room codes, tokens and peer ids must have their shape', () => {
    expect(errorOf(validateClientSignal({ v, t: 'join', code: 'k4ki', roomToken: null }))).toBe('bad-field:code');
    expect(errorOf(validateClientSignal({ v, t: 'join', code: 'K4KI-TOO-LONG', roomToken: null }))).toBe('too-large:code');
    expect(errorOf(validateClientSignal({ v, t: 'join', code: 'K4KI', roomToken: 'short' }))).toBe('bad-field:roomToken');
    expect(errorOf(validateClientSignal({ v, t: 'reopen', code: 'K4KI', hostToken: 'has spaces in it!!' }))).toBe('bad-field:hostToken');
    expect(errorOf(validateClientSignal({ v, t: 'drop', peer: 'p 7', reason: 'room-full' }))).toBe('bad-field:peer');
    expect(errorOf(validateClientSignal({ v, t: 'drop', peer: 'p-7', reason: 'kicked' }))).toBe('bad-field:reason');
    expect(errorOf(validateClientSignal({ v, t: 'drop', peer: 'p-7', reason: 'bored' }))).toBe('bad-field:reason');
  });

  it('handshake steps are bounded and of a known kind', () => {
    const send = (step: unknown): string => errorOf(validateClientSignal({ v, t: 'to-host', step }));
    expect(send({ kind: 'answer', sdp: 'x'.repeat(MAX_SDP_BYTES + 1) })).toBe('too-large:step');
    expect(send({ kind: 'answer', sdp: '' })).toBe('bad-field:step');
    expect(send({ kind: 'answer' })).toBe('bad-field:step');
    expect(send({ kind: 'rollback', sdp: SDP })).toBe('bad-field:step');
    expect(send({ kind: 'candidate', candidate: 'x'.repeat(MAX_CANDIDATE_BYTES), mid: null, mLineIndex: null })).toBe('accepted');
    expect(send({ kind: 'candidate', candidate: 'x'.repeat(MAX_CANDIDATE_BYTES + 1), mid: null, mLineIndex: null })).toBe('too-large:step');
    expect(send({ kind: 'candidate', candidate: 'c', mid: null, mLineIndex: -1 })).toBe('bad-field:step');
    expect(send({ kind: 'candidate', candidate: 'c', mid: 'has space', mLineIndex: 0 })).toBe('bad-field:step');
    expect(send('answer')).toBe('bad-field:step');
  });

  it('a session description is capped in bytes as sent, not in characters', () => {
    const send = (sdp: string): string => errorOf(validateClientSignal({ v, t: 'to-host', step: { kind: 'answer', sdp } }));
    // Each line break is two characters but four bytes once JSON has escaped it.
    const lines = 'a=x\r\n';
    const fits = lines.repeat(Math.floor(MAX_SDP_BYTES / 7));
    expect(fits.length).toBeLessThan(MAX_SDP_BYTES);
    expect(send(fits)).toBe('accepted');
    const over = lines.repeat(Math.floor(MAX_SDP_BYTES / 7) + 1);
    expect(over.length).toBeLessThan(MAX_SDP_BYTES);
    expect(send(over)).toBe('too-large:step');
    expect(send('漢'.repeat(Math.floor(MAX_SDP_BYTES / 3)))).toBe('accepted');
    expect(send('漢'.repeat(Math.floor(MAX_SDP_BYTES / 3) + 1))).toBe('too-large:step');
  });

  it('the host offers and the phone answers: the other way round is refused', () => {
    const anOffer = { kind: 'offer', sdp: SDP };
    const anAnswer = { kind: 'answer', sdp: SDP };
    expect(errorOf(validateClientSignal({ v, t: 'to-host', step: anOffer }))).toBe('bad-field:step');
    expect(errorOf(validateClientSignal({ v, t: 'to-host', step: anAnswer }))).toBe('accepted');
    expect(errorOf(validateClientSignal({ v, t: 'to-phone', peer: 'p-7', step: anAnswer }))).toBe('bad-field:step');
    expect(errorOf(validateClientSignal({ v, t: 'to-phone', peer: 'p-7', step: anOffer }))).toBe('accepted');
    expect(errorOf(validateServerSignal({ v, t: 'from-host', step: anAnswer }))).toBe('bad-field:step');
    expect(errorOf(validateServerSignal({ v, t: 'from-host', step: anOffer }))).toBe('accepted');
    expect(errorOf(validateServerSignal({ v, t: 'from-phone', peer: 'p-7', step: anOffer }))).toBe('bad-field:step');
    expect(errorOf(validateServerSignal({ v, t: 'from-phone', peer: 'p-7', step: anAnswer }))).toBe('accepted');
    // Candidates go both ways.
    for (const step of [candidate, { kind: 'candidates-done' }]) {
      expect(errorOf(validateClientSignal({ v, t: 'to-host', step }))).toBe('accepted');
      expect(errorOf(validateClientSignal({ v, t: 'to-phone', peer: 'p-7', step }))).toBe('accepted');
    }
  });

  it('an ICE grant is bounded', () => {
    const grant = (change: Partial<Record<keyof IceGrant, unknown>>): string =>
      errorOf(validateServerSignal({ v, t: 'ice', ice: { ...ice, ...change } }));
    const server = (change: Record<string, unknown>): string =>
      grant({ servers: [{ urls: ['stun:a'], username: null, credential: null, ...change }] });
    expect(grant({})).toBe('accepted');
    expect(grant({ relay: 'maybe' })).toBe('bad-field:ice');
    expect(grant({ ttlS: -1 })).toBe('bad-field:ice');
    expect(grant({ ttlS: 1.5 })).toBe('bad-field:ice');
    expect(grant({ servers: Array.from({ length: MAX_ICE_SERVERS + 1 }, () => ice.servers[0]) })).toBe('too-large:ice');
    expect(server({ urls: Array.from({ length: MAX_ICE_URLS + 1 }, () => 'stun:a') })).toBe('too-large:ice');
    expect(server({ urls: ['x'.repeat(MAX_ICE_TEXT_CHARS + 1)] })).toBe('too-large:ice');
    expect(server({ urls: 'stun:a' })).toBe('bad-field:ice');
    expect(server({ urls: [''] })).toBe('bad-field:ice');
    expect(server({ urls: [] })).toBe('bad-field:ice');
    expect(server({ urls: ['stun:a b'] })).toBe('bad-field:ice');
    expect(server({ urls: ['stun:é'] })).toBe('bad-field:ice');
    expect(server({ credential: 'line\nbreak' })).toBe('bad-field:ice');
    expect(server({ username: 'x'.repeat(MAX_ICE_TEXT_CHARS + 1) })).toBe('too-large:ice');
  });

  it('every message at its largest fits the message cap', () => {
    const longest = '~'.repeat(MAX_ICE_TEXT_CHARS);
    const fullGrant: IceGrant = {
      servers: Array.from({ length: MAX_ICE_SERVERS }, () => ({
        urls: Array.from({ length: MAX_ICE_URLS }, () => longest),
        username: longest,
        credential: longest,
      })),
      ttlS: 86_400,
      relay: 'limit-reached',
    };
    const code = 'ABCD2345';
    const longToken = 'T'.repeat(128);
    const peer = 'p'.repeat(32);
    const widestSdp = '漢'.repeat(Math.floor(MAX_SDP_BYTES / 3));
    const biggestServer: ServerSignal[] = [
      { v, t: 'created', code, hostToken: longToken, reopened: false, ice: fullGrant },
      { v, t: 'joined', peer, roomToken: longToken, hostPresent: false, ice: fullGrant },
      { v, t: 'ice', ice: fullGrant },
      { v, t: 'from-phone', peer, step: { kind: 'answer', sdp: widestSdp } },
      { v, t: 'from-host', step: { kind: 'offer', sdp: '\u0001'.repeat(Math.floor(MAX_SDP_BYTES / 6)) } },
      { v, t: 'from-host', step: { kind: 'candidate', candidate: '"'.repeat(MAX_CANDIDATE_BYTES / 2), mid: '~'.repeat(16), mLineIndex: 255 } },
    ];
    for (const message of biggestServer) {
      const text = encodeServerSignal(message);
      expect(utf8Length(text), message.t).toBeLessThanOrEqual(MAX_SIGNAL_BYTES);
      expect(decodeServerSignal(text), message.t).toEqual({ ok: true, value: message });
    }
    expect(utf8Length(encodeServerSignal({ v, t: 'ice', ice: fullGrant }))).toBeLessThan(7_000);
    const biggestClient: ClientSignal[] = [
      { v, t: 'to-phone', peer, step: { kind: 'offer', sdp: widestSdp } },
      { v, t: 'to-host', step: { kind: 'answer', sdp: widestSdp } },
      { v, t: 'reopen', code, hostToken: longToken },
    ];
    for (const message of biggestClient) {
      const text = encodeClientSignal(message);
      expect(utf8Length(text), message.t).toBeLessThanOrEqual(MAX_SIGNAL_BYTES);
      expect(decodeClientSignal(text), message.t).toEqual({ ok: true, value: message });
    }
    const biggestHost: HostMessage[] = [
      { v, t: 'view', rev: 0xffff_ffff, view: '漢'.repeat(Math.floor((MAX_VIEW_BYTES - 2) / 3)) },
      { v, t: 'layout', rev: 0xffff_ffff, layout: '漢'.repeat(Math.floor((MAX_LAYOUT_BYTES - 2) / 3)) },
      { v, t: 'seat', seat: 8, colour: 7, name: '🍜'.repeat(12), nameReplaced: true, seatToken: longToken, resumed: true },
    ];
    for (const message of biggestHost) {
      const text = encodeHostMessage(message);
      expect(utf8Length(text), message.t).toBeLessThanOrEqual(MAX_CHANNEL_BYTES);
      expect(decodeHostMessage(text), message.t).toEqual({ ok: true, value: message });
    }
    const biggestAction: PhoneMessage = { v, t: 'action', rev: 0xffff_ffff, viewRev: 0xffff_ffff, data: '漢'.repeat(Math.floor((MAX_ACTION_BYTES - 2) / 3)) };
    expect(decodePhoneMessage(encodePhoneMessage(biggestAction))).toEqual({ ok: true, value: biggestAction });
  });

  it('a server error carries a known code', () => {
    expect(errorOf(validateServerSignal({ v, t: 'error', code: 'on-fire', retryAfterS: null }))).toBe('bad-field:code');
    expect(errorOf(validateServerSignal({ v, t: 'error', code: 'rate-limited', retryAfterS: -5 }))).toBe('bad-field:retryAfterS');
  });

  it('each role is allowed only its own messages', () => {
    const roles = [
      { name: 'opening', validate: validateOpeningSignal, samples: Object.values(openingSamples) as AnySignal[] },
      { name: 'host', validate: validateHostSignal, samples: Object.values(hostSignalSamples) as AnySignal[] },
      { name: 'phone', validate: validatePhoneSignal, samples: Object.values(phoneSignalSamples) as AnySignal[] },
      { name: 'to host', validate: validateToHostSignal, samples: Object.values(toHostSamples) as AnySignal[] },
      { name: 'to phone', validate: validateToPhoneSignal, samples: Object.values(toPhoneSamples) as AnySignal[] },
    ];
    // The only types two roles share: either side may ask for ICE servers and ping; either
    // side may be sent ICE servers, an error and a pong.
    const shared = new Set(['host/phone:relay', 'host/phone:ping', 'to host/to phone:ice', 'to host/to phone:error', 'to host/to phone:pong']);
    let refused = 0;
    for (const from of roles) {
      for (const sample of from.samples) {
        for (const to of roles) {
          const result = errorOf(to.validate(sample));
          const pair = [from.name, to.name].sort().join('/');
          if (from === to || shared.has(`${pair}:${sample.t}`)) {
            expect(result, `${sample.t} from ${from.name} read as ${to.name}`).toBe('accepted');
          } else {
            expect(result, `${sample.t} from ${from.name} read as ${to.name}`).toBe('unknown-type:t');
            refused += 1;
          }
        }
      }
    }
    expect(refused).toBeGreaterThan(80);
  });

  it('a phone socket cannot do what only a host may', () => {
    for (const message of [
      { v, t: 'to-phone', peer: 'p-7', step: offer },
      { v, t: 'drop', peer: 'p-7', reason: 'room-full' },
      { v, t: 'close-room' },
      { v, t: 'reopen', code: 'K4KI', hostToken: HOST_TOKEN },
      { v, t: 'create' },
    ]) {
      expect(errorOf(validatePhoneSignal(message)), message.t).toBe('unknown-type:t');
      expect(errorOf(decodePhoneSignal(JSON.stringify(message))), message.t).toBe('unknown-type:t');
    }
    // And a host socket cannot answer for a phone.
    expect(errorOf(validateHostSignal({ v, t: 'to-host', step: answer }))).toBe('unknown-type:t');
  });

  it('the opening message is sent once: the role decoders refuse a second', () => {
    for (const sample of Object.values(openingSamples)) {
      expect(errorOf(validateOpeningSignal(sample)), sample.t).toBe('accepted');
      expect(errorOf(validateHostSignal(sample)), sample.t).toBe('unknown-type:t');
      expect(errorOf(validatePhoneSignal(sample)), sample.t).toBe('unknown-type:t');
    }
    // And nothing but an opening message is taken first.
    for (const sample of [...Object.values(hostSignalSamples), ...Object.values(phoneSignalSamples)]) {
      expect(errorOf(validateOpeningSignal(sample)), sample.t).toBe('unknown-type:t');
    }
  });

  it('the keep-alive texts are fixed and decode for both roles', () => {
    expect(SIGNAL_PING_TEXT).toBe('{"v":1,"t":"ping"}');
    expect(SIGNAL_PONG_TEXT).toBe('{"v":1,"t":"pong"}');
    expect(decodeHostSignal(SIGNAL_PING_TEXT)).toEqual({ ok: true, value: { v, t: 'ping' } });
    expect(decodePhoneSignal(SIGNAL_PING_TEXT)).toEqual({ ok: true, value: { v, t: 'ping' } });
    expect(decodeToHostSignal(SIGNAL_PONG_TEXT)).toEqual({ ok: true, value: { v, t: 'pong' } });
    expect(decodeToPhoneSignal(SIGNAL_PONG_TEXT)).toEqual({ ok: true, value: { v, t: 'pong' } });
  });
});

describe('data channel: field rules', () => {
  it('a name a phone asks for is only checked for size, so the host can say why it will not do', () => {
    for (const name of ['abcdefghijklm', '   ', 'ab\u202ecd', 'a\u200bb', '', '!!!']) {
      expect(errorOf(validatePhoneMessage({ v, t: 'hello', name })), JSON.stringify(name)).toBe('accepted');
      expect(errorOf(validatePhoneMessage({ v, t: 'set-name', name })), JSON.stringify(name)).toBe('accepted');
      expect(checkNickname(name), JSON.stringify(name)).not.toBe('ok');
    }
    expect(errorOf(validatePhoneMessage({ v, t: 'hello', name: 'x'.repeat(96) }))).toBe('accepted');
    expect(errorOf(validatePhoneMessage({ v, t: 'hello', name: 'x'.repeat(97) }))).toBe('too-large:name');
    expect(errorOf(validatePhoneMessage({ v, t: 'set-name', name: null }))).toBe('bad-field:name');
    expect(errorOf(validatePhoneMessage({ v, t: 'hello', name: 7 }))).toBe('bad-field:name');
  });

  it('the name in a seat is checked for content only: the host has already counted it', () => {
    const seat = (name: unknown): string => errorOf(validateHostMessage({ ...hostSamples.seat, name }));
    expect(seat('முத்துக்குமார்')).toBe('accepted');
    expect(seat('🧑‍💻 Mei')).toBe('accepted');
    // A phone whose browser counts characters differently must not refuse what the host took.
    expect(seat('x'.repeat(13))).toBe('accepted');
    expect(seat('🇸🇬'.repeat(12))).toBe('accepted');
    expect(seat('x'.repeat(48))).toBe('accepted');
    expect(seat('x'.repeat(49))).toBe('too-large:name');
    expect(seat('   ')).toBe('bad-field:name');
    expect(seat('ab\u202ecd')).toBe('bad-field:name');
    expect(seat('a\u200bb')).toBe('bad-field:name');
    expect(seat('')).toBe('bad-field:name');
    const room = (name: unknown): string => errorOf(validateHostMessage({ ...hostSamples.room, team: { id: 0, name } }));
    expect(room('x'.repeat(25))).toBe('accepted');
    expect(room('x'.repeat(49))).toBe('too-large:team');
    expect(room('a\u202eb')).toBe('bad-field:team');
  });

  it('the host tells a phone why its name was refused', () => {
    for (const reason of ['blank', 'too-long', 'bad-characters']) {
      expect(errorOf(validateHostMessage({ v, t: 'name-refused', reason }))).toBe('accepted');
    }
    expect(errorOf(validateHostMessage({ v, t: 'name-refused', reason: 'rude' }))).toBe('bad-field:reason');
    expect(errorOf(validateHostMessage({ v, t: 'name-refused', reason: 'ok' }))).toBe('bad-field:reason');
    // The whole exchange: a bad name, the reason, a better name, a seat.
    const asked = decodePhoneMessage(encodePhoneMessage({ v, t: 'hello', name: '\u200b' }));
    expect(asked.ok && asked.value.t === 'hello' && checkNickname(asked.value.name)).toBe('bad-characters');
    const told = decodeHostMessage(encodeHostMessage({ v, t: 'name-refused', reason: 'bad-characters' }));
    expect(told.ok && told.value.t).toBe('name-refused');
    const again = decodePhoneMessage(encodePhoneMessage({ v, t: 'hello', name: 'Ah Beng' }));
    expect(again.ok && again.value.t === 'hello' && checkNickname(again.value.name)).toBe('ok');
  });

  it('a seat is 1 to 8 with a colour 0 to 7 and a token', () => {
    const seat = (change: Record<string, unknown>): string => errorOf(validateHostMessage({ ...hostSamples.seat, ...change }));
    expect(seat({ seat: 1, colour: 0 })).toBe('accepted');
    expect(seat({ seat: 8, colour: 7 })).toBe('accepted');
    expect(seat({ seat: 0 })).toBe('bad-field:seat');
    expect(seat({ seat: 9 })).toBe('bad-field:seat');
    expect(seat({ seat: 2.5 })).toBe('bad-field:seat');
    expect(seat({ colour: 8 })).toBe('bad-field:colour');
    expect(seat({ colour: -1 })).toBe('bad-field:colour');
    expect(seat({ seatToken: 'tiny' })).toBe('bad-field:seatToken');
    expect(seat({ seatToken: 'x'.repeat(200) })).toBe('too-large:seatToken');
    expect(seat({ nameReplaced: 'no' })).toBe('bad-field:nameReplaced');
  });

  it('room state is bounded', () => {
    const room = (change: Record<string, unknown>): string => errorOf(validateHostMessage({ ...hostSamples.room, ...change }));
    expect(room({ phase: 'intermission' })).toBe('bad-field:phase');
    expect(room({ players: 0 })).toBe('accepted');
    expect(room({ players: -1 })).toBe('bad-field:players');
    expect(room({ players: 9 })).toBe('bad-field:players');
    expect(room({ team: { id: 2, name: 'Green' } })).toBe('bad-field:team');
    expect(room({ team: { id: 0, name: 'x'.repeat(49) } })).toBe('too-large:team');
    expect(room({ team: { id: 0 } })).toBe('bad-field:team');
  });

  it('layout, private view and action payloads are capped by size', () => {
    const fits = (bytes: number): string => 'x'.repeat(bytes - 2);
    expect(errorOf(validateHostMessage({ v, t: 'layout', rev: 1, layout: fits(MAX_LAYOUT_BYTES) }))).toBe('accepted');
    expect(errorOf(validateHostMessage({ v, t: 'layout', rev: 1, layout: fits(MAX_LAYOUT_BYTES + 1) }))).toBe('too-large:layout');
    expect(errorOf(validateHostMessage({ v, t: 'view', rev: 1, view: fits(MAX_VIEW_BYTES) }))).toBe('accepted');
    expect(errorOf(validateHostMessage({ v, t: 'view', rev: 1, view: fits(MAX_VIEW_BYTES + 1) }))).toBe('too-large:view');
    expect(errorOf(validatePhoneMessage({ v, t: 'action', rev: 1, viewRev: null, data: fits(MAX_ACTION_BYTES) }))).toBe('accepted');
    expect(errorOf(validatePhoneMessage({ v, t: 'action', rev: 1, viewRev: null, data: fits(MAX_ACTION_BYTES + 1) }))).toBe('too-large:data');
    // Many small values add up too.
    const many = Array.from({ length: MAX_LAYOUT_BYTES }, () => 0);
    expect(errorOf(validateHostMessage({ v, t: 'layout', rev: 1, layout: many }))).toBe('too-large:layout');
  });

  it('payloads are capped by depth, and a missing payload is not a null one', () => {
    let deep: Json = 0;
    for (let i = 0; i < MAX_JSON_DEPTH + 1; i += 1) deep = { d: deep };
    expect(errorOf(validateHostMessage({ v, t: 'view', rev: 1, view: deep }))).toBe('too-large:view');
    expect(errorOf(decodeHostMessage(JSON.stringify({ v, t: 'view', rev: 1, view: deep })))).toBe('too-large:view');
    expect(errorOf(validateHostMessage({ v, t: 'view', rev: 1 }))).toBe('bad-field:view');
    expect(errorOf(validateHostMessage({ v, t: 'layout', rev: 1 }))).toBe('bad-field:layout');
    expect(errorOf(validatePhoneMessage({ v, t: 'action', rev: 1 }))).toBe('bad-field:data');
    expect(errorOf(decodeHostMessage('{"v":1,"t":"view","rev":1,"view":{"__proto__":{"x":1}}}'))).toBe('bad-field:view');
  });

  it('revisions are whole numbers from 0 to 2^32 - 1', () => {
    for (const rev of [-1, 0.5, 2 ** 32, '1', null]) {
      expect(errorOf(validateHostMessage({ v, t: 'layout', rev, layout: null }))).toBe('bad-field:rev');
    }
  });

  it('an action names the layout and the private view it was made on', () => {
    const action = (change: Record<string, unknown>): string => errorOf(validatePhoneMessage({ ...phoneSamples.action, ...change }));
    expect(action({})).toBe('accepted');
    expect(action({ viewRev: null })).toBe('accepted');
    expect(action({ viewRev: 0 })).toBe('accepted');
    expect(action({ viewRev: -1 })).toBe('bad-field:viewRev');
    expect(action({ viewRev: 1.5 })).toBe('bad-field:viewRev');
    expect(action({ viewRev: '4' })).toBe('bad-field:viewRev');
    expect(action({ rev: null })).toBe('bad-field:rev');
    // The host can tell a choice made on view 4 from one made on view 5.
    const late = validatePhoneMessage({ ...phoneSamples.action, viewRev: 4 });
    expect(late.ok && late.value.t === 'action' && late.value.viewRev).toBe(4);
  });

  it('nothing asks a phone to vibrate, and nobody is kicked', () => {
    expect(errorOf(validateHostMessage({ v, t: 'haptic', pattern: [30] }))).toBe('unknown-type:t');
    expect(errorOf(validateHostMessage({ v, t: 'close', reason: 'kicked' }))).toBe('bad-field:reason');
    expect(errorOf(validateServerSignal({ v, t: 'dropped', reason: 'kicked' }))).toBe('bad-field:reason');
  });

  it('refused with game-running: the phone waits for a phase that takes players, then asks again', () => {
    expect(ROOM_PHASES.map((phase) => [phase, canAskToJoin(phase)])).toEqual([
      ['lobby', true],
      ['playing', false],
      ['paused', false],
      ['results', true],
    ]);
    // The whole exchange, through the real encoders and decoders, as the phone would see it.
    const fromHost: HostMessage[] = [
      { v, t: 'refused', reason: 'game-running' },
      { v, t: 'room', phase: 'playing', players: 3, leader: false, team: null },
      { v, t: 'room', phase: 'paused', players: 3, leader: false, team: null },
      { v, t: 'room', phase: 'playing', players: 3, leader: false, team: null },
      { v, t: 'room', phase: 'results', players: 3, leader: false, team: null },
      { v, t: 'seat', seat: 4, colour: 3, name: 'Late Lah', nameReplaced: false, seatToken: SEAT_TOKEN, resumed: false },
    ];
    const hello: PhoneMessage = { v, t: 'hello', name: 'Late Lah' };
    const sent: string[] = [encodePhoneMessage(hello)];
    let waiting = false;
    let seated = false;
    for (const message of fromHost) {
      const decoded = decodeHostMessage(encodeHostMessage(message));
      if (!decoded.ok) throw new Error('the host message did not decode');
      const received = decoded.value;
      if (received.t === 'refused' && received.reason === 'game-running') waiting = true;
      if (received.t === 'room' && waiting && canAskToJoin(received.phase)) {
        sent.push(encodePhoneMessage(hello));
        waiting = false;
      }
      if (received.t === 'seat') seated = true;
    }
    // One hello at the start, and exactly one more: when the results came up.
    expect(sent.length).toBe(2);
    expect(sent.map((text) => decodePhoneMessage(text).ok)).toEqual([true, true]);
    expect(seated).toBe(true);
  });

  it('enumerated fields take only their listed values', () => {
    expect(errorOf(validatePhoneMessage({ v, t: 'control', request: 'restart' }))).toBe('bad-field:request');
    expect(errorOf(validateHostMessage({ v, t: 'refused', reason: 'no' }))).toBe('bad-field:reason');
    expect(errorOf(validateHostMessage({ v, t: 'close', reason: 'no' }))).toBe('bad-field:reason');
    expect(errorOf(validateHostMessage({ v, t: 'link', quality: 'great', rttMs: 1 }))).toBe('bad-field:quality');
    expect(errorOf(validateHostMessage({ v, t: 'link', quality: 'good', rttMs: -1 }))).toBe('bad-field:rttMs');
  });

  it('a message for one direction is refused in the other (NET-001)', () => {
    for (const sample of Object.values(hostSamples)) {
      expect(errorOf(validatePhoneMessage(sample)), sample.t).toBe('unknown-type:t');
    }
    for (const sample of Object.values(phoneSamples)) {
      expect(errorOf(validateHostMessage(sample)), sample.t).toBe('unknown-type:t');
    }
  });
});

// --- Seeded random garbage -------------------------------------------------------------------

const INTERESTING: unknown[] = [
  null,
  undefined,
  true,
  false,
  0,
  -0,
  1,
  -1,
  2,
  0.5,
  255,
  65536,
  2 ** 32,
  2 ** 53,
  -(2 ** 53),
  1e308,
  NaN,
  Infinity,
  -Infinity,
  '',
  ' ',
  'a',
  'hello',
  'create',
  'seat',
  'K4KI',
  '__proto__',
  'constructor',
  'x'.repeat(13),
  'x'.repeat(200),
  'x'.repeat(20_000),
  '\u0000',
  '\ud83c',
  '🍜'.repeat(12),
  SEAT_TOKEN,
  10n,
  Symbol('s'),
  () => 1,
  new Date(0),
  new Map(),
  new Uint8Array(3),
  /x/,
];

const KEYS = [
  'v', 't', 'code', 'hostToken', 'roomToken', 'peer', 'step', 'kind', 'sdp', 'candidate', 'mid',
  'mLineIndex', 'ice', 'servers', 'urls', 'ttlS', 'relay', 'reason', 'name', 'seatToken', 'rev',
  'data', 'layout', 'view', 'viewRev', 'phase', 'players', 'leader', 'team', 'id', 'quality',
  'rttMs', 'seat', 'colour', 'request', 'present', 'toString', '', 'x',
];

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function garbage(random: () => number, depth: number): unknown {
  const roll = random();
  if (depth > 3 || roll < 0.5) return pick(random, INTERESTING);
  if (roll < 0.7) {
    const length = Math.floor(random() * 5);
    return Array.from({ length }, () => garbage(random, depth + 1));
  }
  const out: Record<string, unknown> = {};
  const fields = Math.floor(random() * 6);
  for (let i = 0; i < fields; i += 1) out[pick(random, KEYS)] = garbage(random, depth + 1);
  return out;
}

/** A valid message with one thing, somewhere inside it, replaced by garbage. */
function mutate(random: () => number, value: unknown, depth: number): unknown {
  if (Array.isArray(value)) {
    const copy = [...(value as unknown[])];
    if (copy.length === 0 || random() < 0.3) return garbage(random, depth);
    const at = Math.floor(random() * copy.length);
    copy[at] = mutate(random, copy[at], depth + 1);
    return copy;
  }
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>;
    const keys = Object.keys(source);
    if (keys.length === 0 || random() < 0.2) return garbage(random, depth);
    const key = pick(random, keys);
    if (random() < 0.15) {
      return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
    }
    return { ...source, [key]: mutate(random, source[key], depth + 1) };
  }
  return garbage(random, depth);
}

const JSON_CHARS = '{}[]":,\\ntruefalsenull0123456789.-eE vt'.split('');

function randomText(random: () => number): string {
  const length = Math.floor(random() * 60);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += random() < 0.7 ? pick(random, JSON_CHARS) : String.fromCharCode(Math.floor(random() * 0x10000));
  }
  return out;
}

describe.each(families)('$name: seeded random garbage', ({ samples, encode, decode, validate }) => {
  /** Whatever a validator accepts must be a clean message: it encodes and decodes to itself. */
  function check(result: Result<unknown>): boolean {
    if (!result.ok) {
      expect(typeof result.error.code).toBe('string');
      return false;
    }
    const again = decode(encode(result.value));
    expect(again).toEqual({ ok: true, value: result.value });
    return true;
  }

  it('random values never make the validator throw', () => {
    const random = seeded(0xf02_0001);
    for (let i = 0; i < 20_000; i += 1) {
      check(validate(garbage(random, 0)));
    }
  });

  it('random values under a valid version and type never make it throw', () => {
    const random = seeded(0xf02_0002);
    for (let i = 0; i < 20_000; i += 1) {
      const body = garbage(random, 1);
      const fields = typeof body === 'object' && body !== null && !Array.isArray(body) ? body : {};
      check(validate({ ...fields, v, t: typeOf(pick(random, samples)) }));
    }
  });

  it('valid messages with one part replaced never make it throw', () => {
    const random = seeded(0xf02_0003);
    let accepted = 0;
    let refused = 0;
    for (let i = 0; i < 20_000; i += 1) {
      const result = validate(mutate(random, pick(random, samples), 0));
      if (check(result)) accepted += 1;
      else refused += 1;
    }
    // Both happen often, so the mutations do land inside messages and do break them.
    expect(accepted).toBeGreaterThan(100);
    expect(refused).toBeGreaterThan(5_000);
  });

  it('random and damaged text never makes the decoder throw', () => {
    const random = seeded(0xf02_0004);
    for (let i = 0; i < 20_000; i += 1) {
      const roll = random();
      let text: string;
      if (roll < 0.4) {
        text = randomText(random);
      } else {
        // A valid message with a piece cut out, doubled or overwritten.
        const valid = encode(pick(random, samples));
        const at = Math.floor(random() * valid.length);
        const span = Math.floor(random() * 8);
        text =
          roll < 0.6
            ? valid.slice(0, at) + valid.slice(at + span)
            : roll < 0.8
              ? valid.slice(0, at) + randomText(random) + valid.slice(at + span)
              : valid.slice(0, at) + valid.slice(at - span);
      }
      check(decode(text));
    }
  });
});
