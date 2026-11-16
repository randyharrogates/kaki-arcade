import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './worker';
import { AdmissionObject } from './admission-object';
import { RoomObject } from './room-object';
import { FakeIdleObject, FakeState, FakeSocket } from './testing/fake';
import { BURST, PER_SECOND } from './core/bucket';

const NativeResponse = Response;
class SerialState extends FakeState {
    private pending: Promise<unknown> = Promise.resolve();
    override blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
        const result = this.pending.then(callback);
        this.pending = result.catch(() => undefined);
        return result;
    }
}
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    vi.stubGlobal('WebSocketRequestResponsePair', class {
        constructor(readonly request: string, readonly response: string) {}
    });
    vi.stubGlobal('WebSocketPair', class { 0 = new FakeSocket(); 1 = new FakeSocket(); });
    vi.stubGlobal('Response', class extends NativeResponse {
        constructor(body: ConstructorParameters<typeof NativeResponse>[0], init: ConstructorParameters<typeof NativeResponse>[1]) {
            super(body, init?.status === 101 ? { status: 200, headers: init.headers ?? {} } : init);
            if (init?.status === 101) Object.defineProperty(this, 'status', { value: 101 });
        }
    });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function harness(idleEviction = false) {
    const lifetimes = new Map<string, FakeIdleObject<AdmissionObject>>();
    const counters = new Map<string, { ctx: SerialState; object: AdmissionObject }>();
    const rooms = new Map<string, { ctx: SerialState; object: RoomObject }>();
    let lookups = 0;
    type Env = Parameters<typeof worker.fetch>[1];
    const edge = { success: true };
    const env = {
        EDGE_LIMIT: { limit: () => Promise.resolve(edge) },
        ALLOWED_ORIGINS: 'https://arcade.test', ADMISSION_SECRET: 'test-only-random-secret-at-least-32-characters',
        ADMISSION: {
            idFromName: (name: string) => name,
            get: (name: string) => ({ fetch: (url: string, init: RequestInit) => {
                let lifetime = lifetimes.get(name);
                if (!lifetime) {
                    lifetime = new FakeIdleObject((ctx) => new AdmissionObject(ctx));
                    lifetimes.set(name, lifetime);
                }
                if (idleEviction) return lifetime.get().object.fetch(new Request(url, init));
                let entry = counters.get(name);
                if (!entry) {
                    const ctx = new SerialState();
                    entry = { ctx, object: new AdmissionObject(ctx) };
                    counters.set(name, entry);
                }
                return entry.object.fetch(new Request(url, init));
            } }),
        },
        ROOMS: {
            idFromName: (name: string) => { lookups++; return name; },
            get: (name: string) => ({ fetch: (url: string | Request, init?: RequestInit) => {
                let entry = rooms.get(name);
                if (!entry) {
                    const ctx = new SerialState();
                    entry = { ctx, object: new RoomObject(ctx as unknown as DurableObjectState, env as unknown as Env) };
                    rooms.set(name, entry);
                }
                return entry.object.fetch(new Request(url, init));
            } }),
        },
    };
    let workerEnv = env;
    const request = (path: string, address = '192.0.2.1', hostToken?: string, upgrade = true) => worker.fetch(
        new Request(`https://signal${path}`, { method: path === '/rooms' ? 'POST' : 'GET', headers: {
            Origin: 'https://arcade.test', 'CF-Connecting-IP': address,
            ...(upgrade ? { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': hostToken ? `kaki.v1, kaki.host.${hostToken}` : 'kaki.v1' } : {}),
        } }), workerEnv as unknown as Env);
    const create = async (address?: string) => {
        const response = await request('/rooms', address);
        expect(response.status).toBe(200);
        return await response.json<{ code: string; hostToken: string }>();
    };
    const send = async (code: string, ws: FakeSocket, message: object) => {
        const entry = rooms.get(code);
        if (!entry) throw new Error('Missing room');
        await entry.object.webSocketMessage(ws as unknown as WebSocket, JSON.stringify({ v: 1, ...message }));
    };
    const latest = (code: string) => {
        const ws = rooms.get(code)?.ctx.sockets.at(-1);
        if (!ws) throw new Error('Missing socket');
        return ws;
    };
    return { env, edge, lifetimes, resetCache: () => { workerEnv = { ...env }; }, counters, rooms, request, create, send, latest, lookups: () => lookups };
}
const messages = (ws: FakeSocket) => ws.sent.map((text) => JSON.parse(text) as Record<string, unknown>);
describe('C-03 DATA-005 Worker and real room adapters', () => {
    it('admits eight simultaneous phones, eight retries, a host reload and several rooms on shared Wi-Fi', async () => {
        const h = harness();
        for (let round = 0; round < 3; round++) {
            const room = await h.create();
            expect((await h.request(`/rooms/${room.code}/host`, undefined, room.hostToken)).status).toBe(101);
            const host = h.latest(room.code);
            const results = await Promise.all(Array.from({ length: 8 }, () => h.request(`/rooms/${room.code}/phone`)));
            expect(results.map((r) => r.status)).toEqual(Array<number>(8).fill(101));
            const phones = h.rooms.get(room.code)?.ctx.sockets.slice(-8) ?? [];
            for (const phone of phones) await h.send(room.code, phone, { t: 'join', code: room.code, roomToken: null });
            // Reproduce pairing.ts: host burst 40, then one frame each 40 ms (25/s).
            // 8 * (offer + 12 candidates + done) = 112 frames per direction, 224 relays.
            let sent = 0;
            const start = Date.now();
            for (let frame = 0; frame < 14; frame++) {
                for (const phone of phones) {
                    if (sent >= 40) vi.setSystemTime(start + (sent - 39) * 40);
                    const peer = messages(phone).find((m) => m.t === 'joined')?.peer;
                    const step = frame === 0 ? { kind: 'offer', sdp: 'offer' } : frame === 13 ? { kind: 'candidates-done' }
                        : { kind: 'candidate', candidate: 'candidate', mid: '0', mLineIndex: 0 };
                    await h.send(room.code, host, { t: 'to-phone', peer, step });
                    await h.send(room.code, phone, { t: 'to-host', step: frame === 0 ? { kind: 'answer', sdp: 'answer' } : step });
                    sent++;
                }
            }
            expect(BURST).toBe(60); expect(PER_SECOND).toBe(30);
            expect(messages(host).filter((m) => m.t === 'from-phone')).toHaveLength(112);
            for (const phone of phones) {
                expect(messages(phone).filter((m) => m.t === 'from-host')).toHaveLength(14);
                expect(phone.closed).toBe(false);
                const token = messages(phone).find((m) => m.t === 'joined')?.roomToken;
                expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
                await h.send(room.code, h.latest(room.code), { t: 'join', code: room.code, roomToken: token });
            }
            expect((await h.request(`/rooms/${room.code}/host`, undefined, room.hostToken)).status).toBe(101);
            expect(messages(h.latest(room.code)).filter((m) => m.t === 'peer-joined')).toHaveLength(8);
        }
    });
    it('denies the ninth creation before room allocation, supplies CORS Retry-After and admits at refill', async () => {
        const h = harness();
        for (let i = 0; i < 8; i++) await h.create();
        const before = h.lookups();
        const refused = await h.request('/rooms');
        expect(refused.status).toBe(429); expect(refused.headers.get('Retry-After')).toBe('60');
        expect(refused.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
        expect(h.lookups()).toBe(before);
        vi.setSystemTime(60000); await h.create();
        await h.create('192.0.2.2');
    });
    it.each(['/rooms/BCDF2345/phone', '/rooms/%xx/phone', '/rooms/bad/phone', '/rooms/BCDF2345/host'])(
        'backs off failed probes %s before lookup, regardless of code existence', async (path) => {
            const h = harness();
            for (let i = 0; i < 17; i++) expect((await h.request(path)).status).toBe(404);
            const before = h.lookups();
            const response = await h.request(path);
            expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('1');
            expect(h.lookups()).toBe(before); expect(await response.text()).toBe('');
            vi.setSystemTime(1000);
            expect((await h.request(path)).status).toBe(404);
        });
    it('counts wrong/malformed opening messages and rejects subsequent attempts before reaching rooms', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 17; i++) {
            expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
            const ws = h.latest(room.code);
            await h.send(room.code, ws, i % 2 ? { t: 'join', code: 'ZZZZZZZZ', roomToken: null } : { t: 'join', code: '?' });
            expect(messages(ws)[0]?.code).toBe(i % 2 ? 'room-not-found' : 'bad-message');
        }
        const before = h.lookups();
        expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(429);
        expect(h.lookups()).toBe(before);
    });
    it('backs off wrong host credentials without replacing the authenticated host', async () => {
        const h = harness(); const room = await h.create();
        await h.request(`/rooms/${room.code}/host`, '192.0.2.2', room.hostToken);
        const host = h.latest(room.code);
        for (let i = 0; i < 17; i++) expect((await h.request(`/rooms/${room.code}/host`, undefined, 'A'.repeat(32))).status).toBe(401);
        const before = h.lookups();
        expect((await h.request(`/rooms/${room.code}/host`, undefined, 'A'.repeat(32))).status).toBe(429);
        expect(h.lookups()).toBe(before); expect(host.closed).toBe(false);
    });
    it('bounds connection floods including probes; no status probe bypasses back-off', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 96; i++) expect((await h.request(`/rooms/${room.code}/phone`, undefined, undefined, false)).status).toBe(426);
        const before = h.lookups(); const response = await h.request(`/rooms/${room.code}/phone`, undefined, undefined, false);
        expect(response.status).toBe(429); expect(h.lookups()).toBe(before);
    });
    it('one silent address cannot fill all slots; room timeout survives restart while idle limiter counters reset', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 12; i++) expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
        const before = h.lookups();
        expect((await h.request(`/rooms/${room.code.toLowerCase()}/phone`)).status).toBe(429);
        expect(h.lookups()).toBe(before);
        for (let i = 0; i < 4; i++) expect((await h.request(`/rooms/${room.code}/phone`, '192.0.2.2')).status).toBe(101);
        // Recreate adapters from persisted state, as on isolate eviction.
        for (const entry of h.counters.values()) entry.object = new AdmissionObject(entry.ctx);
        const entry = h.rooms.get(room.code);
        if (!entry) throw new Error('Missing room');
        entry.object = new RoomObject(entry.ctx as unknown as DurableObjectState, h.env as unknown as Parameters<typeof worker.fetch>[1]);
        vi.setSystemTime(10000); await entry.object.alarm();
        expect(entry.ctx.getWebSockets()).toHaveLength(0);
        for (let i = 0; i < 12; i++) expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
        vi.setSystemTime(20000); await entry.object.alarm();
        const denied = await h.request(`/rooms/${room.code}/phone`);
        expect(denied.status).toBe(101);
    });
    it('keeps no limiter storage, reads or alarms, including after eviction', async () => {
        const h = harness(); const room = await h.create();
        await h.request(`/rooms/${room.code}/phone`);
        const ws = h.latest(room.code);
        expect(JSON.stringify(ws.attachment)).not.toContain('192.0.2.1');
        await h.send(room.code, ws, { t: 'join', code: room.code, roomToken: null });
        expect(ws.deserializeAttachment()).not.toHaveProperty('admission');
        for (const entry of h.counters.values()) {
            expect(entry.ctx.records.size).toBe(0);
            expect(entry.ctx.reads).toBe(0); expect(entry.ctx.writes).toBe(0);
            expect(entry.ctx.alarmAt).toBeNull();
        }
    });
    it('carries creation limits and pending reservations across the ten-minute hash rotation', async () => {
        const h = harness(); vi.setSystemTime(3595000);
        let room = await h.create();
        for (let i = 0; i < 7; i++) room = await h.create();
        for (let i = 0; i < 12; i++) expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
        vi.setSystemTime(3600000);
        const before = h.lookups();
        expect((await h.request('/rooms')).status).toBe(429);
        expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(429);
        expect(h.lookups()).toBe(before);
    });
    it('replaces silent openings without penalising newcomers, and counts abandoned closes', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 12; i++) await h.request(`/rooms/${room.code}/phone`);
        for (let i = 0; i < 4; i++) await h.request(`/rooms/${room.code}/phone`, '192.0.2.2');
        vi.setSystemTime(1500);
        for (let i = 0; i < 17; i++) {
            expect((await h.request(`/rooms/${room.code}/phone`, '192.0.2.3')).status).toBe(i < 12 ? 101 : 429);
        }
        const next = await h.create('192.0.2.4');
        for (let i = 0; i < 17; i++) {
            expect((await h.request(`/rooms/${next.code}/phone`, '192.0.2.4')).status).toBe(101);
            const ws = h.latest(next.code); ws.closed = true;
            await h.rooms.get(next.code)?.object.webSocketClose(ws as unknown as WebSocket);
            expect(ws.deserializeAttachment()).not.toHaveProperty('admission');
        }
        expect((await h.request(`/rooms/${next.code}/phone`, '192.0.2.4')).status).toBe(429);
    });
    it('admits eight phones after an initial failed upgrade and keeps noncanonical heartbeats below the bucket', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 8; i++) {
            expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
            const ws = h.latest(room.code); ws.closed = true;
            await h.rooms.get(room.code)?.object.webSocketClose(ws as unknown as WebSocket);
        }
        const phones: FakeSocket[] = [];
        for (let i = 0; i < 8; i++) {
            vi.setSystemTime(250);
            expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
            const ws = h.latest(room.code); phones.push(ws);
            await h.send(room.code, ws, { t: 'join', code: room.code, roomToken: null });
        }
        expect((await h.request(`/rooms/${room.code}/host`, undefined, room.hostToken)).status).toBe(101);
        const host = h.latest(room.code);
        for (let at = 10000; at <= 60000; at += 10000) {
            vi.setSystemTime(at);
            for (const ws of [host, ...phones]) await h.send(room.code, ws, { t: 'ping' });
        }
        expect([host, ...phones].every((ws) => !ws.closed)).toBe(true);
    });
    it('replays the smoke room history, then refuses a fixed client’s thirteenth opening before lookup', async () => {
        const h = harness(); const room = await h.create();
        const path = `/rooms/${room.code}/phone`;
        const drain = async () => { await h.rooms.get(room.code)?.ctx.drain(); };
        await h.request(`/rooms/${room.code}/host`, '192.0.2.2', room.hostToken);
        const originalHost = h.latest(room.code);
        const phones: FakeSocket[] = [];
        for (let i = 0; i < 8; i++) {
            const displayed = `${room.code.slice(0, 4)}-${room.code.slice(4)}`.toLowerCase();
            expect((await h.request(`/rooms/${displayed}/phone`, '192.0.2.3')).status).toBe(101);
            const ws = h.latest(room.code); phones.push(ws);
            await h.send(room.code, ws, { t: 'join', code: displayed, roomToken: null });
            await drain();
        }
        const waiting: FakeSocket[] = [];
        for (let i = 0; i < 4; i++) {
            await h.request(path, '192.0.2.4'); waiting.push(h.latest(room.code));
        }
        expect((await h.request(`/rooms/${room.code}/host`, '192.0.2.5', room.hostToken)).status).toBe(101);
        expect(originalHost.closed).toBe(true);
        for (const ws of waiting) {
            await h.send(room.code, ws, { t: 'join', code: room.code, roomToken: null });
            expect(messages(ws).at(-1)?.code).toBe('room-full');
        }
        await drain();
        const [firstPhone, secondPhone] = phones;
        if (!firstPhone || !secondPhone) throw new Error('Missing seated phones');
        await h.request(path, '192.0.2.6'); const returning = h.latest(room.code);
        await h.send(room.code, returning, { t: 'join', code: room.code,
            roomToken: messages(firstPhone).find((m) => m.t === 'joined')?.roomToken });
        expect(phones[0]?.closed).toBe(true);
        // Emulate the runtime's canonical ping auto-response, without waking the room.
        const auto = h.rooms.get(room.code)?.ctx.autoResponse as { request: string; response: string };
        for (let i = 0; i < 10000; i++) returning.send(auto.response);
        expect(JSON.parse(auto.request)).toMatchObject({ t: 'ping' });
        for (let i = 0; i < 10000 && !returning.closed; i++)
            await h.rooms.get(room.code)?.object.webSocketMessage(returning as unknown as WebSocket, '{ "v": 1, "t": "ping" }');
        expect(messages(returning).at(-1)?.code).toBe('rate-limited');
        await drain();
        // Mixed upgrades and HTTP probes from the attempt-burst client leave openings.
        for (let i = 0; i < 4; i++) expect((await h.request(path, '192.0.2.7')).status).toBe(101);
        for (let i = 0; i < 92; i++) expect((await h.request(path, '192.0.2.7', undefined, false)).status).toBe(426);
        expect((await h.request(path, '192.0.2.7')).status).toBe(429);
        vi.setSystemTime(3500); await h.rooms.get(room.code)?.object.alarm(); await drain();
        const pending: FakeSocket[] = [];
        for (let i = 0; i < 12; i++) {
            expect((await h.request(path, '192.0.2.8')).status).toBe(101);
            pending.push(h.latest(room.code));
        }
        const before = h.lookups();
        expect((await h.request(path, '192.0.2.8')).status).toBe(429);
        expect(h.lookups()).toBe(before);
        expect(pending.every((ws) => !ws.closed)).toBe(true);
        expect((await h.request(path, '192.0.2.9')).status).toBe(101);
        await h.send(room.code, h.latest(room.code), { t: 'join', code: room.code,
            roomToken: messages(secondPhone).find((m) => m.t === 'joined')?.roomToken });
        expect(messages(h.latest(room.code)).at(-1)?.t).toBe('joined');
        await drain();
    });
    it('keeps the twelve-client cap ahead of D-083 same-client replacement in a full pool', async () => {
        const h = harness(); const room = await h.create(); const path = `/rooms/${room.code}/phone`;
        for (let i = 0; i < 12; i++) expect((await h.request(path)).status).toBe(101);
        const original = h.rooms.get(room.code)?.ctx.sockets.slice() ?? [];
        for (let i = 0; i < 4; i++) expect((await h.request(path, '192.0.2.2')).status).toBe(101);
        const before = h.lookups();
        expect((await h.request(path)).status).toBe(429);
        expect(h.lookups()).toBe(before);
        expect(original.every((ws) => !ws.closed)).toBe(true);
        // Below the per-client cap, the second client may replace its own opening.
        expect((await h.request(path, '192.0.2.2')).status).toBe(101);
        await h.rooms.get(room.code)?.ctx.drain();
        expect(h.rooms.get(room.code)?.ctx.getWebSockets()).toHaveLength(16);
        expect((await h.request(path)).status).toBe(429);
    });
    it('reserves at most seventeen unresolved openings across rooms, including prior failures', async () => {
        const h = harness(); const first = await h.create(); const second = await h.create();
        for (let i = 0; i < 12; i++) expect((await h.request(`/rooms/${first.code}/phone`)).status).toBe(101);
        for (let i = 0; i < 5; i++) expect((await h.request(`/rooms/${second.code}/phone`)).status).toBe(101);
        const before = h.lookups();
        const denied = await h.request(`/rooms/${second.code}/phone`);
        expect(denied.status).toBe(429); expect(denied.headers.get('Retry-After')).toBe('1');
        expect(h.lookups()).toBe(before);
        vi.setSystemTime(3500);
        for (const entry of h.rooms.values()) { await entry.object.alarm(); await entry.ctx.drain(); }
        // Seventeen abandonments cause back-off; expiry permits just one trial.
        expect((await h.request(`/rooms/${second.code}/phone`)).status).toBe(429);
        vi.setSystemTime(5000);
        expect((await h.request(`/rooms/${second.code}/phone`)).status).toBe(101);
        expect((await h.request(`/rooms/${first.code}/phone`)).status).toBe(429);
    });
    it('retains twelve deadline failures across a refused thirteenth and idle eviction (probe B)', async () => {
        const h = harness(true);
        const room = await h.create('192.0.2.2');
        const path = `/rooms/${room.code}/phone`;
        for (let i = 0; i < 12; i++) expect((await h.request(path)).status).toBe(101);
        const refused = await h.request(path);
        expect(refused.status).toBe(429);
        expect(refused.headers.get('Retry-After')).toBe('10');
        vi.setSystemTime(3000);
        const entry = h.rooms.get(room.code);
        if (!entry) throw new Error('Missing room');
        await entry.object.alarm(); await entry.ctx.drain();
        expect(entry.ctx.sockets.every((ws) => ws.closed)).toBe(true);
        expect(entry.ctx.sockets.every((ws) => messages(ws).at(-1)?.code === 'opening-timeout')).toBe(true);
        vi.setSystemTime(14000);
        for (let i = 0; i < 5; i++) expect((await h.request(path)).status).toBe(101);
        expect((await h.request(path)).status).toBe(429);
        vi.setSystemTime(17000);
        await entry.object.alarm(); await entry.ctx.drain();
        vi.setSystemTime(19000);
        expect((await h.request(path)).status).toBe(101);
        expect((await h.request(path)).status).toBe(429);
    });
    it.each(['room pool', 'edge', 'cached', '/48', '/64 rollback'])(
        'preserves pending charges after a %s refusal, including idle runtime eviction', async (refusal) => {
            const h = harness(true);
            const address = refusal.startsWith('/') ? '2001:db8:1234:1::1' : '192.0.2.1';
            const room = await h.create('192.0.2.200');
            const path = `/rooms/${room.code}/phone`;
            for (let i = 0; i < 12; i++) expect((await h.request(path, address)).status).toBe(101);
            let refusedPath = path;
            if (refusal === 'room pool') {
                const full = await h.create('192.0.2.201');
                refusedPath = `/rooms/${full.code}/phone`;
                for (let i = 0; i < 16; i++)
                    expect((await h.request(refusedPath, i < 12 ? '192.0.2.20' : '192.0.2.21')).status).toBe(101);
            }
            if (refusal === '/48') {
                // Consume the family's attempt burst through successful HTTP probes;
                // sibling /64 meters each remain within their own 96-attempt burst.
                for (let group = 0; group < 16; group++) {
                    for (let i = 0; i < (group === 15 ? 84 : 96); i++)
                        expect((await h.request(path, `2001:db8:1234:${String(group + 2)}::1`,
                            undefined, false)).status).toBe(426);
                }
            }
            if (refusal === 'edge') h.edge.success = false;
            const before = h.lookups();
            expect((await h.request(refusedPath, address)).status).toBe(429);
            expect(h.lookups() - before).toBe(refusal === 'room pool' ? 1 : 0);
            if (refusal === 'cached') {
                const cachedBefore = h.lookups();
                expect((await h.request(path, address)).status).toBe(429);
                expect(h.lookups()).toBe(cachedBefore);
            }
            vi.setSystemTime(3000);
            for (const entry of h.rooms.values()) { await entry.object.alarm(); await entry.ctx.drain(); }
            h.edge.success = true;
            // A new Worker isolate has no edge refusal cache, but shares admission shards.
            if (refusal === 'edge') h.resetCache();
            vi.setSystemTime(14000);
            for (let i = 0; i < 5; i++) expect((await h.request(path, address)).status).toBe(101);
            expect((await h.request(path, address)).status).toBe(429);
            vi.setSystemTime(17000);
            for (const entry of h.rooms.values()) { await entry.object.alarm(); await entry.ctx.drain(); }
            vi.setSystemTime(19000);
            expect((await h.request(path, address)).status).toBe(101);
            expect((await h.request(path, address)).status).toBe(429);
        });
    it('releases the idle shard after retention without limiter storage or alarms', async () => {
        const h = harness(true);
        await h.create();
        for (const lifetime of h.lifetimes.values()) {
            const { ctx } = lifetime.get();
            expect(ctx.pendingTasks).toBe(1);
            expect(ctx.reads + ctx.writes).toBe(0);
            expect(ctx.alarmAt).toBeNull();
        }
        await vi.advanceTimersByTimeAsync(600000);
        for (const lifetime of h.lifetimes.values()) {
            lifetime.get();
            expect(lifetime.evictions).toBe(1);
        }
    });
    it('renews a single retention task when traffic continues, then releases it after quiet', async () => {
        const h = harness(true);
        await h.create();
        await vi.advanceTimersByTimeAsync(590000);
        await h.create();
        await vi.advanceTimersByTimeAsync(10000);
        for (const lifetime of h.lifetimes.values()) {
            expect(lifetime.get().ctx.pendingTasks).toBe(1);
            expect(lifetime.evictions).toBe(0);
        }
        await vi.advanceTimersByTimeAsync(590000);
        for (const lifetime of h.lifetimes.values()) {
            lifetime.get();
            expect(lifetime.evictions).toBe(1);
        }
    });
    it('fails closed when the HMAC secret has not been provisioned', async () => {
        const h = harness(); h.env.ADMISSION_SECRET = '';
        expect((await h.request('/rooms')).status).toBe(503); expect(h.lookups()).toBe(0);
    });
});
