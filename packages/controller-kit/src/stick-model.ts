import { knobStretch, space } from '@kaki/ui';

export interface Vector { readonly x: number; readonly y: number }
export interface StickArea { readonly left: number; readonly top: number; readonly width: number; readonly height: number }
export const DEAD_ZONE = space[5];
export const stickRadius = (area: StickArea) => Math.max(0, Math.min(space[55], area.width / 2, area.height / 2));
export function stickModel(area: StickArea, anchor: Vector, pointer: Vector) {
  const radius = stickRadius(area);
  const dx = pointer.x - anchor.x; const dy = pointer.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  const unit = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 };
  const deadZone = Math.min(DEAD_ZONE, radius);
  const magnitude = radius > deadZone ? Math.max(0, Math.min(1, (distance - deadZone) / (radius - deadZone))) : 0;
  const excess = Math.max(0, distance - radius);
  const allowance = radius / 4;
  const travel = radius === 0 ? 0 : Math.min(distance, radius) + allowance * excess / (allowance + excess);
  return { radius, deadZone, offset: { x: unit.x * travel, y: unit.y * travel },
    vector: { x: unit.x * magnitude, y: unit.y * magnitude },
    stretch: knobStretch(magnitude), angle: Math.atan2(dy, dx) };
}
export interface StickPointer { readonly pointerId: number; readonly area: StickArea; readonly anchor: Vector }
export interface StickEvent { type: 'down' | 'move' | 'up' | 'cancel'; pointerId: number; position: Vector; area: StickArea }
/** Ignored pointers produce no output, including when they release. */
export function routeStick(state: StickPointer | null, event: StickEvent) {
  if (event.type === 'down' && state === null) {
    const { position: p, area: a } = event;
    if (p.x < a.left || p.y < a.top || p.x > a.left + a.width || p.y > a.top + a.height) return { state, output: null };
    const next = { pointerId: event.pointerId, area: a, anchor: { x: Math.max(a.left + stickRadius(a), Math.min(a.left + a.width - stickRadius(a), p.x)), y: Math.max(a.top + stickRadius(a), Math.min(a.top + a.height - stickRadius(a), p.y)) } };
    return { state: next, output: stickModel(a, next.anchor, p) };
  }
  if (event.pointerId !== state?.pointerId || event.type === 'down') return { state, output: null };
  const release = event.type === 'up' || event.type === 'cancel';
  return { state: release ? null : state, output: stickModel(state.area, state.anchor, release ? state.anchor : event.position) };
}
