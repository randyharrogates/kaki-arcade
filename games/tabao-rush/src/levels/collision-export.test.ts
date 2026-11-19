import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS } from './catalogue';
import { compileLevel } from './loader';

describe('TR-057 level collision exports', () => {
  for (const level of LEVELS) {
    for (const look of ['terrazzo', 'tile', 'golden']) {
      it(`${level.id} ${look} preserves compiled walkable tiles`, () => {
        const url = new URL(`../../../../assets/src/tabao-rush/levels/${level.id}/${look}/collision.json`, import.meta.url);
        const exported = JSON.parse(readFileSync(url, 'utf8')) as { tiles: string[] };
        const walkable = (tiles: readonly string[]) => tiles.flatMap((kind, i) => kind === 'floor' ? [i] : []);
        expect(walkable(exported.tiles)).toEqual(walkable(compileLevel(level).tiles.map(tile => tile.kind)));
      });
    }
  }
});
