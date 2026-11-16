import { describe, expect, it } from 'vitest';
import worker from './worker';
type Env = Parameters<typeof worker.fetch>[1];
function environment(allowList?: string) {
    const names: string[] = [];
    const namespace = {
        idFromName(name: string) {
            names.push(name);
            return name;
        },
        get() {
            return { fetch: () => Promise.resolve(new Response(null, { status: 200 })) };
        },
    };
    const env = { ROOMS: namespace, ALLOWED_ORIGINS: allowList,
        ADMISSION_SECRET: 'test-only-secret-with-at-least-32-characters',
        ADMISSION: { idFromName: (name: string) => name, get: () => ({ fetch: () => Promise.resolve(new Response('0')) }) } } as unknown as Env;
    return { env, names };
}
describe('C-01 Worker admission', () => {
    it.each([undefined, '', '   ', 'https://example.test'])('S7 fails closed for unconfigured origins: %s',
      async (allowList) => {
        const { env, names } = environment(allowList);
        const response = await worker.fetch(new Request('https://signal/rooms', {
            method: 'POST', headers: { Origin: 'http://localhost:5090' },
        }), env);
        expect(response.status).toBe(403);
        expect(names).toEqual([]);
    });
    const refusedOrigins = [null, 'null', 'https://localhost:5090', 'http://localhost:5090.evil', ''];
    it.each(refusedOrigins)('S7 refuses origin %s before lookup', async (origin) => {
        const { env, names } = environment('http://localhost:5090');
        const headers = origin === null ? {} : { Origin: origin };
        const response = await worker.fetch(new Request('https://signal/rooms/BCDF2345/phone', {
            headers,
        }), env);
        expect(response.status).toBe(403);
        expect(names).toEqual([]);
    });
    it('M6 routes raw, lower-case, hyphenated and space-separated codes to the same object', async () => {
        const { env, names } = environment('http://localhost:5090');
        for (const code of ['BCDF2345', 'bcdf2345', 'bcdf-2345', 'bcdf%202345']) {
            const response = await worker.fetch(new Request(`https://signal/rooms/${code}/phone`, {
                headers: { Origin: 'http://localhost:5090', 'CF-Connecting-IP': '192.0.2.1' },
            }), env);
            expect(response.status).toBe(200);
        }
        expect(names).toEqual(['BCDF2345', 'BCDF2345', 'BCDF2345', 'BCDF2345']);
    });
    it.each(['%xx', 'BCDF23', '00000000'])('M6 refuses invalid path code %s', async (code) => {
        const { env, names } = environment('http://localhost:5090');
        const response = await worker.fetch(new Request(`https://signal/rooms/${code}/phone`, {
            headers: { Origin: 'http://localhost:5090', 'CF-Connecting-IP': '192.0.2.1' },
        }), env);
        expect(response.status).toBe(404);
        expect(names).toEqual([]);
    });
});

// DATA-005: a room-pool refusal is transient and carries no limiter back-off.
describe('D-084 room refusal forwarding', () => {
    it('passes Retry-After 1 and retries the room immediately without a cached refusal', async () => {
        const { env } = environment('http://localhost:5090');
        let calls = 0;
        env.ROOMS = {
            idFromName: (name: string) => name,
            get: () => ({ fetch: () => {
                calls++;
                return Promise.resolve(new Response(null, { status: calls === 1 ? 429 : 200,
                    headers: { 'Retry-After': '1' } }));
            } }),
        } as unknown as DurableObjectNamespace;
        const request = () => new Request('https://signal/rooms/BCDF2345/phone', { headers: {
            Origin: 'http://localhost:5090', 'CF-Connecting-IP': '192.0.2.1', Upgrade: 'websocket',
        } });
        const refused = await worker.fetch(request(), env);
        expect(refused.status).toBe(429);
        expect(refused.headers.get('Retry-After')).toBe('1');
        expect(refused.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After, X-Kaki-Room');
        expect((await worker.fetch(request(), env)).status).toBe(200);
        expect(calls).toBe(2);
    });
});

describe('PLAT-009 CORS exit wrapper', () => {
    const origin = 'http://localhost:5090';
    function check(response: Response): void {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(response.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After, X-Kaki-Room');
        expect(response.headers.get('Vary')).toBe('Origin');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    it.each([400, 401, 404, 410, 426, 429, 500, 503])('decorates forwarded %s without losing room headers', async status => {
        const { env } = environment(origin);
        env.ROOMS = { idFromName: (name: string) => name, get: () => ({ fetch: () => Promise.resolve(
            new Response(null, { status, headers: { Vary: 'Origin', 'X-Kaki-Room': 'gone', 'Retry-After': '7' } })) }) } as unknown as DurableObjectNamespace;
        const response = await worker.fetch(new Request('https://signal/rooms/BCDF2345/phone', {
            headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' },
        }), env);
        expect(response.status).toBe(status); check(response);
        if (status !== 429) expect(response.headers.get('X-Kaki-Room')).toBe('gone');
    });
    it.each(['route', 'address', 'secret', 'method', 'edge', 'admission', 'throw', 'collision'])('decorates worker failure: %s', async fault => {
        const { env } = environment(origin);
        let path = '/rooms'; let method = 'POST';
        const headers: Record<string, string> = { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' };
        if (fault === 'route') path = '/wrong';
        if (fault === 'address') delete headers['CF-Connecting-IP'];
        if (fault === 'secret') env.ADMISSION_SECRET = '';
        if (fault === 'method') method = 'GET';
        if (fault === 'edge') env.EDGE_LIMIT = { limit: () => Promise.resolve({ success: false }) };
        if (fault === 'admission') env.ADMISSION = { idFromName: (name: string) => name,
            get: () => ({ fetch: () => Promise.resolve(new Response('5')) }) } as unknown as DurableObjectNamespace;
        if (fault === 'throw' || fault === 'collision') env.ROOMS = { idFromName: (name: string) => name,
            get: () => ({ fetch: () => fault === 'throw' ? Promise.reject(new Error('storage')) : Promise.resolve(new Response(null, { status: 409 })) }) } as unknown as DurableObjectNamespace;
        const response = await worker.fetch(new Request(`https://signal${path}`, { method, headers }), env);
        expect(response.status).toBeGreaterThanOrEqual(400); check(response);
    });
    it.each(['/wrong', '/rooms', '/rooms/BCDF2345/host', '/rooms/BCDF2345/phone'])('rejects disallowed origins on %s', async path => {
        const { env } = environment(origin);
        const response = await worker.fetch(new Request(`https://signal${path}`, { headers: { Origin: 'https://evil.test' } }), env);
        expect(response.status).toBe(403);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
        expect(response.headers.get('Vary')).toBe('Origin');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
});
