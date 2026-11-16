import { tileAt } from './level';
import { STATION_REACH } from './state';
import type { Facing, Level } from './state';

export const FACING_X = [1, Math.SQRT1_2, 0, -Math.SQRT1_2, -1, -Math.SQRT1_2, 0,
  Math.SQRT1_2] as const;
export const FACING_Y = [0, Math.SQRT1_2, 1, Math.SQRT1_2, 0, -Math.SQRT1_2, -1,
  -Math.SQRT1_2] as const;

export const FACING_HYSTERESIS = 8 * Math.PI / 180;

export function facingFor(x: number, y: number, current?: Facing): Facing {
  if (current !== undefined) {
    if (x === 0 && y === 0) return current;
    const difference = Math.atan2(Math.sin(Math.atan2(y, x) - current * Math.PI / 4),
      Math.cos(Math.atan2(y, x) - current * Math.PI / 4));
    if (Math.abs(difference) <= Math.PI / 8 + FACING_HYSTERESIS) return current;
  }
  return ((Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8) as Facing;
}

/** Ray to the FIRST tile boundary: never highlight through a wall or round a corner.
 * At an exact corner, the x-adjacent tile wins; no candidate enumeration or frame history.
 */
export function targetTile(level: Level, x: number, y: number, facing: Facing): number | null {
  const dx = FACING_X[facing];
  const dy = FACING_Y[facing];
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const distanceX = dx === 0 ? Infinity : ((dx > 0 ? tx + 1 : tx) - x) / dx;
  const distanceY = dy === 0 ? Infinity : ((dy > 0 ? ty + 1 : ty) - y) / dy;
  const crossesX = distanceX <= distanceY + 1e-12;
  const distance = crossesX ? distanceX : distanceY;
  if (distance > STATION_REACH) return null;
  const column = tx + (crossesX ? sx : 0);
  const row = ty + (crossesX ? 0 : sy);
  const tile = tileAt(level, column, row);
  return tile?.kind === 'station' || tile?.kind === 'counter'
    ? row * level.width + column
    : null;
}
