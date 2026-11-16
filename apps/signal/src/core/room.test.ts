import { describe, expect, it, vi } from 'vitest';
import { decodeToHostSignal, decodeToPhoneSignal, MAX_PLAYERS } from '@kaki/protocol';
import { handle, newRoom, IDLE_MS, ABSOLUTE_MS, equalSecret } from './room';
import type { Event, RoomState } from './room';
import { generateCode, randomText, safeCode, CODE_ALPHABET } from './codes';
import { consume } from './bucket';
import { allowedOrigin } from './http';
const code = 'BCDF2345';
const token = 'abcdefghijklmnopqrstuvwxyz012345';
const message = (id: string, data: object): Event => ({ t: 'message', id, data: JSON.stringify({ v: 1,
        ...data }) });
function harness(roomCode = code) {
    let state = newRoom(roomCode, token, 0);
    const run = (event: Event, now = 1) => {
        const out = handle(state, event, now);
        state = out.state;
        return out;
    };
    const connect = (id: string, role: 'host' | 'phone' = 'phone') => {
        const connected = run({ t: 'connect', id, roomToken: token, authenticatedHost: role === 'host' });
        if (role === 'host')
            return connected;
        const opening = { t: 'join', code: roomCode, roomToken: null };
        return run(message(id, opening));
    };
    return { run, connect, state: () => state };
}
describe('C-01', () => {
    it('DATA-005 compares every character for equal-length secrets despite early mismatches', () => {
        const read = vi.spyOn(String.prototype, 'charCodeAt');
        try {
            for (const candidate of ['A' + token.slice(1), token.slice(0, -1) + 'A', token]) {
                read.mockClear();
                const matched = equalSecret(candidate, token);
                const calls = read.mock.calls.length;
                expect(calls).toBe(token.length * 2);
                expect(matched).toBe(candidate === token);
            }
        }
        finally { read.mockRestore(); }
    });
    it('PLAT-001 DATA-005 generates safe unambiguous codes and rejects biased bytes', () => {
        let seed = 123;
        const random = (n: number) => Uint8Array.from({ length: n }, () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed >>> 24;
        });
        for (let i = 0; i < 1000; i++) {
            const value = generateCode(random);
            expect(value).toHaveLength(8);
            expect(safeCode(value)).toBe(true);
            expect(Array.from(value).every((c) => CODE_ALPHABET.includes(c))).toBe(true);
        }
        let calls = 0;
        expect(randomText('ABC', 1, () => new Uint8Array([calls++ === 0 ? 255 : 2]))).toBe('C');
        expect(safeCode('X5H7XYZ2')).toBe(false);
        expect(safeCode('BCDF2345')).toBe(true);
    });
    it.each([
        'FVCK', 'FCK', 'FK', 'CNT', 'CVNT', 'DCK', 'DVCK', 'PSSY', 'NGGR',
        'WNK', 'WNKR', 'KNN', 'CB', 'CCB', 'LJ', 'SHT', 'BTCH', 'SLT', 'FKN', 'XXX',
        'F46', 'F49', '5H7', '69',
    ])('DATA-005 screens rude substring %s', (word) => {
        expect(safeCode(`2${word}Z`)).toBe(false);
    });
    it('M5 keeps the host alive until twelve hours and idles from the last socket close', () => {
        expect(IDLE_MS).toBe(600000);
        expect(ABSOLUTE_MS).toBe(43200000);
        const h = harness();
        const first = h.connect('host', 'host');
        expect(first.sends[0]?.message).toMatchObject({ t: 'created', reopened: false });
        expect(h.run({ t: 'alarm' }, IDLE_MS * 2).state.expired).toBe(false);
        const last = IDLE_MS * 3;
        expect(h.run({ t: 'disconnect', id: 'host' }, last).alarmAt).toBe(last + IDLE_MS);
        expect(h.run({ t: 'alarm' }, last + IDLE_MS - 1).state.expired).toBe(false);
        expect(h.run({ t: 'alarm' }, last + IDLE_MS).state.expired).toBe(true);
    });
    it('PLAT-009 authenticates replacement and reports absence/replays peers', () => {
        const h = harness();
        h.connect('h', 'host');
        h.connect('p');
        h.run({ t: 'connect', id: 'bad', roomToken: token, authenticatedHost: false });
        expect(h.run(message('bad', { t: 'reopen', code, hostToken: 'wrongwrongwrongwrong' })).closes)
            .toContain('bad');
        expect(h.connect('h2', 'host').closes).toContain('h');
        expect(h.run({ t: 'disconnect', id: 'h' }).sends).toEqual([]);
        expect(h.run({ t: 'disconnect', id: 'h2' }).sends).toContainEqual({ id: 'p', message: { v: 1, t:
          'host', present: false } });
        expect(h.connect('h3', 'host').sends).toContainEqual({ id: 'h3', message: { v: 1, t:
          'peer-joined', peer: 'p' } });
    });
    it.each(['create', 'reopen', 'unknown'])(
        'NET-002 refuses invalid opening %s with bad-message and closes it', (t) => {
            const h = harness();
            h.run({ t: 'connect', id: 'invalid', roomToken: token, authenticatedHost: false });
            const result = h.run(message('invalid', { t, code, hostToken: token }));
            expect(result.sends).toContainEqual({ id: 'invalid', message: {
                v: 1, t: 'error', code: 'bad-message', retryAfterS: null,
            } });
            expect(result.closes).toContain('invalid');
            expect(result.state.sockets).toEqual([]);
        },
    );
    it('NET-002 forwards only role-correct signalling to the named peer', () => {
        const h = harness();
        h.connect('h', 'host');
        h.connect('p');
        h.connect('q');
        expect(h.run(message('h', { t: 'to-phone', peer: 'p', step: { kind: 'offer', sdp: 'fake' } }))
            .sends).toEqual([{ id: 'p', message: { v: 1, t: 'from-host', step: { kind: 'offer', sdp:
              'fake' } } }]);
        expect(h.run(message('p', { t: 'to-host', step: { kind: 'answer', sdp: 'fake' } })).sends[0]?.id)
            .toBe('h');
        for (const data of [{ t: 'action' }, { t: 'to-phone', peer: 'q', step: { kind: 'offer', sdp:
          'x' } }, { t: 'close-room' }]) {
            expect(h.run(message('p', data)).sends[0]?.message.t).toBe('error');
        }
        expect(h.run({ t: 'message', id: 'p', data: new ArrayBuffer(2) }).sends[0]?.message.t).toBe('error');
        expect(h.run({ t: 'message', id: 'p', data: 'x'.repeat(16385) }).sends[0]?.message.t).toBe('error');
    });
    it('NET-002 DATA-005 rejects a different room and honours host drop/close', () => {
        const h = harness();
        h.connect('h', 'host');
        h.connect('p');
        h.run({ t: 'connect', id: 'wrong', roomToken: token, authenticatedHost: false });
        expect(h.run(message('wrong', { t: 'join', code: 'ZZZZ2345', roomToken: null })).closes)
            .toContain('wrong');
        expect(h.run(message('h', { t: 'to-phone', peer: 'foreign', step: { kind: 'offer', sdp: 'x' } }))
            .sends[0]?.message).toMatchObject({ t: 'error', code: 'peer-not-found' });
        expect(h.run(message('h', { t: 'drop', peer: 'p', reason: 'room-full' })).closes).toContain('p');
        h.connect('q');
        const closed = h.run(message('h', { t: 'close-room' }));
        expect(closed.state.expired).toBe(true);
        expect(closed.closes).toEqual(['h', 'q']);
    });
    it('DATA-005 bounds phones, buckets and origins', () => {
        const h = harness();
        for (let i = 0; i < MAX_PLAYERS; i++)
            h.connect(`p${String(i)}`);
        expect(h.connect('extra').closes).toContain('extra');
        expect(h.run(message('p0', { t: 'to-host', step: { kind: 'answer', sdp: 'x' } }))
            .sends[0]?.message).toMatchObject({ code: 'host-absent' });
        expect(consume({ tokens: 0, at: 0 }, 0).allowed).toBe(false);
        expect(consume({ tokens: 0, at: 0 }, 1000).allowed).toBe(true);
        expect(allowedOrigin(null, 'https://example.test')).toBe(false);
        expect(allowedOrigin('https://example.test.evil', 'https://example.test')).toBe(false);
        expect(allowedOrigin('https://example.test', 'https://example.test')).toBe(true);
        for (let i = 0; i < 65; i++)
            h.run(message('p0', { t: 'ping' }));
        expect(h.state().sockets.some((s) => s.id === 'p0')).toBe(false);
    });
    it('DATA-001 DATA-002 DATA-003 DATA-005 wipes secrets at idle/absolute expiry', () => {
        const room = newRoom(code, token, 0);
        expect(handle(room, { t: 'alarm' }, IDLE_MS - 1).alarmAt).toBe(IDLE_MS);
        const expired = handle(room, { t: 'alarm' }, IDLE_MS);
        expect(expired.state).toMatchObject({ expired: true, hostToken: '', code: '', sockets: [] });
        const h = harness();
        h.connect('h', 'host');
        expect(h.run({ t: 'alarm' }, ABSOLUTE_MS).closes).toContain('h');
    });
    it('NET-002 isolates two populated rooms and still forwards each room’s own offers', () => {
        const a = harness();
        const b = harness('ZZZZ23');
        a.connect('host-a', 'host');
        a.connect('phone-a');
        b.connect('host-b', 'host');
        b.connect('phone-b');
        for (const [room, hostId, ownPhone, foreignPhone] of [
            [a, 'host-a', 'phone-a', 'phone-b'],
            [b, 'host-b', 'phone-b', 'phone-a'],
        ] as const) {
            const cross = room.run(message(hostId, {
                t: 'to-phone', peer: foreignPhone, step: { kind: 'offer', sdp: 'private' },
            }));
            expect(cross.sends).toEqual([{
                    id: hostId, message: { v: 1, t: 'error', code: 'peer-not-found', retryAfterS: null },
                }]);
            const own = room.run(message(hostId, {
                t: 'to-phone', peer: ownPhone, step: { kind: 'offer', sdp: 'private' },
            }));
            expect(own.sends).toEqual([{
                    id: ownPhone, message: { v: 1, t: 'from-host', step: { kind: 'offer', sdp: 'private' } },
                }]);
        }
    });
    it('NET-002 DATA-005 seeded event sequences preserve room and role invariants', () => {
        for (let seed = 1; seed <= 20; seed++) {
            let rng = seed;
            const next = () => {
                rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
                return rng;
            };
            let state: RoomState = newRoom(code, token, 0);
            const other = harness();
            other.connect('other-host', 'host');
            other.connect('other-phone');
            const foreign = other.run(message('other-host', {
                t: 'to-phone', peer: 's0', step: { kind: 'offer', sdp: 'foreign' },
            }));
            expect(foreign.sends[0]?.message).toMatchObject({ t: 'error', code: 'peer-not-found' });
            // Cover every server message kind before the seeded random lifecycle suffix.
            const prefix: Event[] = [
                { t: 'connect', id: 'host', roomToken: token, authenticatedHost: true },
                { t: 'connect', id: 'phone', roomToken: token, authenticatedHost: false },
                message('phone', { t: 'join', code, roomToken: null }),
                message('host', { t: 'ping' }),
                message('phone', { t: 'relay' }),
                message('host', { t: 'to-phone', peer: 'phone', step: { kind: 'offer', sdp: 'x' } }),
                message('phone', { t: 'to-host', step: { kind: 'answer', sdp: 'x' } }),
                { t: 'disconnect', id: 'host' },
                { t: 'connect', id: 'replacement', roomToken: token, authenticatedHost: true },
                message('replacement', { t: 'drop', peer: 'phone', reason: 'room-full' }),
                message('replacement', { t: 'reopen', code, hostToken: token }),
            ];
            const removed = new Set<string>();
            for (let i = 0; i < 500; i++) {
                const id = `s${String(next() % 12)}`;
                const choice = (next() >>> 16) % 12;
                const target = `s${String(next() % 12)}`;
                const events: Event[] = [
                    { t: 'connect', id, roomToken: token, authenticatedHost: false },
                    { t: 'disconnect', id },
                    message(id, { t: 'reopen', code, hostToken: token }),
                    message(id, { t: 'join', code, roomToken: null }),
                    message(id, { t: 'to-phone', peer: target, step: { kind: 'offer', sdp: 'test' } }),
                    message(id, { t: 'to-host', step: { kind: 'answer', sdp: 'test' } }),
                    { t: 'connect', id, roomToken: token, authenticatedHost: true },
                    message(id, { t: 'ping' }),
                    message(id, { t: 'relay' }),
                    message(id, { t: 'drop', peer: target, reason: 'room-full' }),
                    message(id, { t: 'create' }),
                    message(id, { t: 'close-room' }),
                ];
                const event = prefix[i] ?? events[choice];
                if (!event)
                    throw new Error('Invalid event choice');
                // Socket ids are transport-assigned, never client-selected or reused.
                if (removed.has(id))
                    continue;
                if (event.t === 'connect' && state.sockets.some((s) => s.id === id))
                    continue;
                const before = state;
                const out = handle(state, event, i * 100);
                state = out.state;
                for (const send of out.sends)
                    expect(removed.has(send.id)).toBe(false);
                for (const entry of before.sockets) {
                    if (!state.sockets.some((s) => s.id === entry.id))
                        removed.add(entry.id);
                }
                expect(state.sockets.filter((s) => s.role === 'host').length).toBeLessThanOrEqual(1);
                expect(JSON.parse(JSON.stringify(state))).toEqual(state);
                if (state.sockets.length === 0 && !state.expired)
                    expect(out.alarmAt).not.toBeNull();
                for (const send of out.sends) {
                    const target = state.sockets.find((s) => s.id === send.id) ?? before.sockets.find((
                      s) => s.id === send.id);
                    expect(target).toBeDefined();
                    if (target?.role === 'host')
                        expect(decodeToHostSignal(JSON.stringify(send.message)).ok).toBe(true);
                    if (target?.role === 'phone' || target?.role === 'opening')
                        expect(decodeToPhoneSignal(JSON.stringify(send.message)).ok).toBe(true);
                    if (send.message.t === 'from-host')
                        expect(target?.role).toBe('phone');
                    if (send.message.t === 'from-phone')
                        expect(target?.role).toBe('host');
                }
                expect(other.state().sockets.map((s) => s.id)).toEqual(['other-host', 'other-phone']);
                expect(state.sockets.filter((s) => s.role === 'phone').length).toBeLessThanOrEqual(8);
                expect(state.sockets.filter((s) => s.role === 'opening').length).toBeLessThanOrEqual(16);
                expect(out.sends.some((s) => s.id.startsWith('other-'))).toBe(false);
            }
        }
    });
});
