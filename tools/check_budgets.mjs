#!/usr/bin/env node
import { existsSync, readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
console.log('no bundles yet');
const config = 'assets/src/pipeline.json';
const sourceConfig = existsSync(config) ? /** @type {{ sets?: unknown[] }} */ (JSON.parse(readFileSync(config, 'utf8'))) : undefined;
if (!sourceConfig || sourceConfig.sets?.length === 0) {
  console.log('no asset sets in assets/src yet');
} else {
  mkdirSync('assets/dist', { recursive: true });
  const output = mkdtempSync(resolve('assets/dist/.verify-'));
  try {
    const result = spawnSync('python3', ['tools/assets/pipeline.py', '--config', config, '--output', output], { stdio: 'inherit' });
    process.exitCode = result.status ?? 1;
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}
