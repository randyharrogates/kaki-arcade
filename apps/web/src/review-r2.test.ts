import { describe, expect, it } from 'vitest';
import qrcode from 'qrcode-generator';
import { qrPath } from './qr';
import { seatIdentity, lobbyView } from './view-model';
import { countdownLabel, nameLines } from './seat-text';
import { demoChange, demoInput } from './demo';

describe('C-07 review regressions (PLAT-001, PLAT-004, NN-5)', () => {
  it('draws every QR dark module with M correction and a four-module quiet zone', () => {
    const payload = 'https://arcade.example/play?code=H7KQ9MXR';
    const actual = qrPath(payload);
    const qr = qrcode(0, 'M'); qr.addData(payload); qr.make();
    expect(actual).toMatchObject({ modules: qr.getModuleCount(), quiet: 4, level: 'M', size: qr.getModuleCount() + 8 });
    let expected = '';
    for (let y = 0; y < qr.getModuleCount(); y++) for (let x = 0; x < qr.getModuleCount(); x++) {
      if (qr.isDark(y, x)) expected += `M${String(x + 4)} ${String(y + 4)}h1v1h-1z`;
    }
    expect(actual.path).toBe(expected);
  });
  it('changes countdown speech without changing overlap identity', () => {
    const input = { ...demoInput(8), origin: 'https://arcade.example' };
    const first = lobbyView(input, { now: () => 0 }).seats[3];
    const next = lobbyView(input, { now: () => 1001 }).seats[3];
    if (!first || !next) throw new Error('Missing seat');
    expect(countdownLabel(first.holdSeconds)).toBe('120 s left');
    expect(countdownLabel(next.holdSeconds)).toBe('119 s left');
    expect(seatIdentity(first)).toBe(seatIdentity(next));
  });
  it.each(['天地玄黃宇宙洪荒日月盈昃', '😀😁😂😃😄😅😆😉😊😋😎😍', '👨‍👩‍👧‍👦'.repeat(12)])('keeps twelve graphemes intact in two six-grapheme lines', name => {
    const lines = nameLines(name);
    expect(lines.join('')).toBe(name);
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(line))).toHaveLength(6);
  });
});

it('demo changes affect one seat at two seconds while retaining other names and qualities', () => {
  for (const change of ['join', 'leave', 'held', 'return']) {
    const input = demoInput(3, new URLSearchParams(`names=long&change=${change}`));
    const before = lobbyView({ ...input, origin: 'https://arcade.example' });
    const after = lobbyView({ ...demoChange(input, change), origin: 'https://arcade.example' });
    expect(after.seats.filter((seat, index) => seatIdentity(seat) !== seatIdentity(before.seats[index] ?? seat))).toHaveLength(1);
  }
});
