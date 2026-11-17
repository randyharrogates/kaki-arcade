/// <reference lib="dom" />
import { spawnSync } from 'node:child_process';
import type { Page } from 'playwright';
import type { Harness } from '../uat/harness.js';
import { clockTick, resolution, evaluate, machine, summary, timing } from './metrics.js';
import { correlate } from './timing.js';
import type { PerfTimingEvent } from '../../packages/platform/src/harness/perf-timing';
import type { Timing } from './metrics.js';
import { writeReport } from './report.js';
export interface Scenario {
  name: string;
  /** Development page on the harness origin; skips room creation and phone pairing. */
  hostPage?: string;
  frameReason?: string;
  busiestRound?: boolean;
  inputReason?: string;
  feedbackReason?: string;
  afterCapture?(harness: Harness): Promise<void>;
  run(harness: Harness, capture: Capture): Promise<void>;
}
export interface Capture {
  roundStart(): Promise<void>;
  roundEnd(): Promise<void>;
  inputs: Timing[];
  /** Call only at the host's real simulation apply point, correlated by input sequence. */
  applied(sample: Timing): void;
  events: PerfTimingEvent[];
  /** Expose before installing the opt-in timing hook on a host/phone. Hook record calls
   * globalThis.__kakiPerfRecord(event); it never sends timing on the gameplay channel. */
  observe(page: Page): Promise<void>;
}
/** Browser-side observer; injected by the harness, absent from the product bundle. */
export async function startFrames(page: Page) {
  await page.evaluate(() => {
    let clockTickMs = Infinity, clockPrevious = performance.now();
    for (let i = 0; i < 10000; i++) { const now = performance.now(); if (now > clockPrevious) clockTickMs = Math.min(clockTickMs, now - clockPrevious); clockPrevious = now; }
    const frames: number[] = [], longTasks: number[] = [];
    const slowFrames: { startTime: number; duration: number }[] = [], longTaskEntries: { startTime: number; duration: number }[] = [];
    const recordTask = (entry: PerformanceEntry) => { longTasks.push(entry.duration); longTaskEntries.push({ startTime: entry.startTime, duration: entry.duration }); };
    let previous: number | undefined, stopped = false, hidden = document.hidden;
    const visibility = () => { hidden ||= document.hidden; };
    document.addEventListener('visibilitychange', visibility);
    const tick = (now: number) => { if (stopped) return; if (previous !== undefined) { const duration = now - previous; frames.push(duration); if (duration > 50) slowFrames.push({ startTime: previous, duration }); } previous = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const supported = PerformanceObserver.supportedEntryTypes.includes('longtask');
    const observer = supported ? new PerformanceObserver(list => { for (const entry of list.getEntries()) recordTask(entry); }) : null;
    observer?.observe({ type: 'longtask' });
    Object.assign(globalThis, { __kakiPerfStop() { stopped = true; for (const entry of observer?.takeRecords() ?? []) recordTask(entry); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); return { clockTickMs, frames, slowFrames, longTasks, longTaskEntries, longTasksSupported: supported, hidden }; } });
  });
}
export async function browserScenario(h: Harness, scenario: Scenario, headed: boolean, command = '', build = 'development', memoryGate?: object) {
  const environment = machine(), tick = clockTick();
  await h.host.addInitScript(() => {
    const peers: RTCPeerConnection[] = [];
    const Original = RTCPeerConnection;
    Object.assign(globalThis, { RTCPeerConnection: class extends Original { constructor(config?: RTCConfiguration) { super(config); peers.push(this); } }, __kakiPerfPeers: peers });
  });
  await openHost(h, scenario);
  const refresh = await h.host.evaluate(async () => {
    const intervals: number[] = [];
    let previous = await new Promise<number>(resolve => requestAnimationFrame(resolve));
    for (let i = 0; i < 60; i++) { const now = await new Promise<number>(resolve => requestAnimationFrame(resolve)); intervals.push(now - previous); previous = now; }
    intervals.sort((a, b) => a - b);
    const medianMs = intervals[29] ?? 0;
    return { samples: intervals.length, medianMs, measuredHz: 1000 / medianMs };
  }).catch(() => null);
  const display = process.platform === 'darwin' ? spawnSync('system_profiler', ['SPDisplaysDataType'], { encoding: 'utf8', timeout: 5000 }) : null;
  const osRefreshHz = Number(/(?:Refresh Rate:|@)\s*(\d+(?:\.\d+)?)\s*Hz/i.exec(display?.stdout ?? '')?.[1]) || null;
  await startFrames(h.host);
  const steps: { name: string; startTime: number; endTime: number }[] = [];
  const originalStep = h.step.bind(h);
  const hostNow = () => h.host.evaluate(() => performance.now());
  h.step = async <T>(name: string, action: () => Promise<T>, timeout?: number): Promise<T> => {
    const startTime = await hostNow();
    try { return await originalStep(name, action, timeout); }
    finally { steps.push({ name, startTime, endTime: await hostNow() }); }
  };
  const inputs: Timing[] = [];
  const events: PerfTimingEvent[] = [];
  let roundStart: number | undefined, roundSeconds = 0, roundRaw: Awaited<ReturnType<typeof stopFrames>> | undefined;
  const clocks: { offsetMs: number; uncertaintyMs: number; clockTickMs: number }[] = [];
  const capture: Capture = { inputs, events,
    async roundStart() { if (roundStart !== undefined) throw new Error('Round already started'); await stopFrames(h.host); await startFrames(h.host); roundStart = performance.now(); },
    async roundEnd() { if (roundStart === undefined || roundRaw) throw new Error('Round not active'); roundSeconds = (performance.now() - roundStart) / 1000; roundRaw = await stopFrames(h.host); },
    async observe(page) {
    let best = { offsetMs: 0, uncertaintyMs: Infinity };
    for (let i = 0; i < 5; i++) {
      const before = performance.timeOrigin + performance.now();
      const remote = await page.evaluate(() => performance.timeOrigin + performance.now());
      const after = performance.timeOrigin + performance.now();
      const uncertaintyMs = (after - before) / 2;
      if (uncertaintyMs < best.uncertaintyMs) best = { offsetMs: (before + after) / 2 - remote, uncertaintyMs };
    }
    const contextTick = await page.evaluate(() => {
      let tick = Infinity, previous = performance.now();
      for (let i = 0; i < 10000; i++) { const now = performance.now(); if (now > previous) tick = Math.min(tick, now - previous); previous = now; }
      return tick;
    });
    clocks.push({ ...best, clockTickMs: contextTick });
    await page.exposeFunction('__kakiPerfRecord', (event: PerfTimingEvent) => { events.push({ ...event, epochMs: event.epochMs + best.offsetMs }); });
  }, applied(sample) { timing(sample); inputs.push(sample); } };
  const start = performance.now();
  try { await scenario.run(h, capture); } finally { h.step = originalStep; }
  const endEnvironment = machine();
  const seconds = (performance.now() - start) / 1000;
  const raw = roundRaw ?? await stopFrames(h.host);
  await scenario.afterCapture?.(h);
  const direct = await h.host.evaluate(async () => {
    const peers = (globalThis as unknown as { __kakiPerfPeers: RTCPeerConnection[] }).__kakiPerfPeers;
    const paths: string[] = [];
    for (const peer of peers.filter(p => p.connectionState === 'connected')) {
      const stats = await peer.getStats();
      for (const value of stats.values()) {
        const transport = value as { type: string; selectedCandidatePairId?: string };
        if (transport.type !== 'transport' || !transport.selectedCandidatePairId) continue;
        const pair = stats.get(transport.selectedCandidatePairId) as { localCandidateId: string; remoteCandidateId: string } | undefined;
        if (!pair) continue;
        const local = stats.get(pair.localCandidateId) as { candidateType?: string } | undefined, remote = stats.get(pair.remoteCandidateId) as { candidateType?: string } | undefined;
        paths.push([local?.candidateType, remote?.candidateType].every(type => type === 'host' || type === 'srflx') ? 'direct' : 'unverified');
      }
    }
    return { verified: paths.length >= peers.filter(p => p.connectionState === 'connected').length && paths.length > 0 && paths.every(p => p === 'direct'), paths };
  });
  const correlated = correlate(events); inputs.push(...correlated.samples);
  const parsed = inputs.map(timing);
  const manualMissingFeedback = parsed.slice(0, inputs.length - correlated.samples.length).filter(t => t.feedbackFrames === null).length;
  const delays = parsed.map(t => t.inputMs), feedback = [...correlated.feedback, ...parsed.slice(0, inputs.length - correlated.samples.length).flatMap(t => t.feedbackFrames === null ? [] : [t.feedbackFrames])];
  const assessments = [
    evaluate('PERF-001', raw.frames, { minimum: 600, headed, seconds: roundRaw ? roundSeconds : 0, reason: nonempty(scenario.frameReason) ?? (h.maxPhones !== 8 ? 'PERF-001 specifies eight players' : !scenario.busiestRound ? 'Scenario has not declared the busiest full game round' : raw.hidden ? 'Host was hidden; rAF may be throttled' : undefined) }),
    evaluate('PERF-010', delays, { minimum: 100, reason: nonempty(scenario.inputReason) ?? (correlated.incomplete ? 'Incomplete timing traces; input coverage not established' : undefined) ?? (direct.verified ? undefined : 'Direct path not verified') }),
    evaluate('PERF-012', feedback, { minimum: 100, reason: nonempty(scenario.feedbackReason) ?? (correlated.missingFeedback || manualMissingFeedback || feedback.length < inputs.length ? 'Touch without feedback: coverage unknown; not assessed rather than silently passing' : undefined) }),
    { id: 'PERF-030', status: 'not assessed' as const, reason: 'Not a 30-minute session; no memory/stuck-input coverage' },
  ];
  const contention = environment.contention.startsWith('detected') || endEnvironment.contention.startsWith('detected');
  if (contention) for (const assessment of assessments) if (assessment.status === 'pass') { assessment.status = 'not assessed'; assessment.reason = 'contention'; }
  const requiredAssessments = nonempty(scenario.feedbackReason) ? [] : ['PERF-012'];
  const exit = await writeReport(process.cwd(), scenario.name, { schemaVersion: 1, layer: 'browser', scenario: scenario.name, machine: { ...environment, memoryGate, loadAverageEnd: endEnvironment.loadAverageStart, contentionEnd: endEnvironment.contention }, assessments, requiredAssessments,
    notes: [`Command: ${command}`, `Build: ${build}`, 'Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.', 'Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.'],
    measurements: [{ browser: 'Playwright Chromium (not branded Chrome)', refresh: { ...refresh, osRefreshHz }, steps, hostClock: 'performance.now() milliseconds relative to host page timeOrigin', browserVersion: h.browser.version(), headed, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, phoneViewport: { width: 844, height: 390 }, phoneDeviceScaleFactor: 3, phones: scenario.hostPage ? 0 : h.maxPhones, build, command, clocks, direct, seconds, roundSeconds, nodeClockTickMs: tick, clockTickMs: raw.clockTickMs, timingResolution: { framesMs: resolution(summary(raw.frames), raw.clockTickMs), inputMs: resolution(summary(delays), Math.max(tick, ...clocks.map(c => c.clockTickMs))), longTasksMs: resolution(summary(raw.longTasks), raw.clockTickMs) }, minimumFrames: 600, minimumInputs: 100, frameSampleStatus: raw.frames.length < 600 || !roundRaw || roundSeconds < 180 ? 'insufficient samples' : 'sufficient samples', framesMs: summary(raw.frames), longTasksMs: summary(raw.longTasks), longTasksSupported: raw.longTasksSupported, inputMs: summary(delays), feedbackFrames: summary(feedback), raw, inputs, timingEvents: events, incompleteInputs: correlated.incomplete }],
  }, h.evidence);
  if (exit || contention || assessments.some(a => a.status === 'not assessed' && (a.reason === 'contention' || requiredAssessments.includes(a.id)))) throw new Error(assessments.some(a => a.status === 'fail') ? 'Performance budget exceeded; see perf.json' : assessments.some(a => a.status === 'insufficient samples') ? 'Performance: insufficient samples; see perf.json' : 'Performance not assessed; see perf.json');
}

async function stopFrames(page: Page) {
  return page.evaluate(() => (globalThis as unknown as { __kakiPerfStop(): { clockTickMs: number; frames: number[]; slowFrames: { startTime: number; duration: number }[]; longTaskEntries: { startTime: number; duration: number }[]; longTasks: number[]; longTasksSupported: boolean; hidden: boolean } }).__kakiPerfStop());
}

function nonempty(reason: string | undefined) { return reason?.trim() ? reason : undefined; }

/** Keep custom pages on the local stack; external URLs are not scenario pages. */
export async function openHost(h: Harness, scenario: Scenario) {
  if (!scenario.hostPage) { await h.createRoom(); return; }
  const url = new URL(scenario.hostPage, h.origin);
  if (url.origin !== h.origin || !scenario.hostPage.startsWith('/') || scenario.hostPage.startsWith('//')) throw new Error('Scenario hostPage must be a local absolute path');
  await h.host.goto(url.href);
}
