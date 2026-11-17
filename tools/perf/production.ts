import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
/** Scan final deployed bytes, not just source imports. */
export async function scanProduction(folder: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) bytes += await scanProduction(path);
    else { const file = await readFile(path); bytes += file.length; if (file.includes('kaki-perf-timing-v1') || file.includes('__kakiPerfRecord')) throw new Error(`Timing instrumentation shipped: ${path}`); }
  }
  if (!bytes) throw new Error('Empty production output is not proof');
  return bytes;
}
