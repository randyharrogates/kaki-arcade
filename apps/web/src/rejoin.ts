import type { JsonValue } from '@kaki/platform';
export interface RejoinSeat { seat: number; name: string; colour: number }
export function rejoinSeats(value: JsonValue): RejoinSeat[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.kind !== 'rejoin-seats' || !Array.isArray(value.players)) return null;
  const seats: RejoinSeat[] = [];
  for (const p of value.players) {
    if (!p || typeof p !== 'object' || Array.isArray(p) || typeof p.seat !== 'number' || typeof p.name !== 'string' || typeof p.colour !== 'number') return null;
    seats.push({ seat: p.seat, name: p.name, colour: p.colour });
  }
  return seats;
}
export function rejoinWaiting(value: JsonValue): { message: string | null; countdown: number | null } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.kind !== 'rejoin-waiting') return null;
  if (value.message !== null && typeof value.message !== 'string' || value.countdown !== null && typeof value.countdown !== 'number') return null;
  return { message: value.message, countdown: value.countdown };
}
