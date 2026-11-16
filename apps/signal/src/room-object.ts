import { encodeSignal, PROTOCOL_VERSION, SIGNAL_PING_TEXT, SIGNAL_PONG_TEXT, } from '@kaki/protocol';
import { generateToken } from './core/codes';
import { BURST } from './core/bucket';
import { handle, iceGrant, newRoom, MAX_UNIDENTIFIED, equalSecret } from './core/room';
import type { SignalErrorCode } from '@kaki/protocol';
import type { Event, RoomState, SocketState } from './core/room';
const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
interface Attachment {
    id: string;
    role?: SocketState['role'];
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
    private alarmAt: number | null = null;
    constructor(private readonly ctx: DurableObjectState) {
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
        return this.ctx.blockConcurrencyWhile(async () => {
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
                return new Response(null, { status: 404 });
            if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
                return new Response(null, { status: 426 });
            }
            const route = url.pathname.endsWith('/host') ? 'host' : 'phone';
            const protocols = (request.headers.get('Sec-WebSocket-Protocol') ?? '')
                .split(',').map((value) => value.trim());
            const credentials = protocols.filter((value) => value.startsWith('kaki.host.'));
            const authenticatedHost = route === 'host' && credentials.length === 1 &&
                equalSecret(credentials[0]?.slice('kaki.host.'.length) ?? '', room.hostToken);
            if (route === 'host' && (!protocols.includes('kaki.v1') || !authenticatedHost))
                return new Response(null, { status: 401 });
            if (route === 'phone' && (protocols.length !== 1 || protocols[0] !== 'kaki.v1'))
                return new Response(null, { status: 400 });
            if (!authenticatedHost && room.sockets.filter((s) => s.role === 'opening').length >=
                MAX_UNIDENTIFIED)
                return new Response(null, { status: 429 });
            const id = generateToken(random);
            const pair = new WebSocketPair();
            pair[1].serializeAttachment({
                id, role: authenticatedHost ? 'host' : 'opening',
            } satisfies Attachment);
            this.ctx.acceptWebSocket(pair[1]);
            await this.apply({ t: 'connect', id, roomToken: generateToken(random), authenticatedHost });
            return new Response(null, { status: 101, webSocket: pair[0],
                headers: { 'Sec-WebSocket-Protocol': 'kaki.v1' } });
        });
    }
    async webSocketMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
        await this.ctx.blockConcurrencyWhile(async () => {
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
        await this.ctx.blockConcurrencyWhile(() => this.apply({
            t: 'disconnect',
            id: this.attachment(socket).id,
        }));
    }
    async webSocketError(socket: WebSocket): Promise<void> {
        await this.webSocketClose(socket);
    }
    async alarm(): Promise<void> {
        await this.ctx.blockConcurrencyWhile(() => this.apply({ t: 'alarm' }));
    }
    private attachment(socket: WebSocket): Attachment {
        return (socket.deserializeAttachment() as Attachment | null) ?? { id: '' };
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
