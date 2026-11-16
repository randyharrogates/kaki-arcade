import { checkNameContent, ROOM_CODE_PATTERN, TOKEN_PATTERN } from '@kaki/protocol';
import { keys, natural, object, remove, storageBytes } from './storage';
import type { ReconnectStorage } from './storage';
export const PHONE_STORAGE_KEY = 'kaki.phone-reconnect.v1';
export const PHONE_STORAGE_BYTES = 2048;
export interface PhoneSeat {
  code: string;
  seatToken: string;
  nickname: string;
  /** Signalling admission identity is distinct from the host's seat token. */
  roomToken: string | null;
  droppedAt: number | null;
}
function valid(value: unknown): value is PhoneSeat {
  return object(value) && keys(value,
    ['code', 'seatToken', 'nickname', 'roomToken', 'droppedAt']) &&
    typeof value.code === 'string' && ROOM_CODE_PATTERN.test(value.code) &&
    typeof value.seatToken === 'string' && TOKEN_PATTERN.test(value.seatToken) &&
    typeof value.nickname === 'string' && checkNameContent(value.nickname) === 'ok' &&
    (value.roomToken === null || typeof value.roomToken === 'string' &&
      TOKEN_PATTERN.test(value.roomToken)) &&
    (value.droppedAt === null || natural(value.droppedAt));
}
export function createPhoneSeatStore(storage: ReconnectStorage) {
  let disabled = false;
  function clear(): void { remove(storage, PHONE_STORAGE_KEY); }
  return {
    clear,
    read(): PhoneSeat | null {
      if (disabled) return null;
      try {
        const text = storage.getItem(PHONE_STORAGE_KEY);
        if (text === null) return null;
        if (text.length > PHONE_STORAGE_BYTES || storageBytes(text) > PHONE_STORAGE_BYTES)
          throw new Error('Invalid phone storage');
        const value: unknown = JSON.parse(text);
        if (!object(value) || !keys(value, ['version', 'seat']) || value.version !== 1 ||
          !valid(value.seat)) throw new Error('Invalid phone storage');
        return value.seat;
      } catch { clear(); return null; }
    },
    write(seat: PhoneSeat): boolean {
      if (disabled) return false;
      try {
        if (!valid(seat)) return false;
        const text = JSON.stringify({ version: 1, seat });
        if (storageBytes(text) > PHONE_STORAGE_BYTES) return false;
        storage.setItem(PHONE_STORAGE_KEY, text);
        return true;
      } catch { disabled = true; clear(); return false; }
    },
  };
}
export type PhoneSeatStore = ReturnType<typeof createPhoneSeatStore>;
