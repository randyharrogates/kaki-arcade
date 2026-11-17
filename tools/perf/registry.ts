import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { safeName } from '../uat/core.js';
import type { Scenario } from './browser.js';
export async function registry(root: string) {
  const names = (await readdir(resolve(root, 'uat/perf'))).filter(n => n.endsWith('.mjs')).map(n => safeName(n.slice(0, -4))).sort();
  if (new Set(names).size !== names.length) throw new Error('Duplicate scenario');
  return names;
}
export async function loadScenario(root: string, name: string): Promise<Scenario> {
  safeName(name);
  if (!(await registry(root)).includes(name)) throw new Error(`Unknown scenario ${name}; picker slot pending its integration`);
  const loaded = await import(pathToFileURL(resolve(root, 'uat/perf', `${name}.mjs`)).href) as { default?: Scenario };
  if (loaded.default?.name !== name || typeof loaded.default.run !== 'function') throw new Error('Invalid scenario export');
  return loaded.default;
}
