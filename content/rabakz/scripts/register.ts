// Lets plain Node run this package's TypeScript: Node strips the types itself, and this hook
// adds the `.ts` that the workspace's extensionless relative imports leave off.
// Used as `node --import ./scripts/register.ts scripts/<name>.ts`.

import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
