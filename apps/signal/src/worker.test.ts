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
        expect(refused.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
        expect((await worker.fetch(request(), env)).status).toBe(200);
        expect(calls).toBe(2);
    });
});
