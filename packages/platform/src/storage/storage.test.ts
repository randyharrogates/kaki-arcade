import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHostDeviceStore, HOST_DEVICE_RECORD_BYTES } from './host-store';
import { defaultHostDeviceSettings, detailRefreshRate, effectiveDetail, hashHostUserAgent,
  hostDeviceSettingsSchema, needsDetailBenchmark } from './settings';
function fixture() {
  const data = new Map<string, string>();
  const reports: string[] = [];
  const backend = { getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); } };
  const store = createHostDeviceStore({ backend: () => backend, report: p => { reports.push(p); } });
  const open = (game: string) => store.open({ game }, 'settings', hostDeviceSettingsSchema);
  return { data, reports, backend, store, open };
}
it('DATA-002 round trips, isolates games and the platform, and writes only at save points', () => {
  const f = fixture();
  const a = f.open('one');
  const settings = defaultHostDeviceSettings();
  expect(a.read()).toBeNull();
  expect(f.data.size).toBe(0);
  expect(a.savePoint(settings)).toEqual({ saved: true });
  expect(a.read()).toEqual(settings);
  expect(f.open('two').read()).toBeNull();
  expect(f.store.open({ platform: true }, 'settings', hostDeviceSettingsSchema).read()).toBeNull();
  expect(f.open('platform').read()).toBeNull();
});
it('DATA-002 ignores current-shaped future versions and corrupt data once', () => {
  const f = fixture(); const record = f.open('one');
  record.savePoint(defaultHostDeviceSettings());
  const key = [...f.data.keys()][0] ?? '';
  for (const bad of ['{', 'null', JSON.stringify({ schemaVersion: 2, data: defaultHostDeviceSettings() }),
    JSON.stringify({ schemaVersion: 2, data: { detailMode: 'bad', measurement: null } }),
    'x'.repeat(HOST_DEVICE_RECORD_BYTES + 1)]) {
    f.data.set(key, bad); expect(record.read()).toBeNull(); expect(record.read()).toBeNull();
  }
  expect(f.reports).toEqual(['invalid']);
});
it('DATA-002 quota errors preserve old data and unavailable storage never interrupts play', () => {
  const f = fixture(); const record = f.open('one');
  record.savePoint(defaultHostDeviceSettings());
  f.backend.setItem = () => { throw new Error('QuotaExceededError'); };
  expect(record.savePoint({ detailMode: 'full', measurement: null }))
    .toEqual({ saved: false, reason: 'unavailable' });
  expect(record.read()).toEqual(defaultHostDeviceSettings());
  const blocked = createHostDeviceStore({ backend: () => { throw new Error('SecurityError'); } })
    .open({ platform: true }, 'settings', hostDeviceSettingsSchema);
  expect(blocked.read()).toBeNull();
  expect(blocked.savePoint(defaultHostDeviceSettings()).saved).toBe(false);
});
it('DATA-002 validates writes and bounds small records', () => {
  const f = fixture();
  const text = f.store.open({ game: 'one' }, 'text', { version: 1,
    validate: (v): v is string => typeof v === 'string' });
  expect(text.savePoint('x'.repeat(HOST_DEVICE_RECORD_BYTES))).toEqual({ saved: false, reason: 'too-large' });
  expect(f.open('one').savePoint({ detailMode: 'full', measurement: {
    mode: 'full', screen: display, refreshRate: -1, userAgentHash: 'bad' } })).toEqual({ saved: false, reason: 'invalid' });
  expect(f.data.size).toBe(0);
});
it('DATA-002 import graph excludes protocol, netcode and transport; protocol excludes storage', () => {
  const visited = new Set<string>();
  function walk(file: string): void {
    if (visited.has(file)) return;
    visited.add(file);
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)) {
      const specifier = match[1] ?? '';
      expect(specifier).not.toMatch(/protocol|netcode|transport/);
      if (specifier.startsWith('.')) walk(resolve(dirname(file), `${specifier}.ts`));
    }
  }
  for (const file of readdirSync(dirname(fileURLToPath(import.meta.url))))
    if (file.endsWith('.ts') && !file.endsWith('.test.ts')) walk(resolve(dirname(fileURLToPath(import.meta.url)), file));
  function protocol(dir: string): void {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, file.name);
      if (file.isDirectory()) protocol(path);
      else if (file.name.endsWith('.ts')) {
        const text = readFileSync(path, 'utf8');
        for (const match of text.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g))
          expect(match[1]).not.toMatch(/storage|@kaki\/platform/);
      }
    }
  }
  protocol(fileURLToPath(new URL('../../../protocol/src', import.meta.url)));
});
const display = { width: 1920, height: 1080, devicePixelRatio: 1 };
it('PERF-002 auto defaults, remembers UA/screen/refresh, invalidates changed UA and honours override', () => {
  const settings = defaultHostDeviceSettings();
  expect(needsDetailBenchmark(settings, 'TV', display, 1000 / 60)).toBe(true);
  settings.measurement = { mode: 'lower', screen: display, refreshRate: detailRefreshRate(1000 / 60), userAgentHash: hashHostUserAgent('TV') };
  const f = fixture(); const record = f.open('one'); record.savePoint(settings);
  expect(record.read()).toEqual(settings);
  expect(needsDetailBenchmark(settings, 'TV', display, 1000 / 60)).toBe(false);
  expect(needsDetailBenchmark(settings, 'other TV', display, 1000 / 60)).toBe(true);
  expect(effectiveDetail(settings, 'TV', display, 1000 / 60)).toBe('lower');
  expect(effectiveDetail(settings, 'other TV', display, 1000 / 60)).toBe('full');
  settings.detailMode = 'full';
  expect(needsDetailBenchmark(settings, 'other TV', display, 1000 / 60)).toBe(false);
  expect(effectiveDetail(settings, 'other TV', display, 1000 / 60)).toBe('full');
});

it('PERF-002 screen size, DPR and refreshed cadence invalidate cached verdicts', () => {
  const settings = { detailMode: 'auto' as const, measurement: { mode: 'lower' as const,
    screen: display, refreshRate: 60, userAgentHash: hashHostUserAgent('TV') } };
  for (const screen of [{ ...display, width: 3840 }, { ...display, height: 2160 }, { ...display, devicePixelRatio: 2 }])
    expect(needsDetailBenchmark(settings, 'TV', screen, 1000 / 60)).toBe(true);
  expect(needsDetailBenchmark(settings, 'TV', display, 1000 / 120)).toBe(true);
  expect(hostDeviceSettingsSchema.version).toBe(1);
  expect('migrate' in hostDeviceSettingsSchema).toBe(false);
});
it('DATA-002 protects future records on save', () => {
  const f = fixture(); const record = f.open('one'); record.savePoint(defaultHostDeviceSettings());
  const key = [...f.data.keys()][0] ?? '';
  const future = JSON.stringify({ schemaVersion: 2, data: defaultHostDeviceSettings() });
  f.data.set(key, future);
  expect(record.read()).toBeNull();
  expect(record.savePoint(defaultHostDeviceSettings())).toEqual({ saved: false, reason: 'newer-version' });
  expect(f.data.get(key)).toBe(future);
});
it('DATA-002 safeJson rejects prototype keys and non-finite payloads even with permissive codec', () => {
  const f = fixture(); const record = f.store.open({ platform: true }, 'raw', {
    version: 1, validate: (v): v is unknown => v !== undefined });
  for (const payload of [JSON.parse('{"__proto__":1}'), { number: Infinity }])
    expect(record.savePoint(payload)).toEqual({ saved: false, reason: 'invalid' });
  for (const data of ['{"__proto__":1}', '{"number":1e999}']) {
    f.data.set('kaki.host-device.platform.raw', `{"schemaVersion":1,"data":${data}}`);
    expect(record.read()).toBeNull();
  }
});
it('DATA-002 generic migration remains read-only and schema cap can exceed default', () => {
  const f = fixture(); const record = f.store.open({ platform: true }, 'text', { version: 2,
    maxBytes: HOST_DEVICE_RECORD_BYTES * 2, validate: (v): v is string => typeof v === 'string',
    migrate: (version, data) => version === 1 ? String(data) : null });
  const key = 'kaki.host-device.platform.text';
  const old = JSON.stringify({ schemaVersion: 1, data: 42 }); f.data.set(key, old);
  expect(record.read()).toBe('42'); expect(f.data.get(key)).toBe(old);
  const text = 'x'.repeat(HOST_DEVICE_RECORD_BYTES);
  expect(record.savePoint(text)).toEqual({ saved: true }); expect(record.read()).toBe(text);
});

it('DATA-002 future versions never reach even a permissive migration', () => {
  const f = fixture();
  let migrations = 0;
  const record = f.store.open({ platform: true }, 'future', { version: 1,
    validate: (v): v is string => typeof v === 'string',
    migrate: () => { migrations++; return 'accepted'; } });
  f.data.set('kaki.host-device.platform.future', JSON.stringify({ schemaVersion: 2, data: 'future' }));
  expect(record.read()).toBeNull();
  expect(migrations).toBe(0);
});
