import type { ComponentChildren } from 'preact';
export interface FadeSnapshot { id: number; content: ComponentChildren }
/** A new identity must not replace ink that is still exiting. */
export function retainOutgoing(layers: readonly FadeSnapshot[], snapshot: FadeSnapshot): FadeSnapshot[] {
  return [...layers, snapshot];
}
