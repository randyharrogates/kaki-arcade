import { useEffect, useRef, useState } from 'preact/hooks';
import { ControllerShell, Stick } from '../../../packages/controller-kit/src/index';
import type { LinkState } from '../../../packages/controller-kit/src/index';
import type { SeatNumber } from '@kaki/ui';
import '../../../packages/controller-kit/src/shell.css';
import '../../../packages/controller-kit/src/stick.css';
export function ControllerDemo() {
  const readout = useRef<HTMLOutputElement>(null);
  const showVector = (vector: { x: number; y: number }) => {
    const node = readout.current;
    if (!node) return;
    node.dataset.x = String(vector.x); node.dataset.y = String(vector.y);
    node.textContent = `x ${vector.x.toFixed(3)} · y ${vector.y.toFixed(3)}`;
  };
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
  return mounted ? <ControllerShell seat={seat} name={params.get('name') ?? 'Player'} link={link}><style>{`.ka-stick-readout { position: absolute; right: var(--ka-space-21); top: var(--ka-space-21); font-family: var(--ka-font-mono); font-size: var(--ka-phone-type-13); color: var(--ka-secondary); }`}</style><Stick onChange={showVector}/><output ref={readout} class="ka-stick-readout" data-x="0" data-y="0">x 0.000 · y 0.000</output></ControllerShell> : null;
}
