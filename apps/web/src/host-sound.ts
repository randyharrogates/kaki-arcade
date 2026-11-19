import { createSoundEngine, soundLevels, SOUND_STORAGE_KEY } from '@kaki/platform';
import type { Sound } from '@kaki/platform';
import type { ObservableSound } from './sound-state';

/** One engine per TV page, initialised synchronously in the first gesture. */
export function hostSound(target: Window = window) {
  let disposed = false;
  let context: AudioContext | undefined;
  let engine: Sound | undefined;
  let storage: Storage | undefined;
  try { storage = target.localStorage; } catch { /* Defaults remain available. */ }
  const levels = soundLevels(storage);
  const listeners = new Set<() => void>();
  const options = { capture: true };
  const remove = () => {
    target.removeEventListener('click', start, options);
    target.removeEventListener('keydown', start, options);
  };
  const update = () => {
    if (disposed) return;
    if (context?.state === 'running') remove();
    else {
      target.addEventListener('click', start, options);
      target.addEventListener('keydown', start, options);
    }
    for (const listener of listeners) listener();
  };
  const start = () => {
    try {
      if (!context) {
        context = new AudioContext();
        context.addEventListener('statechange', update);
        engine = createSoundEngine(context, { getItem: () => JSON.stringify(levels), setItem: (_key, value) => storage?.setItem(SOUND_STORAGE_KEY, value) });
      }
      if (context.state !== 'running' && context.state !== 'closed') void context.resume().then(update).catch(() => undefined);
      update();
    } catch { /* Audio unavailable: the TV remains playable. */ }
  };
  target.addEventListener('click', start, options);
  target.addEventListener('keydown', start, options);
  const sound: ObservableSound = {
      running: () => context?.state === 'running',
      subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      play: (cue, channel) => engine?.play(cue, channel),
      getLevel: channel => levels[channel],
      setLevel: (channel, level) => {
        if (!Number.isFinite(level)) return;
        levels[channel] = Math.max(0, Math.min(100, level));
        try { storage?.setItem(SOUND_STORAGE_KEY, JSON.stringify(levels)); } catch { /* Keep session levels. */ }
        engine?.setLevel(channel, levels[channel]);
      },
    };
  return {
    sound,
    start,
    dispose() {
      disposed = true;
      remove();
      listeners.clear();
      context?.removeEventListener('statechange', update);
      void context?.close().catch(() => undefined);
    },
  };
}

let shared: ReturnType<typeof hostSound> | undefined;
/** Survives same-document landing → host navigation. */
export function sharedHostSound() { return shared ??= hostSound(); }
