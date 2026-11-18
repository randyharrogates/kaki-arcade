import { createSoundEngine, soundLevels, SOUND_STORAGE_KEY } from '@kaki/platform';
import type { Sound } from '@kaki/platform';

/** One engine per TV page, initialised synchronously in the first gesture. */
export function hostSound(target: Window = window) {
  let context: AudioContext | undefined;
  let engine: Sound | undefined;
  let storage: Storage | undefined;
  try { storage = target.localStorage; } catch { /* Defaults remain available. */ }
  const levels = soundLevels(storage);
  const start = () => {
    try {
      if (!context) {
        context = new AudioContext();
        engine = createSoundEngine(context, { getItem: () => JSON.stringify(levels), setItem: (_key, value) => storage?.setItem(SOUND_STORAGE_KEY, value) });
      }
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
    } catch { /* Audio unavailable: the TV remains playable. */ }
  };
  const options = { capture: true };
  target.addEventListener('pointerdown', start, options);
  target.addEventListener('click', start, options);
  target.addEventListener('keydown', start, options);
  const sound: Sound = {
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
    dispose() {
      target.removeEventListener('pointerdown', start, options);
      target.removeEventListener('click', start, options);
      target.removeEventListener('keydown', start, options);
      void context?.close().catch(() => undefined);
    },
  };
}
