import { describe, expect, it } from 'vitest';
import { stdout } from 'node:process';
import { clientNetworks } from './core/address';
import { Admission, MAX_CLIENTS } from './core/admission';
import { handle, newRoom } from './core/room';
const say = (s: string) => { stdout.write(`${s}\n`); };
describe('REVIEW2 address parser', () => {
    it.each([
        ['2001:db8:0:1:0:0:0:1', '2001:DB8:0:1::1'], ['::ffff:192.0.2.1', '192.0.2.1'], ['::ffff:c000:0201', '192.0.2.1'],
        ['2001:db8:0:1:ffff::', '2001:db8:0:1:1::'], ['2001:db8::1%eth0', '2001:db8::2'],
    ])('same network: %s ~ %s', (a, b) => { expect(clientNetworks(a)?.[0]).toBe(clientNetworks(b)?.[0]); });
    it.each([' 192.0.2.1', '192.0.2.1 ', '192.0.2.1,198.51.100.1', '[2001:db8::1]', '[2001:db8::1]:443', '192.0.2.1:80',
        '010.0.0.1', '0x7f.0.0.1', '127.1', '1.2.3.4.5', 'a'.repeat(100000), '2001:db8::1,2001:db8::2', '2001:db8::1 '])('refuses %s', (s) => {
        expect(clientNetworks(s)).toBeNull();
    });
    it('reports what tunnelled forms map to', () => {
        for (const s of ['::192.0.2.1', '2002:c000:0201::1', '2002:c000:0201:ffff::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '2001:0:4136:e378:8000:63bf:1111:2222', '64:ff9b::192.0.2.1', 'fe80::1%25en0', 'FE80::1%ETH0'])
            say(`ADDR ${s} -> ${JSON.stringify(clientNetworks(s))}`);
    });
});
describe('REVIEW2 limiter', () => {
    it('G1 real guess path (provisional leases): failed guesses per hour from one client, concurrent bursts', () => {
        let now = 0; const core = new Admission(() => now); let guesses = 0; let n = 0;
        while (now < 3600000) {
            const ids: string[] = [];
            for (;;) { const id = String(n++); if (core.run('a', { kind: 'guess', id, room: '' })) break; ids.push(id); }
            for (const id of ids) core.run('a', { kind: 'finish', id, failed: true });
            guesses += ids.length;
            now = Math.max(now + 1000, core.snapshot()[0]?.[1].blockedUntil ?? 0);
        }
        say(`G1 guess-path failed guesses/hour/client: ${String(guesses)}`);
        expect(guesses).toBeLessThan(200);
    });
    it('G2 overflow can be drained: shard full of offenders, attacker exhausts overflow, a new honest client is refused', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < MAX_CLIENTS; i++) core.run(`bad${String(i)}`, { kind: 'fail' });
        let n = 0;
        for (let i = 0; i < 129; i++) { const id = `x${String(n++)}`; core.run(`att${String(i)}`, { kind: 'guess', id, room: '' }); core.run(`att${String(i)}`, { kind: 'finish', id, failed: true }); }
        const honestJoin = core.run('honest', { kind: 'phone', id: 'h', room: 'ROOMROOM' });
        let creates = 0; while (core.run(`c${String(creates)}`, { kind: 'create' }) === 0 && creates < 1000) creates++;
        const honestCreate = core.run('honest2', { kind: 'create' });
        say(`G2 after 129 overflow failures: honest join retry=${String(honestJoin)}; overflow creates before refusal=${String(creates)}; honest create retry=${String(honestCreate)}`);
        expect(honestJoin).toBe(0);
        expect(honestCreate).toBe(0);
    });
    it('G3 overflow gives a newcomer a larger budget than a normal client (17 vs 129 parallel guesses)', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < MAX_CLIENTS; i++) core.run(`bad${String(i)}`, { kind: 'fail' });
        let admitted = 0; while (core.run('att', { kind: 'guess', id: String(admitted), room: '' }) === 0 && admitted < 5000) admitted++;
        say(`G3 parallel unresolved guesses for one client on the overflow path: ${String(admitted)}`);
        expect(admitted).toBeLessThanOrEqual(17);
    });
    it('G4 a depleted but failure-free entry is "clean", so churn evicts it and its create bucket refills at once', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < 8; i++) core.run('me', { kind: 'create' });
        expect(core.run('me', { kind: 'create' })).toBeGreaterThan(0);
        for (let i = 0; i < MAX_CLIENTS; i++) core.run(`churn${String(i)}`, { kind: 'create' });
        const again = core.run('me', { kind: 'create' });
        say(`G4 create retry after churn eviction: ${String(again)}`);
        expect(again).toBeGreaterThan(0);
    });
    it('G5 offenders are never evicted by churn of clean entries', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < 17; i++) core.run('off', { kind: 'fail' });
        for (let i = 0; i < 5 * MAX_CLIENTS; i++) core.run(`churn${String(i)}`, { kind: 'create' });
        expect(core.snapshot().some(([k]) => k === 'off')).toBe(true);
    });
    it('G6 provisional charge: no double refund, no refund without charge; a dropped request becomes one failure after 10 s', () => {
        let now = 0; const core = new Admission(() => now);
        core.run('a', { kind: 'finish', id: 'never', failed: false });
        core.run('a', { kind: 'guess', id: 'g', room: '' });
        core.run('a', { kind: 'finish', id: 'g', failed: true }); core.run('a', { kind: 'finish', id: 'g', failed: true });
        expect(core.snapshot()[0]?.[1].failures).toBe(1);
        core.run('a', { kind: 'guess', id: 'dropped', room: '' }); now = 10000; core.run('a', { kind: 'probe' });
        expect(core.snapshot()[0]?.[1].failures).toBe(2);
    });
});
describe('REVIEW2 opening pool', () => {
    it('P1 sixteen newcomers push out an honest phone before its join lands; the pushers are not penalised', () => {
        let r = newRoom('BCDFGHJK', 'h'.repeat(32), 0);
        r = handle(r, { t: 'connect', id: 'honest', roomToken: 't0', authenticatedHost: false }, 0).state;
        let closedHonest = false;
        for (let i = 0; i < 16; i++) {
            const out = handle(r, { t: 'connect', id: `att${String(i)}`, roomToken: `t${String(i + 1)}`, authenticatedHost: false }, 5 + i * 5);
            if (out.closes.includes('honest')) closedHonest = true;
            r = out.state;
        }
        say(`P1 honest opening pushed out within 85 ms by 16 attacker upgrades: ${String(closedHonest)}`);
        expect(closedHonest).toBe(false);
    });
});

describe('D-083 explicit bounds', () => {
    it('splits blocked-only overflow and never expands its normal guess budget', () => {
        const core = new Admission(() => 0);
        for (let i = 0; i < MAX_CLIENTS; i++) for (let n = 0; n < 17; n++) core.run(`blocked${String(i)}`, { kind: 'fail' });
        for (let i = 0; i < 17; i++) expect(core.run('overflow-a', { kind: 'guess', id: String(i), room: '' })).toBe(0);
        expect(core.run('overflow-a', { kind: 'guess', id: 'excess', room: '' })).toBeGreaterThan(0);
        expect(core.run('overflow-b', { kind: 'guess', id: 'other', room: '' })).toBe(0);
        expect(core.snapshot()).toHaveLength(MAX_CLIENTS);
    });
    it('meters /48 creation at 64 then one a second', () => {
        let now = 0; const core = new Admission(() => now);
        for (let i = 0; i < 64; i++) expect(core.run('family:48', { kind: 'create' })).toBe(0);
        expect(core.run('family:48', { kind: 'create' })).toBe(1);
        now = 1000;
        expect(core.run('family:48', { kind: 'create' })).toBe(0);
        expect(core.run('family:48', { kind: 'create' })).toBe(1);
    });
});


describe('D-083 opening ownership', () => {
    it('permits immediate same-client replacement but refuses a different fresh newcomer', () => {
        let room = newRoom('BCDFGHJK', 'h'.repeat(32), 0);
        for (let i = 0; i < 16; i++) room = handle(room, { t: 'connect', id: String(i), roomToken: 't', authenticatedHost: false, clientKey: String(i) }, 0).state;
        const refused = handle(room, { t: 'connect', id: 'other', roomToken: 't', authenticatedHost: false, clientKey: 'different' }, 100);
        expect(refused.closes).toEqual(['other']);
        expect(refused.state.sockets).toHaveLength(16);
        const replaced = handle(room, { t: 'connect', id: 'same', roomToken: 't', authenticatedHost: false, clientKey: '0' }, 100);
        expect(replaced.closes).toEqual(['0']);
        expect(replaced.state.sockets.some((socket) => socket.id === 'same')).toBe(true);
    });
});
