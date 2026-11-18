import type { VNode } from 'preact';
import { THEMES } from '@kaki/ui';

export function GameFinalHint({ theme = THEMES.console, keyboard }: { theme?: typeof THEMES.console | undefined; keyboard: boolean }): VNode<{ children: VNode<{ style: { color: string; fontSize: string }; children: string }> }> {
  return <div class="game-final-layer"><p class="game-final-hint" style={{ color: theme.background.secondary, fontSize: 'var(--ka-type-34)' }}>{keyboard ? 'Enter: Continue' : 'The leader continues on their phone'}</p></div>;
}
