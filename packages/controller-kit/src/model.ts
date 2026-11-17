import { playerColour } from '@kaki/ui';
import type { SeatNumber } from '@kaki/ui';
export type LinkState = 'connected' | 'reconnecting' | 'lost';
export const indicators = {
  connected: { word: 'Connected', icon: '✓' },
  reconnecting: { word: 'Reconnecting', icon: '↻' },
  lost: { word: 'Lost', icon: '!' },
} as const;
export function headerModel(seat: SeatNumber, name: string, link: LinkState) {
  return { seat, name, colour: playerColour(seat), ...indicators[link] };
}
