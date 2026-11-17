/** Explicitly opted-in development instrumentation. Never exported from a product entry.
 * Import only inside import.meta.env.DEV at the future controller/session integration.
 * Caller supplies performance.timeOrigin + performance.now() and its presentation frame.
 * Record out of band to the local harness; never change the gameplay wire protocol.
 */
export interface PerfTimingEvent {
  marker: 'kaki-perf-timing-v1';
  player: string;
  sequence: number;
  stage: 'touch' | 'receipt' | 'applied' | 'feedback';
  epochMs: number;
  frame: number;
}
export function createPerfTiming(options: { enabled: boolean; player: string; now(): number; frame(): number; record(event: PerfTimingEvent): void }) {
  if (!options.enabled) return undefined;
  return (stage: PerfTimingEvent['stage'], sequence: number) => {
    options.record({ marker: 'kaki-perf-timing-v1', player: options.player, sequence, stage, epochMs: options.now(), frame: options.frame() });
  };
}
