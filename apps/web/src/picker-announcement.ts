import type { PhoneView } from './phone';

/** Stable text keeps unrelated room/connection renders silent in the single live region. */
export function pickerAnnouncement(view: PhoneView): string {
  const picker = view.connected && !view.renaming ? view.picker : null;
  if (!picker || picker.screen === 'lobby') return `${view.title} ${view.detail}`;
  if (picker.failed && picker.reason) return view.leader ? picker.reason : `${picker.leaderName ?? 'The leader'} starts the game. ${picker.reason}`;
  const game = picker.game?.name ?? 'the game';
  const text = picker.screen === 'starting' ? `Starting ${game}`
    : view.leader ? picker.screen === 'start' ? `Start ${game}?` : `You choose the game: ${game}`
    : `${picker.leaderName ?? 'The leader'} is choosing: ${game}`;
  return picker.reason ? `${text}. ${picker.reason}` : text;
}
