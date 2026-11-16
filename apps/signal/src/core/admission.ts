// DATA-005. Pure, bounded counter shard; all times and opaque keys come from its caller.
export const RETENTION_MS = 600000;
export const ROTATION_MS = 600000;
export const MAX_CLIENTS = 1024;
export const PENDING_PER_ROOM = 12;
export const PENDING_TOTAL = 17;
export interface Lease { id: string; room: string; until: number }
interface Meter { tokens: number; at: number }
export interface ClientCounter {
    expires: number;
    probes?: number[];
    create: Meter;
    attempt: Meter;
    failures: number;
    lastFailure: number;
    blockedUntil: number;
    leases: Lease[];
}
export type AdmissionOperation =
    | { kind: 'create' | 'host' | 'probe' | 'fail' }
    | { kind: 'phone' | 'guess'; id: string; room: string }
    | { kind: 'finish'; id: string; failed: boolean };
export type Snapshot = [string, ClientCounter][];
function take(meter: Meter, now: number, capacity: number, perSecond: number): number {
    meter.tokens = Math.min(capacity, meter.tokens + Math.max(0, now - meter.at) * perSecond / 1000);
    meter.at = Math.max(now, meter.at);
    if (meter.tokens < 1) return Math.ceil((1 - meter.tokens) / perSecond);
    meter.tokens--;
    return 0;
}
function fail(counter: ClientCounter, now: number, generous = false): void {
    counter.failures = Math.max(0, counter.failures - Math.floor(Math.max(0, now - counter.lastFailure) / 60000));
    counter.failures = Math.min(generous ? 256 : 32, counter.failures + 1);
    counter.lastFailure = now;
    // Only confirmed failures change back-off; never extend a live deadline.
    if (now >= counter.blockedUntil && counter.failures > (generous ? 128 : 16))
        counter.blockedUntil = now + Math.min(60, 2 ** Math.min(6, counter.failures - (generous ? 129 : 17))) * 1000;
}
// Settle abandoned requests wherever they are noticed, including during eviction scans.
function settle(counter: ClientCounter, now: number, generous: boolean): asserts counter is ClientCounter & { probes: number[] } {
    counter.probes = (counter.probes ?? []).filter((until) => until > now);
    const expired = counter.leases.filter((lease) => lease.until <= now);
    counter.leases = counter.leases.filter((lease) => lease.until > now);
    expired.forEach(() => { fail(counter, now, generous); });
}
function evictable(counter: ClientCounter, now: number, aggregate: boolean): boolean {
    settle(counter, now, aggregate);
    const failures = Math.max(0, counter.failures - Math.floor(Math.max(0, now - counter.lastFailure) / 60000));
    return failures === 0 && !counter.leases.length && !counter.probes.length && counter.blockedUntil <= now &&
        counter.create.tokens + Math.max(0, now - counter.create.at) * (aggregate ? 1 : 1 / 60) / 1000 >= (aggregate ? 64 : 8);
}
export class Admission {
    private readonly overflow = new Map<number, ClientCounter>();
    private fullAt = -Infinity;
    private readonly full = new Set<string>();
    private readonly clients: Map<string, ClientCounter>;
    constructor(private readonly clock: () => number, saved: Snapshot = []) {
        this.clients = new Map(saved);
    }
    sweep(): void {
        const now = this.clock();
        for (const [key, value] of this.overflow) if (value.expires <= now) this.overflow.delete(key);
        // Expiry order is maintained on access; never evict a live offender to make space.
        for (const [key, value] of this.clients) {
            if (value.expires > now) break;
            this.clients.delete(key);
        }
    }
    snapshot(): Snapshot { return [...this.clients]; }
    run(key: string, operation: AdmissionOperation): number {
        this.sweep();
        const now = this.clock();
        let c = this.clients.get(key);
        if (!c && operation.kind === 'finish') {
            c = [...this.overflow.values()].find((value) => value.leases.some((lease) => lease.id === operation.id));
            if (!c) return 0;
        }
        if (!c) {
            if (this.clients.size >= MAX_CLIENTS) {
                if (this.fullAt !== now) {
                    this.full.clear();
                    for (const [name, value] of this.clients) {
                        const aggregate = name.endsWith(':48');
                        if (evictable(value, now, aggregate)) this.full.add(name);
                    }
                    this.fullAt = now;
                }
                const fullKey = this.full.values().next().value;
                let candidate: [string, ClientCounter] | undefined;
                if (fullKey !== undefined) {
                    const value = this.clients.get(fullKey);
                    this.full.delete(fullKey);
                    if (value) candidate = [fullKey, value];
                }
                if (candidate) this.clients.delete(candidate[0]);
            }
            // Stable key-bit buckets also support arbitrary opaque keys in pure-core tests.
            let bits = 0;
            for (const char of key) bits = (bits * 31 + char.charCodeAt(0)) >>> 0;
            const bucket = bits % 64;
            if (this.clients.size >= MAX_CLIENTS) c = this.overflow.get(bucket);
            const aggregate = this.clients.size < MAX_CLIENTS && key.endsWith(':48');
            c ??= { expires: now + RETENTION_MS, create: { tokens: aggregate ? 64 : 8, at: now },
                attempt: { tokens: aggregate ? 1536 : 96, at: now }, failures: 0, lastFailure: now,
                blockedUntil: 0, leases: [] };
            if (this.clients.size < MAX_CLIENTS) this.clients.set(key, c);
            else this.overflow.set(bucket, c);
        }
        const generous = this.clients.has(key) && key.endsWith(':48');
        const aggregate = generous;
        const failureBudget = generous ? 128 : 16;
        this.full.delete(key);
        c.expires = now + RETENTION_MS;
        if (this.clients.has(key)) { this.clients.delete(key); this.clients.set(key, c); }
        settle(c, now, generous);
        try {
            if (operation.kind === 'finish') {
                const lease = c.leases.find((lease) => lease.id === operation.id);
                if (lease) {
                    c.leases = c.leases.filter((entry) => entry !== lease);
                    if (operation.failed) fail(c, now, generous);
                }
                return Math.min(60, Math.max(0, Math.ceil((c.blockedUntil - now) / 1000)));
            }
            if (operation.kind === 'fail') {
                c.probes.shift();
                fail(c, now, generous);
                return Math.min(60, Math.max(0, Math.ceil((c.blockedUntil - now) / 1000)));
            }
            if (operation.kind === 'create') return Math.min(600, take(c.create, now, aggregate ? 64 : 8, aggregate ? 1 : 1 / 60));
            const pacing = take(c.attempt, now, generous ? 1536 : 96, generous ? 32 : 2);
            const wait = Math.max(pacing, Math.ceil((c.blockedUntil - now) / 1000));
            if (wait > 0) return Math.min(60, wait);
            if (operation.kind === 'phone' || operation.kind === 'guess') {
                const roomLeases = c.leases.filter((lease) => lease.room === operation.room);
                if (!generous && operation.kind === 'phone' && roomLeases.length >= PENDING_PER_ROOM) {
                    return Math.min(60, Math.max(1, Math.ceil((Math.min(...c.leases.map((lease) => lease.until)) - now) / 1000)));
                }
                // Provisional charges reserve the failure budget before a room lookup.
                // After confirmed abuse, only one unresolved guess can test an expired block.
                const available = Math.max(1, (generous ? failureBudget + 1 : PENDING_TOTAL) - c.failures);
                if (c.leases.length + c.probes.length >= available) return 1;
                c.leases.push({ id: operation.id, room: operation.room, until: now + 10000 });
            }
            if (operation.kind === 'probe') {
                // Short provisional charges bound parallel unresolved guesses. Confirmed failures
                // remain until quiet decay; refused requests never increase them.
                const allowance = Math.max(1, failureBudget + 1 - c.failures);
                if (c.probes.length >= allowance) return 1;
                c.probes.push(now + 500);
            }
            return 0;
        } finally {
            // Access moves a clean candidate to the LRU tail, even at the same clock tick.
            if (this.fullAt === now && this.clients.has(key) && evictable(c, now, aggregate)) this.full.add(key);
        }
    }
}
