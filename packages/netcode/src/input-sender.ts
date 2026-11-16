import { BUTTON_MASK, encodeInput, INPUT_HISTORY, INPUT_MAX_HZ, unitToAxis } from '@kaki/protocol';
import type { AnalogInput, WireInput } from '@kaki/protocol';
import type { Scheduler } from './interfaces';

/** Mutable equivalent of the protocol send rule with preallocated wire buffers.
 * Bytes passed to send are borrowed until send returns; adapters must copy synchronously. Touch bursts use the protocol's blip
 * rule (three changes before a tick cancel two), rather than an unbounded event queue.
 * A literal false from send means back-pressure: retry without consuming a wire frame.
 */
export function createPhoneInput(clock: Scheduler, send: (bytes: Uint8Array) => unknown) {
  const history = new Array<number>(INPUT_HISTORY).fill(0);
  const tilt = { x: 0, y: 0 };
  const frame: { -readonly [K in keyof WireInput]: WireInput[K] } = {
    seq: 0, buttons: 0, stickX: 0, stickY: 0, tilt: null, history,
  };
  // Preallocate every wire size; send must synchronously copy the borrowed bytes.
  const outputs = Array.from({ length: 26 }, (_, size) => new Uint8Array(size));
  const plainHeader = encodeInput(frame)[0] ?? 0;
  const tiltHeader = encodeInput({ ...frame, tilt })[0] ?? 0;
  function encode(): Uint8Array {
    const fixed = frame.tilt === null ? 5 : 7;
    let runs = 1; let mask = frame.buttons;
    for (const older of history) { if (older !== mask) { runs++; mask = older; } }
    const out = outputs[fixed + runs * 2];
    if (!out) throw new RangeError('Invalid input size');
    out[0] = frame.tilt === null ? plainHeader : tiltHeader;
    out[1] = frame.seq >> 8; out[2] = frame.seq & 255;
    out[3] = frame.stickX & 255; out[4] = frame.stickY & 255;
    if (frame.tilt) { out[5] = frame.tilt.x & 255; out[6] = frame.tilt.y & 255; }
    let at = fixed; let count = 1; mask = frame.buttons;
    for (const older of history) {
      if (older === mask) count++;
      else { const word = ((count - 1) << 12) | mask; out[at++] = word >> 8; out[at++] = word & 255; mask = older; count = 1; }
    }
    const word = ((count - 1) << 12) | mask; out[at++] = word >> 8; out[at] = word & 255;
    return out;
  }
  const start = clock.now();
  let down = 0;
  let blip = 0;
  let quietIn = 0;
  let last = -Infinity;
  let timer: unknown;
  let scheduled = false;
  let stopped = false;
  const minimum = 1000 / INPUT_MAX_HZ;
  function isStopped(): boolean { return stopped; }
  function cancel(): void {
    if (scheduled) clock.cancel(timer);
    scheduled = false;
  }
  function schedule(delay: number): void {
    cancel();
    scheduled = true;
    timer = clock.schedule(tick, delay);
  }
  function tick(): void {
    scheduled = false;
    if (stopped) return;
    const wait = minimum - (clock.now() - last);
    if (wait > 0.000001) { schedule(wait); return; }
    const sent = history[0] ?? 0;
    frame.buttons = sent ^ ((down ^ sent) | blip);
    const pending = frame.buttons !== down;
    const released = frame.buttons === 0 && frame.stickX === 0 && frame.stickY === 0 && frame.tilt === null;
    if (released && !pending && quietIn === 0) return;
    if (send(encode()) === false) { last = clock.now(); schedule(1000 / 60); return; }
    quietIn = released ? Math.max(0, quietIn - 1) : INPUT_HISTORY + 1;
    if (isStopped()) return;
    last = clock.now();
    frame.seq = (frame.seq + 1) & 0xffff;
    for (let i = INPUT_HISTORY - 1; i > 0; i--) history[i] = history[i - 1] ?? 0;
    history[0] = frame.buttons;
    blip = 0;
    if (!released || pending || quietIn > 0) schedule(Math.max(minimum, start + (Math.floor((clock.now() - start) / (1000 / 60) + 1e-7) + 1) * (1000 / 60) - clock.now()));
  }
  return {
    /** Full button mask and analogue reading from one touch change. */
    change(buttons: number, analog: AnalogInput): void {
      if (stopped) return;
      const changing = (buttons ^ down) & BUTTON_MASK;
      down ^= changing;
      const cancelled = blip & changing;
      blip = (blip & ~cancelled) | (changing & ~cancelled & ~(down ^ (history[0] ?? 0)));
      frame.stickX = unitToAxis(analog.stickX);
      frame.stickY = unitToAxis(analog.stickY);
      if (analog.tilt === null) frame.tilt = null;
      else {
        tilt.x = unitToAxis(analog.tilt.x); tilt.y = unitToAxis(analog.tilt.y); frame.tilt = tilt;
      }
      cancel();
      tick();
    },
    stop(): void { stopped = true; cancel(); },
    /** Fence for a reliable resume acknowledgement: next sequence to be sent. */
    nextSequence(): number { return frame.seq; },
  };
}
export type PhoneInput = ReturnType<typeof createPhoneInput>;
