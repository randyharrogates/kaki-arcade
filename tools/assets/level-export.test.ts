import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../games/tabao-rush/src/levels/catalogue';

describe('TR-050 generated level sources', () => {
  for (const level of LEVELS) it(level.id, () => {
    const { id, venue, width, height, collision, stations, spawns } = level;
    const source: unknown = JSON.parse(readFileSync(new URL(`../../assets/src/tabao-rush/levels/${id}.json`, import.meta.url), 'utf8'));
    expect(source).toEqual({ id, venue, width, height, collision, stations, spawns });
  });
});
