/// <reference lib="dom" />
import { pressScale } from '../../packages/ui/src/motion';
import type { Locator, Page } from 'playwright';
import type { Harness } from '../uat/harness.js';
import type { Capture } from './browser.js';
import type { PerfTimingEvent } from '../../packages/platform/src/harness/perf-timing';

/** Serial, harness-armed action IDs: no gameplay protocol changes. Each arm must finish
 * before another press; missing receipt/application cannot shift later correlations. */
export async function actionTiming(h: Harness, capture: Capture, phones: Page[]) {
  if (capture.build === 'production') return undefined;
  for (const page of [h.host, ...phones]) await capture.observe(page);
  await h.host.evaluate(() => {
    window.__perfAcceptedActions = [];
    window.__kakiActionTiming = (stage, player, control, value, accepted) => {
      if (stage === 'applied' && accepted) window.__perfAcceptedActions?.push({ step: window.__perfStep ?? 'setup', player, control, ...(value === undefined ? {} : { value }), ...accepted });
      const sample = window.__perfAction;
      if (sample?.player !== player || sample.control !== control || sample.value !== value) return;
      window.__perfEmit?.(stage, sample.player, sample.sequence);
      if (stage === 'applied') window.__perfApplied = sample.sequence;
    };
  });
  for (const page of [h.host, ...phones]) await page.evaluate(() => {
    let frame = 0;
    const tick = () => { frame++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    window.__perfEmit = (stage, player, sequence) => {
      window.__kakiPerfRecord?.({ marker: 'kaki-perf-timing-v1', stage, player, sequence, frame, epochMs: performance.timeOrigin + performance.now() });
    };
  });
  let sequence = 0;
  return async (phone: Page, target: Locator, player: string, control: string, value: string | number) => {
    const sample = { player, control, value, sequence: sequence++ };
    await h.host.evaluate(sample => { window.__perfAction = sample; }, sample);
    await phone.evaluate(armPhoneFeedback, { ...sample, pressedScale: pressScale(true) });
    const box = await target.boundingBox();
    if (!box) throw new Error('Timing target has no bounds');
    const thumb = await h.thumbs(phone);
    try {
      await thumb.down({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      // Keep held through presentation, then await actual simulation consumption.
      await phone.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); })));
      await h.host.waitForFunction(sequence => window.__perfApplied === sequence, sample.sequence);
    } finally { await thumb.dispose(); }
  };
}
declare global {
  interface Window {
    __kakiActionTiming?: (stage: 'receipt' | 'applied', player: string, control: string, value?: string | number, accepted?: { round: number | null; wireRevision: number; gameRevision: number }) => void;
    __perfStep?: string;
    __perfAcceptedActions?: { step: string; player: string; control: string; value?: string | number; round: number | null; wireRevision: number; gameRevision: number }[];
    __perfAction?: { player: string; control: string; value: string | number; sequence: number };
    __perfApplied?: number;
    __perfEmit?: (stage: PerfTimingEvent['stage'], player: string, sequence: number) => void;
    __kakiPerfRecord?: (event: PerfTimingEvent) => void;
  }
}

/** Timestamp before the control handler; inspect its local pressed visual next frame. */
export function armPhoneFeedback(sample: { player: string; sequence: number; pressedScale: number }) {
  document.addEventListener('pointerdown', event => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button) return;
    window.__perfEmit?.('touch', sample.player, sample.sequence);
    requestAnimationFrame(() => {
      const matrix = /^matrix\(([^)]+)\)$/.exec(getComputedStyle(button).transform)?.[1]?.split(',').map(Number);
      if (button.dataset.held === 'true' && matrix?.length === 6 && matrix.every((value, index) => Math.abs(value - (index === 0 || index === 3 ? sample.pressedScale : 0)) < 0.0001)) window.__perfEmit?.('feedback', sample.player, sample.sequence);
    });
  }, { capture: true, once: true });
}
