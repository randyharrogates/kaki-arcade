import { describe, expect, it } from 'vitest';
import { Admission, MAX_CLIENTS, RETENTION_MS } from './admission';
import { clientKey } from '../admission-object';
function harness() {
    let now = 0;
    const core = new Admission(() => now);
    return { core, set: (value: number) => { now = value; } };
}
describe('C-03 DATA-005 pure admission', () => {
    it('admits eight phones, retries and several rooms first, with bounded pending reservations', () => {
        const h = harness();
        for (let room = 0; room < 4; room++) {
            expect(h.core.run('wifi', { kind: 'create' })).toBe(0);
            for (let i = 0; i < 12; i++) expect(h.core.run('wifi', {
                kind: 'phone', id: `${String(room)}-${String(i)}`, room: String(room),
            })).toBe(0);
            expect(h.core.run('wifi', { kind: 'phone', room: String(room), id: 'excess' })).toBe(10);
            for (let i = 0; i < 12; i++) h.core.run('wifi', { kind: 'finish', id: `${String(room)}-${String(i)}`, failed: false });
        }
        expect(h.core.run('wifi', { kind: 'host' })).toBe(0);
    });
    it('refills creation at one per minute without window-boundary double bursts or clock rollback', () => {
        const h = harness();
        for (let i = 0; i < 8; i++) expect(h.core.run('wifi', { kind: 'create' })).toBe(0);
        expect(h.core.run('wifi', { kind: 'create' })).toBe(60);
        h.set(59999); expect(h.core.run('wifi', { kind: 'create' })).toBe(1);
        h.set(60000); expect(h.core.run('wifi', { kind: 'create' })).toBe(0);
        h.set(0); expect(h.core.run('wifi', { kind: 'create' })).toBe(60);
    });
    it('bounds all connection attempts and probes, including host routes', () => {
        const h = harness();
        for (let i = 0; i < 96; i++) expect(h.core.run('wifi', { kind: 'host' })).toBe(0);
        expect(h.core.run('wifi', { kind: 'probe' })).toBe(1);
        h.set(500); expect(h.core.run('wifi', { kind: 'host' })).toBe(0);
    });
    it('grows back-off to 60s, ignores refusals without moving the deadline, and decays after quiet', () => {
        const h = harness();
        for (let i = 0; i < 16; i++) h.core.run('wifi', { kind: 'fail' });
        expect(h.core.run('wifi', { kind: 'probe' })).toBe(0);
        h.core.run('wifi', { kind: 'fail' });
        expect(h.core.run('wifi', { kind: 'probe' })).toBe(1);
        h.set(1000);
        expect(h.core.run('wifi', { kind: 'probe' })).toBe(0);
        h.core.run('wifi', { kind: 'fail' });
        expect(h.core.run('wifi', { kind: 'probe' })).toBe(2);
        const deadline = h.core.snapshot()[0]?.[1].blockedUntil;
        h.core.run('wifi', { kind: 'probe' });
        expect(h.core.snapshot()[0]?.[1].blockedUntil).toBe(deadline);
        h.set(300000);
        h.core.run('wifi', { kind: 'fail' });
        expect(h.core.snapshot()[0]?.[1].failures).toBeLessThan(20);
        const growth = harness();
        for (let i = 0; i < 16; i++) growth.core.run('x', { kind: 'fail' });
        let at = 0;
        for (const seconds of [1, 2, 4, 8, 16, 32, 60, 60]) {
            growth.core.run('x', { kind: 'fail' });
            expect(growth.core.snapshot()[0]?.[1].blockedUntil).toBe(at + seconds * 1000);
            at += seconds * 1000; growth.set(at);
        }
    });
    it('releases successful reservations, counts failure once, and penalises silent expiry', () => {
        const h = harness();
        for (let i = 0; i < 12; i++) h.core.run('wifi', { kind: 'phone', room: 'room', id: String(i) });
        expect(h.core.run('wifi', { kind: 'phone', room: 'room', id: 'excess' })).toBe(10);
        h.core.run('wifi', { kind: 'finish', id: '0', failed: false });
        expect(h.core.run('wifi', { kind: 'phone', room: 'room', id: 'retry' })).toBe(0);
        h.core.run('wifi', { kind: 'finish', id: '1', failed: true });
        h.core.run('wifi', { kind: 'finish', id: '1', failed: true });
        expect(h.core.snapshot()[0]?.[1].failures).toBe(1);
        h.set(10000); h.core.run('wifi', { kind: 'probe' });
        expect(h.core.snapshot()[0]?.[1].leases).toHaveLength(0);
        expect(h.core.snapshot()[0]?.[1].failures).toBe(12);
    });
    it('survives snapshot restoration and expires counters after ten minutes without activity', () => {
        const h = harness();
        for (let i = 0; i < 8; i++) h.core.run('wifi', { kind: 'create' });
        const restarted = new Admission(() => 1, structuredClone(h.core.snapshot()));
        expect(restarted.run('wifi', { kind: 'create' })).toBe(60);
        h.set(RETENTION_MS); h.core.sweep(); expect(h.core.snapshot()).toEqual([]);
    });
    it('bounds a million depleted creators through normal overflow; expired entries free capacity', () => {
        const h = harness();
        for (let i = 0; i < 1000000; i++) h.core.run(String(i), { kind: 'create' });
        expect(h.core.snapshot()).toHaveLength(MAX_CLIENTS);
        expect(h.core.run('overflow', { kind: 'create' })).toBeGreaterThan(0);
        h.set(RETENTION_MS); h.core.sweep(); expect(h.core.snapshot()).toEqual([]);
        expect(h.core.run('overflow', { kind: 'create' })).toBe(0);
    });
    it('rotates salted keys every ten minutes, consistently across isolates; never encodes the address', async () => {
        const secret = 'test-only-32-character-salt-or-longer';
        const first = await clientKey('192.0.2.1', secret, 0);
        expect(first).toMatch(/^[0-9a-f]{64}$/);
        expect(await clientKey('192.0.2.1', secret, 599999)).toBe(first);
        expect(await clientKey('192.0.2.1', secret, 600000)).not.toBe(first);
        expect(await clientKey('192.0.2.1', secret + 'x', 0)).not.toBe(first);
        expect(await clientKey('192.0.2.2', secret, 0)).not.toBe(first);
    });
});
