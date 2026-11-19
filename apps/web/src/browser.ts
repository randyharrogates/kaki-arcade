import { prepareDetail } from './detail-preparation';
import { hostCounts } from './counts';
import { viewChannel } from './view-channel';
import { createSessionAdapter, animationFrames } from './session-adapter';
import type { SessionDisplay } from './session-adapter';
import type { SessionEvent } from '@kaki/platform';
import { loadSessionGame, prepareSession, loadSessionAssets } from './session-loading';
import { sessionLinks } from './session-links';
import { loadGame, consoleE2eEnabled } from './game-registry';
import { createHostTransport } from '@kaki/netcode';
import type { Channel, PeerConnection, Socket, Stat } from '@kaki/netcode';
import { HOST_REOPEN_TIMEOUT_MS } from '@kaki/platform';
import type { HostCredentials } from '@kaki/platform';
import type { DialCallbacks, HostDependencies } from './host';

// The browser's wider event/SDP interfaces are narrowed at this one adapter boundary.
export function peerConnection(configuration: RTCConfiguration): PeerConnection {
  const pc = new RTCPeerConnection(configuration);
  return {
    get connectionState() { return pc.connectionState; },
    get onconnectionstatechange() { return null; },
    set onconnectionstatechange(callback) { pc.onconnectionstatechange = callback; },
    get onicecandidate() { return null; },
    set onicecandidate(callback: PeerConnection['onicecandidate']) { pc.onicecandidate = event => callback?.({ candidate: event.candidate }); },
    get ondatachannel() { return null; },
    set ondatachannel(callback: PeerConnection['ondatachannel']) { pc.ondatachannel = event => callback?.({ channel: event.channel as unknown as Channel }); },
    createDataChannel: (label, options) => pc.createDataChannel(label, options) as unknown as Channel,
    createOffer: async () => { const d = await pc.createOffer(); return { type: 'offer', sdp: d.sdp ?? '' }; },
    createAnswer: async () => { const d = await pc.createAnswer(); return { type: 'answer', sdp: d.sdp ?? '' }; },
    setLocalDescription: d => pc.setLocalDescription(d),
    setRemoteDescription: d => pc.setRemoteDescription(d),
    addIceCandidate: c => pc.addIceCandidate(c ?? undefined),
    getStats: async () => {
      const stats = await pc.getStats();
      const result = new Map<string, Stat>();
      stats.forEach((value: Stat) => result.set(value.id, value));
      return result;
    },
    close: () => { pc.close(); },
  };
}
export function retryAfterDelay(value: string | null, now: number, cap = Infinity): number {
  const seconds = value?.trim() ? Number(value) : NaN;
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value ?? '') - now;
  const safe = Number.isFinite(delay) ? Math.max(1000, delay) : 60000;
  return Math.min(cap, safe);
}
export function browserDependencies(baseUrl: string, transportFactory: typeof createHostTransport = createHostTransport, loader: typeof loadGame = loadGame, present: (display: SessionDisplay | null) => void = () => undefined, event: (event: SessionEvent) => void = () => undefined): HostDependencies {
  const clock = {
    now: () => Date.now(),
    schedule: (callback: () => void, delay: number) => window.setTimeout(callback, delay),
    cancel: (handle: unknown) => { if (typeof handle === 'number') window.clearTimeout(handle); },
  };
  let countRequest: AbortController | undefined;
  // DATA-003 (D-180): one reconnect:signal per signalling outage (connected → reconnecting), not per retry notification.
  let signalConnected = false;
  const countsUrl = (): string => `${(baseUrl || window.location.origin).replace(/\/$/, '')}/counts`;
  const counts = hostCounts({
    async send(body) {
      const controller = new AbortController(); countRequest = controller;
      try {
        const response = await fetch(countsUrl(), { method: 'POST', body, credentials: 'omit', referrerPolicy: 'no-referrer',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]) });
        return response.ok;
      } catch { return controller.signal.aborted; }
      finally { if (countRequest === controller) countRequest = undefined; }
    },
    beacon: body => fetch(countsUrl(), { method: 'POST', body, keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer' }).then(response => response.ok),
    cancel() { countRequest?.abort(); countRequest = undefined; },
  });
  const links = sessionLinks();
  const session = createSessionAdapter({
    counts,
    async detail(id, screen, signal) {
      const start = performance.now();
      const detail = await prepareDetail(id, screen, undefined, signal);
      if (import.meta.env.DEV) {
        document.documentElement.dataset.detailPreparationMs = String(performance.now() - start);
        document.documentElement.dataset.chosenDetail = detail;
      }
      return detail;
    },
    load: id => loadSessionGame(id, loader), prepare: prepareSession, assets: loadSessionAssets,
    transport: links.transport,
    frames: animationFrames(callback => requestAnimationFrame(callback), handle => { cancelAnimationFrame(handle); }),
    seed: () => consoleE2eEnabled ? 15 : crypto.getRandomValues(new Uint32Array(1))[0] ?? 0,
    display: present, event,
  });
  return {
    clock,
    session: {
      localPeer: (id, peer) => { links.peer(id, peer); },
      command: (action, id) => { session.command(action, id); },
      continueResults: () => { session.continueResults(); },
      prefetch: session.prefetch,
      setup: (id, teams) => session.setup(id, teams),
      async start(id, room, settings) { links.setup(room, session.buffer); try { await session.start(id, room, settings); } catch (error) { if (!(error instanceof Error && error.message === 'Cancelled')) counts.add('error:host:load'); throw error; } },
      updateRoom(room) { links.updateRoom(room); session.updateRoom(room); },
      control: (id, message) => { links.control(id, message); }, dropped: id => { links.dropped(id); },
      stop() { session.stop(); },
    },
    online: { subscribe(callback) { window.addEventListener('online', callback); return () => { window.removeEventListener('online', callback); }; } },
    storage: {
      getItem: key => window.sessionStorage.getItem(key),
      setItem: (key, value) => { window.sessionStorage.setItem(key, value); },
      removeItem: key => { window.sessionStorage.removeItem(key); },
    },
    mintToken: () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join(''),
    lifecycle: { subscribe(callback) {
      const hide = (): void => { counts.hide(); callback('pagehide'); };
      const show = (): void => { callback('pageshow'); };
      const hidden = (): void => { if (document.visibilityState === 'hidden') { counts.hide(); callback('hidden'); } };
      window.addEventListener('pagehide', hide); window.addEventListener('pageshow', show);
      document.addEventListener('visibilitychange', hidden);
      return () => {
        window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show);
        document.removeEventListener('visibilitychange', hidden);
      };
    } },
    dial: (credentials: HostCredentials | undefined, callbacks: DialCallbacks, registerStop) => new Promise((resolve, reject) => {
      const channels = new Map<string, ReturnType<typeof viewChannel>>();
      let transport: Awaited<ReturnType<typeof createHostTransport>> | undefined;
      let acknowledgement: { code: string; hostToken: string; reopened: boolean } | undefined;
      let cancelled = false;
      const stop = (): void => { cancelled = true; transport?.stop(); links.stop(); reject(new Error('cancelled')); };
      registerStop(stop);
      const finish = (): void => {
        if (!transport || !acknowledgement || cancelled) return;
        if (transport.credentials.code !== acknowledgement.code || transport.credentials.hostToken !== acknowledgement.hostToken) {
          cancelled = true; transport.stop(); callbacks.state('expired'); reject(new Error('bad-token')); return;
        }
        resolve({ ...transport, reopened: acknowledgement.reopened });
      };
      void transportFactory({
        externalRetry: true,
        retryDelay: failure => Math.min(30000, 1000 * 2 ** Math.min(failure, 5)),
        online: { subscribe(callback) {
          window.addEventListener('online', callback);
          return () => { window.removeEventListener('online', callback); };
        } },
        baseUrl: baseUrl || window.location.origin, clock, fetch: async (url, init) => {
          const response = await fetch(url, { ...init, signal: AbortSignal.timeout(HOST_REOPEN_TIMEOUT_MS) });
          if (response.status === 429) {
            const value = response.headers.get('Retry-After');
            const retryAfterMs = retryAfterDelay(value, Date.now());
            callbacks.retryAfter?.(retryAfterMs);
            throw Object.assign(new Error('rate-limited'), { retryAfterMs });
          }
          return response;
        },
        socket: (url, protocols) => new WebSocket(url, protocols) as unknown as Socket,
        factory: peerConnection,
        ...(credentials ? { credentials } : {}),
        upgradeStatus: async url => {
          const response = await fetch(url.replace(/^ws/, 'http'), { signal: AbortSignal.timeout(HOST_REOPEN_TIMEOUT_MS) });
          if (response.status === 429) callbacks.retryAfter?.(retryAfterDelay(response.headers.get('Retry-After'), Date.now()));
          return { status: response.status, gone: response.headers.get('X-Kaki-Room') === 'gone',
            ...(response.status === 429 ? { retryAfterMs: retryAfterDelay(response.headers.get('Retry-After'), Date.now()) } : {}) };
        },
        onRoom: message => { acknowledgement = { code: message.code, hostToken: message.hostToken, reopened: message.reopened }; finish(); },
        onPeer: (id, peer) => {
          const channel = viewChannel(); channels.set(id, channel);
          const wrapped = { ...peer, sendHost: (message: Parameters<typeof peer.sendHost>[0]) => channel.send(message, m => peer.sendHost(m)) };
          links.peer(id, wrapped); callbacks.peer(id, wrapped);
        },
        onControl: (message, _identity, id) => { callbacks.control(id, channels.get(id)?.receive(message) ?? null); },
        onState: (state, id) => {
          if (state === 'closed') { channels.delete(id); callbacks.dropped(id); }
        },
        onLink: (quality, id) => { callbacks.quality(id, quality); },
        onPairingState: state => {
          if (state === 'reconnecting') { if (signalConnected) counts.add('reconnect:signal'); callbacks.state('reconnecting'); }
          signalConnected = state === 'connected';
          if (state === 'connected' && acknowledgement) callbacks.state('ready');
        },
        onError: reason => {
          if (reason === 'not-allowed') callbacks.state('replaced');
          else if (reason === 'room-not-found' || reason === 'room-expired') callbacks.state('expired');
          else if (reason === 'socket-unavailable') { counts.add('error:signal:unavailable'); callbacks.state('unreachable'); }
          // Peer negotiation errors belong to that seat, not the whole lobby.
          if (['not-allowed', 'room-not-found', 'room-expired', 'bad-token', 'socket-unavailable'].includes(reason)) reject(new Error(reason));
        },
      }).then(result => {
        transport = result;
        if (cancelled) result.stop(); else finish();
      }, (error: unknown) => { reject(error instanceof Error ? error : new Error('unreachable')); });
    }),
  };
}
