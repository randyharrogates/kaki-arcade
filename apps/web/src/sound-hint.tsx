import type { ComponentChildren } from 'preact';
import { useSoundRunning } from './sound-state';
import type { ObservableSound } from './sound-state';

export function SoundHint({ sound, children }: { sound: ObservableSound; children: ComponentChildren }) {
  return <>{useSoundRunning(sound) ? children : 'Click or press a key on this screen to turn on sound'}</>;
}
