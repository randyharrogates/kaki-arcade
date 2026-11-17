import type { ColourTokenName } from '@kaki/ui';
/** Structural input boundary: accepts platform ControllerLayout without a runtime dependency.
 * Keep in step with platform/src/game/layout.ts; platform owns the wire contract. */
export type Face = 'face-bottom' | 'face-right' | 'face-left' | 'face-top';
export interface Item { readonly id?: string; readonly label?: string; readonly state?: 'plain' | 'selected' | 'disabled'; readonly focus?: boolean; readonly colour?: ColourTokenName; readonly face?: Face; readonly faceDown?: boolean; readonly mark?: string }
interface Base { readonly id: string; readonly audience?: 'everyone' | 'leader' | 'not-leader' }
export type LayoutPart = Base & (
  | { readonly kind: 'stick' | 'dpad' | 'tilt' }
  | { readonly kind: 'button'; readonly button: Face | 'shoulder-left' | 'shoulder-right'; readonly label: string; readonly disabled?: boolean; readonly colour?: ColourTokenName }
  | { readonly kind: 'shake'; readonly button: Face | 'shoulder-left' | 'shoulder-right' }
  | { readonly kind: 'swipe'; readonly label?: string }
  | { readonly kind: 'options'; readonly options: readonly (Item & { readonly id: string; readonly label: string })[]; readonly size?: 'large' }
  | { readonly kind: 'grid'; readonly rows: number; readonly cols: number; readonly cells: readonly Item[] }
  | { readonly kind: 'cards'; readonly cards: readonly (Item & { readonly id: string; readonly label: string })[]; readonly tappable?: boolean }
  | { readonly kind: 'text'; readonly text: string; readonly tone?: 'title' | 'body' | 'note' }
);
export interface Layout { readonly revision: number; readonly controls: readonly LayoutPart[] }
export type LayoutValue = boolean | string | number | { readonly x: number; readonly y: number };
export interface LayoutOutput { readonly control: string; readonly revision: number; readonly phase: 'press' | 'release' | 'change' | 'choose'; readonly value: LayoutValue }
export const faceShape = { 'face-bottom': 'cross', 'face-right': 'circle', 'face-left': 'square', 'face-top': 'triangle' } as const;
export function visibleParts(layout: Layout, leader: boolean): readonly LayoutPart[] {
  return layout.controls.filter(part => !part.audience || part.audience === 'everyone' || (part.audience === 'leader') === leader);
}
/** Mirrors the platform tap meaning independently of wire revision bumps. */
function signature(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(signature).join('')}]`;
  const text = String(value);
  return `${String(text.length)}:${text}`;
}
export function layoutTapSignature(layout: Layout): string {
  return signature(layout.controls.flatMap<unknown>(part => {
    const base = [part.id, part.audience ?? 'everyone'];
    if (part.kind === 'options') return [[...base, part.options.map(item => [item.id, item.label])]];
    if (part.kind === 'grid') return [[...base, part.rows, part.cols, part.cells.map(item => item.label ?? '')]];
    if (part.kind === 'cards' && part.tappable) return [[...base, part.cards.map(item => [item.id, item.label, item.faceDown === true])]];
    if (part.kind === 'swipe') return [base];
    return [];
  }));
}
export function revisionProblem(previous: Layout, next: Layout): string | null {
  if (!Number.isInteger(next.revision) || next.revision < previous.revision) return 'Layout revision must be a non-decreasing whole number';
  return null;
}
export function layoutOutput(layout: Layout, control: string, phase: LayoutOutput['phase'], value: LayoutValue): LayoutOutput {
  return { control, phase, value, revision: layout.revision };
}
