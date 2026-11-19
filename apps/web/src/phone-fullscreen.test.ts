import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMES } from '@kaki/ui';
import { installPhoneManifest, installPhoneFullscreen } from './phone-fullscreen';
function fixture(path = '/play') {
  const listeners = new Map<string, (event: { isTrusted: boolean; pointerId: number; pointerType: string }) => void>();
  let rotate: () => void = () => undefined;
  const media = { matches: true, addEventListener: (_: string, cb: () => void) => { rotate = cb; }, removeEventListener: vi.fn() };
  const doc = { visibilityState: 'visible', fullscreenEnabled: true, fullscreenElement: null as object | null,
    documentElement: { requestFullscreen: vi.fn<() => Promise<void> | undefined>(() => Promise.resolve()) }, exitFullscreen: vi.fn(() => Promise.resolve()),
    addEventListener: (type: string, cb: NonNullable<ReturnType<typeof listeners.get>>) => { listeners.set(type, cb); }, removeEventListener: vi.fn() };
  let seated = true;
  const stop = installPhoneFullscreen(doc as unknown as Document, { matchMedia: () => media, addEventListener: doc.addEventListener, removeEventListener: doc.removeEventListener } as unknown as Window, () => seated, path);
  return { doc, media, stop, event: (type: string) => { listeners.get(type)?.({ isTrusted: true, pointerId: 0, pointerType: '' }); }, pointer: (type: string, pointerId = 1, pointerType = 'touch', isTrusted = true) => { listeners.get(type)?.({ isTrusted, pointerId, pointerType }); }, tap: (isTrusted = true) => { listeners.get('pointerdown')?.({ isTrusted, pointerId: 1, pointerType: 'mouse' }); }, portrait: () => { media.matches = false; rotate(); }, leave: () => { seated = false; } };
}
it('CTRL-004 enters on a trusted landscape room press, with hidden navigation', () => {
  const f = fixture(); f.tap(false); expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.tap(); expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledExactlyOnceWith({ navigationUI: 'hide' });
});
it('CTRL-004 portrait exits and the next landscape press can enter again', () => {
  const f = fixture(); f.doc.fullscreenElement = {}; f.portrait(); expect(f.doc.exitFullscreen).toHaveBeenCalledOnce();
  f.doc.fullscreenElement = null; f.tap(); expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.media.matches = true; f.tap(); expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
it('CTRL-004 already fullscreen, unsupported, outside a room and host do nothing', () => {
  const f = fixture(); f.doc.fullscreenElement = {}; f.tap(); f.doc.fullscreenElement = null;
  f.doc.fullscreenEnabled = false; f.tap(); f.doc.fullscreenEnabled = true; f.leave(); f.tap();
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  const host = fixture('/host'); host.tap(); host.doc.fullscreenElement = {}; host.portrait();
  expect(host.doc.documentElement.requestFullscreen).not.toHaveBeenCalled(); expect(host.doc.exitFullscreen).not.toHaveBeenCalled();
});
it('CTRL-004 rejection is swallowed and listeners are removed', async () => {
  const f = fixture(); f.doc.documentElement.requestFullscreen.mockRejectedValue(new Error('denied')); f.tap();
  f.doc.fullscreenElement = {}; f.doc.exitFullscreen.mockRejectedValue(new Error('denied')); f.portrait();
  await Promise.resolve(); f.stop(); expect(f.doc.removeEventListener).toHaveBeenCalled(); expect(f.media.removeEventListener).toHaveBeenCalled();
});

it('CTRL-004 touch requests on release only', () => {
  const f = fixture(); f.pointer('pointerdown');
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledExactlyOnceWith({ navigationUI: 'hide' });
});
it('CTRL-004 waits for the last finger so a held stick survives', () => {
  const f = fixture(); f.pointer('pointerdown', 1); f.pointer('pointerdown', 2); f.pointer('pointerup', 2);
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.pointer('pointerup', 1);
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
it('CTRL-004 cancellation removes a finger without requesting', () => {
  const f = fixture(); f.pointer('pointerdown', 1); f.pointer('pointercancel', 1);
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.pointer('pointerdown', 2); f.pointer('pointerup', 2);
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
it('CTRL-004 mouse requests on press, never on release', () => {
  const f = fixture(); f.pointer('pointerdown', 1, 'mouse');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
  f.pointer('pointerup', 1, 'mouse');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
it('CTRL-004 phone manifest and capability metas mount and unmount', () => {
  const nodes: Record<string, unknown>[] = [];
  const doc = { createElement: (tag: string) => ({ tag, remove: vi.fn() }), head: { append: (...added: typeof nodes) => { nodes.push(...added); } } };
  const stop = installPhoneManifest(doc as unknown as Document);
  expect(nodes).toEqual([
    expect.objectContaining({ tag: 'link', rel: 'manifest', href: '/manifest.webmanifest' }),
    expect.objectContaining({ tag: 'meta', name: 'apple-mobile-web-app-capable', content: 'yes' }),
    expect.objectContaining({ tag: 'meta', name: 'mobile-web-app-capable', content: 'yes' }),
  ]);
  stop();
  for (const node of nodes) expect(node.remove).toHaveBeenCalledOnce();
});
it('CTRL-004 manifest colours follow the console background token', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')) as { background_color: string; theme_color: string };
  expect(manifest.background_color).toBe(THEMES.console.background.colour);
  expect(manifest.theme_color).toBe(THEMES.console.background.colour);
});

it('CTRL-004 touch release does not request while already fullscreen', () => {
  const f = fixture(); f.doc.fullscreenElement = {};
  f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
});
it('CTRL-004 a refused touch release remains armed for the next release', async () => {
  const f = fixture(); f.doc.documentElement.requestFullscreen.mockRejectedValueOnce(new Error('denied'));
  f.pointer('pointerdown'); f.pointer('pointerup'); await Promise.resolve();
  f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledTimes(2);
});
it.each(['throw', 'undefined'])('CTRL-004 tolerates a fullscreen request returning %s', mode => {
  const f = fixture();
  f.doc.documentElement.requestFullscreen.mockImplementation(() => {
    if (mode === 'throw') throw new Error('denied');
    return undefined;
  });
  expect(() => { f.pointer('pointerdown'); f.pointer('pointerup'); }).not.toThrow();
  f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledTimes(2);
});
it('CTRL-004 user exit in landscape waits for portrait and landscape before re-entry', () => {
  const f = fixture(); f.doc.fullscreenElement = {}; f.event('fullscreenchange');
  f.doc.fullscreenElement = null; f.event('fullscreenchange');
  f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.portrait(); f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  f.media.matches = true; f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
it('CTRL-004 our portrait exit does not disarm after a quick return to landscape', () => {
  const f = fixture(); f.doc.fullscreenElement = {}; f.portrait();
  f.media.matches = true; f.doc.fullscreenElement = null; f.event('fullscreenchange');
  f.pointer('pointerdown'); f.pointer('pointerup');
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
it.each(['blur', 'pagehide', 'visibilitychange'])('CTRL-004 clears missed releases on %s', type => {
  const f = fixture(); f.pointer('pointerdown', 1);
  if (type === 'visibilitychange') {
    f.event(type); f.pointer('pointerdown', 2); f.pointer('pointerup', 2);
    expect(f.doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
    f.doc.visibilityState = 'hidden';
  }
  f.event(type); f.pointer('pointerdown', 3); f.pointer('pointerup', 3);
  expect(f.doc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
});
