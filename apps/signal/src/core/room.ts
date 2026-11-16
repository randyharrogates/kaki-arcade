import { decodeOpeningSignal, decodeHostSignal, decodePhoneSignal, MAX_PLAYERS, MAX_SIGNAL_BYTES,
  PROTOCOL_VERSION as v } from '@kaki/protocol';
import type { AnySignal, IceGrant, SignalErrorCode } from '@kaki/protocol';
import { normalizeCode } from './codes';
import { BURST, consume } from './bucket';
import type { Bucket } from './bucket';
export const IDLE_MS = 10 * 60 * 1000;
export const OPENING_MS = 3000;
export const MAX_UNIDENTIFIED = 16;
export const ABSOLUTE_MS = 12 * 60 * 60 * 1000;
// C-02 replaces this grant provider; no credentials or usage accounting here.
export function iceGrant(): IceGrant {
    return { servers: [], ttlS: 0, relay: 'off' };
}
export interface SocketState {
    id: string;
    role: 'opening' | 'host' | 'phone';
    bucket: Bucket;
    roomToken: string;
    openedAt: number;
    clientKey?: string | undefined;
}
export interface RoomState {
    code: string;
    hostToken: string;
    createdAt: number;
    emptyAt: number | null;
    sockets: SocketState[];
    expired: boolean;
    hostOpened: boolean;
}
export type Event = {
    t: 'connect';
    id: string;
    roomToken: string;
    authenticatedHost: boolean;
    clientKey?: string | undefined;
} | {
    t: 'message';
    id: string;
    data: unknown;
} | {
    t: 'disconnect';
    id: string;
} | {
    t: 'alarm';
};
export interface Effects {
    state: RoomState;
    sends: {
        id: string;
        message: AnySignal;
    }[];
    closes: string[];
    alarmAt: number | null;
}
export function newRoom(code: string, hostToken: string, now: number): RoomState {
    return { code, hostToken, createdAt: now, emptyAt: now, sockets: [], expired: false, hostOpened: false };
}
export function handle(input: RoomState, event: Event, now: number): Effects {
    const state: RoomState = {
        ...input,
        sockets: input.sockets.map((s) => ({ ...s, bucket: { ...s.bucket } })),
    };
    const out: Effects = { state, sends: [], closes: [], alarmAt: null };
    const send = (id: string, message: Effects['sends'][number]['message']): void => {
        out.sends.push({ id, message });
    };
    const error = (id: string, code: SignalErrorCode): void => {
        send(id, { v, t: 'error', code, retryAfterS: code === 'rate-limited' ? 1 : null });
    };
    const host = (): SocketState | undefined => state.sockets.find((s) => s.role === 'host');
    const phones = (): SocketState[] => state.sockets.filter((s) => s.role === 'phone');
    const remove = (id: string): void => {
        const socket = state.sockets.find((s) => s.id === id);
        state.sockets = state.sockets.filter((s) => s.id !== id);
        if (socket?.role === 'host')
            for (const phone of phones())
                send(phone.id, { v, t: 'host', present: false });
        if (socket?.role === 'phone') {
            const h = host();
            if (h)
                send(h.id, { v, t: 'peer-left', peer: id });
        }
    };
    const expire = (): void => {
        for (const s of state.sockets) {
            error(s.id, 'room-expired');
            out.closes.push(s.id);
        }
        state.sockets = [];
        state.hostToken = '';
        state.code = '';
        state.expired = true;
    };
    const idleExpired = state.emptyAt !== null && now >= state.emptyAt + IDLE_MS;
    if (state.expired || now >= state.createdAt + ABSOLUTE_MS || idleExpired) {
        expire();
        if (event.t === 'connect')
            out.closes.push(event.id);
        return out;
    }
    for (const socket of [...state.sockets]) {
        if (socket.role === 'opening' && now >= socket.openedAt + OPENING_MS) {
            error(socket.id, 'opening-timeout');
            out.closes.push(socket.id);
            remove(socket.id);
        }
    }
    const context: Transition = { state, out, now, send, error, host, phones, remove };
    switch (event.t) {
        case 'connect':
            handleConnect(context, event);
            break;
        case 'disconnect':
            handleDisconnect(context, event);
            break;
        case 'message':
            handleMessage(context, event);
            break;
        case 'alarm':
            handleAlarm();
            break;
    }
    scheduleAlarm(context);
    return out;
}
interface Transition {
    state: RoomState;
    out: Effects;
    now: number;
    send: (id: string, message: AnySignal) => void;
    error: (id: string, code: SignalErrorCode) => void;
    host: () => SocketState | undefined;
    phones: () => SocketState[];
    remove: (id: string) => void;
}

function scheduleAlarm(context: Transition): void {
    const { state, out, now } = context;
    if (state.sockets.length === 0)
        state.emptyAt ??= now;
    else
        state.emptyAt = null;
    const openingDeadlines = state.sockets
        .filter((s) => s.role === 'opening')
        .map((s) => s.openedAt + OPENING_MS);
    out.alarmAt = state.expired ? null : Math.min(state.createdAt + ABSOLUTE_MS, ...openingDeadlines,
      state.emptyAt === null ? Infinity : state.emptyAt + IDLE_MS);
}

function handleConnect(context: Transition, event: Extract<Event, { t: 'connect' }>): void {
    const { state, out, now, error, host, send, phones } = context;
    if (!event.authenticatedHost &&
        state.sockets.filter((s) => s.role === 'opening').length >= MAX_UNIDENTIFIED) {
        const oldest = state.sockets.filter((s) => s.role === 'opening' && ((event.clientKey !== undefined && s.clientKey === event.clientKey) || now - s.openedAt >= 1500)).sort((a, b) => a.openedAt - b.openedAt)[0];
        if (!oldest) {
            error(event.id, 'rate-limited');
            out.closes.push(event.id);
            return;
        }
        error(oldest.id, 'opening-timeout');
        out.closes.push(oldest.id);
        state.sockets = state.sockets.filter((s) => s.id !== oldest.id);
    }
    if (event.authenticatedHost) {
        const old = host();
        if (old) {
            error(old.id, 'not-allowed');
            out.closes.push(old.id);
            state.sockets = state.sockets.filter((s) => s.id !== old.id);
        }
    }
    state.sockets.push({
        id: event.id, roomToken: event.roomToken, clientKey: event.clientKey,
        role: event.authenticatedHost ? 'host' : 'opening',
        bucket: { tokens: BURST, at: now }, openedAt: now,
    });
    if (event.authenticatedHost) {
        send(event.id, { v, t: 'created', code: state.code, hostToken: state.hostToken,
            reopened: state.hostOpened, ice: iceGrant() });
        state.hostOpened = true;
        for (const p of phones()) {
            send(p.id, { v, t: 'host', present: true });
            send(event.id, { v, t: 'peer-joined', peer: p.id });
        }
    }

}

function handleDisconnect(context: Transition, event: Extract<Event, { t: 'disconnect' }>): void {
    const { remove } = context;
    remove(event.id);
}

function handleOpening(
    context: Transition, s: SocketState, event: Extract<Event, { t: 'message' }>,
): void {
    const { state, out, error, remove, phones, send, host } = context;
    const decoded = decodeOpeningSignal(normalizeOpening(event.data));
    if (!decoded.ok) {
        error(s.id, 'bad-message');
        out.closes.push(s.id);
        remove(s.id);
    }
    else {
        const m = decoded.value;
        if (normalizeCode(m.code) !== state.code) {
            error(s.id, 'room-not-found');
            out.closes.push(s.id);
            remove(s.id);
        }
        else if (phones().length >= MAX_PLAYERS && !phones().some((
          p) => m.roomToken !== null && equalSecret(p.roomToken, m.roomToken))) {
            error(s.id, 'room-full');
            out.closes.push(s.id);
            remove(s.id);
        }
        else {
            const previous = phones().find((p) => m.roomToken !== null && equalSecret(
              p.roomToken, m.roomToken));
            if (previous) {
                error(previous.id, 'not-allowed');
                out.closes.push(previous.id);
                remove(previous.id);
            }
            s.role = 'phone';
            send(s.id, { v, t: 'joined', peer: s.id, roomToken: s.roomToken, hostPresent:
              !!host(), ice: iceGrant() });
            const h = host();
            if (h)
                send(h.id, { v, t: 'peer-joined', peer: s.id });
        }
    }
}

function handleEstablished(
    context: Transition, s: SocketState, event: Extract<Event, { t: 'message' }>,
): void {
    const { state, out, error, host, send, phones, remove } = context;
    const decoded = s.role === 'host' ? decodeHostSignal(event.data) : decodePhoneSignal(
      event.data);
    if (!decoded.ok)
        error(s.id, 'bad-message');
    else {
        const m = decoded.value;
        switch (m.t) {
            case 'ping':
                send(s.id, { v, t: 'pong' });
                break;
            case 'relay':
                send(s.id, { v, t: 'ice', ice: iceGrant() });
                break;
            case 'to-host': {
                const h = host();
                if (h)
                    send(h.id, { v, t: 'from-phone', peer: s.id, step: m.step });
                else
                    error(s.id, 'host-absent');
                break;
            }
            case 'to-phone': {
                const p = phones().find((p) => p.id === m.peer);
                if (p)
                    send(p.id, { v, t: 'from-host', step: m.step });
                else
                    error(s.id, 'peer-not-found');
                break;
            }
            case 'drop': {
                const p = phones().find((p) => p.id === m.peer);
                if (p) {
                    send(p.id, { v, t: 'dropped', reason: m.reason });
                    out.closes.push(p.id);
                    remove(p.id);
                }
                else
                    error(s.id, 'peer-not-found');
                break;
            }
            case 'close-room':
                for (const p of phones())
                    send(p.id, { v, t: 'dropped', reason: 'room-closed' });
                out.closes.push(...state.sockets.map((x) => x.id));
                state.sockets = [];
                state.expired = true;
                state.hostToken = '';
                state.code = '';
                break;
        }
    }
}

function handleMessage(context: Transition, event: Extract<Event, { t: 'message' }>): void {
    const { state, out, now, error, remove } = context;
    const s = state.sockets.find((socket) => socket.id === event.id);
    if (!s)
        out.closes.push(event.id);
    if (s) {
        const used = consume(s.bucket, now);
        s.bucket = used.bucket;
        if (!used.allowed) {
            error(s.id, 'rate-limited');
            out.closes.push(s.id);
            remove(s.id);
        }
        else if (s.role === 'opening') {
            handleOpening(context, s, event);
        }
        else if (isRepeatedJoin(event.data)) {
            error(s.id, 'not-allowed');
            out.closes.push(s.id);
            remove(s.id);
        }
        else {
            handleEstablished(context, s, event);
        }
    }
}

function handleAlarm(): void {
    // Expiry and opening deadlines are processed before every event, including alarms.
}

// Tokens are bounded ASCII by the protocol validator. Compare every byte for equal lengths.
export function equalSecret(a: string, b: string): boolean {
    if (a.length !== b.length)
        return false;
    let different = 0;
    for (let i = 0; i < a.length; i++)
        different |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return different === 0;
}
function normalizeOpening(data: unknown): unknown {
    if (typeof data !== 'string' || new TextEncoder().encode(data).byteLength > MAX_SIGNAL_BYTES)
        return data;
    try {
        const value: unknown = JSON.parse(data);
        if (value && typeof value === 'object' && 'code' in value && typeof value.code === 'string') {
            return JSON.stringify({ ...value, code: normalizeCode(value.code) });
        }
    }
    catch {
        /* The decoder or close callback handles this case. */
    }
    return data;
}

function isRepeatedJoin(data: unknown): boolean {
    if (typeof data !== 'string' || data.length > MAX_SIGNAL_BYTES)
        return false;
    try {
        const value: unknown = JSON.parse(data);
        return !!value && typeof value === 'object' && 't' in value && value.t === 'join';
    }
    catch { return false; }
}
