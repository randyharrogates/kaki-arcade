import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Animation, Direction } from './manifest.js';

const config = JSON.parse(readFileSync('assets/src/pipeline.json', 'utf8')) as {
  sets: { id: string; animations?: Animation[] }[];
};
const animations = config.sets.find(s => s.id === 'tabao-rush-cook-body')?.animations ?? [];
const directions: Direction[] = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];

describe('TR-060 / NN-4 cook animation manifest', () => {
  it('covers nine actions and matching masks in eight directions', () => {
    expect(animations).toHaveLength(18);
    for (const body of animations.filter(a => !a.action.endsWith('-mask'))) {
      expect(Object.keys(body.directions ?? {}).sort()).toEqual([...directions].sort());
      const mask = animations.find(a => a.action === `${body.action}-mask`);
      expect(mask).toEqual({ ...body, action: `${body.action}-mask`, directions: Object.fromEntries(
        directions.map(d => [d, (body.directions?.[d] ?? []).map(id => `${id}-mask`)]),
      ) });
      if (body.releaseFrame !== undefined) {
        expect(body.releaseFrame).toBeGreaterThanOrEqual(0);
        expect(body.releaseFrame).toBeLessThan(body.directions?.s.length ?? 0);
      }
      expect(typeof body.loop).toBe('boolean');
      if (['walk', 'carry-walk'].includes(body.action)) expect(body.strideTiles).toBeGreaterThan(0);
      else expect(body.strideTiles).toBeUndefined();
    }
    expect(animations.find(a => a.action === 'walk')?.strideTiles)
      .toBe(animations.find(a => a.action === 'carry-walk')?.strideTiles);
  });
});
