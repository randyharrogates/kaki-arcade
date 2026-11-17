import { describe, expect, it } from 'vitest';
import { controllerStartupReport, controllerStartupLine } from './controller-startup-report';
describe('PERF-020 controller start-up report', () => {
  it('takes the median of five cold loads without mutating the samples', () => {
    const samples = [8000, 640, 400, 900, 500];
    const report = controllerStartupReport(samples, 'test-browser');
    expect(report.medianMs).toBe(640);
    expect(samples).toEqual([8000, 640, 400, 900, 500]);
    expect(JSON.parse(JSON.stringify(report))).toMatchObject({ status: 'pass', browserVersion: 'test-browser', cacheDisabled: true, cpuRate: 4, viewport: { width: 844, height: 390 }, network: { downloadThroughput: 3750000, uploadThroughput: 1875000, latency: 20 } });
    expect(controllerStartupLine(report)).toBe('PERF-020 controller start-up: median 640 ms / 2000 (5 runs, CPU 4x)');
  });
  it('prints the recorded CPU rate and budget (PERF-020)', () => {
    const report = { ...controllerStartupReport([1, 2, 3, 4, 5], ''), cpuRate: 6, budgetMs: 1234 };
    expect(controllerStartupLine(report)).toContain('/ 1234 (5 runs, CPU 6x)');
  });
  it('accepts 2000 ms and fails any median above it', () => {
    expect(controllerStartupReport([1, 2, 2000, 4000, 5000], '').status).toBe('pass');
    expect(controllerStartupReport([1, 2, 2000.01, 4000, 5000], '').status).toBe('fail');
  });
  it.each([[], [1, 2, 3, 4], [1, 2, 3, 4, 5, 6], [1, 2, NaN, 4, 5], [1, 2, Infinity, 4, 5], [0, 1, 2, 3, 4], [-1, 1, 2, 3, 4]].map(samples => ({ samples })))('rejects invalid or incomplete samples %j', ({ samples }) => {
    expect(() => controllerStartupReport(samples, '')).toThrow('five positive finite');
  });
});
