#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import { isIP } from 'node:net';
import { join, resolve } from 'node:path';
const keep = process.env.KAKI_DEV_KEEP === '1';
const host = process.env.KAKI_HOST ?? '127.0.0.1';
if (!isIP(host)) throw new Error('KAKI_HOST must be an IP literal, such as 127.0.0.1 or your laptop LAN IP; hostnames are not supported.');
const webPort = Number(process.env.KAKI_PORT_WEB ?? 5150);
const signalPort = Number(process.env.KAKI_PORT_SIGNAL ?? 5151);
if (![webPort, signalPort].every(port => Number.isInteger(port) && port > 0 && port < 65536) || webPort === signalPort) throw new Error('Use two different ports between 1 and 65535.');
const advertisedHost = host === '0.0.0.0' ? Object.values(networkInterfaces()).flat().find(address => address?.family === 'IPv4' && !address.internal)?.address ?? '127.0.0.1' : host;
const urlHost = isIP(advertisedHost) === 6 ? `[${advertisedHost}]` : advertisedHost;
const web = new URL(`http://${urlHost}:${String(webPort)}`).origin;
const signal = new URL(`http://${urlHost}:${String(signalPort)}`).origin;
const temp = mkdtempSync(join(tmpdir(), 'kaki-local-'));
const secrets = join(temp, '.dev.vars');
writeFileSync(secrets, `ADMISSION_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
/** @type {import('node:child_process').ChildProcess[]} */
const children = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) signalGroup(child, 'SIGTERM');
  rmSync(temp, { recursive: true, force: true });
  process.exitCode = code;
  // A bounded grace period also catches a tool whose child ignores SIGTERM.
  const timer = setTimeout(() => { for (const child of children) signalGroup(child, 'SIGKILL'); }, 2000);
  timer.unref();
}
/** @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} signal
 */
function signalGroup(child, signal) {
  if (child.pid === undefined) return;
  try { process.kill(-child.pid, signal); } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
  }
}
/** @param {string[]} args */
function launch(args, env = process.env) {
  const child = spawn('pnpm', args, { stdio: 'inherit', env, detached: true });
  children.push(child);
  console.log(`[kaki dev] ${args.includes('@kaki/signal') ? 'Pairing' : 'Web'} process group PID: ${String(child.pid)}`);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!closing && !keep) stop(code ?? 0); });
}
process.on('SIGINT', () => { stop(); });
process.on('SIGTERM', () => { stop(); });
process.on('exit', () => { rmSync(temp, { recursive: true, force: true }); });
launch(['--filter', '@kaki/signal', 'exec', 'wrangler', 'dev', '--local', '--env', 'dev', '--ip', host === 'localhost' ? '127.0.0.1' : host, '--port', String(signalPort), '--env-file', resolve(secrets), '--var', `ALLOWED_ORIGINS:${host === '127.0.0.1' ? `${web},http://localhost:${String(webPort)}` : web}`]);
launch(['--filter', '@kaki/web', 'dev'], { ...process.env, KAKI_HOST: host, KAKI_PORT_WEB: String(webPort), KAKI_SIGNAL_URL: signal, KAKI_JOIN_ORIGIN: web });
console.log(`Host: ${web}/host\nPhone: ${web}/play\nPairing: ${signal}`);
