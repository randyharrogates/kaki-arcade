import { namePresentation } from './seat-text';
import { describe, expect, it } from 'vitest';
import { createRoom } from '@kaki/platform';
import { PLAYER_COLOURS } from '@kaki/ui';
import { demoInput } from './demo';
import { joinLink, lobbyView, normaliseCode } from './view-model';
import type { PairingState } from './view-model';
import qrcode from 'qrcode-generator';

const origin = 'https://arcade.example';
describe('host lobby projection (PLAT-001, PLAT-004, PLAT-010)', () => {
  it.each<PairingState>(['creating', 'ready', 'reconnecting', 'unreachable', 'expired', 'replaced'])('projects %s with clear actions and no stale QR', pairing => {
    const view = lobbyView({ ...demoInput(0), origin, pairing });
    expect(view.status.length).toBeGreaterThan(0);
    expect(view.seats).toHaveLength(8);
    expect(view.retry).toBe(pairing === 'unreachable');
    expect(view.newRoom).toBe(pairing === 'expired');
    expect(Boolean(view.qrPayload)).toBe(pairing === 'ready' || pairing === 'reconnecting');
  });
  it.each([0, 1, 8])('shows %i seated players with numbers and token colours', count => {
    const view = lobbyView({ ...demoInput(count), origin });
    expect(view.count).toBe(`${String(count)} of 8 players`);
    expect(view.seats.filter(s => s.occupied)).toHaveLength(count);
    for (const [index, row] of view.seats.entries()) {
      expect(row.number).toBe(index + 1);
      expect(row.colour).toBe(PLAYER_COLOURS[index]?.colour);
      expect(row.name.length).toBeGreaterThan(0);
    }
  });
  it('shows measured quality, non-colour icons, leader, held seat and long names', () => {
    const view = lobbyView({ ...demoInput(8), origin });
    expect(view.seats.map(s => s.connection).slice(0, 4)).toEqual(['Good', 'Weak', 'Relayed', 'Seat held']);
    expect(new Set(view.seats.slice(0, 4).map(s => s.icon)).size).toBe(4);
    expect(view.seats[0]?.leader).toBe(true);
    expect(view.seats[0]?.name).toBe('Cloud Noodle');
    const input = demoInput(1);
    expect(lobbyView({ ...input, links: new Map(), origin }).seats[0]?.connection).toBe('Connected');
  });
  it('encodes exactly the public join link and groups the code in fours', () => {
    const view = lobbyView({ ...demoInput(1), origin });
    expect(view.codeGroups).toEqual(['H7KQ', '9MXR']);
    expect(view.qrPayload).toBe(`${origin}/play?code=H7KQ9MXR`);
    expect(view.joinLink).toBe(view.qrPayload);
    const qr = qrcode(0, 'M'); qr.addData(view.qrPayload); qr.make();
    expect(qr.getModuleCount()).toBeGreaterThan(0);
  });
  it('never projects credentials, seat tokens, connection identities or arbitrary quality data', () => {
    const input = demoInput(1);
    const player = input.room.players[0];
    if (!player) throw new Error('Missing fixture');
    const secret = 'private-seat-value';
    const room = { ...input.room, players: [{ ...player, seatToken: secret, deviceId: 'private-device', connectionId: 'private-connection', quality: { roomToken: 'private-room' } }] };
    const view = lobbyView({ ...input, room, origin, hostToken: 'private-host', roomToken: 'private-room' } as Parameters<typeof lobbyView>[0]);
    const serialised = JSON.stringify(view);
    for (const value of [secret, 'private-device', 'private-connection', 'private-host', 'private-room', 'seatToken', 'hostToken', 'roomToken']) expect(serialised).not.toContain(value);
  });
});
describe('join link normalisation', () => {
  it('normalises typed codes and strips origin paths, secrets, queries and fragments', () => {
    expect(normaliseCode(' h7kq-9mxr ')).toBe('H7KQ9MXR');
    expect(joinLink('https://user:secret@arcade.example/private?hostToken=hidden#secret', 'h7kq 9mxr')).toBe(`${origin}/play?code=H7KQ9MXR`);
    expect(joinLink(origin, 'H7KQ9MXR', 'http://192.168.1.20:5150/path?token=hidden')).toBe('http://192.168.1.20:5150/play?code=H7KQ9MXR');
  });
  it.each(['', 'bad', 'H7KQ9MXR?token=secret', '<script>'])('rejects invalid code %s', code => {
    expect(joinLink(origin, code)).toBe('');
  });
  it.each(['javascript:alert(1)', 'file:///private', 'not a URL'])('rejects invalid join origin %s', override => {
    expect(joinLink(origin, 'H7KQ9MXR', override)).toBe('');
  });
  it('handles empty rooms without inventing a leader', () => {
    const view = lobbyView({ room: createRoom(), links: new Map(), pairing: 'creating', code: '', origin });
    expect(view.seats.some(s => s.leader)).toBe(false);
  });
});

it('counts held time from the drop timestamp using an injected clock', () => {
  const input = { ...demoInput(8), origin };
  for (const [now, seconds] of [[0, 120], [1001, 119], [119001, 1], [121000, 0]]) {
    const seat = lobbyView(input, { now: () => now ?? 0 }).seats[3];
    expect(seat?.held).toBe(true);
    expect(seat?.holdSeconds).toBe(seconds);
  }
  expect(lobbyView(input).seats[0]?.holdSeconds).toBeNull();
});
it('uses neutral fictional demo names only', () => {
  expect(lobbyView({ ...demoInput(8), origin }).seats.map(s => s.name)).toEqual([
    'Cloud Noodle', 'Pebble Puff', 'Mango Moon', 'Waffle Fern', 'Velvet Kite', 'Bumble Bean', 'Puddle Pip', 'Comet Crumb',
  ]);
});
it('shows valid short codes without padding or empty groups', () => {
  const view = lobbyView({ ...demoInput(0), origin, code: 'MHH9' });
  expect(view.codeGroups).toEqual(['MHH9']);
  expect(view.qrPayload).toBe(`${origin}/play?code=MHH9`);
  expect(lobbyView({ ...demoInput(0), origin, code: 'MHH9JP' }).codeGroups).toEqual(['MHH9', 'JP']);
});
it('keeps the two code groups separate for display and speech', () => {
  const view = lobbyView({ ...demoInput(0), origin, code: 'MHH9JPBC' });
  expect(view.codeGroups.join(' ')).toBe('MHH9 JPBC');
});

// Widths are injected so wrapping is deterministic without a browser font engine.
it('keeps names at reading size unless that name cannot fit two lines (NFR-A11Y)', () => {
  const measure = (text: string, size: number): number => Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).reduce((width, { segment }) => width + size * (/^[\x20-\x7e]+$/.test(segment) ? 0.55 : 1), 0);
  for (const name of ['Cloud Noodle', 'Waffle Fern', 'Mango Moonss', 'Seat 8', 'WWWWWW']) {
    const layout = namePresentation(name, 181, measure);
    expect(layout.size).toBe(34);
    expect(layout.lines.length).toBeLessThanOrEqual(2);
    expect(layout.lines.every(line => measure(line, 34) <= 181)).toBe(true);
  }
  for (const name of ['天地玄黃宇宙洪荒日月盈昃', '😀😁😂😃😄😅😆😉😊😋😎😍', '👨‍👩‍👧‍👦'.repeat(12)]) {
    const layout = namePresentation(name, 181, measure);
    expect(layout.size).toBe(34);
    expect(layout.lines).toHaveLength(3);
    expect(layout.lines.join('')).toBe(name);
    expect(layout.lines.every(line => measure(line, 34) <= 181)).toBe(true);
  }
});
it.each<PairingState>(['creating', 'restoring', 'unreachable', 'expired', 'replaced', 'ready', 'reconnecting'])('only claims link quality for live seats: %s (PLAT-004)', pairing => {
  const live = pairing === 'ready' || pairing === 'reconnecting';
  const view = lobbyView({ ...demoInput(8), origin, pairing });
  for (const seat of view.seats) {
    expect(seat.dimmed).toBe(!live);
    if (!live) { expect(seat.connection).toBe(''); expect(seat.icon).toBe(''); }
  }
  expect(view.seats[0]?.name).toBe('Cloud Noodle');
  expect(view.seats[0]?.leader).toBe(true);
  if (live) expect(view.seats[0]?.connection).toBe('Good');
});


it.each<PairingState>(['creating', 'restoring', 'unreachable', 'expired', 'replaced', 'ready', 'reconnecting'])('PLAT-001 empty seats invite scanning only with a visible code: %s', pairing => {
  const view = lobbyView({ ...demoInput(0), origin, pairing });
  expect(view.seats.every(seat => seat.name === `Seat ${String(seat.number)}`)).toBe(true);
  expect(view.seats.every(seat => seat.connection === (view.qrPayload ? 'Scan to join' : ''))).toBe(true);
});
