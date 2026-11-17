/** Host-only persistence. Never pass records to publicView, privateView or transport.
 * The host shell supplies localStorage lazily; access can throw in blocked/private mode. */
import { keys, natural, object, safeJson, storageBytes } from '../reconnect/storage';

export interface HostDeviceBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface HostDeviceRecord<T> { schemaVersion: number; data: T }
/** Game-owned codecs keep game rules out of the platform. Migration must be pure. */
export interface HostRecordSchema<T> {
  version: number;
  /** Maximum encoded record bytes; defaults to 16 KiB. */
  maxBytes?: number;
  validate(value: unknown): value is T;
  migrate?(version: number, data: unknown): unknown;
}
export type SaveResult = { saved: true } | { saved: false; reason: 'invalid' | 'too-large' | 'unavailable' | 'newer-version' };
export type StoreProblem = 'invalid' | 'unavailable';
/** A size guard for small checkpoints, not a performance budget. */
export const HOST_DEVICE_RECORD_BYTES = 16384;
export type HostNamespace = { platform: true } | { game: string };

export function createHostDeviceStore(options: {
  backend(): HostDeviceBackend;
  /** Local status only: no payload, nickname or device identifier. Called once per key/reason. */
  report?(problem: StoreProblem): void;
}) {
  const reported = new Set<string>();
  function report(key: string, problem: StoreProblem): void {
    if (reported.has(`${key}:${problem}`)) return;
    reported.add(`${key}:${problem}`);
    try { options.report?.(problem); } catch { /* Reporting must never interrupt play. */ }
  }
  return {
    open<T>(namespace: HostNamespace, name: string, schema: HostRecordSchema<T>) {
      const id = 'game' in namespace ? namespace.game : 'platform';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
        || !natural(schema.version) || schema.version < 1)
        throw new Error('Invalid host store configuration');
      const maxBytes = schema.maxBytes ?? HOST_DEVICE_RECORD_BYTES;
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('Invalid record cap');
      const key = `kaki.host-device.${'game' in namespace ? `game.${id}` : 'platform'}.${name}`;
      return {
        read(): T | null {
          let text: string | null;
          try { text = options.backend().getItem(key); }
          catch { report(key, 'unavailable'); return null; }
          if (text === null) return null;
          try {
            if (storageBytes(text) > maxBytes) throw new Error('oversize');
            const record: unknown = JSON.parse(text);
            if (!safeJson(record) || !object(record) || !keys(record, ['schemaVersion', 'data'])
              || !natural(record.schemaVersion) || record.schemaVersion < 1
              || record.schemaVersion > schema.version) throw new Error('version');
            const data: unknown = record.schemaVersion === schema.version ? record.data
              : schema.migrate?.(record.schemaVersion, record.data);
            if (!safeJson(data) || !schema.validate(data)) throw new Error('data');
            // Migration stays in memory until the next explicit save point.
            return data;
          } catch { report(key, 'invalid'); return null; }
        },
        /** Call only between rounds/results or on an idle settings change, never from
         * SessionFrames, step or render. No timer, subscription or automatic write exists. */
        savePoint(data: T): SaveResult {
          let text: string;
          try {
            if (!safeJson(data) || !schema.validate(data)) return { saved: false, reason: 'invalid' };
            text = JSON.stringify({ schemaVersion: schema.version, data });
            if (storageBytes(text) > maxBytes) return { saved: false, reason: 'too-large' };
          } catch { return { saved: false, reason: 'invalid' }; }
          try {
            const backend = options.backend();
            const existing = backend.getItem(key);
            if (existing !== null) {
              let record: unknown;
              try { record = JSON.parse(existing); } catch { /* Corrupt records may be replaced. */ }
              if (object(record) && natural(record.schemaVersion) && record.schemaVersion > schema.version)
                return { saved: false, reason: 'newer-version' };
            }
            backend.setItem(key, text); return { saved: true };
          }
          catch { report(key, 'unavailable'); return { saved: false, reason: 'unavailable' }; }
        },
      };
    },
  };
}
