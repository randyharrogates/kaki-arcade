import * as fs from 'node:fs';
import { expect, it } from 'vitest';
import { conformanceTimeout, formatReport, readSources, runConformance } from '@kaki/platform/kit';
import { tabaoRush } from './rules/game';
it('TR-055 first-run tutorial conforms for 1, 4 and 8 cooks with disconnect and leader skip', { timeout: conformanceTimeout(15000) }, () => {
  const game: typeof tabaoRush = { ...tabaoRush, init(...args) { return { ...tabaoRush.init(...args), endTick: 300 }; } };
  const report = runConformance(game, [1, 4, 8].map(players => ({
    name: `tutorial-${String(players)}`, players, firstInRoom: true, steps: 2000,
    // Membership replay can disconnect everyone before Ready or replace the leader.
    // Respond to the current phase instead of assuming picker/tutorial tick numbers.
    script: ({ step, players: seated, leader, layout }) => ({
      ...(step === 2 ? { disconnected: seated.slice(1).map(p => p.id) } : {}),
      actions: seated.flatMap(p => {
        const controls = layout(p.id).controls;
        if (controls.some(control => control.kind === 'options' && control.id === 'ready' &&
            control.options.some(option => option.id === 'ready' && option.state !== 'selected'))) {
          return [{ player: p.id, control: 'ready', value: 'ready' }];
        }
        return p.id === leader && controls.some(control => control.id === 'header-action')
          ? [{ player: p.id, control: 'header-action', value: 'skip-tutorial' }] : [];
      }),
    }),
  })), { sources: readSources(fs, new URL('./rules/', import.meta.url).pathname) });
  expect(report.ok, formatReport(report)).toBe(true);
});
