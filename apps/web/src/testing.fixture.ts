import type { Scheduler, Socket } from '@kaki/netcode';
import type { ReconnectStorage } from '@kaki/platform';
export class MemoryStorage implements ReconnectStorage {
  data = new Map<string, string>();
  writes = 0;
  fail = false;
  getItem(key: string): string | null {
    if (this.fail) throw new Error('Denied');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.fail) throw new Error('Quota');
    this.writes++; this.data.set(key, value);
  }
  removeItem(key: string): void {
    if (this.fail) throw new Error('Denied');
    this.data.delete(key);
  }
}
export class Clock implements Scheduler {
  time = 1000;
  serial = 0;
  tasks = new Map<number, { at: number; callback(): void }>();
  now(): number { return this.time; }
  schedule(callback: () => void, delayMs: number): number {
    const id = ++this.serial; this.tasks.set(id, { at: this.time + delayMs, callback }); return id;
  }
  cancel(id: unknown): void { this.tasks.delete(id as number); }
  advance(ms: number): void {
    const end = this.time + ms;
    let count = 0;
    for (;;) {
      const next = [...this.tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end + 1e-8) break;
      if (++count > 100000) throw new Error('Timer loop');
      this.time = next[1].at; this.tasks.delete(next[0]); next[1].callback();
    }
    this.time = end;
  }
}
export const CODE = 'BCDF2345';
export const SECRET = 'a'.repeat(32);
export class SimSocket implements Socket {
  readyState = 0;
  onopen: Socket['onopen'] = null;
  onmessage: Socket['onmessage'] = null;
  onclose: Socket['onclose'] = null;
  onerror: Socket['onerror'] = null;
  constructor(readonly route: (data: string) => void, readonly end: () => void) {}
  send(data: string): void { this.route(data); }
  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3; this.end(); this.onclose?.();
  }
}
export async function settle(clock: Clock): Promise<void> {
  for (let i = 0; i < 80; i++) { clock.advance(0); await Promise.resolve(); }
}
