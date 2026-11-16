import { describe, expect, it } from 'vitest';
import { main } from './cli';
import { phasedFixture } from '../src/harness/fixture';
import { parseRecording } from '../src/harness/match';
describe('F-05 CLI (PLAT-030, NFR-TEST)', () => {
  it('records and replays its own file through injected IO, settings, teams and context', async () => {
    const files = new Map([['context', JSON.stringify({ data: { bank: ['test'] } })]]);
    const output: string[] = [];
    const io = { read: (path: string) => { const file = files.get(path); if (!file) throw new Error(path); return file; },
      write: (path: string, text: string) => { files.set(path, text); },
      load: () => Promise.resolve({ phasedFixture }), log: (text: string) => { output.push(text); } };
    expect(await main(['play', 'harness-fixture', '--seed', '42', '--players', '8', '--teams', '--settings', '{"length":24}', '--context', 'context', '--steps', '24', '--bots', '--record', 'round'], io)).toBe(0);
    const file = parseRecording(io.read('round'));
    expect(file.options.teams).toBe(true);
    expect(file.options.settings).toEqual({ length: 24 });
    expect(file.options.context?.data).toEqual({ bank: ['test'] });
    expect(await main(['replay', 'round'], io)).toBe(0);
    expect(output.at(-1)).toContain('"matches": true');
    await expect(main(['play', 'wrong-id'], io)).rejects.toThrow(/requested game wrong-id.*harness-fixture/);
  });
});
