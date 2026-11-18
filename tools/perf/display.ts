import { spawnSync } from 'node:child_process';
/** Every online display must report the same rate. */
export function parseRefresh(text: string): number | null {
  const lines = text.split('\n');
  const displays: (number | null)[] = [];
  let displaysIndent: number | undefined;
  let nameIndent: number | undefined;
  let block: string[] = [];
  const finish = () => {
    if (!block.length) return;
    const body = block.join('\n');
    if (!/Online:\s*(?:No|Off)/i.test(body)) {
      const rates = [...body.matchAll(/(?:Refresh Rate:|@)\s*(\d+(?:\.\d+)?)\s*Hz/gi)].map(m => Number(m[1]));
      displays.push(rates.length && rates.every(r => r === rates[0]) ? rates[0] ?? null : null);
    }
    block = [];
  };
  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = line.search(/\S/);
    if (displaysIndent !== undefined && indent <= displaysIndent) {
      finish(); displaysIndent = undefined; nameIndent = undefined;
    }
    if (line.trim() === 'Displays:') { displaysIndent = indent; continue; }
    if (displaysIndent === undefined) continue;
    if (line.trim().endsWith(':') && (nameIndent === undefined || indent === nameIndent)) {
      finish(); nameIndent = indent;
    }
    if (nameIndent !== undefined) block.push(line);
  }
  finish();
  return displays.length && displays.every(rate => rate !== null && rate === displays[0]) ? displays[0] ?? null : null;
}
export function osRefresh() {
  if (process.platform !== 'darwin') return null;
  const display = spawnSync('system_profiler', ['SPDisplaysDataType'], { encoding: 'utf8', timeout: 5000 });
  return display.status === 0 ? parseRefresh(display.stdout) : null;
}
