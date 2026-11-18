import { dailyCounts } from './counts';
import { admission } from './admission-object';
import type { AdmissionEnv, AdmissionTicket } from './admission-object';
import { encodeSignal, parseHostSubprotocols, PROTOCOL_VERSION, SIGNAL_PING_TEXT, SIGNAL_PONG_TEXT, SIGNAL_SUBPROTOCOL, } from '@kaki/protocol';
import { generateToken } from './core/codes';
import { BURST } from './core/bucket';
import { handle, iceGrant, newRoom, MAX_UNIDENTIFIED, equalSecret } from './core/room';
import type { SignalErrorCode } from '@kaki/protocol';
import type { Event, RoomState, SocketState } from './core/room';
const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
interface Attachment {
    id: string;
    role?: SocketState['role'];
    admission?: AdmissionTicket;
}
type StoredRoom = Omit<RoomState, 'sockets'> & {
    sockets: Omit<SocketState, 'bucket'>[];
};
function stored(room: RoomState): StoredRoom {
    return {
        ...room,
        sockets: room.sockets.map((socket) => ({
            id: socket.id,
            role: socket.role,
            roomToken: socket.roomToken,
            openedAt: socket.openedAt,
        })),
    };
}
export class RoomObject {
    private room: RoomState | null | undefined;
    private readonly tickets = new Map<string, AdmissionTicket>();
    private alarmAt: number | null = null;
    constructor(private readonly ctx: DurableObjectState, private readonly env?: Pick<AdmissionEnv, 'ADMISSION'>) {
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(SIGNAL_PING_TEXT, SIGNAL_PONG_TEXT));
    }
    private async load(): Promise<RoomState | null> {
        if (this.room === undefined) {
            const saved = await this.ctx.storage.get<StoredRoom>('room');
            this.alarmAt = await this.ctx.storage.getAlarm();
            this.room = saved ? {
                ...saved,
                sockets: saved.sockets.map((s) => ({ ...s, bucket: { tokens: BURST, at: Date.now() } })),
            } : null;
        }
        return this.room;
    }
    async fetch(request: Request): Promise<Response> {
        if (new URL(request.url).hostname === 'counts' && new URL(request.url).pathname === '/counts') return dailyCounts(request, this.ctx);
        return this.critical(async () => {
            const url = new URL(request.url);
            if (request.method === 'POST') {
                if (await this.load())
                    return new Response(null, { status: 409 });
                const code = url.searchParams.get('code');
                if (!code)
                    return new Response(null, { status: 400 });
                const room = newRoom(code, generateToken(random), Date.now());
                this.room = room;
                await this.ctx.storage.put('room', stored(room));
                await this.apply({ t: 'alarm' });
                return Response.json({
                    v: PROTOCOL_VERSION,
                    t: 'created',
                    code,
                    hostToken: room.hostToken,
                    reopened: false,
                    ice: iceGrant(),
                });
            }
            await this.apply({ t: 'alarm' });
            const room = await this.load();
            if (!room || room.expired)
                return new Response(null, { status: 404, headers: { 'X-Kaki-Room': 'gone' } });
            if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
                return new Response(null, { status: 426 });
            }
            const route = url.pathname.endsWith('/host') ? 'host' : 'phone';
            const protocols = (request.headers.get('Sec-WebSocket-Protocol') ?? '')
                .split(',').map((value) => value.trim());
            const hostSecret = parseHostSubprotocols(protocols);
            const authenticatedHost = route === 'host' && hostSecret !== null &&
                equalSecret(hostSecret, room.hostToken);
            if (route === 'host' && !authenticatedHost)
                return new Response(null, { status: 401 });
            if (route === 'phone' && (protocols.length !== 1 || protocols[0] !== SIGNAL_SUBPROTOCOL))
                return new Response(null, { status: 400 });
            const ticket = request.headers.has('X-Kaki-Admission')
                ? JSON.parse(request.headers.get('X-Kaki-Admission') ?? '{}') as AdmissionTicket : undefined;
            const clientKey = ticket?.key.find((key) => !key.endsWith(':48'));
            const openings = room.sockets.filter((s) => s.role === 'opening');
            if (!authenticatedHost && openings.length >= MAX_UNIDENTIFIED && !openings.some((s) =>
                (clientKey !== undefined && s.clientKey === clientKey) || Date.now() - s.openedAt >= 1500))
                return new Response(null, { status: 429, headers: { 'Retry-After': '1' } });
            const id = generateToken(random);
            const pair = new WebSocketPair();
            if (ticket) this.tickets.set(id, ticket);
            pair[1].serializeAttachment({
                id, role: authenticatedHost ? 'host' : 'opening',
            } satisfies Attachment);
            this.ctx.acceptWebSocket(pair[1]);
            await this.apply({ t: 'connect', id, roomToken: generateToken(random), authenticatedHost, clientKey });
            return new Response(null, { status: 101, webSocket: pair[0],
                headers: { 'Sec-WebSocket-Protocol': SIGNAL_SUBPROTOCOL } });
        });
    }
    async webSocketMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
        await this.critical(async () => {
            const id = this.attachment(socket).id;
            const room = await this.load();
            if (!room?.sockets.some((s) => s.id === id)) {
                this.refuse(socket, room ? 'not-allowed' : 'room-not-found');
                await this.apply({ t: 'alarm' });
                return;
            }
            await this.apply({ t: 'message', id, data });
        });
    }
    async webSocketClose(socket: WebSocket): Promise<void> {
        await this.critical(async () => {
            const attachment = this.attachment(socket);
            if (attachment.admission && this.env) {
                this.resolve(attachment.admission, {
                    kind: 'finish', id: attachment.admission.id, failed: true,
                });
                this.tickets.delete(attachment.id);
                socket.serializeAttachment({ id: attachment.id, role: attachment.role ?? 'opening' } satisfies Attachment);
            }
            await this.apply({ t: 'disconnect', id: attachment.id });
        });
    }
    async webSocketError(socket: WebSocket): Promise<void> {
        await this.webSocketClose(socket);
    }
    async alarm(): Promise<void> {
        await this.critical(() => this.apply({ t: 'alarm' }));
    }
    private readonly resolutions: { ticket: AdmissionTicket; operation: Parameters<typeof admission>[2] }[] = [];
    private async critical<T>(callback: () => Promise<T>): Promise<T> {
        try { return await this.ctx.blockConcurrencyWhile(callback); }
        finally {
            const env = this.env;
            const resolutions = this.resolutions.splice(0);
            if (env) for (const { ticket, operation } of resolutions) {
                this.ctx.waitUntil(admission(env, ticket.key, operation).catch(() => undefined));
            }
        }
    }
    private resolve(ticket: AdmissionTicket, operation: Parameters<typeof admission>[2]): void {
        this.resolutions.push({ ticket, operation });
    }
    private attachment(socket: WebSocket): Attachment {
        const value = (socket.deserializeAttachment() as Attachment | null) ?? { id: '' };
        const ticket = this.tickets.get(value.id);
        return { id: value.id, ...(value.role ? { role: value.role } : {}), ...(ticket ? { admission: ticket } : {}) };
    }
    private end(socket: WebSocket, reason = 'Signalling ended'): void {
        try {
            socket.close(1008, reason);
        }
        catch {
            /* The decoder or close callback handles this case. */
        }
    }
    private refuse(socket: WebSocket, code: SignalErrorCode): void {
        try {
            socket.send(encodeSignal({ v: PROTOCOL_VERSION, t: 'error', code, retryAfterS: null }));
        }
        catch {
            /* The decoder or close callback handles this case. */
        }
        this.end(socket);
    }
    private async apply(event: Event): Promise<void> {
        let room = await this.load();
        const live = this.ctx.getWebSockets();
        if (!room) {
            for (const socket of live)
                this.refuse(socket, 'room-not-found');
            return;
        }
        const stateIds = new Set(room.sockets.map((entry) => entry.id));
        const orphaned = new Set(live.filter((socket) => !stateIds.has(this.attachment(socket).id) &&
            !(event.t === 'connect' && event.id === this.attachment(socket).id)));
        for (const socket of orphaned)
            this.refuse(socket, 'not-allowed');
        const before = JSON.stringify(stored(room));
        const liveIds = new Set(live.map((socket) => this.attachment(socket).id));
        const effects = [];
        // Reconciliation uses the ordinary close transition, including presence notifications.
        for (const entry of room.sockets) {
            if (!liveIds.has(entry.id)) {
                const result = handle(room, { t: 'disconnect', id: entry.id }, Date.now());
                effects.push(result);
                room = result.state;
            }
        }
        const result = handle(room, event, Date.now());
        effects.push(result);
        // Resolve each opening exactly once, including alarms, vanished transports and restart.
        for (const transport of live) {
            const attachment = this.attachment(transport);
            if (!attachment.admission) continue;
            const next = result.state.sockets.find((entry) => entry.id === attachment.id);
            if (next?.role === 'opening') continue;
            const roomFull = effects.some((effect) => effect.sends.some((send) =>
                send.id === attachment.id && send.message.t === 'error' && send.message.code === 'room-full'));
            if (this.env) this.resolve(attachment.admission, {
                kind: 'finish', id: attachment.admission.id,
                failed: next?.role !== 'phone' && next?.role !== 'host' && !roomFull,
            });
            this.tickets.delete(attachment.id);
            transport.serializeAttachment({ id: attachment.id, role: next?.role ?? 'opening' } satisfies Attachment);
        }
        this.room = result.state;
        if (result.state.expired) {
            await this.ctx.storage.deleteAll();
            await this.ctx.storage.deleteAlarm();
            this.alarmAt = null;
            this.room = null;
        }
        else {
            if (before !== JSON.stringify(stored(result.state))) {
                await this.ctx.storage.put('room', stored(result.state));
            }
            if (result.alarmAt !== null && this.alarmAt !== result.alarmAt) {
                await this.ctx.storage.setAlarm(result.alarmAt);
                this.alarmAt = result.alarmAt;
            }
        }
        for (const socket of live) {
            const id = this.attachment(socket).id;
            if (orphaned.has(socket))
                continue;
            for (const effect of effects) {
                for (const send of effect.sends) {
                    if (send.id === id) {
                        try {
                            socket.send(JSON.stringify(send.message));
                        }
                        catch {
                            /* The decoder or close callback handles this case. */
                        }
                    }
                }
            }
            if (!result.state.sockets.some((s) => s.id === id)) {
                const replacedHost = event.t === 'connect' && event.authenticatedHost &&
                    room.sockets.some((s) => s.id === id && s.role === 'host');
                this.end(socket, replacedHost ? 'replaced' : 'Signalling ended');
            }
        }
    }
}
