/** Host-only Web Audio service (RZ-033); games supply their own schedulers. */
// Structural Web Audio ports keep the pure platform package independent of DOM libs.
export interface SoundNode { connect(node: SoundNode): unknown; disconnect(): void }
export interface SoundParam {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
  setTargetAtTime(value: number, time: number, constant: number): unknown;
}
export interface SoundGain extends SoundNode { gain: SoundParam }
export interface SoundOscillator extends SoundNode {
  type: string; frequency: { value: number };
  start(time: number): void; stop(time: number): void;
  addEventListener(type: 'ended', listener: () => void): void;
}
export interface SoundLimiter extends SoundNode { threshold: SoundParam; knee: SoundParam; ratio: SoundParam; attack: SoundParam; release: SoundParam }
export interface SoundContext {
  readonly currentTime: number; readonly state: string; readonly destination: SoundNode;
  createDynamicsCompressor(): SoundLimiter;
  createGain(): SoundGain; createOscillator(): SoundOscillator;
}
export interface SoundStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type SoundChannel = 'effects' | 'music';
export type SoundCue = (context: SoundContext, time: number, output: SoundNode) => void;
export interface Sound {
  play(cue: SoundCue, channel?: SoundChannel): void;
  setLevel(channel: SoundChannel, level: number): void;
  getLevel(channel: SoundChannel): number;
}
export const SOUND_STORAGE_KEY = 'kaki.sound.levels';
export function soundLevels(storage?: SoundStorage) {
  const levels = { effects: 70, music: 55 };
  try {
    const saved: unknown = JSON.parse(storage?.getItem(SOUND_STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') for (const channel of ['effects', 'music'] as const) {
      const value: unknown = Reflect.get(saved, channel);
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100) levels[channel] = value;
    }
  } catch { /* Storage can be blocked on a shared TV. */ }
  return levels;
}
export function createSoundEngine(context: SoundContext, storage?: SoundStorage): Sound {
  const levels = soundLevels(storage);
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.001; limiter.release.value = 0.1;
  const master = context.createGain();
  const outputs = { effects: context.createGain(), music: context.createGain() };
  master.connect(context.destination);
  for (const channel of ['effects', 'music'] as const) {
    outputs[channel].gain.value = levels[channel] / 100;
    outputs[channel].connect(channel === 'effects' ? limiter : master);
  }
  const compensation = context.createGain();
  // With knee 0, full-range gain at 0 dB is 10^(threshold * (1 - 1/ratio) / 20).
  // Web Audio makeup gain is (1 / full-range gain)^0.6; cancel it after limiting.
  const fullRangeGain = 10 ** (limiter.threshold.value * (1 - 1 / limiter.ratio.value) / 20);
  compensation.gain.value = fullRangeGain ** 0.6;
  limiter.connect(compensation);
  compensation.connect(master);
  return {
    play(cue, channel = 'effects') {
      cue(context, context.currentTime + 0.02, outputs[channel]);
    },
    getLevel: channel => levels[channel],
    setLevel(channel, value) {
      if (!Number.isFinite(value)) return;
      levels[channel] = Math.max(0, Math.min(100, value));
      outputs[channel].gain.setTargetAtTime(levels[channel] / 100, context.currentTime, 0.02);
      try { storage?.setItem(SOUND_STORAGE_KEY, JSON.stringify(levels)); } catch { /* Keep the session's level. */ }
    },
  };
}

/** The outgoing shell surface must not schedule game cues during its overlap exit. */
export function activeScreenSound(active: boolean, sound: Sound): Sound | undefined {
  return active ? sound : undefined;
}

/** Neutral C5 Mallet confirmation (RZ-033, D-168), through the saved Effects bus. */
export const confirmationTone: SoundCue = (context, time, output) => {
  for (const [ratio, level, decay] of [[1, 1, 0.42], [3.93, 0.28, 0.09], [9.2, 0.06, 0.03]] as const) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440 * 2 ** ((72 - 69) / 12) * ratio;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.38 * level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    oscillator.connect(gain); gain.connect(output);
    oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); });
    oscillator.start(time); oscillator.stop(time + decay + 0.02);
  }
};
