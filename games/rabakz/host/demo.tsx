import { detectOverflow } from './overflow';
import { render } from 'preact';
import { countUpDuration, STAGGER_MS } from '@kaki/ui';
import { RabakzScreen } from './Screen';
import { rabakz } from '../src/index';
import { advance, answer, scenario, SCENARIOS } from './scenarios';
import '@kaki/ui/tokens.css';

/** Imported only by dev/index.html; the production game entry has no import of this module. */
if ((import.meta as ImportMeta & { readonly env: { readonly DEV: boolean } }).env.DEV) {
  Object.assign(window, { __rzOverflow: detectOverflow });
  const query = new URLSearchParams(location.search);
  const stateName = SCENARIOS.find(s => s === query.get('state')) ?? 'open';
  const requestedCount = query.has('players') ? Number(query.get('players')) : NaN;
  const count = Number.isInteger(requestedCount) && requestedCount >= 1 && requestedCount <= 8 ? requestedCount : undefined;
  const slow = Math.min(100, Math.max(1, Number(query.get('slow')) || 1));
  const at = query.has('at') ? Math.max(0, Number(query.get('at')) || 0) : undefined;
  const from = SCENARIOS.find(s => s === query.get('from'));
  const to = SCENARIOS.find(s => s === query.get('to'));
  let state = scenario(from ?? stateName, count);
  let seeking = !from;
  const draw = () => { render(<RabakzScreen view={rabakz.publicView(state)} width={innerWidth} height={innerHeight}
    slow={slow} frozenAt={seeking ? at : undefined} {...(query.get('reduced') === '1' ? { reduced: true } : {})} />, document.body);
    if (seeking) requestAnimationFrame(() => { requestAnimationFrame(() => {
      // Effects and the browser font measurement have applied before seeking.
      if (at !== undefined) for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = at;
      }
      document.documentElement.dataset.rzReady = '1';
    }); });
  };
  // Perf-only fixture driver retains the mounted screen across real public snapshots.
  if (query.get('perf') === '1') Object.assign(window, {
    __rzPerfState(name: string) {
      const next = SCENARIOS.find(value => value === name);
      if (!next) throw new Error('Unknown Rabakz fixture');
      state = scenario(next, 8); draw();
    },
  });
  // Keyboard-only controls keep the photographed surface bare.
  addEventListener('keydown', event => {
    const correct = state.questions[state.round]?.correct ?? 0;
    if (event.key === 'r') {
      state = advance(state, [answer(state, 0, correct)]);
      while (state.phase === 'question') state = advance(state);
    } else if (event.key === 'n') {
      if (state.phase === 'question') state = advance(state, [{ player: state.players[0]?.info.id ?? '', control: 'skip', revision: 0 }]);
      while (state.phase === 'reveal' || state.phase === 'final') state = advance(state);
    } else return;
    draw();
  });
  addEventListener('resize', draw);
  draw();
  if (from && to) void document.fonts.ready.then(() => { setTimeout(() => {
    for (const animation of document.getAnimations()) animation.cancel();
    state = scenario(to, count); seeking = true; draw();
  }, (countUpDuration({ reduced: false }) + 7 * STAGGER_MS) * slow); });
  // Build both real states before seeking the incoming question's overlap.
  if (query.get('transition') === 'next') requestAnimationFrame(() => {
    dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
  });
}
