import { activeScreenSound } from '@kaki/platform';
import { afterEach, expect, it, vi } from 'vitest';
import { createElement, render } from 'preact';
import { RabakzScreen } from './Screen';
import { scenario, advance, answer } from './scenarios';
import { rabakz } from '../src';

// Minimal DOM port for Preact's real reconciler; no browser layout is needed for sound.
class Element {
  nodeType = 1; parentNode: Element | null = null; childNodes: Element[] = [];
  style = { setProperty: vi.fn() }; attributes: { name: string; value: string }[] = [];
  offsetWidth = 100; offsetHeight = 30; data = '';
  constructor(readonly localName = 'div') {}
  get firstChild(): Element | null { return this.childNodes[0] ?? null; }
  get nextSibling(): Element | null { const siblings = this.parentNode?.childNodes; return siblings?.[(siblings.indexOf(this)) + 1] ?? null; }
  insertBefore(node: Element, before: Element | null) {
    node.parentNode?.removeChild(node);
    const index = before ? this.childNodes.indexOf(before) : -1;
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, node);
    node.parentNode = this; return node;
  }
  appendChild(node: Element) { return this.insertBefore(node, null); }
  removeChild(node: Element) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node; }
  remove() { this.parentNode?.removeChild(this); }
  setAttribute(name: string, value: string) { this.removeAttribute(name); this.attributes.push({ name, value }); }
  removeAttribute(name: string) { this.attributes = this.attributes.filter(a => a.name !== name); }
  addEventListener() { /* Events are not used by this screen. */ }
  removeEventListener() { /* Events are not used by this screen. */ }
  closest() { return null; }
  getContext() { return null; }
}
afterEach(() => { vi.unstubAllGlobals(); });
it('RZ-033 renders cues exactly once across redraw, remount and inactive/active transitions', () => {
  vi.stubGlobal('document', {
    createElementNS: (_namespace: string, name: string) => new Element(name),
    createElement: (name: string) => new Element(name),
    createTextNode: (text: string) => Object.assign(new Element(), { nodeType: 3, data: text }),
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const root = new Element() as unknown as HTMLElement;
  const sound = { play: vi.fn(), getLevel: () => 70, setLevel: vi.fn() };
  const history = { previous: null as unknown };
  let state = scenario('open', 2); let view = rabakz.publicView(state);
  const draw = (active = true) => { render(createElement(RabakzScreen, { view, width: 1920, height: 1080, reduced: true, sound: activeScreenSound(active, sound), soundHistory: history }), root); };
  draw(); draw(); render(null, root); draw(); draw(false); draw();
  expect(sound.play).toHaveBeenCalledTimes(1);
  state = advance(state, [answer(state, 0, ((state.questions[0]?.correct ?? 0) + 1) % 4)]);
  view = rabakz.publicView(state);
  draw(false); expect(sound.play).toHaveBeenCalledTimes(1);
  draw(); draw(); render(null, root); draw(); draw(false); draw();
  expect(sound.play).toHaveBeenCalledTimes(3);
  while (state.phase === 'question') state = advance(state);
  view = rabakz.publicView(state); draw(); draw();
  expect(sound.play).toHaveBeenCalledTimes(3);
  render(null, root);

});

for (const count of [1, 2]) it(`RZ-033 hears wrong presses once with three steps between renders (${String(count)} players)`, () => {
  vi.stubGlobal('document', {
    createElementNS: (_namespace: string, name: string) => new Element(name),
    createElement: (name: string) => new Element(name),
    createTextNode: (text: string) => Object.assign(new Element(), { nodeType: 3, data: text }),
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const root = new Element() as unknown as HTMLElement;
  const sound = { play: vi.fn(), getLevel: () => 70, setLevel: vi.fn() };
  const history = { previous: null as unknown };
  let state = scenario('open', count);
  const draw = () => { render(createElement(RabakzScreen, { view: rabakz.publicView(state), width: 1920, height: 1080, reduced: true, sound: activeScreenSound(true, sound), soundHistory: history }), root); };
  draw();
  for (let seat = 0; seat < count; seat++) {
    const before = state;
    const actions = [answer(state, seat, ((state.questions[0]?.correct ?? 0) + seat + 1) % 4)];
    state = advance(state, actions);
    expect(state).toEqual(advance(before, actions));
    state = advance(advance(state));
    draw(); draw(); render(null, root); draw();
    expect(sound.play).toHaveBeenCalledTimes(1 + (seat + 1) * 2);
  }
  if (count === 2) expect(state.players.every(p => p.pick === null)).toBe(true);
  while (state.round === 0) state = advance(state);
  expect(state.wrongPresses).toEqual({});
  render(null, root);
});

it('RZ-033 renders both consecutive-step wrong presses once in a single draw', () => {
  vi.stubGlobal('document', {
    createElementNS: (_namespace: string, name: string) => new Element(name),
    createElement: (name: string) => new Element(name),
    createTextNode: (text: string) => Object.assign(new Element(), { nodeType: 3, data: text }),
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const root = new Element() as unknown as HTMLElement;
  const sound = { play: vi.fn(), getLevel: () => 70, setLevel: vi.fn() };
  const history = { previous: null as unknown };
  let state = scenario('open', 2);
  const draw = () => { render(createElement(RabakzScreen, { view: rabakz.publicView(state), width: 1920, height: 1080, reduced: true, sound, soundHistory: history }), root); };
  draw();
  const correct = state.questions[0]?.correct ?? 0;
  state = advance(state, [answer(state, 0, (correct + 1) % 4)]);
  state = advance(state, [answer(state, 1, (correct + 2) % 4)]);
  draw();
  expect(sound.play).toHaveBeenCalledTimes(4); // Unlock, two seat notes, one wrong.
  draw(); render(null, root); draw();
  expect(sound.play).toHaveBeenCalledTimes(4);
  render(null, root);
});
