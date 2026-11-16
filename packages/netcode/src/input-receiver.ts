import type { WireInput } from '@kaki/protocol';
import { axisToUnit, decodePhoneFrame, expandInput, isNewerSeq } from '@kaki/protocol';

/** Structural subset of sim-core's InputBuffer: no new package dependency needed. */
export interface HostInputBuffer<Seat> {
  add(seat: Seat): void;
  reset(seat: Seat): void;
  discardEdges(seat: Seat): void;
  receive(seat: Seat, seq: number, buttons: number, axes: ArrayLike<number>): unknown;
}
export function createHostInput<Seat>(buffer: HostInputBuffer<Seat>, seat: Seat) {
  buffer.add(seat);
  buffer.reset(seat);
  const axes = [0, 0, 0, 0];
  let paused = false;
  let fence: number | null = null;
  return {
    receive(data: unknown): boolean {
      const decoded = decodePhoneFrame(data);
      if (!decoded.ok || decoded.value.kind !== 'input' || paused) return false;
      return this.receiveInput(decoded.value.input);
    },
    receiveInput(input: WireInput): boolean {
      if (paused) return false;
      if (fence !== null && input.seq !== fence && !isNewerSeq(input.seq, fence)) return false;
      for (const tick of expandInput(input)) {
        // Fence every history tick as well: a post-resume frame still carries paused taps.
        if (fence !== null && tick.seq !== fence && !isNewerSeq(tick.seq, fence)) continue;
        axes[0] = axisToUnit(tick.stickX); axes[1] = axisToUnit(tick.stickY);
        axes[2] = tick.tilt === null ? 0 : axisToUnit(tick.tilt.x);
        axes[3] = tick.tilt === null ? 0 : axisToUnit(tick.tilt.y);
        buffer.receive(seat, tick.seq, tick.buttons, axes);
      }
      if (fence !== null && ((input.seq - fence) & 65535) >= 8) fence = null;
      return true;
    },
    pause(): void { paused = true; },
    /** Call ONLY with the sequence captured by the phone after acknowledging this resume.
     * Retire the fence once the entire carried history is post-resume.
     */
    acknowledgeResume(nextSequence: number): void {
      if (!Number.isInteger(nextSequence) || nextSequence < 0 || nextSequence > 65535) {
        throw new RangeError('Resume fence must be a 16-bit sequence');
      }
      buffer.discardEdges(seat);
      fence = nextSequence;
      paused = false;
    },
  };
}
export type HostInput = ReturnType<typeof createHostInput>;
