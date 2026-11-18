import type { SoundCue } from '@kaki/platform';
import type { RabakzPublicView } from './view-model';
export type Cue = ({ kind: 'unlock' | 'correct' | 'wrong' } | { kind: 'answer'; seat: number }) & { delay?: number };
export const SEAT_NOTES = [72, 74, 76, 79, 81, 84, 86, 88] as const;
const note = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const PARTIALS = [[1, 1, 0.42], [3.93, 0.28, 0.09], [9.2, 0.06, 0.03]] as const;
/** Exact D-168 artifact voice and Mallet set; no assets or persistent graph work. */
export function scheduleCue(cue: Cue): SoundCue {
  return (context, time, output) => {
    time += cue.delay ?? 0;
    const mallet = (t: number, midi: number, peak = 0.32) => {
      for (const [ratio, level, decay] of PARTIALS) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = note(midi) * ratio;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(peak * level, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        oscillator.connect(gain); gain.connect(output);
        oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); });
        oscillator.start(t); oscillator.stop(t + decay + 0.02);
      }
    };
    switch (cue.kind) {
      case 'unlock': mallet(time, 72); mallet(time + 0.089, 79); break;
      case 'answer': { const midi = SEAT_NOTES[cue.seat - 1]; if (midi !== undefined) mallet(time, midi, 0.38); break; }
      case 'correct': [72, 76, 79, 84].forEach((midi, i) => { mallet(time + i * 0.089, midi); }); break;
      case 'wrong': mallet(time, 64, 0.28); mallet(time + 0.144, 60, 0.28); break;
    }
  };
}
/** null marks a fresh session. History belongs to the session, surviving remounts. */
export function cuesFor(previous: RabakzPublicView | null, next: RabakzPublicView): Cue[] {
  if (previous === null) return next.phase === 'question' ? [{ kind: 'unlock' }] : [];
  const sameQuestion = previous.round === next.round && previous.question?.id === next.question?.id;
  const cues: Cue[] = [];
  if (next.phase === 'question' && (!sameQuestion || previous.phase !== 'question')) cues.push({ kind: 'unlock' });
  if (!sameQuestion) return cues;
  const wrong = Object.entries(next.wrongPresses).flatMap(([seat, count]) =>
    Array.from({ length: Math.max(0, count - (previous.wrongPresses[Number(seat)] ?? 0)) }, () => Number(seat)));
  const winners = next.phase === 'reveal' && previous.phase !== 'reveal' ? next.winners : [];
  const seats = [...wrong, ...winners.map(w => w.seat)].sort((a, b) => a - b);
  seats.forEach((seat, i) => cues.push({ kind: 'answer', seat, ...(i ? { delay: i * 0.03 } : {}) }));
  const delay = Math.max(0, seats.length - 1) * 0.03 + 0.233;
  if (wrong.length) cues.push({ kind: 'wrong', delay });
  if (winners.length) cues.push({ kind: 'correct', delay });
  return cues;
}
