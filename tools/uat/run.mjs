#!/usr/bin/env node
import { registerHooks } from 'node:module';
// TypeScript's existing build uses .js specifiers. Node 24 strips the source types;
// map only this library's .js specifiers to its .ts sources, without a loader dependency.
const library = new URL('./', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = new URL(specifier, context.parentURL ?? import.meta.url);
    if (url.href.startsWith(library) && url.pathname.endsWith('.js')) return nextResolve(url.href.replace(/\.js$/, '.ts'), context);
    return nextResolve(specifier, context);
  },
});
const entry = new URL('./runner.ts', import.meta.url).href;
const loaded = /** @type {unknown} */ (await import(entry));
await /** @type {{ run: () => Promise<void> }} */ (loaded).run();
