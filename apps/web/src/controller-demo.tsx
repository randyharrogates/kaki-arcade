import { useEffect, useState } from 'preact/hooks';
import { ControllerShell } from '../../../packages/controller-kit/src/index';
import type { LinkState } from '../../../packages/controller-kit/src/index';
import type { SeatNumber } from '@kaki/ui';
import '../../../packages/controller-kit/src/shell.css';
export function ControllerDemo() {
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
  return mounted ? <ControllerShell seat={seat} name={params.get('name') ?? 'Player'} link={link}/> : null;
}
