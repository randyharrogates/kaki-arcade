import type { BuildOutput } from '../src/build';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
/** Build validated, hashed bank bytes in memory for Vite; never ship the validator to phones. */
export function rabakzBank() {
  const id = 'virtual:rabakz-bank';
  const indexId = 'virtual:rabakz-bank-index';
  const downloadPath = '/rabakz/questions.json';
  let bank: BuildOutput | undefined;
  const download = () => JSON.stringify({
    questions: bank?.chunks.flatMap(chunk => chunk.questions).filter(question => question.id.startsWith('otdb-')),
    credits: bank?.index.credits,
  }) + '\n';
  const plugin = {
    name: 'rabakz-bank',
    generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => unknown }, _options: unknown, bundle: Record<string, { type: string; modules?: Record<string, unknown> }>) {
      if (!Object.values(bundle).some(file => file.type === 'chunk' && file.modules && ('\0' + id) in file.modules)) return;
      if (!bank) throw new Error('Missing Rabakz bank');
      this.emitFile({ type: 'asset', fileName: downloadPath.slice(1), source: download() });
    },
    configureServer(server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void) => void) => void } }) {
      server.middlewares.use(downloadPath, (request, response, next) => {
        if (request.url !== '/') { next(); return; }
        void plugin.load('\0' + id).then(() => {
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Content-Disposition', 'attachment; filename="kaki-arcade-rabakz-questions.json"');
          response.end(download());
        }).catch(next);
      });
    },
    resolveId(source: string) { return (source === id || source === indexId) ? '\0' + source : undefined; },
    async load(source: string) {
      if (source !== '\0' + id && source !== '\0' + indexId) return;
      if (bank) return `export default ${JSON.stringify(source === '\0' + indexId ? bank.index : { index: bank.index, files: bank.files })}`;
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
      bank = result.output;
      return `export default ${JSON.stringify(source === '\0' + indexId ? result.output.index : { index: result.output.index, files: result.output.files })}`;
    },
  };
  return plugin;
}

