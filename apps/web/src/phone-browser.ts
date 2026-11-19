import { createPhoneTransport } from '@kaki/netcode';
import type { Socket } from '@kaki/netcode';
import { peerConnection, retryAfterDelay } from './browser';
import type { PhoneDependencies } from './phone';
let tabIdentity: string | undefined;
function browserIdentity(): string {
  tabIdentity ??= Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const saved = localStorage.getItem('kaki.device');
    if (saved && /^[a-zA-Z0-9_-]{16,128}$/.test(saved)) return saved;
    localStorage.setItem('kaki.device', tabIdentity);
  } catch { /* Storage denial keeps a per-tab identity. */ }
  return tabIdentity;
}
export function phoneBrowserDependencies(baseUrl: string): PhoneDependencies {
  const clock = { now: () => Date.now(), schedule: (fn: () => void, ms: number) => window.setTimeout(fn, ms),
    cancel: (id: unknown) => { if (typeof id === 'number') window.clearTimeout(id); } };
  return { clock, browserId: browserIdentity(),
    storage: { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => { sessionStorage.setItem(key, value); }, removeItem: key => { sessionStorage.removeItem(key); } },
    lifecycle: { subscribe(receive) {
      const sleep = (): void => { receive('sleep'); };
      const wake = (): void => { receive('wake'); };
      const visibility = (): void => { receive(document.hidden ? 'sleep' : 'wake'); };
      window.addEventListener('pagehide', sleep); window.addEventListener('pageshow', wake); window.addEventListener('online', wake);
      document.addEventListener('visibilitychange', visibility);
      return () => { window.removeEventListener('pagehide', sleep); window.removeEventListener('pageshow', wake); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', visibility); };
    } },
    dial(options, feedback) {
      return createPhoneTransport({ ...options, baseUrl: baseUrl || location.origin, clock, externalRetry: true,
        socket: (url, protocols) => new WebSocket(url, protocols) as unknown as Socket, factory: peerConnection,
        upgradeStatus: async url => {
          feedback.unreachable();
          const response = await fetch(url.replace(/^ws/, 'http'), { signal: AbortSignal.timeout(15000) });
          const retryAfterMs = response.headers.has('Retry-After') ? retryAfterDelay(response.headers.get('Retry-After'), clock.now(), 30000) : 0;
          feedback.retryAfter(retryAfterMs);
          return { status: response.status, gone: response.headers.get('X-Kaki-Room') === 'gone', retryAfterMs };
        },
        onControl: message => { options.onControl(message); },
        onLink: () => undefined,
        onSignal: message => { if (message.t === 'host') options.onHost(message.present); },
      });
    },
  };
}
