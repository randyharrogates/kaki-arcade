import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@kaki/')) {
      const [name, sub] = specifier.slice(6).split('/');
      const path = new URL(`packages/${name ?? ''}/src/${sub ? sub + '/index' : 'index'}.ts`, root);
      return nextResolve(path.href, context);
    }
    // Only this repository's own sources are TypeScript: leave packages in node_modules alone.
    if (specifier.startsWith('.')) {
      const path = new URL(specifier, context.parentURL ?? import.meta.url);
      if (!path.href.startsWith(root.href) || path.pathname.includes('/node_modules/')) return nextResolve(specifier, context);
      if (path.pathname.endsWith('.js') && existsSync(new URL(path.href.replace(/\.js$/, '.ts')))) return nextResolve(path.href.replace(/\.js$/, '.ts'), context);
      if (!/\.[a-z]+$/.test(path.pathname)) return nextResolve(path.href + '.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
