import { describe, expect, it } from 'vitest';
import {
  buildHostSubprotocols,
  decodeOpeningSignal,
  decodeToHostSignal,
  decodeToPhoneSignal,
  HOST_SUBPROTOCOL_PREFIX,
  parseHostSubprotocols,
  SIGNAL_SUBPROTOCOL,
} from './signal';
import { PROTOCOL_VERSION as v } from './limits';

describe('NET-002 host upgrade contract', () => {
  it.each([16, 32, 128])('builds and parses a valid %i-character token', (length) => {
    const secret = 'aB_9-'.repeat(26).slice(0, length);
    const offer = buildHostSubprotocols(secret);
    expect(SIGNAL_SUBPROTOCOL).toBe('kaki.v1');
    expect(HOST_SUBPROTOCOL_PREFIX).toBe('kaki.host.');
    expect(offer).toEqual(['kaki.v1', 'kaki.host.' + secret]);
    expect(parseHostSubprotocols(offer)).toBe(secret);
    expect(parseHostSubprotocols([...offer].reverse())).toBe(secret);
    expect(parseHostSubprotocols([...offer, 'extra', 'extra'])).toBe(secret);
  });

  it.each([
    ['missing both', []],
    ['missing credential', ['kaki.v1']],
    ['missing base', ['kaki.host.' + 'a'.repeat(16)]],
    ['duplicate base', ['kaki.v1', 'kaki.v1', 'kaki.host.' + 'a'.repeat(16)]],
    ['duplicate credential', ['kaki.v1', ...Array<string>(2).fill('kaki.host.' + 'a'.repeat(16))]],
    ['different credentials', ['kaki.v1', 'kaki.host.' + 'a'.repeat(16), 'kaki.host.' + 'b'.repeat(16)]],
  ])('refuses %s', (_name, offer) => {
    expect(parseHostSubprotocols(offer)).toBeNull();
  });

  it.each(['', 'a'.repeat(15), 'a'.repeat(129), 'a'.repeat(15) + '.',
    'a'.repeat(15) + ' ', 'a'.repeat(15) + 'é'])(
    'refuses invalid token %j in both helpers', (secret) => {
      expect(parseHostSubprotocols(['kaki.v1', 'kaki.host.' + secret])).toBeNull();
      expect(() => buildHostSubprotocols(secret)).toThrow(TypeError);
    },
  );

  it.each(['create', 'reopen', 'unknown'])('refuses retired or unknown opening %s', (t) => {
    const result = decodeOpeningSignal(JSON.stringify({ v, t, code: 'K4KI', hostToken: 'secret' }));
    expect(result).toEqual({ ok: false, error: { code: 'unknown-type', field: 't' } });
  });

  it('decodes the terminal opening timeout for either client role', () => {
    const message = { v, t: 'error', code: 'opening-timeout', retryAfterS: null };
    for (const decode of [decodeToHostSignal, decodeToPhoneSignal]) {
      expect(decode(JSON.stringify(message))).toEqual({ ok: true, value: message });
    }
  });
});
