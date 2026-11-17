/** PERF-020 / D-129: fixed conditions, decimal bits converted to bytes for CDP. */
export const controllerConditions = {
  cpuRate: 4, viewport: { width: 844, height: 390 },
  network: { offline: false, downloadThroughput: 30_000_000 / 8, uploadThroughput: 15_000_000 / 8, latency: 20 },
};
export function controllerStartupReport(samplesMs: number[], browserVersion: string) {
  if (samplesMs.length !== 5 || samplesMs.some(ms => !Number.isFinite(ms) || ms <= 0)) throw new Error('Expected five positive finite cold-load samples');
  const medianMs = [...samplesMs].sort((a, b) => a - b)[2] ?? NaN;
  return { schemaVersion: 1, requirement: 'PERF-020', decision: 'D-129', build: 'production',
    route: '/play', browserVersion, headless: true, cacheDisabled: true, ...controllerConditions,
    samplesMs: [...samplesMs], medianMs, budgetMs: 2000, status: medianMs <= 2000 ? 'pass' : 'fail',
    measurement: 'Navigation start to painted room-code control accepting synthetic pointerdown in its attached handler',
  };
}
export function controllerStartupLine(report: ReturnType<typeof controllerStartupReport>) {
  return `PERF-020 controller start-up: median ${String(Math.round(report.medianMs))} ms / ${String(report.budgetMs)} (5 runs, CPU ${String(report.cpuRate)}x)`;
}
