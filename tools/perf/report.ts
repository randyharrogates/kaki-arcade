import { writeFile, readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { prepareEvidence } from '../uat/core.js';
import { significant, type Assessment } from './metrics.js';
export interface Report { schemaVersion: 1; layer: 'simulation' | 'browser'; machine: object; requiredAssessments?: string[]; scenario: string; assessments: Assessment[]; measurements: object[]; notes: string[] }
function tableRow(measurement: object) {
  const m = measurement as Record<string, unknown>;
  const stats = (m.stepMs ?? m.framesMs) as Record<string, unknown> | undefined;
  const allocation = m.allocation as Record<string, unknown> | undefined;
  const gc = (m.gc ?? m.longTasksMs) as Record<string, unknown> | undefined;
  const number = (value: unknown) => typeof value === 'number' ? value.toFixed(6) : '—';
  const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
  return `| ${text(m.game ?? 'browser')} | ${text(m.players ?? m.phones)} | ${text(stats?.count ?? 0)} | ${number(stats?.median)} | ${number(stats?.p95)} | ${number(stats?.p99)} | ${number(stats?.max)} | ${number(allocation?.bytesPerStep)} | ${number(allocation?.gameBytesPerStep)} | ${number(gc?.max)} |`;
}
export async function writeReport(root: string, name: string, report: Report, folder?: string) {
  if (folder && ((await lstat(folder)).isSymbolicLink() || !(await readFile(join(folder, '.uat-run'), 'utf8')).startsWith('kaki-uat-v1\n'))) throw new Error('Refusing unmarked or linked prepared run');
  const output = folder ?? await prepareEvidence(root, name, 'perf');
  await writeFile(join(output, 'perf.json'), JSON.stringify(report, null, 2) + '\n');
  const assessmentTable = report.layer === 'simulation' ? `\n\nPERF-040 assessment samples (milliseconds):\n\n| Game | Matches | Seeds | Samples | Median | p95 | p99 | Max |\n|---|---:|---|---:|---:|---:|---:|---:|\n${report.measurements.flatMap(measurement => {
    const m = measurement as { game?: string; assessmentSeeds?: number[]; assessmentStepMs?: { count: number; median: number | null; p95: number | null; p99: number | null; max: number | null } };
    const stats = m.assessmentStepMs;
    return stats ? [`| ${m.game ?? 'unknown'} | ${String(m.assessmentSeeds?.length ?? 0)} | ${m.assessmentSeeds?.join(', ') ?? '—'} | ${String(stats.count)} | ${significant(stats.median)} | ${significant(stats.p95)} | ${significant(stats.p99)} | ${significant(stats.max)} |`] : [];
  }).join('\n')}` : '';
  await writeFile(join(output, 'PERF.md'), `# ${report.scenario}\n\nMemory gate: ${JSON.stringify((report.machine as { memoryGate?: object }).memoryGate ?? null)}\n\n${report.notes.join('\n\n')}\n\nMachine: ${JSON.stringify(report.machine)}\n\n| Budget | Result | Reason |\n|---|---|---|\n${report.assessments.map(a => `| ${a.id}${a.game ? ` (${a.game})` : ''} | ${a.status}${a.status === 'not assessed' && a.reason.includes('contention') ? ' (contention)' : ''} | ${a.reason} |`).join('\n')}\n\nTime in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. ${report.layer === 'simulation' ? 'Allocation includes the bot/driver harness.' : 'Browser identity and version: see perf.json (Chromium is not branded Chrome). No allocation measurement.'} See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.\n\n| Game | Players | Samples${report.layer === 'simulation' ? ' (first match)' : ''} | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${report.measurements.map(tableRow).join('\n')}\n\n${assessmentTable}\n\nClock and resolution flags:\n${report.measurements.map(m => JSON.stringify({ scenario: (m as Record<string, unknown>).game ?? report.scenario, clockTickMs: (m as Record<string, unknown>).clockTickMs, timingResolution: (m as Record<string, unknown>).timingResolution })).join('\n\n')}\n`);
  return report.assessments.some(a => a.status === 'fail' || a.status === 'insufficient samples' || (a.status === 'not assessed' && (a.reason.includes('contention') || report.requiredAssessments?.includes(a.id)))) ? 1 : 0;
}
