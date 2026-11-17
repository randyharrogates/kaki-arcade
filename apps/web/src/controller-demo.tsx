import { useEffect, useRef, useState } from 'preact/hooks';
import { ControllerShell, FaceButtons, DPad, ShoulderButton, StartButton, Stick, controlSizes, LayoutEngine } from '@kaki/controller-kit';
import type { Layout, LayoutOutput, LinkState } from '@kaki/controller-kit';
import { privateFixtures } from './private-fixtures';
import { layoutFixtures, nextWireLayout } from './layout-fixtures';
import '../../../packages/controller-kit/src/layout.css';
import type { SeatNumber } from '@kaki/ui';
import '@kaki/controller-kit/shell.css';
import '../../../packages/controller-kit/src/buttons.css';
import '../../../packages/controller-kit/src/stick.css';
import './controller-demo.css';
// Development page: the stick (K-02) by default, the buttons (K-03) with ?controls=buttons.
// The real layouts come from the layout engine (K-04).
export function ControllerDemo() {
  const privateName = new URLSearchParams(location.search).get('private');
  const [privateView,setPrivateView] = useState(privateName ? privateFixtures[privateName] ?? null : null);
  useEffect(() => {
    const change = (event:Event) => { const name:unknown = (event as CustomEvent<unknown>).detail; if (typeof name === 'string' && privateFixtures[name]) setPrivateView(privateFixtures[name]); };
    window.addEventListener('controller-demo-private',change);
    return () => { window.removeEventListener('controller-demo-private',change); };
  }, []);
  const layoutName = new URLSearchParams(location.search).get('layout');
  const [fixture, setFixture] = useState<Layout | null>(layoutName ? layoutFixtures[layoutName] ?? null : null);
  const outputs = useRef<LayoutOutput[]>([]);
  const layoutReadout = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    const change = (event: Event) => {
      const detail: unknown = (event as CustomEvent<unknown>).detail;
      if (typeof detail === 'string' && layoutFixtures[detail]) {
        const next = layoutFixtures[detail];
        setFixture(old => nextWireLayout(old,next));
      }
    };
    window.addEventListener('controller-demo-layout',change);
    return () => { window.removeEventListener('controller-demo-layout',change); };
  }, []);
  const buttons = new URLSearchParams(location.search).get('controls') === 'buttons';
  const readout = useRef<HTMLOutputElement>(null);
  const showVector = (vector: { x: number; y: number }) => {
    const node = readout.current;
    if (!node) return;
    node.dataset.x = String(vector.x); node.dataset.y = String(vector.y);
    node.textContent = `x ${vector.x.toFixed(3)} · y ${vector.y.toFixed(3)}`;
  };
  const [held, setHeld] = useState<string[]>([]);
  const [area, setArea] = useState<{ width: number; height: number; viewport: { width: number; height: number } } | null>(null);
  useEffect(() => {
    const board = document.querySelector('.ka-controller-play');
    if (!board) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setArea({ width: entry.contentRect.width, height: entry.contentRect.height, viewport: { width: innerWidth, height: innerHeight } }); });
    observer.observe(board); return () => { observer.disconnect(); };
  }, []);
  const sizes = area ? controlSizes(area.viewport, area) : null;
  const callbacks = { onPress: (id: string) => { setHeld(old => [...old.filter(value => value !== id), id]); }, onRelease: (id: string) => { setHeld(old => old.filter(value => value !== id)); } };
  const params = new URLSearchParams(location.search);
  const rawSeat = Number(params.get('seat') ?? 1);
  const seat = (Number.isInteger(rawSeat) && rawSeat >= 1 && rawSeat <= 8 ? rawSeat : 1) as SeatNumber;
  const rawLink = params.get('link');
  const [link, setLink] = useState<LinkState>(rawLink === 'lost' || rawLink === 'reconnecting' ? rawLink : 'connected');
  const [mounted, setMounted] = useState(true);
  const cycle = params.get('cycle') === '1';
  useEffect(() => {
    const advance = () => { setLink(old => old === 'connected' ? 'reconnecting' : old === 'reconnecting' ? 'lost' : 'connected'); };
    const unmount = () => { setMounted(false); };
    window.addEventListener('controller-demo-link', advance);
    window.addEventListener('controller-demo-unmount', unmount);
    const timer = cycle ? window.setInterval(advance, 1500) : undefined;
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('controller-demo-link', advance);
      window.removeEventListener('controller-demo-unmount', unmount);
    };
  }, [cycle]);
  if (!mounted) return null;
  if (fixture) return <ControllerShell seat={seat} name={params.get('name') ?? 'Player'} link={link}>
    {area && <LayoutEngine layout={fixture} privateView={privateView} area={area} viewport={area.viewport} isLeader={params.get('leader') === '1'} onOutput={output => {
      outputs.current.push(output);
      if (layoutReadout.current) { layoutReadout.current.dataset.outputs = JSON.stringify(outputs.current); layoutReadout.current.textContent = `${output.control} · ${output.phase} · r${String(output.revision)}`; }
      if (layoutName === 'options' && output.phase === 'choose') setFixture(old => layoutFixtures.watch ? nextWireLayout(old,layoutFixtures.watch) : null);
    }}/>}
    <output ref={layoutReadout} class="ka-layout-readout" hidden={params.get('debug') !== '1'} aria-label="Layout outputs" data-outputs="[]"/>
  </ControllerShell>;
  if (buttons) return <ControllerShell seat={seat} name={params.get('name') ?? 'Player'} link={link}>
    {sizes && <div class="ka-buttons-demo" data-sizes={JSON.stringify(sizes)} style={{ '--in-play-width': `${String(sizes.inPlayWidth)}px` }}>
      <div class="ka-buttons-demo-l"><ShoulderButton {...callbacks} id="L" size={sizes.inPlayWidth} height={sizes.inPlayHeight}/></div><div class="ka-buttons-demo-r"><ShoulderButton {...callbacks} id="R" size={sizes.inPlayWidth} height={sizes.inPlayHeight}/></div>
      <div class="ka-buttons-demo-left"><DPad {...callbacks} size={sizes.inPlayWidth} height={sizes.inPlayHeight}/></div>
      <div class="ka-buttons-demo-right"><FaceButtons {...callbacks} size={sizes.face}/></div>
      <div class="ka-buttons-demo-centre"><StartButton {...callbacks} size={sizes.inPlayWidth} height={sizes.inPlayHeight}/></div><output aria-label="Held controls">{held.length ? held.join(', ') : 'None'}</output>
    </div>}
  </ControllerShell>;
  return <ControllerShell seat={seat} name={params.get('name') ?? 'Player'} link={link}><style>{`.ka-stick-readout { position: absolute; right: var(--ka-space-21); top: var(--ka-space-21); font-family: var(--ka-font-mono); font-size: var(--ka-phone-type-13); color: var(--ka-secondary); }`}</style><Stick onChange={showVector}/><output ref={readout} class="ka-stick-readout" data-x="0" data-y="0">x 0.000 · y 0.000</output></ControllerShell>;
}
