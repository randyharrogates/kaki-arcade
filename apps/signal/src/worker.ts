import { countsRoute } from './counts';
import { clientNetworks } from './core/address';
import { generateCode, normalizeCode } from './core/codes';
import { allowedOrigin } from './core/http';
import { admission, clientKey } from './admission-object';
import { ROTATION_MS } from './core/admission';
import type { AdmissionEnv } from './admission-object';
export { AdmissionObject } from './admission-object';
export { RoomObject } from './room-object';
interface Env extends AdmissionEnv {
    ROOMS: DurableObjectNamespace;
    COUNTS_DEV_READ?: string;
    ALLOWED_ORIGINS?: string;
    EDGE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
const blocked = new WeakMap<object, Map<string, number>>();
async function route(request: Request, env: Env): Promise<Response> {
        const origin = request.headers.get('Origin');
        if (!allowedOrigin(origin, env.ALLOWED_ORIGINS))
            return new Response(null, { status: 403, headers: { Vary: 'Origin', 'Cache-Control': 'no-store' } });
        const url = new URL(request.url);
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204 });
        if (url.pathname === '/counts') return countsRoute(request, env);
        if (url.pathname !== '/rooms' && !url.pathname.startsWith('/rooms/'))
            return new Response(null, { status: 404 });
        const networks = clientNetworks(request.headers.get('CF-Connecting-IP'));
        if (!networks) return new Response(null, { status: 400 });
        if (!env.ADMISSION_SECRET || env.ADMISSION_SECRET.length < 32)
            return new Response(null, { status: 503, headers: { 'Retry-After': '5' } });
        const now = Date.now();
        const key = await Promise.all([now, now + ROTATION_MS].map((at) =>
            clientKey(networks[0] ?? '', env.ADMISSION_SECRET, at)));
        const family = networks[1] ? await Promise.all([now, now + ROTATION_MS].map((at) =>
            clientKey(networks[1] ?? '', env.ADMISSION_SECRET, at).then((hash) => `${hash}:48`))) : [];
        const match = /^\/rooms\/([^/]+)\/(host|phone)$/.exec(url.pathname);
        let roomKey = '';
        try { roomKey = normalizeCode(decodeURIComponent(match?.[1] ?? '')); } catch { /* Count malformed routes too. */ }
        const routeKey = /^[23456789BCDFGHJKMNPQRSTVWXYZ]{8}$/.test(roomKey) ? `${roomKey}:${match?.[2] ?? ''}` : 'invalid';
        const cache = blocked.get(env) ?? new Map<string, number>();
        blocked.set(env, cache);
        const cacheKey = `${url.pathname === '/rooms' ? 'create' : 'join'}:${key.join(':')}`;
        const remember = (key: string, until: number): void => {
            if (cache.size >= 1024) cache.delete(cache.keys().next().value ?? '');
            cache.set(key, until);
        };
        const limited = (retry: number, global = false): Response => {
            const seconds = Math.min(url.pathname === '/rooms' ? 600 : 60, Math.max(1, retry));
            remember(global ? cacheKey : `${cacheKey}:${routeKey}`, now + seconds * 1000);
            return new Response(null, { status: 429, headers: { 'Retry-After': String(seconds) } });
        };
        const edgeCacheKey = `edge:${key.join(':')}`;
        const familyCacheKey = `${url.pathname === '/rooms' ? 'create' : 'join'}:${family.join(':')}`;
        const cached = Math.max(cache.get(edgeCacheKey) ?? 0, family.length ? cache.get(familyCacheKey) ?? 0 : 0, cache.get(cacheKey) ?? 0, cache.get(`${cacheKey}:${routeKey}`) ?? 0);
        if (cached && cached > now) return limited(Math.ceil((cached - now) / 1000));
        const unavailable = (): Response => new Response(null, { status: 503,
            headers: { 'Retry-After': '5' } });
        const check = async (operation: Parameters<typeof admission>[2]): Promise<number> => {
            for (const parts of [family, key]) {
                if (!parts.length) continue;
                const retry = await admission(env, parts, operation);
                if (retry) {
                    if (parts === family) remember(familyCacheKey, now + retry * 1000);
                    if (parts === key && (operation.kind === 'phone' || operation.kind === 'guess'))
                        await admission(env, family, { kind: 'finish', id: operation.id, failed: false });
                    return retry;
                }
            }
            return 0;
        };
        const finish = async (id: string, failed: boolean): Promise<number> => {
            const familyRetry = family.length ? await admission(env, family, { kind: 'finish', id, failed }) : 0;
            if (familyRetry) remember(familyCacheKey, now + familyRetry * 1000);
            return Math.max(familyRetry, await admission(env, key, { kind: 'finish', id, failed }));
        };
        try {
            if (env.EDGE_LIMIT && !(await env.EDGE_LIMIT.limit({ key: key[0] ?? '' })).success) {
                remember(edgeCacheKey, now + 60000);
                return limited(60, true);
            }
            if (url.pathname === '/rooms') {
                if (request.method !== 'POST')
                    return new Response(null, { status: 405 });
                const retry = await check({ kind: 'create' });
                if (retry) return limited(retry);
                for (let attempt = 0; attempt < 8; attempt++) {
                    const code = generateCode((n) => crypto.getRandomValues(new Uint8Array(n)));
                    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
                    const response = await stub.fetch(`https://room/init?code=${code}`, { method: 'POST' });
                    if (response.status === 409)
                        continue;
                    return response;
                }
                return new Response(null, { status: 503, headers: { 'Retry-After': '5' } });
            }
            const id = crypto.randomUUID();
            const kind = match?.[2] === 'host' ? 'host' :
                request.headers.get('Upgrade')?.toLowerCase() === 'websocket' ? 'phone' : 'probe';
            const retry = await check(kind === 'phone'
                ? { kind, id, room: /^[23456789BCDFGHJKMNPQRSTVWXYZ]{8}$/.test(roomKey) ? roomKey : '' }
                : { kind: 'guess', id, room: '' });
            if (retry) return limited(retry);
            const failed = async (): Promise<number> => {
                return finish(id, true);
            };
            const code = roomKey;
            if (!/^[23456789BCDFGHJKMNPQRSTVWXYZ]{8}$/.test(code) || request.method !== 'GET') {
                const failureRetry = await failed();
                if (failureRetry) limited(failureRetry, true);
                return new Response(null, { status: 404 });
            }
            const forwarded = new Request(request.url, { method: request.method, headers: {
                Origin: origin ?? '', Upgrade: request.headers.get('Upgrade') ?? '',
                'Sec-WebSocket-Protocol': request.headers.get('Sec-WebSocket-Protocol') ?? '',
            } });
            // Strip spoofable internal headers and address before crossing the room boundary.
            forwarded.headers.delete('CF-Connecting-IP');
            forwarded.headers.delete('X-Kaki-Admission');
            if (kind !== 'probe') forwarded.headers.set('X-Kaki-Admission', JSON.stringify({ key: [...family, ...key], id }));
            const response = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(forwarded);
            let refusalRetry = 0;
            if (response.status !== 101)
                refusalRetry = await finish(id, [400, 401, 404].includes(response.status));
            if (response.status === 429) return new Response(null, { status: 429, headers: {
                'Retry-After': response.headers.get('Retry-After') ?? '1',
            } });
            if (refusalRetry) limited(refusalRetry, true);
            return response;
        } catch { return unavailable(); }
}
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        let response: Response;
        try { response = await route(request, env); }
        catch { response = new Response(null, { status: 503, headers: { 'Retry-After': '5' } }); }
        const headers = new Headers(response.headers);
        const vary = new Set((headers.get('Vary') ?? '').split(',').map(value => value.trim()).filter(value => value && value.toLowerCase() !== 'origin'));
        vary.add('Origin'); headers.set('Vary', [...vary].join(', '));
        headers.set('Cache-Control', 'no-store');
        const origin = request.headers.get('Origin');
        if (allowedOrigin(origin, env.ALLOWED_ORIGINS)) {
            headers.set('Access-Control-Allow-Origin', origin ?? '');
            headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
            headers.set('Access-Control-Allow-Headers', 'Content-Type');
            headers.set('Access-Control-Expose-Headers', 'Retry-After, X-Kaki-Room');
        }
        return new Response(response.body, { status: response.status, statusText: response.statusText,
            headers, ...(response.webSocket ? { webSocket: response.webSocket } : {}) });
    },
} satisfies ExportedHandler<Env>;
