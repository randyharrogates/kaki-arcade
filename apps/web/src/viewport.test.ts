import { expect, it } from 'vitest';
import { tv } from '@kaki/ui';
import { screenScale } from './viewport';
it.each([[1280, 720], [1920, 1080], [3840, 2160], [2560, 1080]])('fits %i × %i without stretching or scrolling', (width, height) => {
  const scale = screenScale(width, height);
  expect(tv.width * scale).toBeLessThanOrEqual(width);
  expect(tv.height * scale).toBeLessThanOrEqual(height);
  expect(Math.max(tv.width * scale / width, tv.height * scale / height)).toBe(1);
});
