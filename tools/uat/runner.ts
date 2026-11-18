import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { errorMessage, prepareEvidence, parseArgs, selectPorts, memoryGate, assertPortFree, startGroup, stopGroup, ready } from './core.js';
import { Harness } from './harness.js';
import { builtInSlices } from './slices.js';

export async function run(args = process.argv.slice(2), extension?: { production?: boolean; command?: string; headed?: boolean; script: string; execute: (harness: Harness) => Promise<void> }) {
  if (args.filter(a => a !== '--').includes('--help')) {
    process.stdout.write('Usage: pnpm uat -- <slice> [--out name] [--max-mb 12] [--timeout-min 10] [--phones 1..8] [--headed] [--keep] [--frames] [--signal-var NAME:value]\nSlices: ' + Object.keys(builtInSlices).join(', ') + '\n');
    return;
  }
  const options = parseArgs(args); options.headed = extension?.headed ?? options.headed; const root = process.cwd();
  const script = extension?.script ?? resolve(root, 'uat/slices', `${options.slice}.mjs`); await access(script);
  const ports = selectPorts(process.env, basename(root));
  const origin = `http://127.0.0.1:${String(ports.web)}`; const signalUrl = `http://127.0.0.1:${String(ports.signal)}`;
  const wranglerState = join(root, 'apps/signal/.wrangler');
  try { await access(wranglerState); throw new Error('Refusing to remove existing apps/signal/.wrangler; archive it before UAT'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  memoryGate(); await Promise.all([assertPortFree(ports.web), assertPortFree(ports.signal)]);
  const evidence = await prepareEvidence(root, options.slice, options.out);
  const controller = new AbortController();
  let shuttingDown = false; let completed = false; let normalStop = false; let wranglerCreated = false; let signalSpawned = false;
  let interrupted: Error | undefined;
  const interrupt = () => { normalStop = completed; interrupted = new Error('UAT interrupted'); if (controller.signal.aborted) { void cleanup().catch(() => undefined); } else controller.abort(interrupted); };
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt); process.on('SIGHUP', interrupt);
  const fatal = (error: unknown) => { normalStop = false; interrupted = new Error(errorMessage(error)); controller.abort(interrupted); };
  process.on('uncaughtException', fatal); process.on('unhandledRejection', fatal);
  const timeout = setTimeout(() => { normalStop = completed; interrupted = new Error(`UAT exceeded ${String(options.timeoutMin)}-minute timeout during ${harness?.activeStep ?? 'setup/run'}`); controller.abort(interrupted); }, options.timeoutMin * 60000);
  let temp: string | undefined; let browser: Browser | undefined; let harness: Harness | undefined;
  let web: ReturnType<typeof startGroup> | undefined; let signal: ReturnType<typeof startGroup> | undefined;
  let cleanupPromise: Promise<void> | undefined;
  const isNormalStop = () => completed && normalStop;
  const stopSignal = async () => { const current = signal; current?.child.removeAllListeners('exit'); await stopGroup(current?.child.pid); if (signal === current) signal = undefined; };
  const recordWrangler = async () => {
    if (!signalSpawned) return;
    try { await access(wranglerState); wranglerCreated = true; await writeFile(join(evidence, '.uat-run'), 'kaki-uat-v1\n' + JSON.stringify({ wranglerCreated })); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  };
  const cleanup = async () => {
    shuttingDown = true;
    const outcomes = await Promise.allSettled([browser?.close(), stopGroup(web?.child.pid), stopSignal()]);
    await recordWrangler();
    outcomes.push(...await Promise.allSettled([temp ? rm(temp, { recursive: true, force: true }) : Promise.resolve(), wranglerCreated ? rm(wranglerState, { recursive: true, force: true }) : Promise.resolve()]));
    const failed = outcomes.find(o => o.status === 'rejected'); if (failed?.status === 'rejected') throw failed.reason;
  };
  // On interruption close browser and process groups immediately, including during a pending Playwright call.
  const onAbort = () => { harness?.abort(interrupted ?? new Error('UAT aborted')); cleanupPromise = (async () => { if (!completed) await harness?.failureShots(); await cleanup(); })(); void cleanupPromise.catch(() => undefined); };
  controller.signal.addEventListener('abort', onAbort);
  const watch = (group: ReturnType<typeof startGroup>, name: string) => {
    group.child.once('exit', () => { if (!shuttingDown && !controller.signal.aborted) fatal(new Error(`${name} server exited during ${harness?.activeStep ?? 'setup/run'}`)); });
  };
  try {
    const work = async () => {
      temp = await mkdtemp(join(tmpdir(), 'kaki-uat-'));
      controller.signal.throwIfAborted();
      const tempDir = temp;
      // Wrangler discovers .dev.vars beside this temporary config; the repository is never given a secret.
      const config = (await readFile(join(root, 'apps/signal/wrangler.jsonc'), 'utf8')).replace('"main": "src/worker.ts"', `"main": ${JSON.stringify(join(root, 'apps/signal/src/worker.ts'))}`);
      await writeFile(join(temp, 'wrangler.jsonc'), config);
      await writeFile(join(temp, '.dev.vars'), `ADMISSION_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
      const startSignal = async () => {
        controller.signal.throwIfAborted(); if (signal) throw new Error('Pairing server already running');
        if (signalSpawned) await assertPortFree(ports.signal);
        signal = startGroup('pnpm', ['--dir', join(root, 'apps/signal'), 'exec', 'wrangler', 'dev', '--local', '--env', 'dev', '--config', join(tempDir, 'wrangler.jsonc'), '--persist-to', join(tempDir, 'state'), '--port', String(ports.signal), '--var', `ALLOWED_ORIGINS:${origin}`, ...options.signalVars.flatMap(value => ['--var', value])], { cwd: root });
        signalSpawned = true; watch(signal, 'Pairing');
        await ready(signalUrl, signal.check, controller.signal, 60000, response => Promise.resolve([403, 404].includes(response.status) && response.headers.get('cache-control') === 'no-store' && (response.headers.get('vary') ?? '').includes('Origin')));
        await recordWrangler();
      };
      await startSignal(); controller.signal.throwIfAborted();
      if (extension?.production) execFileSync('pnpm', ['--dir', 'apps/web', 'exec', 'vite', 'build'], { cwd: root, env: { ...process.env, KAKI_SIGNAL_URL: signalUrl, KAKI_JOIN_ORIGIN: origin }, stdio: 'pipe' });
      web = startGroup('pnpm', ['--dir', 'apps/web', 'exec', 'vite', ...(extension?.production ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(ports.web), '--strictPort'], { cwd: root, env: { ...process.env, KAKI_SIGNAL_URL: signalUrl, KAKI_JOIN_ORIGIN: origin, KAKI_PORT_WEB: String(ports.web) } });
      watch(web, 'Web');
      await ready(origin, web.check, controller.signal, 60000, async response => response.ok && (await response.text()).includes('<title>Kaki Arcade</title>'));
      browser = await chromium.launch({ headless: !options.headed }); if (controller.signal.aborted) { await browser.close(); controller.signal.throwIfAborted(); }
      harness = new Harness(browser, origin, evidence, options.slice, options.phones, { stopSignal, startSignal,
        async resetSignal() { await stopSignal(); await rm(join(tempDir, 'state'), { recursive: true, force: true }); await startSignal(); } });
      harness.keepFrames = options.frames; harness.signalOrigin = signalUrl;
      harness.maxBytes = options.maxMb * 1024 * 1024;
      harness.command = extension?.command ?? ['node tools/uat/run.mjs', ...args].join(' ');
      harness.commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      await harness.init();
      const slice = extension?.execute ?? builtInSlices[options.slice] ?? (await import(pathToFileURL(script).href) as { default: (harness: Harness) => Promise<void> }).default;
      await slice(harness); controller.signal.throwIfAborted(); harness.assertNoUnexpectedErrors();
      await harness.assertSize('completed-awaiting-visual-review');
      completed = true;
      if (options.keep) {
        process.stdout.write('Evidence captured. Keeping browsers and servers until Ctrl-C (configured overall timeout still applies).\n');
        await new Promise<void>(resolve => { if (controller.signal.aborted) resolve(); else controller.signal.addEventListener('abort', () => { resolve(); }, { once: true }); });
      }
    };
    await Promise.race([work(), new Promise<never>((_, reject) => {
      if (controller.signal.aborted) reject(interrupted ?? new Error('UAT aborted'));
      else controller.signal.addEventListener('abort', () => { reject(interrupted ?? new Error('UAT aborted')); }, { once: true });
    })]);
  } catch (error) {
    if (cleanupPromise) await cleanupPromise.catch(() => undefined);
    if (isNormalStop()) return;
    if (harness) { await harness.save('failed', interrupted ?? error); await harness.assertSize('failed', interrupted ?? error).catch((sizeError: unknown) => { process.stderr.write(`${errorMessage(sizeError)}\n`); }); }
    else await writeFile(join(evidence, 'run.json'), JSON.stringify({ status: 'failed', error: errorMessage(interrupted ?? error) }, null, 2));
    process.exitCode = 1;
    process.stderr.write(`${errorMessage(interrupted ?? error)}\n`);
  } finally {
    clearTimeout(timeout); controller.signal.removeEventListener('abort', onAbort);
    try { await Promise.allSettled([cleanupPromise]); await cleanup(); } finally { process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt); process.removeListener('SIGHUP', interrupt); process.removeListener('uncaughtException', fatal); process.removeListener('unhandledRejection', fatal); }
  }
}
