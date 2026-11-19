#!/usr/bin/env node
import { registerHooks } from 'node:module';
// TypeScript's existing build uses .js specifiers. Node 24 strips the source types;
// map only this library's .js specifiers to its .ts sources, without a loader dependency.
const library = new URL('./', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = new URL(specifier, context.parentURL ?? import.meta.url);
    if (url.href.startsWith(library) && url.pathname.endsWith('.js')) return nextResolve(url.href.replace(/\.js$/, '.ts'), context);
    // Workspace sources use extensionless relative imports (bundler resolution); try the .ts file.
    try { return nextResolve(specifier, context); } catch (error) {
      const missing = /** @type {{ code?: string }} */ (error).code === 'ERR_MODULE_NOT_FOUND';
      if (!missing || !specifier.startsWith('.') || /\.[cm]?[jt]sx?$/.test(url.pathname)) throw error;
      try { return nextResolve(`${url.href}.ts`, context); } catch { throw error; }
    }
  },
});
const entry = new URL('./runner.ts', import.meta.url).href;
const loaded = /** @type {unknown} */ (await import(entry));
await /** @type {{ run: () => Promise<void> }} */ (loaded).run();
