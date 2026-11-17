import { expect, it } from 'vitest';
import { phoneView } from './phone';
import { pickerAnnouncement } from './picker-announcement';
import { gameMetas } from './game-registry';

it('NFR-A11Y announces focus, selection, leadership and starting from a single stable string', () => {
  const meta = gameMetas[0];
  if (!meta) throw new Error('Missing installed game');
  const view = { ...phoneView('lobby', { seat: 1, name: 'Cloud Noodle', leader: true }),
    picker: { v: 1 as const, t: 'picker-state' as const, failed: false, revision: 1, screen: 'picker' as const,
      leaderName: 'Cloud Noodle', game: { id: meta.id, name: meta.name, blurb: meta.blurb, min: 1, max: 8 }, reason: null } };
  expect(pickerAnnouncement(view)).toBe('You choose the game: Tabao Rush');
  // Connection quality, revisions and unrelated lobby copy must not change the live text.
  expect(pickerAnnouncement({ ...view, detail: 'Unrelated', picker: { ...view.picker, revision: 2 } })).toBe(pickerAnnouncement(view));
  expect(pickerAnnouncement({ ...view, picker: { ...view.picker, game: { ...view.picker.game, name: 'Peek Poker' } } })).toBe('You choose the game: Peek Poker');
  expect(pickerAnnouncement({ ...view, leader: false })).toBe('Cloud Noodle is choosing: Tabao Rush');
  expect(pickerAnnouncement({ ...view, picker: { ...view.picker, screen: 'start' } })).toBe('Start Tabao Rush?');
  expect(pickerAnnouncement({ ...view, picker: { ...view.picker, screen: 'start', failed: true, reason: 'Could not load Tabao Rush. Try again.' } })).toBe('Could not load Tabao Rush. Try again.');
  expect(pickerAnnouncement({ ...view, picker: { ...view.picker, reason: 'Could not load availability', failed: false } })).toBe('You choose the game: Tabao Rush. Could not load availability');
  expect(pickerAnnouncement({ ...view, picker: { ...view.picker, screen: 'starting' } })).toBe('Starting Tabao Rush');
  expect(pickerAnnouncement({ ...view, picker: { ...view.picker, reason: 'Needs at least 2 players' } })).toBe('You choose the game: Tabao Rush. Needs at least 2 players');
});

it('PLAT-020 metadata-only exports match the full installed modules', async () => {
  const modules = await Promise.all([
    import('../../../games/tabao-rush/src/index').then(m => m.tabaoRush),
    import('../../../games/peek-poker/src/index').then(m => m.peekPoker),
    import('../../../games/rabakz/src/index').then(m => m.rabakz),
  ]);
  expect(gameMetas).toEqual(modules.map(game => game.meta));
});
