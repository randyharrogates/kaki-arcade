import type { sessionDisplayStore } from './session-display';
import { useSoundRunning } from './sound-state';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { duration, exitDuration, easing, reducedMotion, POPOVER_START_SCALE } from '@kaki/ui';
import type { Sound, SoundChannel } from '@kaki/platform';
import { confirmationTone } from '@kaki/platform';
import { stepLevel } from './pause-level';

export function PausePanel({ paused, resume, quit, sound, waiting, codeGroups = [], joinLink = '' }: { paused: boolean; resume: () => void; quit: () => void; sound: Sound; waiting?: { message: string | null; countdown: number | null } | undefined; codeGroups?: string[]; joinLink?: string }) {
  const running = useSoundRunning(sound);
  const [levels, setLevels] = useState(() => ({ effects: sound.getLevel('effects'), music: sound.getLevel('music') }));
  const change = (channel: SoundChannel, direction: -1 | 1): void => {
    const before = sound.getLevel(channel);
    const next = stepLevel(before, direction);
    if (next === before) return;
    sound.setLevel(channel, next);
    setLevels(previous => ({ ...previous, [channel]: next }));
    // At 0 the gain is still gliding down when the tone starts, so it would tick; zero stays silent.
    if (channel === 'effects' && next > 0) sound.play(confirmationTone);
  };
  const [visible, setVisible] = useState(paused);
  const panel = useRef<HTMLElement>(null);
  const number = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!waiting?.countdown || !number.current || reducedMotion()) return;
    const animation = number.current.animate([{ opacity: 0, transform: `scale(${String(POPOVER_START_SCALE)})` }, { opacity: 1, transform: 'scale(1)' }], { duration: duration.base, easing: easing.out });
    return () => { animation.cancel(); };
  }, [waiting?.countdown]);
  const resumeButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { if (paused) setVisible(true); }, [paused]);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element || !visible) return;
    if (paused) resumeButton.current?.focus();
    if (reducedMotion()) { if (!paused) setVisible(false); return; }
    const small = { opacity: 0, transform: `scale(${String(POPOVER_START_SCALE)})` };
    const full = { opacity: 1, transform: 'scale(1)' };
    const animation = element.animate(paused ? [small, full] : [full, small], { duration: paused ? duration.base : exitDuration('base'), easing: easing.out, fill: 'both' });
    animation.onfinish = () => { if (!paused) setVisible(false); };
    return () => { animation.cancel(); if (!paused) setVisible(false); };
  }, [paused, visible]);
  return visible ? <div class="host-pause screen" inert={!paused}><section ref={panel} class="ka-panel" role="dialog" aria-modal="true" aria-label="Paused" data-waiting={Boolean(waiting?.message ?? waiting?.countdown)}>{(waiting?.message ?? waiting?.countdown) && <div class="pause-rejoin" role="status"><h2>{waiting.countdown !== null ? <span ref={number} class="rejoin-countdown" key={waiting.countdown}>{waiting.countdown}</span> : waiting.message}</h2><div class="room-code" aria-label={`Room code ${codeGroups.join(' ')}`}>{codeGroups.map(group => <span key={group}>{group}</span>)}</div>{joinLink && <p>or go to <b>{new URL(joinLink).host}/play</b></p>}</div>}<div class="pause-controls"><h2>Paused</h2><button ref={resumeButton} class="ka-panel ka-pressable" onClick={resume}>{waiting?.message && waiting.countdown === null ? 'Carry on without them' : 'Resume'}</button>{(['effects', 'music'] as const).map(channel => <div class="ka-panel pause-level" role="slider" tabIndex={0} aria-label={channel === 'effects' ? 'Effects' : 'Music'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={levels[channel]} aria-valuetext={running ? undefined : 'Sound is off'} onKeyDown={event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    change(channel, event.key === 'ArrowLeft' ? -1 : 1);
  }}><span>{channel === 'effects' ? 'Effects' : 'Music'}</span><button class="ka-panel ka-pressable" tabIndex={-1} aria-label={`Lower ${channel}`} onClick={() => { change(channel, -1); }}>−</button><span class="pause-level-value">{running ? <span>{levels[channel]}</span> : null}</span><button class="ka-panel ka-pressable" tabIndex={-1} aria-label={`Raise ${channel}`} onClick={() => { change(channel, 1); }}>+</button><span class="pause-level-off" hidden={running}>Sound is off</span><span class="pause-level-bar" hidden={!running} aria-hidden="true"><span style={{ transform: `scaleX(${String(levels[channel] / 100)})` }}/></span></div>)}<button class="ka-panel ka-pressable" onClick={quit}>Quit to picker</button></div></section></div> : null;
}

export function SessionPausePanel({ displays, ...props }: Omit<Parameters<typeof PausePanel>[0], 'waiting'> & { displays: ReturnType<typeof sessionDisplayStore> }) {
  const [waiting, setWaiting] = useState(displays.get()?.waiting);
  useEffect(() => displays.subscribe(display => { setWaiting(display?.waiting); }), [displays]);
  return <PausePanel {...props} waiting={waiting}/>;
}
