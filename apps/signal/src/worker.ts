import { generateCode, normalizeCode } from './core/codes';
import { allowedOrigin } from './core/http';
export { RoomObject } from './room-object';
interface Env {
    ROOMS: DurableObjectNamespace;
    ALLOWED_ORIGINS?: string;
}
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const origin = request.headers.get('Origin');
        if (!allowedOrigin(origin, env.ALLOWED_ORIGINS))
            return new Response(null, { status: 403 });
        const headers = { 'Access-Control-Allow-Origin': origin ?? '', Vary: 'Origin',
            'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'no-store' };
        const url = new URL(request.url);
        if (url.pathname === '/rooms') {
            if (request.method === 'OPTIONS')
                return new Response(null, { status: 204, headers });
            if (request.method !== 'POST')
                return new Response(null, { status: 405, headers });
            // C-03 installs creation/join admission here, before object lookup/allocation.
            for (let attempt = 0; attempt < 8; attempt++) {
                const code = generateCode((n) => crypto.getRandomValues(new Uint8Array(n)));
                const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
                const response = await stub.fetch(`https://room/init?code=${code}`, { method: 'POST' });
                if (response.status === 409)
                    continue;
                return new Response(response.body, { status: response.status, headers: { ...headers,
                        'Content-Type': 'application/json' } });
            }
            return new Response(null, { status: 503, headers });
        }
        const match = /^\/rooms\/([^/]+)\/(host|phone)$/.exec(url.pathname);
        let code: string;
        try {
            code = match?.[1] ? normalizeCode(decodeURIComponent(match[1])) : '';
        }
        catch {
            return new Response(null, { status: 404, headers });
        }
        if (!/^[23456789BCDFGHJKMNPQRSTVWXYZ]{8}$/.test(code) || request.method !== 'GET')
            return new Response(null, { status: 404, headers });
        return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    },
} satisfies ExportedHandler<Env>;
