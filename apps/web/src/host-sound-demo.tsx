import { useEffect, useMemo } from 'preact/hooks';
import { hostSound } from './host-sound';
import { loadSoundDemo } from './game-registry';
export function HostSoundDemo() {
  const audio = useMemo(() => hostSound(), []);
  useEffect(() => () => { audio.dispose(); }, [audio]);
  return <main class="screen room-status"><h1>Rabakz sounds</h1><div class="ka-panel">
    {(['unlock', 'correct', 'wrong'] as const).map(kind => <button class="ka-panel ka-pressable" onClick={() => { void loadSoundDemo().then(schedule => { audio.sound.play(schedule({ kind })); }); }}>{kind}</button>)}
    {Array.from({ length: 8 }, (_, i) => <button class="ka-panel ka-pressable" onClick={() => { void loadSoundDemo().then(schedule => { audio.sound.play(schedule({ kind: 'answer', seat: i + 1 })); }); }}>Seat {i + 1}</button>)}
  </div></main>;
}
