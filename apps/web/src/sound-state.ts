import { useLayoutEffect, useState } from 'preact/hooks';
import type { Sound } from '@kaki/platform';

export interface ObservableSound extends Sound {
  running?: () => boolean;
  subscribe?: (listener: () => void) => () => void;
}
export function useSoundRunning(sound: ObservableSound): boolean {
  const [running, setRunning] = useState(() => sound.running?.() ?? true);
  useLayoutEffect(() => {
    const update = () => { setRunning(sound.running?.() ?? true); };
    update();
    return sound.subscribe?.(update);
  }, [sound]);
  return running;
}
