import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { fieldSummary, groupSelection } from './game-setup';
import type { FieldView } from './game-setup';
import type { TeamSetupView } from './team-setup';
import { TeamsToggle } from './team-setup-route';
import { duration, easing, exitDuration, reducedMotion } from '@kaki/ui';
import { Icon } from './icons';
import './game-setup.css';
export function GameSetup({ setup, leader, leaderName, change, toggle, start, back }: {
  setup: TeamSetupView; leader: boolean; leaderName: string;
  change: (id: string, value: unknown) => void; toggle: () => void; start: () => void; back: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [group, setGroup] = useState('');
  const refusal = setupRefusal(setup);
  if (!leader) return <section class="phone-picker setup-watcher"><div class="phone-status picker-status"><h2>{leaderName} is setting up</h2><p>Watch the TV.</p></div></section>;
  const fields = setup.settings?.fields ?? [];
  const active = fields.find(f => f.id === expanded);
  const problem = setup.settings?.problem;
  const choose = (field: FieldView, value: unknown) => { change(field.id, value); };
  return <section class="phone-game-setup" data-expanded={Boolean(active)} aria-label="Game settings">
    {setup.settings?.loading && <p role="status">Loading settings…</p>}
    {fields.map(field => <div class="setup-field" data-field={field.id} key={field.id} data-expanded={field.id === expanded}>
      {field.kind === 'multi' && field.id === expanded ? <>
        <header class="setup-panel-heading"><div class="setup-tabs" aria-label={field.label}>
          {[...new Set(field.options.map(o => o.group ?? ''))].map(name => <button class="ka-panel ka-pressable" aria-pressed={group === name} onClick={() => { setGroup(name); }}>{name || field.label}{group !== name && field.options.some(o => (o.group ?? '') === name && o.chosen) ? ` · ${String(field.options.filter(o => (o.group ?? '') === name && o.chosen).length)}` : ''}</button>)}
        </div><button class="ka-panel ka-pressable picker-primary" onClick={() => { setExpanded(null); }}>Done</button></header>
        <div class="setup-option-grid ka-panel">
          {field.noneLabel && group === (field.options[0]?.group ?? '') && <button class="ka-panel ka-pressable" aria-pressed={!field.options.some(o => o.chosen)} onClick={() => { choose(field, []); }}>{!field.options.some(o => o.chosen) && <span aria-hidden="true">✓ </span>}{field.noneLabel}</button>}
          {group && (!field.noneLabel || group !== (field.options[0]?.group ?? '')) && <button class="ka-panel ka-pressable setup-group" aria-pressed={field.options.filter(o => o.group === group).every(o => o.chosen)} onClick={() => { choose(field, groupSelection(field, group)); }}>All of {group}</button>}
          {field.options.filter(o => (o.group ?? '') === group).map(option => <button class="ka-panel ka-pressable" aria-pressed={option.chosen} aria-disabled={Boolean(option.reason)} onClick={() => {
            choose(field, field.options.filter(o => o.value === option.value ? !o.chosen : o.chosen).map(o => o.value));
          }}><span aria-hidden="true">{option.chosen ? '✓ ' : option.reason ? '✕ ' : ''}</span><span class="setup-option-label">{option.label}</span></button>)}
        </div>
      </> : <div class="setup-field-row"><header class="setup-field-heading"><span title={field.help ?? undefined}>{field.label}</span></header>
        {field.kind === 'choice' ? <div class="setup-inline-options">{field.options.map(option => <button class="ka-panel ka-pressable" aria-pressed={option.chosen} aria-disabled={Boolean(option.reason)} onClick={() => { choose(field, option.value); }}><span aria-hidden="true">{option.chosen ? '✓ ' : option.reason ? '✕ ' : ''}</span><span>{option.label}</span></button>)}</div>
          : field.kind === 'toggle' ? <button class="ka-panel ka-pressable" aria-pressed={field.value} onClick={() => { choose(field, !field.value); }}>{field.value ? 'On ✓' : 'Off'}</button>
          : field.kind === 'number' ? <div class="setup-inline-options"><button class="ka-panel ka-pressable" disabled={field.value <= field.min} aria-label={`Decrease ${field.label}`} onClick={() => { choose(field, field.value - field.step); }}>−</button><span>{fieldSummary(field)}</span><button class="ka-panel ka-pressable" disabled={field.value >= field.max} aria-label={`Increase ${field.label}`} onClick={() => { choose(field, field.value + field.step); }}>+</button></div>
          : <button class="ka-panel ka-pressable" onClick={() => { setExpanded(field.id); setGroup(field.options[0]?.group ?? ''); }}>{fieldSummary(field)}</button>}
      </div>}{field.help && <p class="setup-help">{field.help}</p>}
    </div>)}
    {!active && setup.teamsOffered && <fieldset class="setup-teams-row" disabled={Boolean(setup.teamsReason) && !setup.enabled} aria-disabled={Boolean(setup.teamsReason) && !setup.enabled}><TeamsToggle enabled={setup.enabled} toggle={toggle}/>{setup.teamsReason && <span>{setup.teamsReason}</span>}</fieldset>}
    {(!active || refusal) && <footer><p role="status">{(refusal?.sentence ?? problem) && <><Icon kind="weak"/>{refusal?.sentence ?? problem}</>}</p>{!active && <><button class="ka-panel ka-pressable picker-primary" disabled={setup.settings?.loading === true || Boolean(problem) || setup.enabled && Boolean(setup.teamsReason)} onClick={start}>Start</button><button class="ka-panel ka-pressable" onClick={back}>Back</button></>}</footer>}
  </section>;
}
export interface SetupRefusal { field: string; sentence: string; revision: number }
// The opaque setup envelope preserves additional host state. Validate it at the UI boundary.
function setupRefusal(setup: TeamSetupView): SetupRefusal | null {
  const value: unknown = Reflect.get(setup, 'refusal');
  if (!value || typeof value !== 'object' || !('field' in value) || typeof value.field !== 'string' ||
    !('sentence' in value) || typeof value.sentence !== 'string' || !('revision' in value) ||
    typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision)) return null;
  return value as SetupRefusal;
}
export function GameSetupMirror({ setup }: { setup: TeamSetupView | null }) {
  if (!setup) return null;
  const refusal = setupRefusal(setup);
  const problem = refusal?.sentence ?? setup.settings?.problem;
  return <dl class="game-setup-mirror">{setup.settings?.fields.map(field => <div class="setup-mirror-row" data-refused={refusal?.field === field.id} data-field={field.id} key={field.id}><dt class="setup-mirror-heading" data-refused={refusal?.field === field.id}><span>{field.label}</span></dt><dd><MirrorValue value={fieldSummary(field)}/></dd></div>)}
    {setup.teamsOffered && <div class="setup-mirror-row"><dt>Teams</dt><dd><MirrorValue value={setup.enabled ? 'On' : 'Off'}/></dd></div>}
    <MirrorProblem text={problem ?? (setup.settings?.loading ? 'Loading settings…' : '')} warning={Boolean(problem)}/>
  </dl>;
}

function MirrorValue({ value }: { value: string }) {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useLayoutEffect(() => {
    const el = node.current;
    const oldValue = previous.current; previous.current = value;
    if (!el || oldValue === value || reducedMotion()) return;
    const old = document.createElement('strong'); old.textContent = oldValue;
    old.className = 'setup-value-outgoing'; old.setAttribute('aria-hidden', 'true'); el.append(old);
    const incoming = el.firstElementChild;
    const options = { duration: duration.base, easing: easing.out };
    const a = incoming?.animate([{ opacity: 0 }, { opacity: 1 }], options);
    const b = old.animate([{ opacity: 1 }, { opacity: 0 }], options);
    b.onfinish = () => { old.remove(); };
    return () => { a?.cancel(); b.cancel(); old.remove(); };
  }, [value]);
  return <span class="setup-mirror-value" ref={node}><strong>{value}</strong></span>;
}

/** Keep the live region mounted; only the decorative exit copy retains old text. */
function MirrorProblem({ text, warning }: { text: string; warning: boolean }) {
  const node = useRef<HTMLParagraphElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    const old = previous.current;
    previous.current = text ? el.cloneNode(true) as HTMLElement : null;
    if (reducedMotion()) return;
    const incoming = text ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.base, easing: easing.out }) : null;
    let outgoing: Animation | null = null;
    if (old && old.textContent !== el.textContent) {
      old.removeAttribute('role'); old.setAttribute('aria-hidden', 'true');
      old.classList.add('setup-problem-outgoing');
      el.parentElement?.append(old);
      outgoing = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: exitDuration('base'), easing: easing.inOut, fill: 'forwards' });
      outgoing.onfinish = () => { old.remove(); };
    }
    return () => { incoming?.cancel(); outgoing?.cancel(); old?.remove(); };
  }, [text]);
  return <div class="setup-mirror-problem"><p role="status" ref={node}>{text && <>{warning && <Icon kind="weak"/>}{text}</>}</p></div>;
}
