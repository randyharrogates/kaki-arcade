import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { expect, it } from 'vitest';

/** The launcher honours the KAKI_PORT_* variables; drop any the caller's shell set, so the defaults are tested. */
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('KAKI_PORT_')));

it.each(['127.0.0.1', '192.168.1.23', '0.0.0.0'])('launcher binds exactly %s and cleans child groups after a kept pairing exit', async host => {
  const temp = mkdtempSync(join(tmpdir(), 'kaki-launcher-'));
  const log = join(temp, 'children.jsonl');
  const executable = join(temp, 'pnpm');
  writeFileSync(executable, `#!${process.execPath}\nimport { appendFileSync } from 'node:fs';\nappendFileSync(process.env.TEST_LOG, JSON.stringify({ args: process.argv.slice(2), host: process.env.KAKI_HOST, pid: process.pid }) + '\\n');\nsetInterval(() => {}, 1000);\n`);
  chmodSync(executable, 0o755);
  const child = spawn(process.execPath, [resolve('tools/dev.mjs')], { env: { ...cleanEnv(), PATH: `${temp}:${process.env.PATH ?? ''}`, KAKI_HOST: host, KAKI_DEV_KEEP: '1', TEST_LOG: log }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', data => { output += String(data); });
  const exited = once(child, 'exit');
  let pids: number[] = [];
  try {
    let rows: { args: string[]; host: string; pid: number }[] = [];
    for (let attempt = 0; attempt < 500; attempt++) { // up to 10 s: child start-up is slow under a loaded machine
      try { rows = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line) as typeof rows[number]); } catch { /* Child startup. */ }
      if (rows.length === 2) break;
      await pause(20);
    }
    expect(rows).toHaveLength(2); pids = rows.map(row => row.pid);
    const pairing = rows.find(row => row.args.includes('@kaki/signal'));
    const web = rows.find(row => row.args.includes('@kaki/web'));
    expect(pairing?.args[(pairing.args.indexOf('--ip')) + 1]).toBe(host === 'localhost' ? '127.0.0.1' : host);
    expect(web?.host).toBe(host);
    if (host === '0.0.0.0') { expect(output).toMatch(/Phone: http:\/\/(?!0\.0\.0\.0)[^/]+:5150\/play/); }
    else expect(output).toContain(`Phone: http://${host}:5150/play`);
    if (!pairing || !web) throw new Error('Missing child');
    process.kill(-pairing.pid, 'SIGTERM'); await pause(50);
    expect(() => process.kill(web.pid, 0)).not.toThrow();
    child.kill('SIGINT'); await exited;
    for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    child.kill('SIGTERM');
    for (const pid of pids) { try { process.kill(-pid, 'SIGKILL'); } catch { /* Already exited. */ } }
    rmSync(temp, { recursive: true, force: true });
  }
}, 10000);

it.each(['localhost', 'arcade.example'])('refuses hostname %s with a clear message', async host => {
  const child = spawn(process.execPath, [resolve('tools/dev.mjs')], { env: { ...cleanEnv(), KAKI_HOST: host }, stdio: ['ignore', 'pipe', 'pipe'] });
  let error = ''; child.stderr.on('data', data => { error += String(data); });
  const result: unknown[] = await once(child, 'exit');
  expect(result[0]).toBe(1); expect(error).toContain('KAKI_HOST must be an IP literal');
});
