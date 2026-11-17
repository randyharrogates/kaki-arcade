import { buttonSizes, BUTTON_FLOOR, space } from '@kaki/ui';
import type { Size } from '@kaki/ui';
/** Size from the phone; the demo play area only limits layouts that cannot fit. */
export function controlSizes(viewport: Size, playArea?: Size) {
  const desired = buttonSizes(viewport);
  if (!playArea) return desired;
  const sizesAt = (factor: number) => ({
    face: Math.max(BUTTON_FLOOR.face, Math.floor(desired.face * factor)),
    inPlayWidth: Math.max(BUTTON_FLOOR.inPlayWidth, Math.floor(desired.inPlayWidth * factor)),
    inPlayHeight: Math.max(BUTTON_FLOOR.inPlayHeight, Math.floor(desired.inPlayHeight * factor)),
    minimum: Math.max(BUTTON_FLOOR.minimum, Math.floor(desired.minimum * factor)),
  });
  const fits = (size: typeof desired) => {
    const gap = space[13];
    const faceSpan = size.face + 2 * ((size.face + space[5]) / Math.SQRT2 + gap);
    const padWidth = 3 * size.inPlayWidth + 2 * gap;
    // Bottom diamonds, the upper row, and their margins/clearance in controller-demo.css.
    return Math.max(faceSpan + padWidth + 3 * gap, 4 * size.inPlayWidth + 5 * gap) <= playArea.width
      && Math.max(faceSpan + 2 * gap, 4 * size.inPlayHeight + 5 * gap) <= playArea.height;
  };
  if (fits(desired)) return desired;
  let low = 0, high = 1;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (fits(sizesAt(middle))) low = middle; else high = middle;
  }
  // An area smaller than the floor layout cannot override D-051's target floors.
  return sizesAt(low);
}
