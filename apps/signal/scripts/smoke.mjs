// Node >=24. Start wrangler dev --local --env dev --port 5091 separately. No external traffic.
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { randomBytes } from 'node:crypto';
const port = Number(process.env.KAKI_PORT_SIGNAL ?? '5091');
const origin = 'http://localhost:5090';
// Local-only synthetic clients; confirm Wrangler preserves this header before trusting results.
let clientAddress = '192.0.2.1';
let clientSequence = 1;
/** @type {import('node:net').Socket[]} */
const sockets = [];
/**
 * @param {string} path
 * @param {string | null} hostToken
 * @returns {Promise<{send(value: object | string | Uint8Array): void, receive(timeout?: number):
   Promise<Record<string, unknown>>, closed(): boolean}>}
 */
function open(path, hostToken = null) {
    return new Promise((resolve, reject) => {
        const req = request({ hostname: '127.0.0.1', port, path, headers: { 'CF-Connecting-IP': clientAddress, Origin: origin, Upgrade:
          'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key':
          randomBytes(16).toString('base64'), 'Sec-WebSocket-Protocol': hostToken === null
            ? 'kaki.v1' : `kaki.v1, kaki.host.${hostToken}` } });
        req.on('response', (res) => {
            res.resume();
            reject(new Error(`Upgrade refused: ${String(res
                .statusCode)}`));
        });
        req.on('error', reject);
        req.on('upgrade', (res, socket, head) => {
            if (res.headers['sec-websocket-protocol'] !== 'kaki.v1') {
                socket.destroy();
                reject(new Error('Server did not select kaki.v1'));
                return;
            }
            sockets.push(socket);
            let buffer = head;
            let closed = false;
            /** @type {Record<string, unknown>[]} */
            const queue = [];
            /** @type {((value: Record<string, unknown>) => void) | null} */
            let waiting = null;
            const parse = () => {
                while (buffer.length >= 2) {
                    const opcode = (buffer[0] ?? 0) & 15;
                    let size = (buffer[1] ?? 0) & 127;
                    let offset = 2;
                    if (size === 126) {
                        if (buffer.length < 4)
                            return;
                        size = buffer.readUInt16BE(2);
                        offset = 4;
                    }
                    if (size === 127) {
                        socket.destroy();
                        return;
                    }
                    if (buffer.length < offset + size)
                        return;
                    const body = buffer.subarray(offset, offset + size);
                    buffer = buffer.subarray(offset + size);
                    if (opcode === 8) {
                        closed = true;
                        if (waiting) {
                            const done = waiting;
                            waiting = null;
                            done({ closed: true });
                        }
                        else
                            queue.push({ closed: true });
                        continue;
                    }
                    if (opcode !== 1)
                        continue;
                    const parsed = /** @type {unknown} */ (JSON.parse(body.toString()));
                    const value = /** @type {Record<string, unknown>} */ (parsed);
                    if (waiting) {
                        const done = waiting;
                        waiting = null;
                        done(value);
                    }
                    else
                        queue.push(value);
                }
            };
            socket.on('error', () => {
                /* Closing transports may stop accepting writes. */
            });
            socket.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                parse();
            });
            resolve({
                /** @param {object | string | Uint8Array} value */
                send(value) {
                    const body = Buffer.from(value instanceof Uint8Array ? value :
                        typeof value === 'string' ? value : JSON.stringify({ v: 1, ...value }));
                    const mask = randomBytes(4);
                    const opcode = value instanceof Uint8Array ? 0x82 : 0x81;
                    let header;
                    if (body.length < 126)
                        header = Buffer.from([opcode, 0x80 | body.length]);
                    else if (body.length < 65536) {
                        header = Buffer.from([opcode, 0xfe, body.length >> 8, body.length & 255]);
                    }
                    else {
                        header = Buffer.alloc(10);
                        header[0] = opcode;
                        header[1] = 0xff;
                        header.writeBigUInt64BE(BigInt(body.length), 2);
                    }
                    const masked = Buffer.from(body);
                    for (let i = 0; i < body.length; i++)
                        masked[i] = (body[i] ?? 0) ^ (mask[i % 4] ?? 0);
                    socket.write(Buffer.concat([header, mask, masked]));
                },
                closed: () => closed,
                /** @param {number} timeout */
                async receive(timeout = 3000) {
                    const queued = queue.shift();
                    if (queued)
                        return queued;
                    if (closed)
                        return { closed: true };
                    return new Promise((done, fail) => {
                        const timer = setTimeout(() => {
                            waiting = null;
                            fail(new Error('WebSocket timeout'));
                        }, timeout);
                        waiting = (value) => {
                            clearTimeout(timer);
                            done(value);
                        };
                        parse();
                    });
                },
            });
        });
        req.end();
    });
}
async function newRoom(address = clientAddress) {
    const response = await fetch(`http://127.0.0.1:${String(port)}/rooms`, {
        method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': address },
    });
    assert.equal(response.status, 200);
    return /** @type {{code:string,hostToken:string}} */ (await response.json());
}
let stepName = 'initialise';
/** @param {string} name */
function step(name, freshClient = true) {
    stepName = name;
    if (freshClient) clientAddress = `192.0.2.${String(++clientSequence)}`;
    process.stdout.write(`STEP ${name}\n`);
}
try {
    step('unknown host room CORS');
    const unknown = await fetch(`http://127.0.0.1:${String(port)}/rooms/22222222/host`, { headers: { Origin: origin } });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get('X-Kaki-Room'), 'gone');
    assert.equal(unknown.headers.get('Access-Control-Allow-Origin'), origin);
    process.stdout.write('PASS unknown host room CORS\n');
    step('create room');
    const response = await fetch(`http://127.0.0.1:${String(
      port)}/rooms`, { method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': clientAddress } });
    assert.equal(response.status, 200);
    const room = /** @type {{code:string,hostToken:string}} */ (await response.json());
    process.stdout.write('PASS create room\n');
    step('host and two phones');
    const host = await open(`/rooms/${room.code}/host`, room.hostToken);
    assert.deepEqual({ ...await host.receive(), ice: null }, {
        v: 1, t: 'created', code: room.code, hostToken: room.hostToken, ice: null, reopened: false,
    });
    const phone = await open(`/rooms/${room.code}/phone`);
    phone.send({ t: 'join', code: room.code, roomToken: null });
    const joined = await phone.receive();
    assert.equal(joined.t, 'joined');
    await host.receive();
    const second = await open(`/rooms/${room.code}/phone`);
    second.send({ t: 'join', code: room.code, roomToken: null });
    assert.equal((await second.receive()).t, 'joined');
    await host.receive();
    process.stdout.write('PASS host and two phones\n');
    step('offer and answer');
    host.send({ t: 'to-phone', peer: joined.peer, step: { kind: 'offer', sdp: 'fake-offer' } });
    assert.deepEqual(await phone.receive(), { v: 1, t: 'from-host', step: { kind: 'offer', sdp:
      'fake-offer' } });
    phone.send({ t: 'to-host', step: { kind: 'answer', sdp: 'fake-answer' } });
    assert.deepEqual(await host.receive(), { v: 1, t: 'from-phone', peer: joined.peer, step: { kind:
      'answer', sdp: 'fake-answer' } });
    process.stdout.write('PASS offer and answer\n');
    step('gameplay refused');
    phone.send({ t: 'action', action: 'gameplay' });
    assert.equal((await phone.receive()).code, 'bad-message');
    process.stdout.write('PASS gameplay refused\n');
    step('wrong code refused');
    const wrong = await open(`/rooms/${room.code}/phone`);
    wrong.send({ t: 'join', code: room.code === '22222222' ? '33333333' : '22222222', roomToken: null });
    assert.equal((await wrong.receive()).code, 'room-not-found');
    process.stdout.write('PASS wrong code refused\n');
    step('origin table');
    // a1: exact-origin table, including absent/null, look-alike and scheme mismatch.
    for (const value of [null, 'null', 'http://localhost:5090.evil.test', 'https://localhost:5090',
        'http://LOCALHOST:5090', 'http://localhost:5090/', '']) {
        const headers = value === null ? {} : { Origin: value };
        const refused = await fetch(`http://127.0.0.1:${String(port)}/rooms`, { method: 'POST', headers });
        assert.equal(refused.status, 403);
        const upgrade = await fetch(`http://127.0.0.1:${String(port)}/rooms/${room.code}/host`, { headers });
        assert.equal(upgrade.status, 403);
    }
    process.stdout.write('PASS origin table on HTTP and socket routes\n');
    step('retired create and reopen return bad-message and close; upgrade credentials');
    // Use a phone route so the refusal cannot replace the host under test.
    const createSocket = await open(`/rooms/${room.code}/phone`);
    createSocket.send({ t: 'create' });
    assert.equal((await createSocket.receive()).code, 'bad-message');
    assert.equal((await createSocket.receive()).closed, true);
    const reopenSocket = await open(`/rooms/${room.code}/phone`);
    reopenSocket.send({ t: 'reopen', code: room.code, hostToken: room.hostToken });
    assert.equal((await reopenSocket.receive()).code, 'bad-message');
    assert.equal((await reopenSocket.receive()).closed, true);
    await assert.rejects(open(`/rooms/${room.code}/host`), /401/);
    await assert.rejects(open(`/rooms/${room.code}/host`, 'A'.repeat(32)), /401/);
    step('spoofed peer is discarded');
    phone.send({ t: 'to-host', peer: 'spoof', step: { kind: 'answer', sdp: 'x' } });
    assert.deepEqual(await host.receive(), {
        v: 1, t: 'from-phone', peer: joined.peer, step: { kind: 'answer', sdp: 'x' },
    });
    step('malformed binary nested oversized frames');
    const badFrames = [
        '{not json', new Uint8Array([1, 2, 3]), '['.repeat(16000),
        { t: 'to-host', step: { kind: 'answer', sdp: 'x'.repeat(1000000) } },
    ];
    for (const [index, data] of badFrames.entries()) {
        step(`bad frame ${String(index + 1)} (malformed, binary, nested, oversized)`);
        phone.send(data);
        assert.equal((await phone.receive()).code, 'bad-message');
    }
    process.stdout.write('PASS retired create/reopen bad-message and close, bad secret, spoof, binary, malformed and oversized frames\n');
    step('silent saturation and deadline');
    // a2/a5/a6: all excess upgrades fail before 101; a host still gets in.
    const freshResponse = await fetch(`http://127.0.0.1:${String(port)}/rooms`, {
        method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': clientAddress },
    });
    const fresh = /** @type {{code:string,hostToken:string}} */ (await freshResponse.json());
    const silentStarted = Date.now();
    const silent = [];
    for (let i = 0; i < 19; i++) {
        if (i < 12)
            silent.push(await open(`/rooms/${fresh.code}/phone`));
        else
            await assert.rejects(open(`/rooms/${fresh.code}/phone`), /429/);
    }
    for (let i = 0; i < 30; i++) {
        await assert.rejects(open(`/rooms/${fresh.code}/phone`), /429/);
    }
    await assert.rejects(open('/rooms/22222222/phone'), /404/);
    clientAddress = `192.0.2.${String(++clientSequence)}`;
    const recovered = await open(`/rooms/${fresh.code}/host`, fresh.hostToken);
    assert.equal((await recovered.receive()).reopened, false);
    assert.ok(silent[0]);
    assert.ok(silent[1]);
    const deadlineStart = Date.now();
    assert.equal((await (silent[1]).receive(13000)).code, 'opening-timeout');
    assert.equal((await (silent[1]).receive()).closed, true);
    assert.ok(Date.now() - deadlineStart <= 13000);
    assert.ok(Date.now() - silentStarted >= 2000);
    process.stdout.write('PASS silent saturation, excess HTTP refusals, host admission and deadline\n');
    step('full room and normalised codes');
    // a2: full room, authenticated host reload and live phone-token replacement.
    const fullPhones = [];
    for (let i = 0; i < 8; i++) {
        const displayed = `${fresh.code.slice(0, 4)}-${fresh.code.slice(4)}`.toLowerCase();
        const ws = await open(`/rooms/${displayed}/phone`);
        ws.send({ t: 'join', code: displayed, roomToken: null });
        const joined = await ws.receive();
        assert.equal(joined.t, 'joined');
        fullPhones.push({ ws, token: joined.roomToken });
        await recovered.receive();
    }
    const ninth = await open(`/rooms/${fresh.code}/phone`);
    ninth.send({ t: 'join', code: fresh.code, roomToken: null });
    assert.equal((await ninth.receive()).code, 'room-full');
    assert.equal((await ninth.receive()).closed, true);
    step('four waiting phones');
    const waiting = [];
    for (let i = 0; i < 4; i++)
        waiting.push(await open(`/rooms/${fresh.code}/phone`));
    step('wrong host upgrades at full capacity');
    for (let attempt = 0; attempt < 3; attempt++)
        await assert.rejects(open(`/rooms/${fresh.code}/host`, 'A'.repeat(32)), /401/);
    step('authenticated reload at full capacity');
    const reload = await open(`/rooms/${fresh.code}/host`, fresh.hostToken);
    const reloaded = await reload.receive();
    assert.equal(reloaded.reopened, true);
    assert.equal(reloaded.hostToken, fresh.hostToken);
    assert.equal((await recovered.receive()).code, 'not-allowed');
    assert.equal((await recovered.receive()).closed, true);
    for (let i = 0; i < 8; i++)
        assert.equal((await reload.receive()).t, 'peer-joined');
    // Every waiting phone survived the unauthenticated attempts and authenticated replacement.
    for (const ws of waiting) {
        ws.send({ t: 'join', code: fresh.code, roomToken: null });
        assert.equal((await ws.receive()).code, 'room-full');
        assert.equal((await ws.receive()).closed, true);
    }
    process.stdout.write('PASS wrong secrets and saturated authenticated reload\n');
    step('live phone replacement');
    const returning = await open(`/rooms/${fresh.code}/phone`);
    returning.send({ t: 'join', code: fresh.code, roomToken: fullPhones[0]?.token });
    assert.equal((await returning.receive()).t, 'joined');
    assert.ok(fullPhones[0]);
    assert.equal((await (fullPhones[0]).ws.receive()).t, 'host');
    assert.equal((await (fullPhones[0]).ws.receive()).code, 'not-allowed');
    assert.equal((await (fullPhones[0]).ws.receive()).closed, true);
    process.stdout.write('PASS full room, host reload, phone replacement and normalised code\n');
    step('10000 canonical pings');
    // a1's exact ping flood is auto-responded by the runtime without waking the object.
    for (let i = 0; i < 10000; i++)
        returning.send({ t: 'ping' });
    for (let i = 0; i < 10000; i++)
        assert.equal((await returning.receive()).t, 'pong');
    process.stdout.write('PASS 10000 canonical pings use the required auto-response (not rate-limited)\n');
    step('10000 noncanonical pings');
    // Canonical protocol ping is a hibernation auto-response. Noncanonical JSON must be throttled.
    for (let i = 0; i < 10000; i++)
        returning.send('{ "v": 1, "t": "ping" }');
    let pongs = 0;
    for (;;) {
        const message = await returning.receive();
        if (message.t === 'pong') {
            pongs++;
            continue;
        }
        assert.equal(message.code, 'rate-limited');
        break;
    }
    assert.ok(pongs < 10000);
    assert.equal((await returning.receive()).closed, true);
    process.stdout.write(`PASS 10000 noncanonical pings throttled (${String(pongs)} pongs)\n`);
    step('C-03 creation bucket, Retry-After and another client');
    for (let i = 0; i < 8; i++) {
        const response = await fetch(`http://127.0.0.1:${String(port)}/rooms`, {
            method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': clientAddress },
        });
        assert.equal(response.status, 200);
    }
    const deniedCreate = await fetch(`http://127.0.0.1:${String(port)}/rooms`, {
        method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': clientAddress },
    });
    assert.equal(deniedCreate.status, 429);
    assert.ok(Number(deniedCreate.headers.get('Retry-After')) > 0);
    assert.equal(deniedCreate.headers.get('Access-Control-Expose-Headers'), 'Retry-After, X-Kaki-Room');
    process.stdout.write('PASS C-03 creation burst 8, ninth 429 with Retry-After\n');
    step('C-03 failed malformed joins and back-off');
    const malformedRoom = await newRoom();
    for (let i = 0; i < 17; i++) await assert.rejects(open('/rooms/00000000/phone'), /404/);
    await assert.rejects(open(`/rooms/${malformedRoom.code}/phone`), /429/);
    process.stdout.write('PASS C-03 malformed guesses back off regardless of room existence\n');
    step('C-03 connection attempts including non-upgrade probes');
    const attemptRoom = await newRoom();
    for (let i = 0; i < 4; i++) await open(`/rooms/${attemptRoom.code}/phone`);
    for (let i = 0; i < 92; i++) {
        const response = await fetch(`http://127.0.0.1:${String(port)}/rooms/${attemptRoom.code}/phone`, {
            headers: { Origin: origin, 'CF-Connecting-IP': clientAddress },
        });
        assert.equal(response.status, 426);
    }
    let attemptLimited = false;
    for (let i = 0; i < 200 && !attemptLimited; i++) {
        const response = await fetch(`http://127.0.0.1:${String(port)}/rooms/${attemptRoom.code}/phone`, {
            headers: { Origin: origin, 'CF-Connecting-IP': clientAddress },
        });
        attemptLimited = response.status === 429;
        if (attemptLimited) assert.ok(Number(response.headers.get('Retry-After')) > 0);
    }
    assert.ok(attemptLimited);
    process.stdout.write('PASS C-03 attempt burst 96 then 429 (also covers upgrade retries)\n');
    step('C-03 unidentified cap leaves four slots for a different client');
    const pendingRoom = await newRoom(`192.0.2.${String(++clientSequence)}`);
    const pendingClient = clientAddress;
    const pending = [];
    // D-081/D-083: twelve unresolved openings per client, before room replacement.
    // Progress labels must preserve the address throughout this scenario.
    for (let i = 0; i < 12; i++) {
        step(`C-03 pending opening ${String(i + 1)} of 12`, false);
        pending.push(await open(`/rooms/${pendingRoom.code}/phone`));
    }
    step('C-03 thirteenth opening from one client is refused', false);
    await assert.rejects(open(`/rooms/${pendingRoom.code}/phone`), /429/);
    step('C-03 a different client joins while twelve openings wait');
    const other = await open(`/rooms/${pendingRoom.code}/phone`);
    other.send({ t: 'join', code: pendingRoom.code, roomToken: null });
    assert.equal((await other.receive()).t, 'joined');
    for (const ws of pending) assert.equal((await ws.receive(13000)).code, 'opening-timeout');
    // A per-room refusal caches a ten-second lease deadline, longer than the
    // room's three-second opening deadline. Also exercise the runtime's ten-second
    // idle-eviction window after the room reports all twelve failures.
    await new Promise((resolve) => setTimeout(resolve, 10500));
    clientAddress = pendingClient;
    const abandoned = [];
    // Twelve confirmed abandonments leave five provisional charges (17 - 12).
    for (let i = 0; i < 5; i++) abandoned.push(await open(`/rooms/${pendingRoom.code}/phone`));
    await assert.rejects(open(`/rooms/${pendingRoom.code}/phone`), /429/);
    for (const ws of abandoned) assert.equal((await ws.receive(13000)).code, 'opening-timeout');
    // Receipt of all five errors bounds the final failure time. Allow its one-second
    // block (and the sixth request's cache) to expire before the single trial.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    // Seventeen failures: the short first block has now run out, so
    // exactly one unresolved opening may test it; a second at the same moment is refused.
    const probe = await open(`/rooms/${pendingRoom.code}/phone`);
    await assert.rejects(open(`/rooms/${pendingRoom.code}/phone`), /429/);
    assert.equal((await probe.receive(13000)).code, 'opening-timeout');
    process.stdout.write('PASS C-03 pending cap, other-client join and abandonment back-off\n');

}
catch (error) {
    process.stderr.write(`FAIL ${stepName}: ${String(error instanceof Error ? error.stack : error)}\n`);
    process.exitCode = 1;
}
finally {
    for (const socket of sockets)
        socket.destroy();
}
