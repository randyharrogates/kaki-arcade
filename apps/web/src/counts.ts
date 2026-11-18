import { COUNT_MAX } from '@kaki/protocol';
import type { CountKind, Counts } from '@kaki/protocol';

export interface CountDelivery {
  send(body: string): Promise<boolean>;
  beacon(body: string): boolean | Promise<boolean>;
  cancel(): void;
}
/** Constructed only by the host browser adapter. No timers, persistence or retries. */
export function hostCounts(delivery: CountDelivery) {
  let pending: Counts = {};
  let playing = false;
  let disabled = false;
  const frames = [0, 0, 0, 0];
  const bands: CountKind[] = ['perf:host-frame-p95:le17', 'perf:host-frame-p95:le34', 'perf:host-frame-p95:le50', 'perf:host-frame-p95:gt50'];
  function add(kind: CountKind): void {
    if (!disabled) pending[kind] = Math.min(COUNT_MAX, (pending[kind] ?? 0) + 1);
  }
  function flush(hide: boolean): void {
    if (playing || disabled || !Object.keys(pending).length) return;
    const body = JSON.stringify(pending); pending = {};
    try {
      void Promise.resolve(hide ? delivery.beacon(body) : delivery.send(body)).then(ok => { if (!ok) disabled = true; }, () => { disabled = true; });
    } catch { disabled = true; }
  }
  return {
    add,
    begin(): void { delivery.cancel(); frames.fill(0); playing = true; },
    /** Constant memory; one histogram integer increment per visible animation frame. */
    frame(ms: number): void {
      if (playing && !disabled && ms > 0 && Number.isFinite(ms)) {
        const index = ms <= 17 ? 0 : ms <= 34 ? 1 : ms <= 50 ? 2 : 3;
        frames[index] = (frames[index] ?? 0) + 1;
      }
    },
    end(): void {
      if (!playing) return;
      playing = false;
      const total = frames.reduce((a, b) => a + b, 0);
      if (total >= 600) {
        let seen = 0;
        for (let i = 0; i < frames.length; i++) {
          seen += frames[i] ?? 0;
          if (seen >= Math.ceil(total * 0.95)) { const kind = bands[i]; if (kind) add(kind); break; }
        }
      }
      flush(false);
    },
    stop(): void { playing = false; frames.fill(0); },
    hide(): void { flush(true); },
  };
}
