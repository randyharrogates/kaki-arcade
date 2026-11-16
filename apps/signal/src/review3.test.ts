import { describe, expect, it } from 'vitest';
import { stdout } from 'node:process';
import { Admission, MAX_CLIENTS } from './core/admission';
import { handle, newRoom } from './core/room';
import type { RoomState } from './core/room';
const say = (s: string) => { stdout.write(`${s}\n`); };
const fill = (core: Admission, prefix: string, op: (k: string) => void) => { for (let i = 0; i < MAX_CLIENTS; i++) op(`${prefix}${String(i)}`); };
describe('REVIEW3 eviction', () => {
    it('E1 churn cannot evict an offender (failures > 0, block expired) while zero-failure entries exist', () => {
        let now = 0; const core = new Admission(() => now);
        for (let i = 0; i < 17; i++) core.run('off', { kind: 'fail' });
        now = 120000;
        for (let i = 0; i < 2 * MAX_CLIENTS; i++) { now += 5; core.run(`churn${String(i)}`, { kind: 'guess', id: String(i), room: '' }); }
        say(`E1 offender (17 failures) survives 2,048 churned unresolved guesses over 10 s: ${String(core.snapshot().some(([k]) => k === 'off'))}`);
        expect(core.snapshot().some(([k]) => k === 'off')).toBe(true);
    });
    it('E2 unresolved (expired) provisional leases are forgotten if the entry is evicted before its next access', () => {
        let now = 0; const core = new Admission(() => now); let guesses = 0; let n = 0; let cycles = 0;
        while (now < 3600000) {
            for (let i = 0; i < 17; i++) if (core.run('att', { kind: 'guess', id: String(n++), room: '' }) === 0) guesses++;
            now += 10001;
            fill(core, `c${String(cycles++)}-`, (k) => core.run(k, { kind: 'create' }));
            now += 1;
        }
        say(`E2 guesses/hour by one identity that never lets a miss resolve, churning 1,024 keys per cycle: ${String(guesses)}`);
        expect(guesses).toBeLessThan(200);
    });
    it('E3 a shard of one-failure entries: honest newcomer admitted (overflow) and gets only a normal budget', () => {
        const core = new Admission(() => 120000);
        fill(core, 'one', (k) => core.run(k, { kind: 'fail' }));
        expect(core.run('honest', { kind: 'phone', id: 'h', room: 'R' })).toBe(0);
        let g = 0; while (core.run('x', { kind: 'guess', id: `g${String(g)}`, room: '' }) === 0 && g < 999) g++;
        expect(g).toBeLessThanOrEqual(17);
    });
    it('E4 a shard of depleted entries: newcomer admitted; a depleted creator is not reset by churn', () => {
        const core = new Admission(() => 0);
        fill(core, 'dep', (k) => { for (let i = 0; i < 8; i++) core.run(k, { kind: 'create' }); });
        expect(core.run('honest', { kind: 'create' })).toBe(0);
        expect(core.run('dep5', { kind: 'create' })).toBeGreaterThan(0);
    });
    it('E5 a shard of blocked entries: newcomers go to 64 overflow buckets; cost to drain them all', () => {
        const core = new Admission(() => 0);
        fill(core, 'blk', (k) => { for (let i = 0; i < 17; i++) core.run(k, { kind: 'fail' }); });
        const drained = new Set<number>(); let keys = 0; let failures = 0;
        while (drained.size < 64 && keys < 100000) {
            const k = `d${String(keys++)}`;
            for (let i = 0; i < 17; i++) { core.run(k, { kind: 'fail' }); failures++; }
            let b = 0; for (const ch of k) b = (b * 31 + ch.charCodeAt(0)) >>> 0; drained.add(b % 64);
        }
        say(`E5 to block all 64 overflow buckets of one shard: ${String(keys)} new keys, ${String(failures)} failures (plus 17,408 to block the 1,024 entries)`);
        expect(core.run('honest', { kind: 'phone', id: 'h', room: 'R' })).toBeGreaterThan(0);
    });
    it('E6 university /48: 2,000 users, 300 rooms and 2,400 joins in 10 min, 1% typos', () => {
        let now = 0; const core = new Admission(() => now); let refused = 0; let n = 0;
        for (let t = 0; t < 600; t++) {
            now = t * 1000;
            if (t % 2 === 0) refused += core.run('u:48', { kind: 'create' }) ? 1 : 0;
            for (let j = 0; j < 4; j++) { const id = String(n++); if (core.run('u:48', { kind: 'phone', id, room: String(t) })) refused++; else core.run('u:48', { kind: 'finish', id, failed: n % 100 === 0 }); }
        }
        say(`E6 university /48 refusals: ${String(refused)}`);
        expect(refused).toBe(0);
    });
});
describe('REVIEW3 opening pool', () => {
    const fillPool = (count: number, at: (i: number) => number, key: (i: number) => string, start?: RoomState) => {
        let r = start ?? newRoom('BCDFGHJK', 'h'.repeat(32), 0);
        for (let i = 0; i < count; i++) r = handle(r, { t: 'connect', id: `s${String(i)}`, roomToken: 't', authenticatedHost: false, clientKey: key(i) }, at(i)).state;
        return r;
    };
    it('P2 an honest opening younger than 1.5 s survives any number of other-client newcomers', () => {
        let r = fillPool(15, () => 0, (i) => `a${String(i % 3)}`);
        r = handle(r, { t: 'connect', id: 'honest', roomToken: 't', authenticatedHost: false, clientKey: 'H' }, 1000).state;
        let closed = false;
        for (let i = 0; i < 200; i++) { const o = handle(r, { t: 'connect', id: `x${String(i)}`, roomToken: 't', authenticatedHost: false, clientKey: `z${String(i)}` }, 1000 + i * 2); if (o.closes.includes('honest')) closed = true; r = o.state; }
        expect(closed).toBe(false);
    });
    it('P3 a housemate on the same address can push out a fresh honest opening (same-client rule)', () => {
        let r = fillPool(15, () => 0, () => 'att');
        r = handle(r, { t: 'connect', id: 'honest', roomToken: 't', authenticatedHost: false, clientKey: 'home' }, 1000).state;
        const o = handle(r, { t: 'connect', id: 'mate', roomToken: 't', authenticatedHost: false, clientKey: 'home' }, 1001);
        expect(o.closes).toContain('honest');
        say(`P3 housemate push-out of a 1 ms-old opening: ${String(o.closes.includes('honest'))}`);
    });
});

describe('D-084 eviction eligibility', () => {
    it('evicts quiet-decayed failures with full creation even if the attempt meter is depleted', () => {
        let now = 0;
        const core = new Admission(() => now);
        core.run('quiet', { kind: 'fail' });
        fill(core, 'pending', (key) => core.run(key, { kind: 'guess', id: key, room: '' }));
        now = 60000;
        for (let i = 0; i < 96; i++) core.run('quiet', { kind: 'host' });
        expect(core.run('new', { kind: 'create' })).toBe(0);
        expect(core.snapshot().some(([key]) => key === 'quiet')).toBe(false);
    });
    it('maintains least-recently-seen eligible entries across same-clock accesses', () => {
        const core = new Admission(() => 0);
        fill(core, 'clean', (key) => core.run(key, { kind: 'host' }));
        core.run('clean0', { kind: 'host' });
        core.run('new', { kind: 'host' });
        expect(core.snapshot().some(([key]) => key === 'clean1')).toBe(false);
        for (let i = 0; i < MAX_CLIENTS; i++) core.run(`next${String(i)}`, { kind: 'host' });
        expect(core.snapshot().some(([key]) => key === 'new')).toBe(false);
        expect(core.snapshot().at(-1)?.[0]).toBe(`next${String(MAX_CLIENTS - 1)}`);
    });
    it('gives overflow /48 keys ordinary creation and unresolved-guess budgets', () => {
        const core = new Admission(() => 0);
        fill(core, 'offender', (key) => core.run(key, { kind: 'fail' }));
        for (let i = 0; i < 8; i++) expect(core.run('overflow:48', { kind: 'create' })).toBe(0);
        expect(core.run('overflow:48', { kind: 'create' })).toBe(60);
        for (let i = 0; i < 17; i++) expect(core.run('overflow:48', { kind: 'guess', id: String(i), room: '' })).toBe(0);
        expect(core.run('overflow:48', { kind: 'guess', id: 'excess', room: '' })).toBeGreaterThan(0);
    });
});
