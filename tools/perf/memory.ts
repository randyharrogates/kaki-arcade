import { spawnSync } from 'node:child_process';
import { totalmem, freemem, platform } from 'node:os';
/** Same 4 GiB perf gate as memcheck.sh; Node can read total RAM under the sandbox. */
export function memoryGate() {
  if (platform() !== 'darwin') {
    const available = freemem();
    if (available < 4 * 1073741824) throw new Error('Memory gate refused: less than 4 GiB free');
    return { freePercent: available / totalmem() * 100, pressureLevel: null, source: 'Node freemem/totalmem' };
  }
  const result = spawnSync('sh', ['tools/agents/memcheck.sh', 'perf'], { encoding: 'utf8' });
  process.stdout.write(result.stdout);
  if (result.status === 0) return { freePercent: Number(/(\d+)% free/.exec(result.stdout)?.[1]), pressureLevel: Number(/pressure level (\d+)/.exec(result.stdout)?.[1]), source: 'memcheck.sh' };
  if (!result.stderr.includes('Operation not permitted')) throw new Error(`Memory gate refused: ${result.stdout}${result.stderr}`);
  const pressure = spawnSync('memory_pressure', [], { encoding: 'utf8' });
  const percent = Number(/System-wide memory free percentage: (\d+)%/.exec(pressure.stdout)?.[1]);
  // As in memcheck.sh, a denied pressure-level sysctl falls back to level 1.
  // Preserve the original 4 GiB requirement and disclose this weaker observation.
  if (pressure.status !== 0 || !Number.isFinite(percent) || Math.floor(totalmem() / 1073741824) * percent / 100 < 4) throw new Error('Memory gate refused: cannot establish 4 GiB available');
  return { freePercent: percent, pressureLevel: null, source: 'Node totalmem + memory_pressure; sysctl unavailable (level-1 fallback)' };
}
