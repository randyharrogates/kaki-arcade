#!/usr/bin/env node
import './hooks.mjs';
const module = /** @type {unknown} */ (await import(new URL('./cli.ts', import.meta.url).href));
const loaded = /** @type {{ main(args: string[]): Promise<void> }} */ (module);
try { await loaded.main(process.argv.slice(2)); } catch (error) { console.error(error); process.exitCode = 1; }
