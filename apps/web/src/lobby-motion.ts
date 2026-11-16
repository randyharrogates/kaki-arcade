import { crossfade, enter, GHOST_OPACITY } from '@kaki/ui';
import type { ReducedOption } from '@kaki/ui';

/** Complementary masks share a boundary: content never paints over another label. */
export function lobbyMasks(progress: number) {
  const boundary = Math.round(Math.min(1, Math.max(0, progress)) * 1000000) / 10000;
  return {
    incoming: `inset(0 0 ${String(100 - boundary)}% 0)`,
    outgoing: `inset(${String(boundary)}% 0 0 0)`,
  };
}
export function lobbyMotion(row: boolean, index: number, option: ReducedOption = {}) {
  const timing = row ? enter({ ...option, kind: 'row', index }).options : crossfade(option).incoming.options;
  const start = lobbyMasks(0);
  const end = lobbyMasks(1);
  const reduced = timing.duration === 0;
  return {
    incoming: { keyframes: reduced ? [{ clipPath: end.incoming }] : [{ clipPath: start.incoming }, { clipPath: end.incoming }], options: timing },
    outgoing: { keyframes: reduced ? [{ clipPath: end.outgoing }] : [{ clipPath: start.outgoing, opacity: 1, offset: 0 }, { clipPath: lobbyMasks(1 / 3).outgoing, opacity: GHOST_OPACITY, offset: 1 / 3 }, { clipPath: end.outgoing, opacity: GHOST_OPACITY, offset: 1 }], options: { ...timing } },
  };
}
