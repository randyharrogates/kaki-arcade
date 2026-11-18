import { PeekPokerScreen, sameTable } from './Screen';
import { preloadCards } from './assets';
import type { PokerPublicView } from './view-model';

interface Options { view: PokerPublicView; width: number; height: number }
/** Public-only adapter; all network, decode and mounted warm-up precede ready. */
export const ConsoleScreen = {
  mount(root: HTMLElement, initial: Options) {
    let screen: ReturnType<typeof PeekPokerScreen> | undefined;
    let latest = initial;
    let destroyed = false;
    let prepared = false;
    const isDestroyed = () => destroyed;
    const ready = preloadCards(new URL('../../../assets/dist/manifest.json', import.meta.url).href).then(async deck => {
      if (isDestroyed()) return;
      screen = PeekPokerScreen(root, deck);
      await screen.ready(latest);
      if (!isDestroyed()) { prepared = true; screen.update(latest); }
    });
    return {
      ready,
      update(options: Options) { latest = options; if (prepared) screen?.update(options); },
      destroy() { destroyed = true; screen?.destroy(); },
    };
  },
};
/** Retain a revision while drawn fields are unchanged; no per-step model or string.
 * Module state is safe across sessions: revisions only increase, while each session
 * compares against its own previous key (initially undefined). Interleaved sessions
 * may cause extra publications, but can never suppress a changed drawing. Views
 * are immutable public snapshots. See the two-session regression test. */
let previous: PokerPublicView | undefined;
let revision = 0;
export function publicViewKey(view: unknown): number {
  const next = view as PokerPublicView;
  if (!sameTable(previous, next)) { previous = next; revision++; }
  return revision;
}
