import { stdout } from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './worker';
import { AdmissionObject } from './admission-object';
import { RoomObject } from './room-object';
import { FakeState, FakeSocket } from './testing/fake';
import { Admission, MAX_CLIENTS } from './core/admission';
import { clientKey } from './admission-object';

const report = (line: string): void => { stdout.write(`${line}\n`); };
const NativeResponse = Response;
class SerialState extends FakeState {
    active = false;
    private pending: Promise<unknown> = Promise.resolve();
    override blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
        const result = this.pending.then(async () => {
            this.active = true;
            try { return await callback(); } finally { this.active = false; }
        });
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
function harness() {
    const counters = new Map<string, { ctx: SerialState; object: AdmissionObject }>();
    const rooms = new Map<string, { ctx: SerialState; object: RoomObject }>();
    let lookups = 0; let calls = 0; let down = false;
    const seenKeys = new Set<string>();
    type Env = Parameters<typeof worker.fetch>[1];
    const env = {
        ALLOWED_ORIGINS: 'https://arcade.test', ADMISSION_SECRET: 'test-only-random-secret-at-least-32-characters',
        ADMISSION: {
            idFromName: (name: string) => name,
            get: (name: string) => ({ fetch: (url: string, init: RequestInit) => {
                expect([...rooms.values()].every((entry) => !entry.ctx.active)).toBe(true);
                calls++;
                seenKeys.add((JSON.parse(typeof init.body === 'string' ? init.body : '') as { key: string }).key);
                if (down) return Promise.resolve(new NativeResponse('', { status: 500 }));
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
    const request = (path: string, address: string | null = '192.0.2.1', hostToken?: string, upgrade = true) => worker.fetch(
        new Request(`https://signal${path}`, { method: path === '/rooms' ? 'POST' : 'GET', headers: {
            Origin: 'https://arcade.test', ...(address === null ? {} : { 'CF-Connecting-IP': address }),
            ...(upgrade ? { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': hostToken ? `kaki.v1, kaki.host.${hostToken}` : 'kaki.v1' } : {}),
        } }), env as unknown as Env);
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
    return { env, counters, rooms, seenKeys, request, create, send, latest, lookups: () => lookups, calls: () => calls, setDown: (v: boolean) => { down = v; } };
}
const messages = (ws: FakeSocket) => ws.sent.map((text) => JSON.parse(text) as Record<string, unknown>);
const v6 = (i: number, prefix = '2001:db8:0:1') => `${prefix}::${i.toString(16)}`;
function lcg(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; }
describe('REVIEW C-03 attacks (each asserts the secure behaviour; a failure is a finding)', () => {
    it('R01 pure: a full shard still admits a never-seen honest client', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < MAX_CLIENTS; i++) core.run(`attacker-${String(i)}`, { kind: 'probe' });
        expect(core.run('honest', { kind: 'phone', id: 'p', room: 'BCDFGHJK' })).toBe(0);
    });
    it('R02 worker: distinct addresses from ONE IPv6 /64 cannot deny room creation to an unrelated IPv4 household', async () => {
        const h = harness();
        // Memory-only state has no storage index. Exercise more interface IDs than
        // a shard's capacity and inspect the actual opaque identities sent to the limiter.
        const sent = MAX_CLIENTS + 1;
        for (let i = 0; i < sent; i++) await h.request('/rooms/x/phone', v6(i), undefined, false);
        expect(h.seenKeys.size).toBe(4); // two overlapping /64 and /48 HMACs
        for (const entry of h.counters.values()) expect(entry.ctx.records.size).toBe(0);
        const honest = await h.request('/rooms', '198.51.100.7');
        report(`R02 honest create status ${String(honest.status)} Retry-After ${String(honest.headers.get('Retry-After'))}`);
        expect(honest.status).toBe(200);
    }, 600000);
    it('R03 one /64 rotating its interface id cannot make more than ~17 failed guesses before back-off', async () => {
        const h = harness(); let refused = 0;
        for (let i = 0; i < 300; i++) if ((await h.request('/rooms/BCDF2345/phone', v6(i))).status === 429) refused++;
        report(`R03 guesses from one /64: 300 sent, ${String(refused)} refused`);
        expect(refused).toBeGreaterThan(250);
    });
    it('R04 two addresses (or one /64) cannot fill the 16-slot opening pool and lock an honest phone out', async () => {
        const h = harness(); const room = await h.create('198.51.100.9');
        for (let i = 0; i < 12; i++) expect((await h.request(`/rooms/${room.code}/phone`, '203.0.113.1')).status).toBe(101);
        for (let i = 0; i < 4; i++) expect((await h.request(`/rooms/${room.code}/phone`, '203.0.113.2')).status).toBe(101);
        vi.setSystemTime(1500);
        const honest = await h.request(`/rooms/${room.code}/phone`, '198.51.100.10');
        report(`R04 honest phone while pool held by 2 silent addresses: ${String(honest.status)}`);
        expect(honest.status).toBe(101);
    });
    it('R05 an attacker-filled pool does not turn into address-level back-off for the honest household', async () => {
        const h = harness(); const room = await h.create('198.51.100.9'); const other = await h.create('198.51.100.20');
        for (let i = 0; i < 16; i++) await h.request(`/rooms/${room.code}/phone`, `203.0.113.${String(i + 1)}`);
        // eight honest phones, real netcode: up to 4 upgrade attempts each (status probes see 426, not counted)
        for (let i = 0; i < 17; i++) await h.request(`/rooms/${room.code}/phone`, '198.51.100.20');
        const ownRoom = await h.request(`/rooms/${other.code}/host`, '198.51.100.20', other.hostToken);
        report(`R05 honest household's own host reconnect after room-full 429s: ${String(ownRoom.status)}`);
        expect(ownRoom.status).toBe(101);
    });
    it('R06 one address can take all eight seats with valid joins and is never penalised (documents residual risk)', async () => {
        const h = harness(); const room = await h.create('198.51.100.9');
        for (let i = 0; i < 8; i++) {
            expect((await h.request(`/rooms/${room.code}/phone`, '203.0.113.5')).status).toBe(101);
            await h.send(room.code, h.latest(room.code), { t: 'join', code: room.code, roomToken: null });
        }
        expect((await h.request(`/rooms/${room.code}/phone`, '198.51.100.10')).status).toBe(101);
        const honest = h.latest(room.code);
        await h.send(room.code, honest, { t: 'join', code: room.code, roomToken: null });
        expect(messages(honest)[0]?.code).toBe('room-full');
        const again = await h.request(`/rooms/${room.code}/phone`, '203.0.113.5');
        expect(again.status).toBe(101);
    });
    it('R07 a bursty but honest shared address (school: 8 arrivals/s for 30 s) is paced, not escalated into back-off', () => {
        let now = 0; const core = new Admission(() => now); let admitted = 0;
        for (let i = 0; i < 240; i++) { now = i * 125; if (core.run('school', { kind: 'probe' }) === 0) admitted++; }
        report(`R07 school burst: ${String(admitted)} of 240 admitted in 30 s (pacing alone would admit ~156)`);
        expect(admitted).toBeGreaterThanOrEqual(150);
    });
    it('R08 a request without CF-Connecting-IP is refused rather than pooled into one shared identity', async () => {
        const h = harness();
        const response = await h.request('/rooms', null);
        expect(response.status).toBe(400);
        expect(h.calls()).toBe(0);
    });
    it('R09 limiter unavailable: the Worker answers a well-formed 503 with CORS and Retry-After, never throws', async () => {
        const h = harness(); h.setDown(true);
        const response = await h.request('/rooms').catch((e: unknown) => e);
        report(`R09 limiter down: ${response instanceof Error ? `threw ${response.message}` : String((response as Response).status)}`);
        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(503);
        expect((response as Response).headers.get('Retry-After')).toBe('5');
        expect((response as Response).headers.get('Access-Control-Allow-Origin')).toBe('https://arcade.test');
    });
    it('R10 limiter unavailable while a phone joins: the room still processes the join (no throw inside blockConcurrencyWhile)', async () => {
        const h = harness(); const room = await h.create();
        expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
        const ws = h.latest(room.code); h.setDown(true);
        const outcome = await h.send(room.code, ws, { t: 'join', code: room.code, roomToken: null }).then(() => 'ok', (e: unknown) => `threw ${String(e)}`);
        report(`R10 join while limiter down: ${outcome}`);
        expect(outcome).toBe('ok');
        expect(messages(ws)[0]?.t).toBe('joined');
    });
    it('R11 clock stepping backwards never advertises Retry-After above the 60 s cap', () => {
        let now = 3600000; const core = new Admission(() => now);
        for (let i = 0; i < 40; i++) core.run('x', { kind: 'fail' }); now += 1000; core.run('x', { kind: 'fail' });
        now -= 3600000;
        const retry = core.run('x', { kind: 'probe' });
        report(`R11 retry after clock step back 1 h: ${String(retry)} s`);
        expect(retry).toBeLessThanOrEqual(60);
    });
    it('R12 an already-refused client costs no Durable Object request', async () => {
        const h = harness();
        for (let i = 0; i < 17; i++) await h.request('/rooms/BCDF2345/phone');
        const before = h.calls(); await h.request('/rooms/BCDF2345/phone');
        const refusedCost = h.calls() - before;
        const b2 = h.calls(); const l2 = h.lookups(); await h.request('/rooms/BCDF2346/phone', '203.0.113.77');
        report(`R12 limiter DO calls: refused request ${String(refusedCost)}; admitted wrong guess ${String(h.calls() - b2)} + room ${String(h.lookups() - l2)}`);
        expect(refusedCost).toBe(0);
    });
    it('R13 a blocked client sees identical answers for an existing and a missing code', async () => {
        const h = harness(); const room = await h.create('198.51.100.9');
        for (let i = 0; i < 17; i++) await h.request('/rooms/BCDF2345/phone');
        const a = await h.request(`/rooms/${room.code}/phone`); const b = await h.request('/rooms/BCDF2346/phone');
        expect([a.status, a.headers.get('Retry-After'), await a.text()]).toEqual([b.status, b.headers.get('Retry-After'), await b.text()]);
    });
    it('R14 HMAC keys survive a full epoch overlap and change after two epochs (linkability window is 20 min)', async () => {
        const s = 'test-only-random-secret-at-least-32-characters';
        const at0 = [await clientKey('a', s, 0), await clientKey('a', s, 600000)];
        const at1 = [await clientKey('a', s, 600000), await clientKey('a', s, 1200000)];
        expect(at0[1]).toBe(at1[0]);
        expect(at0[0]).not.toBe(at1[1]);
    });
    it('R15 property: random honest/abusive op mixes keep every bound (seeded, monotonic clock)', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const r = lcg(seed); let now = 0; const core = new Admission(() => now);
            for (let n = 0; n < 600; n++) {
                now += Math.floor(r() * 3000);
                const key = `k${String(Math.floor(r() * 5))}`; const roll = r();
                const op = roll < 0.1 ? { kind: 'create' as const } : roll < 0.3 ? { kind: 'fail' as const }
                    : roll < 0.6 ? { kind: 'phone' as const, id: `i${String(n)}`, room: `R${String(Math.floor(r() * 3))}` }
                    : roll < 0.8 ? { kind: 'finish' as const, id: `i${String(n - Math.floor(r() * 20))}`, failed: r() < 0.5 } : { kind: 'probe' as const };
                const retry = core.run(key, op);
                expect(Number.isInteger(retry) && retry >= 0 && retry <= 600).toBe(true);
                for (const [, c] of core.snapshot()) {
                    expect(c.failures).toBeLessThanOrEqual(32); expect(c.failures).toBeGreaterThanOrEqual(0);
                    expect(c.create.tokens).toBeLessThanOrEqual(8); expect(c.create.tokens).toBeGreaterThanOrEqual(0);
                    expect(c.attempt.tokens).toBeLessThanOrEqual(96); expect(c.attempt.tokens).toBeGreaterThanOrEqual(0);
                    expect(c.leases.length).toBeLessThanOrEqual(48);
                    expect(c.blockedUntil - now).toBeLessThanOrEqual(60000);
                    for (const room of ['R0', 'R1', 'R2']) expect(c.leases.filter((l) => l.room === room && l.until > now).length).toBeLessThanOrEqual(12);
                }
            }
        }
    }, 600000);
    it('R16 property: a long honest evening (4 h, a room every 3 min, 8 phones, one retry each, the odd typo) is never refused', () => {
        let now = 0; const core = new Admission(() => now); let refused = 0; let id = 0;
        for (let room = 0; room < 80; room++) {
            now = room * 180000;
            refused += core.run('home', { kind: 'create' }) ? 1 : 0;
            refused += core.run('home', { kind: 'host' }) ? 1 : 0;
            for (let p = 0; p < 8; p++) {
                const a = `a${String(id++)}`; refused += core.run('home', { kind: 'phone', id: a, room: String(room) }) ? 1 : 0;
                core.run('home', { kind: 'finish', id: a, failed: p === 0 });
                const b = `a${String(id++)}`; refused += core.run('home', { kind: 'phone', id: b, room: String(room) }) ? 1 : 0;
                core.run('home', { kind: 'finish', id: b, failed: false });
            }
            if (room % 10 === 0) core.run('home', { kind: 'fail' });
        }
        expect(refused).toBe(0);
    });
    it('R17 burst of 8 phones x 4 netcode retries + 4 probes within 4 s (all refused upstream by a full pool) stays below the attempt bucket', () => {
        const core = new Admission(() => 0);
        let refused = 0;
        for (let i = 0; i < 8 * 8 + 1; i++) {
            const id = String(i);
            refused += core.run('wifi', { kind: 'guess', id, room: '' }) ? 1 : 0;
            // The upstream full answer refunds the provisional charge under D-081c/d.
            core.run('wifi', { kind: 'finish', id, failed: false });
        }
        expect(refused).toBe(0);
    });
});
describe('REVIEW C-03 guessing rate', () => {
    it('R18 a concurrent prober cannot outrun back-off (failures are charged only after the guess resolves)', () => {
        let now = 0; const core = new Admission(() => now); let guesses = 0;
        while (now < 3600000) {
            let admitted = 0;
            while (core.run('a', { kind: 'probe' }) === 0) admitted++;
            for (let i = 0; i < admitted; i++) core.run('a', { kind: 'fail' });
            guesses += admitted;
            const blocked = core.snapshot()[0]?.[1].blockedUntil ?? 0;
            now = Math.max(now + 1000, blocked);
        }
        report(`R18 failed guesses in one hour from one address with concurrent bursts: ${String(guesses)}`);
        expect(guesses).toBeLessThan(200);
    });
});

describe('D-081 additional regression and cost evidence', () => {
    it('uses a second failure counter across /64s in the same IPv6 /48', async () => {
        const h = harness(); let refused = 0;
        for (let i = 0; i < 300; i++) {
            if ((await h.request('/rooms/BCDF2345/phone', `2001:db8:7:${i.toString(16)}::1`)).status === 429) refused++;
        }
        expect(refused).toBeGreaterThan(150);
        expect((await h.request('/rooms', '2001:db8:8::1')).status).toBe(200);
    });
    it('uses the optional edge binding with a canonical opaque client key before limiter calls', async () => {
        const h = harness(); const keys: string[] = [];
        const env = h.env as typeof h.env & { EDGE_LIMIT: { limit: (options: { key: string }) => Promise<{ success: boolean }> } };
        env.EDGE_LIMIT = { limit: ({ key }) => { keys.push(key); return Promise.resolve({ success: false }); } };
        expect((await h.request('/rooms', '2001:db8:1:2::1')).status).toBe(429);
        expect((await h.request('/rooms', '2001:0db8:0001:0002::2')).status).toBe(429);
        expect(keys).toHaveLength(1); // second refusal is isolate-local
        expect(keys[0]).toBe(await clientKey('2001:db8:1:2::/64', h.env.ADMISSION_SECRET, 0));
        expect((await h.request('/rooms', '2001:db8:1:3::1')).status).toBe(429);
        expect(keys).toHaveLength(2);
        expect(keys[1]).not.toBe(keys[0]);
        expect(h.calls()).toBe(0); expect(h.lookups()).toBe(0);
    });
    it('answers joins with CORS, Retry-After 5 and 503 when the limiter fails', async () => {
        const h = harness(); h.setDown(true);
        for (const path of ['/rooms/BCDF2345/phone', '/rooms/BCDF2345/host']) {
            const response = await h.request(path);
            expect(response.status).toBe(503);
            expect(response.headers.get('Retry-After')).toBe('5');
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://arcade.test');
        }
        expect(h.lookups()).toBe(0);
    });
    it('measures limiter calls and storage for a refusal, wrong guess and honest session', async () => {
        for (const address of ['192.0.2.1', '2001:db8::1']) {
            const h = harness(); const room = await h.create(address);
            await h.request(`/rooms/${room.code}/host`, address, room.hostToken);
            for (let i = 0; i < 8; i++) {
                await h.request(`/rooms/${room.code}/phone`, address);
                await h.send(room.code, h.latest(room.code), { t: 'join', code: room.code, roomToken: null });
            }
            for (const entry of h.rooms.values()) await entry.ctx.drain();
            const session = h.calls();
            const wrongAddress = address.includes(':') ? '2001:db8:1::1' : '198.51.100.1';
            const before = h.calls(); const roomsBefore = h.lookups();
            await h.request('/rooms/BCDF2345/phone', wrongAddress);
            const wrong = h.calls() - before; const wrongRooms = h.lookups() - roomsBefore;
            for (let i = 0; i < 16; i++) await h.request('/rooms/BCDF2345/phone', wrongAddress);
            const refusedBefore = h.calls();
            expect((await h.request('/rooms/BCDF2345/phone', wrongAddress)).status).toBe(429);
            const refused = h.calls() - refusedBefore;
            const reads = [...h.counters.values()].reduce((sum, entry) => sum + entry.ctx.reads, 0);
            const writes = [...h.counters.values()].reduce((sum, entry) => sum + entry.ctx.writes, 0);
            report(`COST ${address.includes(':') ? 'IPv6' : 'IPv4'}: refused=${String(refused)}, wrong=${String(wrong)} limiter + ${String(wrongRooms)} room, session=${String(session)} limiter + 10 room fetches + 8 join events, storage reads=${String(reads)}, writes=${String(writes)}`);
            expect(session).toBe(address.includes(':') ? 76 : 38);
            expect(wrong).toBe(address.includes(':') ? 8 : 4);
            expect(refused).toBe(0); expect(reads).toBe(0); expect(writes).toBe(0);
        }
    });
});

describe('D-081 capacity and room-full refunds', () => {
    it('evicts the least recently seen clean entry and retains offenders', () => {
        let now = 0; const core = new Admission(() => now);
        core.run('offender', { kind: 'fail' });
        for (let i = 1; i < MAX_CLIENTS; i++) core.run(`clean${String(i)}`, { kind: 'host' });
        now++;
        core.run('clean1', { kind: 'host' });
        core.run('new', { kind: 'create' });
        const keys = core.snapshot().map(([key]) => key);
        expect(keys).toContain('offender'); expect(keys).toContain('clean1');
        expect(keys).not.toContain('clean2'); expect(keys).toContain('new');
    });
    it('shares a generous bounded overflow when all normal entries are offenders and resolves its leases', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < MAX_CLIENTS; i++) core.run(`bad${String(i)}`, { kind: 'fail' });
        for (let i = 0; i < 100; i++) expect(core.run(`new${String(i)}`, { kind: 'create' })).toBe(0);
        for (let i = 0; i < 100; i++) {
            expect(core.run(`new${String(i)}`, { kind: 'phone', room: 'same', id: String(i) })).toBe(0);
            expect(core.run(`new${String(i)}`, { kind: 'finish', id: String(i), failed: false })).toBe(0);
        }
        expect(core.snapshot()).toHaveLength(MAX_CLIENTS);
    });
    it('never charges a valid join refused because all eight seats are taken', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 8; i++) {
            await h.request(`/rooms/${room.code}/phone`);
            await h.send(room.code, h.latest(room.code), { t: 'join', code: room.code, roomToken: null });
        }
        for (let i = 0; i < 20; i++) {
            expect((await h.request(`/rooms/${room.code}/phone`, '198.51.100.7')).status).toBe(101);
            const ws = h.latest(room.code);
            await h.send(room.code, ws, { t: 'join', code: room.code, roomToken: null });
            expect(messages(ws)[0]?.code).toBe('room-full');
            await h.rooms.get(room.code)?.ctx.drain();
        }
        const own = await h.create('198.51.100.7');
        expect((await h.request(`/rooms/${own.code}/host`, '198.51.100.7', own.hostToken)).status).toBe(101);
    });
});

describe('D-081 limiter isolation', () => {
    it('finishes a room join even when lease resolution never returns', async () => {
        const h = harness(); const room = await h.create();
        expect((await h.request(`/rooms/${room.code}/phone`)).status).toBe(101);
        const ws = h.latest(room.code);
        h.env.ADMISSION.get = () => ({ fetch: () => new Promise<Response>(() => { /* Simulated hung limiter. */ }) });
        await h.send(room.code, ws, { t: 'join', code: room.code, roomToken: null });
        expect(messages(ws)[0]?.t).toBe('joined');
        expect(h.rooms.get(room.code)?.ctx.tasks.length).toBeGreaterThan(0);
    });
    it('caps an isolate-cached Retry-After after the wall clock rolls back', async () => {
        const h = harness(); vi.setSystemTime(60000);
        for (let i = 0; i < 17; i++) await h.request('/rooms/BCDF2345/phone');
        vi.setSystemTime(0);
        const retry = await h.request('/rooms/BCDF2345/phone');
        expect(retry.status).toBe(429);
        expect(Number(retry.headers.get('Retry-After'))).toBeLessThanOrEqual(60);
    });
});

describe('D-081 provisional failure budget', () => {
    it('bounds unresolved guesses before feedback and refunds successful provisional charges', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < 17; i++) expect(core.run('client', { kind: 'guess', id: String(i), room: '' })).toBe(0);
        expect(core.run('client', { kind: 'guess', id: 'refused', room: '' })).toBe(1);
        expect(core.snapshot()[0]?.[1].failures).toBe(0);
        core.run('client', { kind: 'finish', id: '0', failed: false });
        expect(core.run('client', { kind: 'guess', id: 'new', room: '' })).toBe(0);
        for (let i = 1; i < 17; i++) core.run('client', { kind: 'finish', id: String(i), failed: true });
        core.run('client', { kind: 'finish', id: 'new', failed: true });
        expect(core.snapshot()[0]?.[1].failures).toBe(17);
        expect(core.run('client', { kind: 'guess', id: 'blocked', room: '' })).toBe(1);
    });
});

describe('D-081 host lease isolation', () => {
    it('keeps an authenticated host upgrade when the limiter fails after admission', async () => {
        const h = harness(); const room = await h.create();
        const get = h.env.ROOMS.get;
        h.env.ROOMS.get = (name: string) => {
            const stub = get(name);
            return { fetch: (url: string | Request, init?: RequestInit) => {
                h.setDown(true);
                return stub.fetch(url, init);
            } };
        };
        const response = await h.request(`/rooms/${room.code}/host`, undefined, room.hostToken);
        expect(response.status).toBe(101);
        expect(messages(h.latest(room.code))[0]?.t).toBe('created');
        await h.rooms.get(room.code)?.ctx.drain();
    });
});

describe('D-083 edge ordering and opening privacy', () => {
    it('refuses /48 creation before /64 calls and caches it across subnets', async () => {
        const h = harness();
        for (let i = 0; i < 64; i++) expect((await h.request('/rooms', `2001:db8:1:${i.toString(16)}::1`)).status).toBe(200);
        const before = h.calls();
        expect((await h.request('/rooms', '2001:db8:1:aaaa::1')).status).toBe(429);
        expect(h.calls() - before).toBe(1);
        const cached = h.calls();
        expect((await h.request('/rooms', '2001:db8:1:bbbb::1')).status).toBe(429);
        expect(h.calls()).toBe(cached);
    });
    it('charges a silent replaced opening to its owner and stores no client key', async () => {
        const h = harness(); const room = await h.create();
        for (let i = 0; i < 16; i++) await h.request(`/rooms/${room.code}/phone`, `203.0.113.${String(i + 1)}`);
        vi.setSystemTime(1500);
        expect((await h.request(`/rooms/${room.code}/phone`, '198.51.100.77')).status).toBe(101);
        for (const entry of h.rooms.values()) {
            await entry.ctx.drain();
            expect(JSON.stringify([...entry.ctx.records.values()])).not.toContain('clientKey');
        }
        const owner = await clientKey('203.0.113.1', h.env.ADMISSION_SECRET, 1500);
        const shard = h.counters.get(owner.slice(0, 1));
        expect(shard).toBeDefined();
        const snapshot = (shard?.object as unknown as { core: Admission }).core.snapshot();
        expect(snapshot.find(([key]) => key === owner)?.[1].failures).toBe(1);
        // A fresh guess is still permitted: replacement is one failure, not a block.
        expect((await h.request('/rooms/BCDF2345/phone', '203.0.113.1')).status).toBe(404);
    });
});
