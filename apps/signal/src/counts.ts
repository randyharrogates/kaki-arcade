import { COUNTS_MAX_BYTES, validateCounts } from '@kaki/protocol';
import type { Counts } from '@kaki/protocol';
import { admission, clientKey } from './admission-object';
import type { AdmissionEnv } from './admission-object';
import { clientNetworks } from './core/address';
import { ROTATION_MS } from './core/admission';
const refusals = new WeakMap<object, Map<string, number>>();

/** Stream rather than trusting Content-Length; the cap also applies to chunked bodies. */
export async function readCounts(request: Request): Promise<Counts | 400 | 413> {
  const reader = request.body?.getReader();
  if (!reader) return 400;
  const bytes = new Uint8Array(COUNTS_MAX_BYTES);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read() as { value?: Uint8Array; done: boolean };
      if (done) break;
      if (!value) return 400;
      if (size + value.length > bytes.length) { await reader.cancel(); return 413; }
      bytes.set(value, size); size += value.length;
    }
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes.subarray(0, size)));
    return validateCounts(value) ? value : 400;
  } catch { return 400; }
}
export interface CountsEnv extends AdmissionEnv { ROOMS: DurableObjectNamespace; COUNTS_DEV_READ?: string; EDGE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> } }
export async function countsRoute(request: Request, env: CountsEnv): Promise<Response> {
  const url = new URL(request.url);
  const day = new Date().toISOString().slice(0, 10);
  if (request.method === 'GET') {
    if (env.COUNTS_DEV_READ !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return new Response(null, { status: 404 });
    return env.ROOMS.get(env.ROOMS.idFromName(`counts:${day}`)).fetch('https://counts/counts', { method: 'GET' });
  }
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const networks = clientNetworks(request.headers.get('CF-Connecting-IP'));
  if (!networks) return new Response(null, { status: 400 });
  if (!env.ADMISSION_SECRET || env.ADMISSION_SECRET.length < 32) return new Response(null, { status: 503 });
  // Separate budgets from pairing; only rotating hashes enter the memory-only limiter.
  const now = Date.now();
  const cache = refusals.get(env) ?? new Map<string, number>();
  refusals.set(env, cache);
  for (const [index, network] of networks.entries()) {
    const keys = await Promise.all([now, now + ROTATION_MS].map(at => clientKey(`counts:${network}`, env.ADMISSION_SECRET, at).then(hash => index === 1 ? `${hash}:48` : hash)));
    if (index === 0 && env.EDGE_LIMIT && !(await env.EDGE_LIMIT.limit({ key: keys[0] ?? '' })).success) {
      return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
    }
    const cached = cache.get(keys[0] ?? '') ?? 0;
    const retry = cached > now ? Math.ceil((cached - now) / 1000) : await admission(env, keys, { kind: 'create' });
    if (retry) {
      if (cache.size >= 1024) cache.delete(cache.keys().next().value ?? '');
      cache.set(keys[0] ?? '', now + retry * 1000);
      return new Response(null, { status: 429, headers: { 'Retry-After': String(retry) } });
    }
  }
  const counts = await readCounts(request);
  if (typeof counts === 'number') return new Response(null, { status: counts });
  // No original URL, address or headers cross the storage boundary.
  return env.ROOMS.get(env.ROOMS.idFromName(`counts:${day}`)).fetch('https://counts/counts', {
    method: 'POST', body: JSON.stringify(counts),
  });
}
/** Reserved daily RoomObject instances use the existing storage binding, no new product. */
export async function dailyCounts(request: Request, ctx: DurableObjectState): Promise<Response> {
  return ctx.blockConcurrencyWhile(async () => {
    if (request.method === 'GET') return Response.json(await ctx.storage.get<Counts>('counts') ?? {});
    const counts = await readCounts(request);
    if (typeof counts === 'number') return new Response(null, { status: counts });
    const totals = await ctx.storage.get<Counts>('counts') ?? {};
    for (const [key, n] of Object.entries(counts)) {
      const kind = key as keyof Counts;
      totals[kind] = Math.min(Number.MAX_SAFE_INTEGER, (totals[kind] ?? 0) + n);
    }
    await ctx.storage.put('counts', totals);
    return new Response(null, { status: 204 });
  });
}
