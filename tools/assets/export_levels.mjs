/** TR-050: execute the catalogue, never parse or duplicate its recipe logic. */
import { registerHooks } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === '@kaki/platform') return nextResolve(new URL('../../packages/platform/src/game/types.ts', import.meta.url).href, context);
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(url)) return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
} });
const { LEVELS } = await import('../../games/tabao-rush/src/levels/catalogue');
const out = new URL('../../assets/src/tabao-rush/levels/', import.meta.url);
const check = process.argv.includes('--check');
if (!check) mkdirSync(out, { recursive: true });
for (const level of LEVELS) {
  const { id, venue, width, height, collision, stations, spawns } = level;
  const value = { id, venue, width, height, collision, stations, spawns };
  const path = fileURLToPath(new URL(id + '.json', out));
  const text = JSON.stringify(value, null, 2) + '\n';
  if (check) {
    if (readFileSync(path, 'utf8') !== text) throw new Error(`${id}: generated source differs; run node tools/assets/export_levels.mjs`);
  } else writeFileSync(path, text);
}
