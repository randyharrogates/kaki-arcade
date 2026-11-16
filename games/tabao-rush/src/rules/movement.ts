import { normaliseAxes } from '@kaki/sim-core';
import { STEPS_PER_SECOND } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { clearOfWalls } from './level';
import {
  MIN_SEPARATION, SOFT_PUSH, SOFT_SEPARATION, STICK_DEAD_ZONE, WALK_SPEED,
} from './state';
import type { Cook, Level } from './state';
import { facingFor, targetTile } from './target';

// Fully overwritten on every call, never retained in state. No per-step scratch allocation.
const scratch = {
  axes: [0, 0] as [number, number],
  x: new Float64Array(8),
  y: new Float64Array(8),
};
const MIN_SQUARED = MIN_SEPARATION * MIN_SEPARATION;
const SIDESTEP = WALK_SPEED / STEPS_PER_SECOND;

/** Closest point on this short axis segment: near-tangent contacts must not tunnel. */
function clearSweep(
  level: Level, i: number, count: number, x: number, y: number, dx: number, dy: number,
): 'wall' | 'cook' | null {
  if (!clearOfWalls(level, x + dx, y + dy)) return 'wall';
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return null;
  for (let j = 0; j < count; j += 1) {
    if (j === i) continue;
    const ox = (scratch.x[j] ?? 0) - x;
    const oy = (scratch.y[j] ?? 0) - y;
    const t = Math.max(0, Math.min(1, (ox * dx + oy * dy) / lengthSquared));
    const nearX = ox - dx * t;
    const nearY = oy - dy * t;
    if (nearX * nearX + nearY * nearY < MIN_SQUARED - 1e-12) return 'cook';
  }
  return null;
}

/** Move one axis up to contact. Short sweeps cannot jump across a cook or wall. */
function axisMove(level: Level, i: number, count: number, amount: number, axis: 'x' | 'y'): 'wall' | 'cook' | null {
  if (amount === 0) return null;
  const x = scratch.x[i] ?? 0;
  const y = scratch.y[i] ?? 0;
  const dx = axis === 'x' ? amount : 0;
  const dy = axis === 'y' ? amount : 0;
  let fraction = 1;
  const blockedBy = clearSweep(level, i, count, x, y, dx, dy);
  if (blockedBy !== null) {
    let low = 0;
    let high = 1;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const middle = (low + high) / 2;
      if (clearSweep(level, i, count, x, y, dx * middle, dy * middle) === null) low = middle;
      else high = middle;
    }
    fraction = low;
  }
  scratch.x[i] = x + dx * fraction;
  scratch.y[i] = y + dy * fraction;
  return blockedBy;
}

function separate(level: Level, i: number, count: number, vx: number, vy: number): void {
  let pushX = 0;
  let pushY = 0;
  for (let j = 0; j < count; j += 1) {
    if (i === j) continue;
    const dx = (scratch.x[i] ?? 0) - (scratch.x[j] ?? 0);
    const dy = (scratch.y[i] ?? 0) - (scratch.y[j] ?? 0);
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance >= SOFT_SEPARATION) continue;
    const strength = SOFT_PUSH * (1 - distance / SOFT_SEPARATION);
    pushX += dx / distance * strength;
    pushY += dy / distance * strength;
  }
  // Contact must not undo the player's forward progress into free space.
  const dot = pushX * vx + pushY * vy;
  const speedSquared = vx * vx + vy * vy;
  if (dot < 0 && speedSquared > 0) {
    pushX -= dot * vx / speedSquared;
    pushY -= dot * vy / speedSquared;
  }
  axisMove(level, i, count, Math.max(-SOFT_PUSH, Math.min(SOFT_PUSH, pushX)), 'x');
  axisMove(level, i, count, Math.max(-SOFT_PUSH, Math.min(SOFT_PUSH, pushY)), 'y');
}

function moveCook(level: Level, cooks: readonly Cook[], i: number, inputs: StepInputs): Cook {
  const cook = cooks[i];
  if (cook === undefined) throw new Error('Missing cook');
  const frame = inputs.frames.get(cook.id);
  let [x, y] = normaliseAxes(frame?.axes[0] ?? 0, frame?.axes[1] ?? 0, scratch.axes);
  const magnitude = Math.hypot(x, y);
  if (magnitude <= STICK_DEAD_ZONE) {
    x = 0;
    y = 0;
  }
  const vx = x * WALK_SPEED;
  const vy = y * WALK_SPEED;
  const facing = x === 0 && y === 0 ? cook.facing : facingFor(x, y, cook.vx !== 0 || cook.vy !== 0 ? cook.facing : undefined);
  const startX = scratch.x[i] ?? 0;
  const startY = scratch.y[i] ?? 0;
  const blockedX = axisMove(level, i, cooks.length, vx / STEPS_PER_SECOND, 'x');
  const blockedY = axisMove(level, i, cooks.length, vy / STEPS_PER_SECOND, 'y');
  const forward = ((scratch.x[i] ?? 0) - startX) * x + ((scratch.y[i] ?? 0) - startY) * y;
  const dominantBlock = Math.abs(x) >= Math.abs(y) ? blockedX : blockedY;
  if (dominantBlock === 'cook' && magnitude > STICK_DEAD_ZONE &&
      forward < (x * x + y * y) * SIDESTEP * 0.25) {
    // Right-hand passing: opposite sticks yield opposite lateral directions.
    // Cook contact on the dominant axis permits passing while leaning on a wall;
    // each lateral sweep still stops at walls. Solo cooks are never steered.
    axisMove(level, i, cooks.length, -y * SIDESTEP, 'x');
    axisMove(level, i, cooks.length, x * SIDESTEP, 'y');
  }
  separate(level, i, cooks.length, vx, vy);
  const nextX = scratch.x[i] ?? 0;
  const nextY = scratch.y[i] ?? 0;
  const target = targetTile(level, nextX, nextY, facing);
  if (nextX === cook.x && nextY === cook.y && vx === cook.vx && vy === cook.vy &&
      facing === cook.facing && target === cook.targetTile) return cook;
  return { ...cook, x: nextX, y: nextY, vx, vy, facing, targetTile: target };
}

export function moveCooks(
  level: Level, cooks: readonly Cook[], inputs: StepInputs, tick: number,
): readonly Cook[] {
  if (cooks.length > scratch.x.length) throw new Error('Movement supports at most 8 cooks');
  for (let i = 0; i < cooks.length; i += 1) {
    scratch.x[i] = cooks[i]?.x ?? 0;
    scratch.y[i] = cooks[i]?.y ?? 0;
  }
  let changed: Cook[] | null = null;
  // Rotate priority each step; array/frame insertion order never decides traffic priority.
  for (let offset = 0; offset < cooks.length; offset += 1) {
    const i = (tick + offset) % cooks.length;
    const next = moveCook(level, cooks, i, inputs);
    if (next !== cooks[i]) {
      changed ??= cooks.slice();
      changed[i] = next;
    }
  }
  return changed ?? cooks;
}
