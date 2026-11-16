import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomObject } from './room-object';
import { FakeSocket, FakeState } from './testing/fake';
import * as roomCore from './core/room';
import { ABSOLUTE_MS, IDLE_MS, OPENING_MS } from './core/room';
import type { RoomState } from './core/room';
import { SIGNAL_PING_TEXT, SIGNAL_PONG_TEXT } from '@kaki/protocol';
const NativeResponse = Response;
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.stubGlobal('WebSocketRequestResponsePair', class {
        constructor(readonly request: string, readonly response: string) {
        }
    });
    vi.stubGlobal('WebSocketPair', class {
        0 = new FakeSocket();
        1 = new FakeSocket();
    });
    vi.stubGlobal('Response', class extends NativeResponse {
        constructor(body: ConstructorParameters<typeof NativeResponse>[0], init:
          ConstructorParameters<typeof NativeResponse>[1]) {
            super(body, init?.status === 101 ? { status: 200, headers: init.headers ?? {} } : init);
            if (init?.status === 101)
                Object.defineProperty(this, 'status', { value: 101 });
        }
    });
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
function last(values: FakeSocket[]): FakeSocket {
    const value = values.at(-1);
    if (!value)
        throw new Error('No socket');
    return value;
}
function object(ctx: FakeState): RoomObject {
    return new RoomObject(ctx as unknown as ConstructorParameters<typeof RoomObject>[0]);
}
function socket(s: FakeSocket): Parameters<RoomObject['webSocketMessage']>[0] {
    return s as unknown as Parameters<RoomObject['webSocketMessage']>[0];
}
async function setup() {
    const ctx = new FakeState();
    const room = object(ctx);
    await room.fetch(new Request('https://room/init?code=BCDF2345', { method: 'POST' }));
    const saved = ctx.records.get('room') as RoomState;
    const upgrade = async (route = 'phone', token: string | null = saved.hostToken) => {
        const response = await room.fetch(new Request(`https://room/rooms/BCDF2345/${route}`, {
            headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': route === 'host' && token !== null
                ? `kaki.v1, kaki.host.${token}` : 'kaki.v1' },
        }));
        return { status: response.status, headers: response.headers, ws: last(ctx.sockets) };
    };
    const send = async (ws: FakeSocket, message: object) => {
        await room.webSocketMessage(socket(ws), JSON.stringify({ v: 1, ...message }));
    };
    const host = async () => {
        const { ws } = await upgrade('host');
        return ws;
    };
    return { ctx, room, saved, upgrade, send, host };
}
function messages(ws: FakeSocket): Record<string, unknown>[] {
    return ws.sent.map((text) => JSON.parse(text) as Record<string, unknown>);
}
describe('C-01 Durable Object adapter review round 1', () => {
    it('M1 M3 rejects before accept and reserves host admission under silent saturation', async () => {
        const h = await setup();
        for (let i = 0; i < 11; i++) {
            expect((await h.upgrade()).status).toBe(i < 4 ? 101 : 429);
        }
        expect(h.ctx.sockets).toHaveLength(4);
        const host = await h.host();
        expect(messages(host)[0]).toMatchObject({ t: 'created', reopened: false });
        expect(h.ctx.sockets[0]?.closed).toBe(false);
        const replacement = await h.host();
        expect(replacement.deserializeAttachment()).toMatchObject({ role: 'host' });
        expect(messages(replacement)[0]).toHaveProperty('hostToken', h.saved.hostToken);
        expect(messages(replacement)[0]).toMatchObject({ t: 'created', reopened: true });
        expect(host.closed).toBe(true);
        expect(host.closeReason).toBe('replaced');
        expect(h.ctx.getWebSockets()).toHaveLength(5);
    });
    it('DATA-005 refuses 1000 wrong host upgrades without allocating or evicting sockets', async () => {
        const h = await setup();
        const oldHost = await h.host();
        for (let i = 0; i < 8; i++) {
            const phone = (await h.upgrade()).ws;
            await h.send(phone, { t: 'join', code: 'BCDF2345', roomToken: null });
        }
        const pending: FakeSocket[] = [];
        for (let i = 0; i < 4; i++)
            pending.push((await h.upgrade()).ws);
        const accepted = h.ctx.sockets.length;
        expect((await h.upgrade('host', null)).status).toBe(401);
        for (let attempt = 0; attempt < 1000; attempt++)
            expect((await h.upgrade('host', 'A'.repeat(32))).status).toBe(401);
        expect(h.ctx.sockets).toHaveLength(accepted);
        expect(pending.every((phone) => !phone.closed)).toBe(true);
        const replacement = await h.host();
        expect(replacement.deserializeAttachment()).toMatchObject({ role: 'host' });
        expect(messages(replacement)[0]).toHaveProperty('hostToken', h.saved.hostToken);
        expect(messages(replacement)[0]).toMatchObject({ t: 'created', reopened: true });
        expect(messages(replacement).filter((m) => m.t === 'peer-joined')).toHaveLength(8);
        expect(oldHost.closed).toBe(true);
        expect(pending.every((phone) => !phone.closed)).toBe(true);
        expect(h.ctx.getWebSockets()).toHaveLength(13);
        const livePhone = h.ctx.sockets[1];
        if (!livePhone)
            throw new Error('Missing phone');
        await h.send(livePhone, { t: 'to-host', step: { kind: 'answer', sdp: 'still usable' } });
        expect(messages(replacement).at(-1)).toMatchObject({ t: 'from-phone',
            step: { kind: 'answer', sdp: 'still usable' } });
        await h.send(replacement, { t: 'ping' });
        expect(messages(replacement).at(-1)).toMatchObject({ t: 'pong' });
    });
    it('DATA-005 selects kaki.v1 and sends hostToken only to the authenticated host', async () => {
        const h = await setup();
        const compare = vi.spyOn(roomCore, 'equalSecret');
        const result = await h.upgrade('host');
        expect(compare).toHaveBeenCalledWith(h.saved.hostToken, h.saved.hostToken);
        compare.mockRestore();
        expect(result.headers.get('Sec-WebSocket-Protocol')).toBe('kaki.v1');
        expect([...result.headers.values()].join()).not.toContain(h.saved.hostToken);
        expect(messages(result.ws)[0]).toHaveProperty('hostToken', h.saved.hostToken);
        const count = result.ws.sent.length;
        await h.send(result.ws, { t: 'reopen', code: 'BCDF2345', hostToken: h.saved.hostToken });
        expect(result.ws.sent).toHaveLength(count + 1);
        expect(messages(result.ws).at(-1)).toMatchObject({ code: 'not-allowed' });
        expect(result.ws.closed).toBe(false);
        await h.send(result.ws, { t: 'reopen', code: 'BCDF2345', hostToken: 'A'.repeat(32) });
        expect(messages(result.ws).at(-1)).toMatchObject({ code: 'not-allowed' });
        expect(result.ws.closed).toBe(false);
        await h.send(result.ws, { t: 'ping' });
        expect(messages(result.ws).at(-1)).toMatchObject({ t: 'pong' });
    });
    it.each([
        '', 'kaki.host.secret', 'kaki.v1, kaki.host.wrong',
        'kaki.v1, kaki.host.one, kaki.host.two',
    ])('DATA-005 rejects invalid host offers before allocating: %s', async (protocols) => {
        const h = await setup();
        const response = await h.room.fetch(new Request('https://room/host', {
            headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': protocols },
        }));
        expect(response.status).toBe(401);
        expect(h.ctx.sockets).toHaveLength(0);
        expect(await response.text()).toBe('');
        expect([...response.headers.values()].join()).not.toContain(h.saved.hostToken);
    });
    it.each([
        '{ "v": 1, "t": "ping" }',
        '{bad json',
        JSON.stringify({ v: 1, t: 'action' }),
        new ArrayBuffer(4),
        'x'.repeat(1000000),
    ])('DATA-005 counts every noncanonical frame against the bucket', async (frame) => {
        const h = await setup();
        const host = await h.host();
        for (let i = 0; i < 61; i++)
            await h.room.webSocketMessage(socket(host), frame);
        expect(messages(host).at(-1)).toMatchObject({ code: 'rate-limited' });
        expect(host.closed).toBe(true);
    });
    it('M1 closes orphan transports and unknown message senders, including missing rooms', async () => {
        const h = await setup();
        const orphan = new FakeSocket();
        orphan.serializeAttachment({ id: 'orphan' });
        h.ctx.acceptWebSocket(orphan);
        await h.send(orphan, { t: 'ping' });
        expect(orphan.closed).toBe(true);
        expect(messages(orphan)[0]).toMatchObject({ t: 'error', code: 'not-allowed' });
        const empty = new FakeState();
        const unknown = object(empty);
        const response = await unknown.fetch(new Request('https://room/phone', {
            headers: { Upgrade: 'websocket' },
        }));
        expect(response.status).toBe(404);
        expect(empty.sockets).toHaveLength(0);
    });
    it('M2 reconciles dead phones after restart without replaying ghosts or retaining capacity', async () => {
        const h = await setup();
        const oldHost = await h.host();
        const phone = (await h.upgrade()).ws;
        await h.send(phone, { t: 'join', code: 'BCDF2345', roomToken: null });
        phone.closed = true;
        oldHost.closed = true;
        const restarted = object(h.ctx);
        await restarted.alarm();
        expect((h.ctx.records.get('room') as RoomState).sockets).toEqual([]);
        expect(h.ctx.alarmAt).toBe(IDLE_MS);
        const response = await restarted.fetch(new Request('https://room/host', {
            headers: { Upgrade: 'websocket',
                'Sec-WebSocket-Protocol': `kaki.v1, kaki.host.${h.saved.hostToken}` },
        }));
        expect(response.status).toBe(101);
        const fresh = last(h.ctx.sockets);
        await restarted.webSocketMessage(socket(fresh), JSON.stringify({
            v: 1, t: 'reopen', code: 'BCDF2345', hostToken: h.saved.hostToken,
        }));
        expect(messages(fresh).filter((m) => m.t === 'peer-joined')).toEqual([]);
    });
    it('M2 emits ordinary close effects for a dead peer and never sends to it again', async () => {
        const h = await setup();
        const host = await h.host();
        const phone = (await h.upgrade()).ws;
        await h.send(phone, { t: 'join', code: 'BCDF2345', roomToken: null });
        phone.closed = true;
        const count = phone.sent.length;
        await h.room.alarm();
        expect(messages(host).at(-1)).toMatchObject({ t: 'peer-left' });
        await h.send(host, { t: 'relay' });
        expect(phone.sent).toHaveLength(count);
    });
    it('M3 opening deadline runs by alarm and lazily, with the earliest alarm scheduled', async () => {
        const h = await setup();
        const silent = (await h.upgrade()).ws;
        expect(h.ctx.alarmAt).toBe(OPENING_MS);
        vi.setSystemTime(OPENING_MS);
        await h.room.alarm();
        expect(silent.closed).toBe(true);
        expect(messages(silent)[0]).toMatchObject({ t: 'error', code: 'bad-message' });
        expect(h.ctx.alarmAt).toBe(OPENING_MS + IDLE_MS);
        const another = (await h.upgrade()).ws;
        vi.setSystemTime(OPENING_MS * 2);
        await h.send(another, { t: 'join', code: 'BCDF2345', roomToken: null });
        expect(another.closed).toBe(true);
    });
    it('PLAT-009 labels only the old host replaced when upgrade also expires a silent phone', async () => {
        const h = await setup();
        const host = await h.host();
        const silent = (await h.upgrade()).ws;
        vi.setSystemTime(OPENING_MS);
        await h.host();
        expect(host.closeReason).toBe('replaced');
        expect(silent.closeReason).toBe('Signalling ended');
        expect(messages(silent).at(-1)).toMatchObject({ code: 'bad-message' });
    });
    it('M4 rejects socket creation clearly and enforces route roles', async () => {
        const h = await setup();
        const first = (await h.upgrade('host')).ws;
        await h.send(first, { t: 'create' });
        expect(messages(first).at(-1)).toMatchObject({ code: 'not-allowed' });
        expect(first.closed).toBe(true);
        const second = (await h.upgrade('host')).ws;
        await h.send(second, { t: 'join', code: 'BCDF2345', roomToken: null });
        expect(messages(second).at(-1)).toMatchObject({ code: 'not-allowed' });
    });
    it('M5 host lives for twelve hours; last close starts idle expiry; storage is wiped', async () => {
        const h = await setup();
        const host = await h.host();
        vi.setSystemTime(IDLE_MS * 2);
        await h.room.alarm();
        expect(host.closed).toBe(false);
        host.closed = true;
        await h.room.webSocketClose(socket(host));
        expect(h.ctx.alarmAt).toBe(IDLE_MS * 3);
        vi.setSystemTime(IDLE_MS * 3);
        await h.room.alarm();
        expect(h.ctx.records.size).toBe(0);
        expect(h.ctx.alarmAt).toBeNull();
        const absolute = await setup();
        const alive = await absolute.host();
        vi.setSystemTime((absolute.saved.createdAt) + ABSOLUTE_MS);
        await absolute.room.alarm();
        expect(alive.closed).toBe(true);
        expect(absolute.ctx.records.size).toBe(0);
    });
    it('DATA-001–003 wipes room storage and alarm when the host closes the room', async () => {
        const h = await setup();
        const host = await h.host();
        await h.send(host, { t: 'close-room' });
        expect(h.ctx.records.size).toBe(0);
        expect(h.ctx.alarmAt).toBeNull();
        expect(host.closed).toBe(true);
    });
    it('S2 auto-responds canonical keep-alives; frames cause no persistent reads or writes', async () => {
        const h = await setup();
        const host = await h.host();
        const { reads, writes } = h.ctx;
        for (let i = 0; i < 10; i++)
            await h.send(host, { t: 'relay' });
        expect(h.ctx.reads).toBe(reads);
        expect(h.ctx.writes).toBe(writes);
        expect(h.ctx.autoResponse).toMatchObject({ request: SIGNAL_PING_TEXT, response: SIGNAL_PONG_TEXT });
        const saved = h.ctx.records.get('room') as {
            sockets: Record<string, unknown>[];
        };
        expect(saved.sockets[0]).not.toHaveProperty('bucket');
    });
    it('S6 phone token replaces a live phone even when all eight slots are occupied', async () => {
        const h = await setup();
        await h.host();
        const phones: FakeSocket[] = [];
        for (let i = 0; i < 8; i++) {
            const phone = (await h.upgrade()).ws;
            await h.send(phone, { t: 'join', code: 'BCDF2345', roomToken: null });
            phones.push(phone);
        }
        const first = last(phones.slice(0, 1));
        const token = messages(first)[0]?.roomToken;
        const fresh = (await h.upgrade()).ws;
        await h.send(fresh, { t: 'join', code: 'bcdf-2345', roomToken: token });
        expect(messages(fresh)[0]).toMatchObject({ t: 'joined' });
        expect(first.closed).toBe(true);
        expect((h.ctx.records.get('room') as RoomState).sockets.filter((s) => s.role === 'phone'))
            .toHaveLength(8);
    });
});
