import { describe, expect, it } from 'vitest';

import {
  CHANNEL_BINARY_TYPE,
  CONTROL_CHANNEL_LABEL,
  CONTROL_CHANNEL_OPTIONS,
  INPUT_CHANNEL_LABEL,
  INPUT_CHANNEL_OPTIONS,
} from './datachannel';
import { BUTTON, BUTTON_MASK, INPUT_HISTORY } from './input';
import type { WireInput } from './input';
import { PROTOCOL_VERSION } from './limits';
import {
  decodeHostFrame,
  decodePhoneFrame,
  encodeInput,
  encodePing,
  encodePong,
  INPUT_FRAME_MAX_BYTES,
  INPUT_FRAME_MIN_BYTES,
  INPUT_TILT_EXTRA_BYTES,
  MAX_FRAME_BYTES,
  PING_FRAME_BYTES,
  PONG_FRAME_BYTES,
} from './wire';

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

const A = BUTTON.a;
const steady = (mask: number): number[] => Array.from({ length: INPUT_HISTORY }, () => mask);

/** A held: the same mask in this tick and all eight before it. */
const held: WireInput = {
  seq: 513,
  buttons: A | BUTTON.r | BUTTON.up,
  history: steady(A | BUTTON.r | BUTTON.up),
  stickX: -127,
  stickY: 64,
  tilt: null,
};

/** A tap passing through the history: released now, down two and three ticks ago. */
const tapped: WireInput = {
  seq: 7,
  buttons: 0,
  history: [0, A, A, 0, 0, 0, 0, 0],
  stickX: 0,
  stickY: 0,
  tilt: null,
};

/** A button changing on every tick: the largest frame there is. */
const busiest: WireInput = {
  seq: 65535,
  buttons: BUTTON_MASK,
  history: [0, BUTTON_MASK, 0, BUTTON_MASK, 0, BUTTON_MASK, 0, BUTTON_MASK],
  stickX: 127,
  stickY: -127,
  tilt: null,
};

describe('frame sizes', () => {
  it('the protocol version fits the four bits a frame gives it', () => {
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(0);
    expect(PROTOCOL_VERSION).toBeLessThanOrEqual(15);
  });

  it('an input frame is 7 bytes while nothing changes, 11 for a tap, 23 at most; tilt adds 2', () => {
    expect(INPUT_FRAME_MIN_BYTES).toBe(7);
    expect(INPUT_FRAME_MAX_BYTES).toBe(23);
    expect(INPUT_TILT_EXTRA_BYTES).toBe(2);
    expect(MAX_FRAME_BYTES).toBe(25);
    expect(encodeInput(held).length).toBe(7);
    expect(encodeInput(tapped).length).toBe(11);
    expect(encodeInput(busiest).length).toBe(23);
    const tilt = { x: 1, y: -1 };
    expect(encodeInput({ ...held, tilt }).length).toBe(9);
    expect(encodeInput({ ...tapped, tilt }).length).toBe(13);
    expect(encodeInput({ ...busiest, tilt }).length).toBe(25);
  });

  it('a ping is 5 bytes and a pong is 3', () => {
    expect(encodePing({ id: 1, rttMs: 20 }).length).toBe(PING_FRAME_BYTES);
    expect(PING_FRAME_BYTES).toBe(5);
    expect(encodePong({ id: 1 }).length).toBe(PONG_FRAME_BYTES);
    expect(PONG_FRAME_BYTES).toBe(3);
  });

  it('the bytes are as documented', () => {
    // header · seq · stick x · stick y · one run: nine ticks (8 in the top four bits) of 0x211.
    expect([...encodeInput(held)]).toEqual([0x10, 0x02, 0x01, 0x81, 0x40, 0x82, 0x11]);
    // With tilt: kind 1, and the two tilt bytes before the runs.
    expect([...encodeInput({ ...held, tilt: { x: 5, y: -5 } })]).toEqual([
      0x11, 0x02, 0x01, 0x81, 0x40, 0x05, 0xfb, 0x82, 0x11,
    ]);
    // Newest first: two ticks released, two ticks of A (0x010), five ticks released.
    expect([...encodeInput(tapped)]).toEqual([0x10, 0x00, 0x07, 0x00, 0x00, 0x10, 0x00, 0x10, 0x10, 0x40, 0x00]);
    expect([...encodePing({ id: 0x0102, rttMs: 0x0304 })]).toEqual([0x12, 1, 2, 3, 4]);
    expect([...encodePing({ id: 0, rttMs: null })]).toEqual([0x12, 0, 0, 0xff, 0xff]);
    expect([...encodePong({ id: 0xfffe })]).toEqual([0x13, 0xff, 0xfe]);
  });
});

describe('round trips', () => {
  it('input frames, with and without tilt, at the edges of every field', () => {
    const frames: WireInput[] = [
      held,
      tapped,
      busiest,
      { seq: 0, buttons: 0, history: steady(0), stickX: 0, stickY: 0, tilt: null },
      { seq: 40000, buttons: BUTTON.shake, history: [0, 0, 0, 0, 0, 0, 0, BUTTON.shake], stickX: 1, stickY: -1, tilt: { x: -127, y: 127 } },
      { seq: 7, buttons: 0, history: steady(0), stickX: 0, stickY: 0, tilt: { x: 0, y: 0 } },
      { seq: 9, buttons: A, history: [1, 2, 4, 8, 16, 32, 64, 128], stickX: 0, stickY: 0, tilt: null },
    ];
    for (const frame of frames) {
      expect(decodePhoneFrame(encodeInput(frame))).toEqual({
        ok: true,
        value: { kind: 'input', input: frame },
      });
    }
  });

  it('every button by itself, now and at every place in the history', () => {
    for (const bit of Object.values(BUTTON)) {
      for (let place = -1; place < INPUT_HISTORY; place += 1) {
        const history = steady(0);
        if (place >= 0) history[place] = bit;
        const frame: WireInput = { ...tapped, buttons: place < 0 ? bit : 0, history };
        expect(decodePhoneFrame(encodeInput(frame))).toEqual({
          ok: true,
          value: { kind: 'input', input: frame },
        });
      }
    }
  });

  it('random histories', () => {
    const random = seeded(0xf02_0006);
    for (let i = 0; i < 5_000; i += 1) {
      // Mostly runs, as real input is, sometimes noise.
      const masks: number[] = [];
      let mask = Math.floor(random() * 4096);
      for (let tick = 0; tick <= INPUT_HISTORY; tick += 1) {
        if (random() < 0.4) mask = random() < 0.5 ? 0 : Math.floor(random() * 4096);
        masks.push(mask);
      }
      const frame: WireInput = {
        seq: Math.floor(random() * 65536),
        buttons: masks[0] ?? 0,
        history: masks.slice(1),
        stickX: Math.floor(random() * 255) - 127,
        stickY: Math.floor(random() * 255) - 127,
        tilt: random() < 0.3 ? { x: Math.floor(random() * 255) - 127, y: 0 } : null,
      };
      const bytes = encodeInput(frame);
      expect(bytes.length).toBeLessThanOrEqual(MAX_FRAME_BYTES);
      expect(decodePhoneFrame(bytes)).toEqual({ ok: true, value: { kind: 'input', input: frame } });
    }
  });

  it('ping and pong', () => {
    for (const ping of [
      { id: 0, rttMs: null },
      { id: 65535, rttMs: 0 },
      { id: 9, rttMs: 65534 },
    ]) {
      expect(decodePhoneFrame(encodePing(ping))).toEqual({ ok: true, value: { kind: 'ping', ping } });
    }
    for (const pong of [{ id: 0 }, { id: 65535 }]) {
      expect(decodeHostFrame(encodePong(pong))).toEqual({ ok: true, value: { kind: 'pong', pong } });
    }
  });

  it('decodes from an ArrayBuffer, a Uint8Array inside a larger buffer and a DataView', () => {
    const bytes = encodeInput(tapped);
    const expected = { ok: true, value: { kind: 'input', input: tapped } };
    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);
    expect(decodePhoneFrame(buffer)).toEqual(expected);
    // The frame sits in the middle of a bigger buffer.
    const big = new Uint8Array(bytes.length + 10).fill(0xee);
    big.set(bytes, 4);
    expect(decodePhoneFrame(big.subarray(4, 4 + bytes.length))).toEqual(expected);
    expect(decodePhoneFrame(new DataView(big.buffer, 4, bytes.length))).toEqual(expected);
    const pong = encodePong({ id: 77 });
    expect(decodeHostFrame(new DataView(pong.buffer))).toEqual({ ok: true, value: { kind: 'pong', pong: { id: 77 } } });
  });
});

describe('encoders bring numbers into range', () => {
  it('wraps sequence numbers, clears undefined buttons and clamps axes', () => {
    const decoded = decodePhoneFrame(
      encodeInput({ seq: 65536 + 5, buttons: 0xffff, history: steady(0xf001), stickX: 300, stickY: -128, tilt: null }),
    );
    expect(decoded).toEqual({
      ok: true,
      value: {
        kind: 'input',
        input: { seq: 5, buttons: BUTTON_MASK, history: steady(1), stickX: 127, stickY: -127, tilt: null },
      },
    });
  });

  it('pads a short history with zeros and cuts a long one', () => {
    const short = decodePhoneFrame(encodeInput({ ...tapped, buttons: A, history: [A] }));
    expect(short.ok && short.value.kind === 'input' && short.value.input.history).toEqual([A, 0, 0, 0, 0, 0, 0, 0]);
    const long = decodePhoneFrame(encodeInput({ ...tapped, buttons: A, history: Array.from({ length: 30 }, () => A) }));
    expect(long.ok && long.value.kind === 'input' && long.value.input.history).toEqual(steady(A));
  });

  it('survives numbers that are not numbers', () => {
    const decoded = decodePhoneFrame(
      encodeInput({ seq: NaN, buttons: NaN, history: [NaN, Infinity], stickX: NaN, stickY: Infinity, tilt: { x: -Infinity, y: 0.4 } }),
    );
    expect(decoded).toEqual({
      ok: true,
      value: {
        kind: 'input',
        input: { seq: 0, buttons: 0, history: steady(0), stickX: 0, stickY: 127, tilt: { x: -127, y: 0 } },
      },
    });
  });

  it('caps a reported round trip and keeps "unknown" distinct', () => {
    expect(decodePhoneFrame(encodePing({ id: 1, rttMs: 999_999 }))).toEqual({
      ok: true,
      value: { kind: 'ping', ping: { id: 1, rttMs: 65534 } },
    });
    expect(decodePhoneFrame(encodePing({ id: 1, rttMs: -4 }))).toEqual({
      ok: true,
      value: { kind: 'ping', ping: { id: 1, rttMs: 0 } },
    });
    expect(decodePhoneFrame(encodePing({ id: 1, rttMs: NaN }))).toEqual({
      ok: true,
      value: { kind: 'ping', ping: { id: 1, rttMs: null } },
    });
  });
});

describe('rejections', () => {
  const code = (result: { ok: boolean; error?: { code: string } }): string | undefined =>
    result.ok ? undefined : result.error?.code;

  it('refuses things that are not bytes, and empty frames', () => {
    for (const bad of [null, undefined, 'text', 7, {}, [16, 0, 0], new Uint8Array(0), new ArrayBuffer(0), new DataView(new ArrayBuffer(0))]) {
      expect(code(decodePhoneFrame(bad))).toBe('bad-frame');
      expect(code(decodeHostFrame(bad))).toBe('bad-frame');
    }
  });

  it('refuses, without throwing, bytes and objects that throw when looked at', () => {
    const detached = new ArrayBuffer(7);
    const view = new Uint8Array(detached);
    const dataView = new DataView(detached);
    view.set(encodeInput(held));
    structuredClone(detached, { transfer: [detached] });
    expect(detached.byteLength).toBe(0);
    const hostile = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw new Error('trap');
        },
      },
    );
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    for (const bad of [detached, view, dataView, hostile, revocable.proxy]) {
      expect(code(decodePhoneFrame(bad))).toBe('bad-frame');
      expect(code(decodeHostFrame(bad))).toBe('bad-frame');
    }
  });

  it('refuses a frame over the largest size', () => {
    const big = new Uint8Array(MAX_FRAME_BYTES + 1);
    big[0] = 0x10;
    expect(code(decodePhoneFrame(big))).toBe('too-large');
    expect(code(decodeHostFrame(big))).toBe('too-large');
    expect(code(decodePhoneFrame(new Uint8Array(100_000)))).toBe('too-large');
  });

  it('refuses another protocol version', () => {
    for (const version of [0, 2, 15]) {
      const input = encodeInput(held);
      input[0] = (version << 4) | 0;
      expect(code(decodePhoneFrame(input))).toBe('bad-version');
      const pong = encodePong({ id: 1 });
      pong[0] = (version << 4) | 3;
      expect(code(decodeHostFrame(pong))).toBe('bad-version');
    }
  });

  it('refuses an unknown kind, and a kind sent in the wrong direction', () => {
    for (let kind = 4; kind <= 15; kind += 1) {
      const frame = Uint8Array.of((PROTOCOL_VERSION << 4) | kind, 0, 0);
      expect(code(decodePhoneFrame(frame))).toBe('unknown-type');
      expect(code(decodeHostFrame(frame))).toBe('unknown-type');
    }
    expect(code(decodePhoneFrame(encodePong({ id: 1 })))).toBe('unknown-type');
    expect(code(decodeHostFrame(encodeInput(held)))).toBe('unknown-type');
    expect(code(decodeHostFrame(encodePing({ id: 1, rttMs: null })))).toBe('unknown-type');
  });

  it('refuses a frame of the wrong length for its kind', () => {
    for (const frame of [encodeInput(held), encodeInput({ ...held, tilt: { x: 0, y: 0 } }), encodeInput(tapped)]) {
      // One byte short or long leaves half a run.
      expect(code(decodePhoneFrame(frame.subarray(0, frame.length - 1)))).toBe('bad-frame');
      expect(code(decodePhoneFrame(Uint8Array.of(...frame, 0)))).toBe('bad-frame');
    }
    // No runs at all.
    expect(code(decodePhoneFrame(encodeInput(held).subarray(0, 5)))).toBe('bad-frame');
    expect(code(decodePhoneFrame(encodeInput({ ...held, tilt: { x: 0, y: 0 } }).subarray(0, 7)))).toBe('bad-frame');
    const ping = encodePing({ id: 1, rttMs: 1 });
    expect(code(decodePhoneFrame(ping.subarray(0, 4)))).toBe('bad-frame');
    expect(code(decodePhoneFrame(Uint8Array.of(...ping, 0)))).toBe('bad-frame');
    const pong = encodePong({ id: 1 });
    expect(code(decodeHostFrame(pong.subarray(0, 2)))).toBe('bad-frame');
    expect(code(decodeHostFrame(Uint8Array.of(...pong, 0)))).toBe('bad-frame');
  });

  it('refuses runs that do not add up to nine ticks, and two runs alike side by side', () => {
    const fixed = [0x10, 0, 1, 0, 0];
    const frame = (...runs: number[]): Uint8Array => Uint8Array.of(...fixed, ...runs.flatMap((run) => [run >> 8, run & 0xff]));
    const refused = { ok: false, error: { code: 'bad-field', field: 'buttons' } };
    expect(decodePhoneFrame(frame(0x8010)).ok).toBe(true);
    expect(decodePhoneFrame(frame(0x0010, 0x7000)).ok).toBe(true);
    // Eight ticks, ten ticks, sixteen ticks.
    expect(decodePhoneFrame(frame(0x7010))).toEqual(refused);
    expect(decodePhoneFrame(frame(0x9010))).toEqual(refused);
    expect(decodePhoneFrame(frame(0xf010))).toEqual(refused);
    expect(decodePhoneFrame(frame(0x0010, 0x8000))).toEqual(refused);
    expect(decodePhoneFrame(frame(0x0010, 0x0000))).toEqual(refused);
    // Nine ticks, but as two runs of the same mask: the same input has one encoding only.
    expect(decodePhoneFrame(frame(0x0010, 0x7010))).toEqual(refused);
    expect(decodePhoneFrame(frame(0x3010, 0x0000, 0x3000))).toEqual(refused);
  });

  it('refuses the axis value no encoder writes', () => {
    const tilted = encodeInput({ ...held, tilt: { x: 0, y: 0 } });
    for (const [at, field] of [
      [3, 'stickX'],
      [4, 'stickY'],
      [5, 'tilt'],
      [6, 'tilt'],
    ] as const) {
      const frame = Uint8Array.from(tilted);
      frame[at] = 0x80;
      expect(decodePhoneFrame(frame)).toEqual({ ok: false, error: { code: 'bad-field', field } });
    }
  });
});

describe('random bytes', () => {
  it('never make a decoder throw, and whatever decodes re-encodes to the same bytes', () => {
    const random = seeded(0xf02);
    let accepted = 0;
    for (let i = 0; i < 40_000; i += 1) {
      const length = Math.floor(random() * 30);
      const bytes = new Uint8Array(length);
      for (let j = 0; j < length; j += 1) bytes[j] = Math.floor(random() * 256);
      // Half the time, give it a valid header so the body checks are reached; and sometimes
      // make the runs plausible (short ones), so that whole frames get through.
      if (length > 0 && random() < 0.5) bytes[0] = (PROTOCOL_VERSION << 4) | Math.floor(random() * 5);
      if (random() < 0.5) {
        for (let j = 5; j < length; j += 2) bytes[j] = ((bytes[j] ?? 0) & 0x3f) | 0;
      }

      const fromPhone = decodePhoneFrame(bytes);
      if (fromPhone.ok) {
        accepted += 1;
        const again =
          fromPhone.value.kind === 'input'
            ? encodeInput(fromPhone.value.input)
            : encodePing(fromPhone.value.ping);
        expect([...again]).toEqual([...bytes]);
      }
      const fromHost = decodeHostFrame(bytes);
      if (fromHost.ok) {
        accepted += 1;
        expect([...encodePong(fromHost.value.pong)]).toEqual([...bytes]);
      }
    }
    // The generator does reach valid frames; otherwise this test would prove nothing.
    expect(accepted).toBeGreaterThan(100);
  });
});

describe('the two data channels', () => {
  it('have fixed labels and options', () => {
    expect(INPUT_CHANNEL_LABEL).toBe('kaki-input');
    expect(CONTROL_CHANNEL_LABEL).toBe('kaki-control');
    expect(INPUT_CHANNEL_LABEL).not.toBe(CONTROL_CHANNEL_LABEL);
    expect(INPUT_CHANNEL_OPTIONS).toEqual({ ordered: false, maxRetransmits: 0 });
    expect(CONTROL_CHANNEL_OPTIONS).toEqual({ ordered: true });
    expect(CHANNEL_BINARY_TYPE).toBe('arraybuffer');
  });
});
