import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
/** Build validated, hashed bank bytes in memory for Vite; never ship the validator to phones. */
export function rabakzBank() {
  const id = 'virtual:rabakz-bank';
  const indexId = 'virtual:rabakz-bank-index';
  return {
    name: 'rabakz-bank',
    resolveId(source: string) { return (source === id || source === indexId) ? '\0' + source : undefined; },
    async load(source: string) {
      if (source !== '\0' + id && source !== '\0' + indexId) return;
      const directory = fileURLToPath(new URL('../', import.meta.url));
      // Like the content package's CLI, resolve its extensionless TS imports in Node 24.
      // Scope the hook to that package and remove it once the tools entry has loaded.
      const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
        if (context.parentURL?.startsWith(new URL('../', import.meta.url).href) && /^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
        return nextResolve(specifier, context);
      } });
      const tools = await import('@kaki/content-rabakz/tools').finally(() => { hooks.deregister(); });
      const result = tools.buildBank({
        files: readdirSync(`${directory}/src/questions`).filter(name => name.endsWith('.json')).map(name => ({ name, text: readFileSync(`${directory}/src/questions/${name}`, 'utf8') })),
        blocklist: tools.parseBlocklist(readFileSync(`${directory}/blocklist.txt`, 'utf8')),
        pictures: new Map(), hash: text => createHash('sha256').update(text).digest('hex'),
      });
      if (!result.output) throw new Error('Rabakz bank validation failed');
      return `export default ${JSON.stringify(source === '\0' + indexId ? result.output.index : { index: result.output.index, files: result.output.files })}`;
    },
  };
}

