import { sessionRegistrations } from './game-registry';
import { expect, it, vi } from 'vitest';
import { THEMES, contrastRatio } from '@kaki/ui';
import type { VNode } from 'preact';
import type { useLayoutEffect } from 'preact/hooks';

type LayoutEffect = Parameters<typeof useLayoutEffect>[0];
import { GameFinalHint } from './game-final-hint';

const mount = vi.hoisted(() => ({ element: null as { animate: ReturnType<typeof vi.fn> } | null, effect: undefined as LayoutEffect | undefined }));
vi.mock('preact/hooks', () => ({
  useRef: () => ({ current: mount.element }),
  useLayoutEffect: (effect: LayoutEffect) => { mount.effect = effect; },
}));

const hintText = (props: Parameters<typeof GameFinalHint>[0]) => GameFinalHint(props).props.children as VNode<{ children: string; style: { color: string; fontSize: string } }>;

it('PLAT-024 Rabakz final hint uses theme secondary text at TV size with contrast over plum and dots', () => {
  const hint = hintText({ theme: THEMES.rabakz, keyboard: false });
  expect(hint.props.children).toBe('The leader continues on their phone');
  expect(hint.props.style).toEqual({ color: THEMES.rabakz.background.secondary, fontSize: 'var(--ka-type-34)' });
  const background = THEMES.rabakz.background;
  for (const paint of [background.colour, ...background.treatment.paints]) {
    expect(contrastRatio(hint.props.style.color, paint)).toBeGreaterThanOrEqual(4.5);
  }
  expect(hintText({ theme: THEMES.rabakz, keyboard: true }).props.children).toBe('Enter: Continue');
});

it('PLAT-024 registry carries the Tabao Rush final-hint theme', () => {
  expect(sessionRegistrations['tabao-rush']?.finalHintTheme).toBe(THEMES['tabao-rush']);
  expect(hintText({ theme: sessionRegistrations['tabao-rush']?.finalHintTheme, keyboard: false }).props.style.color).toBe(THEMES['tabao-rush'].background.secondary);
});

it('PLAT-022 mounts one finite incoming crossfade and cancels it on unmount', async () => {
  const { crossfade } = await import('@kaki/ui');
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  mount.element = { animate };
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('location', { search: '' });
  try {
    GameFinalHint({ keyboard: false });
    const cleanup = mount.effect?.();
    expect(animate).toHaveBeenCalledExactlyOnceWith([{ opacity: 0 }, { opacity: 1 }], crossfade().incoming.options);
    expect(crossfade().incoming.options.duration).toBeGreaterThan(0);
    if (cleanup) cleanup();
    expect(cancel).toHaveBeenCalledOnce();
  } finally { vi.unstubAllGlobals(); mount.element = null; }
});

it('PLAT-022 skips animation under reduced motion and keeps an opaque resting style', async () => {
  const { readFile } = await import('node:fs/promises');
  const animate = vi.fn();
  mount.element = { animate };
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  try {
    GameFinalHint({ keyboard: true });
    expect(mount.effect?.()).toBeUndefined();
    expect(animate).not.toHaveBeenCalled();
    const css = await readFile(new URL('./style.css', import.meta.url), 'utf8');
    expect(/\.game-final-layer\s*\{([^}]+)\}/.exec(css)?.[1]).toMatch(/opacity:\s*1;/);
  } finally { vi.unstubAllGlobals(); mount.element = null; }
});

it('PLAT-022 scales the dev entrance duration like FadeLayer', async () => {
  const { crossfade } = await import('@kaki/ui');
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  mount.element = { animate };
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubEnv('DEV', true);
  try {
    for (const [search, multiplier] of [['?slow=4', 4], ['?slow=0.5', 1], ['?slow=invalid', 1]] as const) {
      vi.stubGlobal('location', { search });
      GameFinalHint({ keyboard: false });
      const cleanup = mount.effect?.();
      expect(animate).toHaveBeenLastCalledWith(crossfade().incoming.keyframes, {
        ...crossfade().incoming.options, duration: crossfade().incoming.options.duration * multiplier,
      });
      if (cleanup) cleanup();
    }
  } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); mount.element = null; }
});
