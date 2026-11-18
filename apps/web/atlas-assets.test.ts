import { describe, expect, it, vi } from 'vitest';
import { publishAtlases } from './atlas-assets';

describe('production atlas publication (PP-030, PP-031)', () => {
  it('emits both details for every game beside the built manifest, once, preserving metadata', () => {
    const source = JSON.stringify({ version: 1, atlases: [
      { set: 'peek-poker-cards', full: { file: 'cards-full.hash.webp' }, half: { file: 'cards-half.hash.webp' } },
      { set: 'tabao-rush', full: { file: 'cook.hash.webp' }, half: { file: 'cards-half.hash.webp' } },
    ] });
    const emitted = new Map<string, Uint8Array>();
    publishAtlases(source, 'assets/manifest-hash.json', file => new TextEncoder().encode(file),
      (file, bytes) => { emitted.set(file, bytes); });
    expect([...emitted.keys()]).toEqual(['assets/cards-full.hash.webp', 'assets/cards-half.hash.webp', 'assets/cook.hash.webp']);
    for (const [file, bytes] of emitted) expect(new TextDecoder().decode(bytes)).toBe(file.slice(7));
  });
  it('fails on a missing source atlas or an unsafe filename', () => {
    const source = (file: string) => JSON.stringify({ atlases: [{ full: { file }, half: { file } }] });
    expect(() => { publishAtlases(source('missing.webp'), 'assets/manifest.json', () => { throw Error('missing'); }, vi.fn()); }).toThrow('missing');
    expect(() => { publishAtlases(source('../outside.webp'), 'assets/manifest.json', () => new Uint8Array(), vi.fn()); }).toThrow('Invalid atlas');
  });
});
