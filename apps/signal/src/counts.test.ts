import { expect, it, vi } from 'vitest';
import worker from './worker';
import { dailyCounts } from './counts';
import { FakeState } from './testing/fake';
import { COUNT_KINDS, validateCounts } from '@kaki/protocol';
type Env = Parameters<typeof worker.fetch>[1];
function fixture() {
  const state = new FakeState(); const forwarded: Request[] = []; const names: string[] = [];
  let retry = '0';
  const env = {
    ALLOWED_ORIGINS: 'http://localhost:5090', ADMISSION_SECRET: 'test-secret-at-least-32-characters-long',
    ADMISSION: { idFromName: (name: string) => name, get: () => ({ fetch: () => Promise.resolve(new Response(retry)) }) },
    ROOMS: { idFromName: (name: string) => { names.push(name); return name; }, get: () => ({ fetch: (url: string, init: RequestInit) => {
      const request = new Request(url, init); forwarded.push(request.clone()); return dailyCounts(request, state as unknown as DurableObjectState);
    } }) },
  } as unknown as Env;
  const post = (body: string, ip = '192.0.2.99') => worker.fetch(new Request('https://signal/counts', { method: 'POST', body, headers: {
    Origin: 'http://localhost:5090', 'CF-Connecting-IP': ip, 'User-Agent': 'private-device', 'X-Nickname': 'private-name',
  } }), env);
  return { env, post, state, forwarded, names, limit: () => { retry = '60'; } };
}
it('aggregates UTC-day kind integers only; never forwards or persists IP or headers', async () => {
  const f = fixture();
  expect((await f.post('{"reconnect:signal":2}')).status).toBe(204);
  expect((await f.post('{"reconnect:signal":3,"error:host:load":1}')).status).toBe(204);
  expect(f.state.records.get('counts')).toEqual({ 'reconnect:signal': 5, 'error:host:load': 1 });
  expect([...f.state.records.keys()]).toEqual(['counts']);
  for (const request of f.forwarded) {
    expect([...request.headers.keys()]).toEqual(['content-type']);
    expect(await request.text()).not.toMatch(/192\.0|private|nickname|user-agent/i);
  }
  expect(f.names.every(name => /^counts:\d{4}-\d{2}-\d{2}$/.test(name))).toBe(true);
  expect(Object.entries(f.state.records.get('counts') as object).every(([key, n]) => COUNT_KINDS.includes(key as typeof COUNT_KINDS[number]) && Number.isInteger(n))).toBe(true);
});
it('rejects oversize, malformed, free text and every non-kind field before storage', async () => {
  const f = fixture();
  expect((await f.post(' '.repeat(513))).status).toBe(413);
  for (const body of ['{', '[]', '{}', '{"reconnect:signal":"text"}', '{"reconnect:signal":1.1}', ...['nickname', 'room', 'seat', 'ip', 'userAgent', 'deviceId', 'timestamp', 'stack', 'message'].map(key => JSON.stringify({ 'reconnect:signal': 1, [key]: 1 }))]) {
    expect((await f.post(body)).status).toBe(400);
  }
  expect(f.state.writes).toBe(0);
  expect(validateCounts({ 'error:host:load': 1 })).toBe(true);
});
it('rate limits admission before storage and fails closed', async () => {
  const f = fixture(); f.limit();
  const response = await f.post('{"reconnect:signal":1}');
  expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('60'); expect(f.state.writes).toBe(0);
  const unavailable = fixture();
  unavailable.env.ADMISSION.get = vi.fn(() => { throw new Error('unavailable'); });
  expect((await unavailable.post('{"reconnect:signal":1}')).status).toBe(503);
});
it('read route is opt-in and local only, never mutates storage', async () => {
  const f = fixture();
  const read = (host: string) => worker.fetch(new Request(`http://${host}/counts`, { headers: { Origin: 'http://localhost:5090' } }), f.env);
  expect((await read('localhost')).status).toBe(404);
  f.env.COUNTS_DEV_READ = 'true';
  expect((await read('signal')).status).toBe(404);
  expect(await (await read('localhost')).json()).toEqual({}); expect(f.state.writes).toBe(0);
});

it('uses the real admission budget and caches repeated refusals without storage work', async () => {
  const { Admission } = await import('./core/admission');
  const core = new Admission(() => Date.now());
  const f = fixture(); let calls = 0;
  f.env.ADMISSION.get = (() => ({ fetch: (_url: string, init: RequestInit) => {
    calls++;
    if (typeof init.body !== 'string') throw new Error('Expected counts admission body');
    const body = JSON.parse(init.body) as { key: string; operation: { kind: 'create' } };
    expect(body.key).toMatch(/^[0-9a-f]{64}$/);
    return Promise.resolve(new Response(String(core.run(body.key, body.operation))));
  } })) as unknown as DurableObjectNamespace['get'];
  for (let n = 0; n < 8; n++) expect((await f.post('{"reconnect:signal":1}')).status).toBe(204);
  expect((await f.post('{"reconnect:signal":1}')).status).toBe(429);
  const refusedAt = calls;
  expect((await f.post('{"reconnect:signal":1}')).status).toBe(429);
  expect(calls).toBe(refusedAt); expect(f.state.writes).toBe(8);
});

it('the shared validator never throws for hostile objects and rejects invalid integers', () => {
  expect(validateCounts(new Proxy({}, { ownKeys() { throw new Error('hostile'); } }))).toBe(false);
  for (const kind of COUNT_KINDS) {
    expect(validateCounts({ [kind]: 1 })).toBe(true);
    for (const n of [0, -1, 1.5, NaN, Infinity, 65536, '1', {}, []]) expect(validateCounts({ [kind]: n })).toBe(false);
  }
});

it('DATA-003 gives an IPv6 /48 a shared budget across distinct /64 clients', async () => {
  const { Admission } = await import('./core/admission');
  const core = new Admission(() => 0); const f = fixture();
  f.env.ADMISSION.get = (() => ({ fetch: (_url: string, init: RequestInit) => {
    if (typeof init.body !== 'string') throw new Error('Expected body');
    const body = JSON.parse(init.body) as { key: string; operation: { kind: 'create' } };
    expect(body.key).toMatch(/^[0-9a-f]{64}(:48)?$/);
    return Promise.resolve(new Response(String(core.run(body.key, body.operation))));
  } })) as unknown as DurableObjectNamespace['get'];
  for (let n = 0; n < 64; n++) expect((await f.post('{"reconnect:signal":1}', `2001:db8:1234:${n.toString(16)}::1`)).status).toBe(204);
  expect((await f.post('{"reconnect:signal":1}', '2001:db8:1234:ffff::1')).status).toBe(429);
  expect(f.state.writes).toBe(64);
});
it('DATA-003 applies EDGE_LIMIT to the counts hash before admission or storage', async () => {
  const { clientKey } = await import('./admission-object');
  const f = fixture(); const limit = vi.fn(() => Promise.resolve({ success: false }));
  f.env.EDGE_LIMIT = { limit }; const admission = vi.spyOn(f.env.ADMISSION, 'get');
  vi.spyOn(Date, 'now').mockReturnValue(0);
  try {
    expect((await f.post('{"reconnect:signal":1}')).status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: await clientKey('counts:192.0.2.99', f.env.ADMISSION_SECRET, 0) });
    expect(admission).not.toHaveBeenCalled(); expect(f.state.writes).toBe(0);
    limit.mockRejectedValueOnce(new Error('offline'));
    expect((await f.post('{"reconnect:signal":1}')).status).toBe(503);
  } finally { vi.restoreAllMocks(); }
});
it('DATA-003 refuses 400/413/429/503 without writing to console', async () => {
  const spies = ['log', 'info', 'warn', 'error', 'debug'].map(method => vi.spyOn(console, method as 'log').mockImplementation(() => undefined));
  try {
    const f = fixture();
    expect((await f.post('{')).status).toBe(400);
    expect((await f.post(' '.repeat(513))).status).toBe(413);
    f.limit(); expect((await f.post('{"reconnect:signal":1}')).status).toBe(429);
    const unavailable = fixture(); unavailable.env.ADMISSION_SECRET = '';
    expect((await unavailable.post('{"reconnect:signal":1}')).status).toBe(503);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  } finally { vi.restoreAllMocks(); }
});
