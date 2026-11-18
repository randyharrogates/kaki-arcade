import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { lstat, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';

export const hostPresets = { '720p': { width: 1280, height: 720 }, '1080p': { width: 1920, height: 1080 }, '4K': { width: 3840, height: 2160 } };
export const phonePresets = { portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } };
export function safeName(value: string): string {
  if (!/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(value)) throw new Error(`Unsafe evidence name: ${value}`);
  return value;
}
export function parseArgs(args: string[], env: NodeJS.ProcessEnv = process.env) {
  const values = args.filter((value, i) => !(i === 0 && value === '--'));
  const slice = safeName(values.shift() ?? '');
  const signalVars: string[] = [];
  let out = 'auto'; let maxMb = 12; let timeoutMin = 10;
  let frames = false; let headed = env.KAKI_UAT_HEADED === '1'; let phones = 8; let keep = false;
  while (values.length) {
    const arg = values.shift();
    if (arg === '--signal-var') {
      const value = values.shift() ?? '';
      if (!/^[A-Z][A-Z0-9_]*:[A-Za-z0-9_.-]+$/.test(value)) throw new Error('--signal-var requires NAME:value');
      signalVars.push(value);
    } else if (arg === '--frames') frames = true;
    else if (arg === '--headed') headed = true;
    else if (arg === '--keep') keep = true;
    else if (arg === '--out') { out = values.shift() ?? ''; if (!/^[A-Za-z0-9-]+$/.test(out)) throw new Error('--out requires letters, digits or dashes'); }
    else if (arg === '--timeout-min') { timeoutMin = Number(values.shift()); if (!Number.isFinite(timeoutMin) || timeoutMin <= 0) throw new Error('--timeout-min must be positive'); }
    else if (arg === '--max-mb') { maxMb = Number(values.shift()); if (!Number.isFinite(maxMb) || maxMb <= 0) throw new Error('--max-mb must be positive'); }
    else if (arg === '--phones') {
      const value = values.shift() ?? '';
      if (!/^[1-8]$/.test(value)) throw new Error('--phones must be 1 to 8');
      phones = Number(value);
    } else throw new Error(`Unknown argument: ${arg ?? ''}`);
  }
  return { slice, headed, phones, keep, out, maxMb, timeoutMin, frames, signalVars };
}
export function selectPorts(env: NodeJS.ProcessEnv = process.env, issue = 'main') {
  const match = /^([A-Z])-(\d+)(?:$|-)/.exec(issue);
  const parts = match ?? ['', 'X', '0'];
  const index = 'GSFCKRPTAX'.indexOf(parts[1]) + 1 || 11;
  const base = 4000 + index * 270 + (Number(parts[2]) % 27) * 10;
  const port = (value: string | undefined, fallback: number) => {
    if (value !== undefined && !/^\d+$/.test(value)) throw new Error('Invalid port');
    const result = Number(value ?? fallback);
    if (!Number.isInteger(result) || result < 1024 || result > 65535) throw new Error('Invalid port');
    return result;
  };
  const web = port(env.KAKI_PORT_WEB, base); const signal = port(env.KAKI_PORT_SIGNAL, base + 1);
  if (web === signal) throw new Error('Web and signal ports must differ');
  return { web, signal };
}
export function memoryGate(run: () => { status: number | null; stdout: string; stderr: string } = () => spawnSync('sh', ['tools/agents/memcheck.sh', 'uat'], { encoding: 'utf8' })) {
  const result = run();
  if (result.status !== 0) throw new Error(`Memory gate refused: ${result.stdout}${result.stderr}`);
  return result.stdout;
}
export async function assertPortFree(port: number) {
  for (const host of ['127.0.0.1', '::1', 'localhost']) await new Promise<void>((resolve, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(port, host, () => { server.close(error => { if (error) reject(error); else resolve(); }); });
  });
}
const stoppedGroups = new Map<number, Promise<void>>();
export function startGroup(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const child = spawn(command, args, { ...options, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  if (child.pid) stoppedGroups.delete(child.pid);
  // Drain output, but do not persist server output that might contain credentials.
  child.stdout.resume(); child.stderr.resume();
  let failure: Error | undefined;
  child.on('error', error => { failure = error; });
  return { child, check: () => { if (failure) throw failure; if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${command} exited before readiness`); } };
}
export function stopGroup(pid: number | undefined, graceMs = 1000): Promise<void> {
  if (!pid) return Promise.resolve();
  const existing = stoppedGroups.get(pid); if (existing) return existing;
  const stopping = (async () => {
    const signal = (name: NodeJS.Signals) => { try { process.kill(-pid, name); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; } };
    signal('SIGTERM');
    // A dead group leader does not mean its descendants have stopped.
    await delay(graceMs); signal('SIGKILL');
  })();
  stoppedGroups.set(pid, stopping);
  void stopping.catch(() => { stoppedGroups.delete(pid); });
  return stopping;
}

export async function ready(url: string, check: () => void, signal: AbortSignal, timeoutMs = 60000, accepts: (response: Response) => Promise<boolean> = response => Promise.resolve(response.ok)) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    signal.throwIfAborted(); check();
    try { const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]) }); const accepted = await accepts(response); if (!response.bodyUsed) await response.body?.cancel(); check(); if (accepted) return; }
    catch { signal.throwIfAborted(); }
    await delay(200, undefined, { signal });
  }
  throw new Error(`Readiness timed out: ${url}`);
}
export function evidenceName(step: number, target: string, name: string) {
  if (!Number.isInteger(step) || step < 1) throw new Error('Invalid evidence step');
  return `${String(step).padStart(2, '0')}-${safeName(target)}-${safeName(name)}.png`;
}
export interface ErrorRecord { page: string; kind: 'console' | 'pageerror' | 'crash' | 'requestfailed'; url?: string; text: string; expected: boolean }
export function matchesError(text: string, pattern: string | RegExp) {
  if (typeof pattern === 'string') return text === pattern;
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')).test(text);
}
export async function prepareEvidence(root: string, slice: string, out: string) {
  safeName(slice);
  if (!/^[A-Za-z0-9-]+$/.test(out)) throw new Error('Unsafe --out');
  let parent = resolve(root);
  for (const part of ['uat', 'evidence', slice]) {
    parent = join(parent, part);
    try { if ((await lstat(parent)).isSymbolicLink()) throw new Error('Evidence parent must not be a symlink'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const folder = join(parent, out);
  try {
    if ((await lstat(folder)).isSymbolicLink()) throw new Error('Evidence run must not be a symlink');
    const marker = await readFile(join(folder, '.uat-run'), 'utf8').catch(() => '');
    if (!marker.startsWith('kaki-uat-v1\n')) throw new Error(`Refusing existing unmarked evidence folder ${folder}; choose a different --out name from human evidence`);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, '.uat-run'), 'kaki-uat-v1\n' + JSON.stringify({ wranglerCreated: false }));
  return folder;
}
export interface ReportMetadata {
  shotStates?: { file: string; unsettled: boolean }[];
  command: string; commit: string; viewports: string[];
  steps: { name: string; ms: number; status: string }[];
  joins: { name: string; ms: number }[]; errors: ErrorRecord[];
}
export function reportSkeleton(slice: string, shots: string[], meta?: ReportMetadata) {
  const groups = new Map<string, string[]>();
  for (const file of shots) {
    const section = /strip|frame\d/.test(file) ? 'Strips' : /demo-(720p|1080p|4K)/.exec(file)?.[1];
    const key = section ? (section === 'Strips' ? section : 'Demo ' + section) : 'Real server';
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  const counts = new Map<string, number>();
  for (const e of meta?.errors ?? []) if (e.expected) { const key = e.page + ': ' + e.text; counts.set(key, (counts.get(key) ?? 0) + 1); }
  return `# ${safeName(slice)} UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: \`${meta?.command ?? ''}\`
Commit: \`${meta?.commit ?? ''}\`
Viewports: ${meta?.viewports.join(', ') ?? ''}

| Timing | ms | Status |
|---|---:|---|
${[...(meta?.steps ?? []), ...(meta?.joins ?? []).map(j => ({ ...j, status: 'joined' }))].map(t => `| ${t.name} | ${t.ms.toFixed(1)} | ${t.status} |`).join('\n')}

Expected errors (count):
${[...counts].map(([text, count]) => `- ${String(count)} × ${text}`).join('\n') || 'None'}

${[...groups].map(([section, files]) => `## ${section}

| Screenshot | What it shows | Looked at by |
|---|---|---|
${files.map(file => `| ![${file}](${file}) | ${meta?.shotStates?.find(s => s.file === file)?.unsettled ? "UNSETTLED " : ""}| |`).join('\n')}`).join('\n\n')}

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
`;
}
export interface Point { x: number; y: number }
export function thumbPath(points: Point[], steps = 10): Point[] {
  if (!Number.isInteger(steps) || steps < 1 || points.length < 1 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Invalid thumb path');
  const first = points[0]; if (!first) throw new Error('Empty thumb path');
  const output = [{ ...first }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]; const b = points[i]; if (!a || !b) throw new Error('Missing path point');
    for (let n = 1; n <= steps; n++) output.push({ x: a.x + (b.x - a.x) * n / steps, y: a.y + (b.y - a.y) * n / steps });
  }
  return output;
}

export function errorMessage(error: unknown): string { return error instanceof Error ? error.stack ?? error.message : typeof error === 'string' ? error : JSON.stringify(error); }

/** Race even promises that never react to browser closure; always release the timer. */
export async function deadline<T>(action: Promise<T>, ms: number, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([action, new Promise<never>((_, reject) => {
    timer = setTimeout(() => { reject(new Error(`${name} timed out after ${String(ms)} ms`)); }, ms);
  })]); } finally { clearTimeout(timer); }
}
