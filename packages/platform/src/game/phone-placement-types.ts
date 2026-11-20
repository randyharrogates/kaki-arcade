import type { ColourToken as ColourTokenName } from './types';
export type Face = 'face-bottom' | 'face-right' | 'face-left' | 'face-top';
export interface Item { readonly image?: string; readonly badge?: { readonly colour: ColourTokenName; readonly text: string; readonly tick?: boolean }; readonly id?: string; readonly label?: string; readonly state?: 'plain' | 'selected' | 'disabled'; readonly focus?: boolean; readonly colour?: ColourTokenName; readonly face?: Face; readonly faceDown?: boolean; readonly mark?: string }
interface Base { readonly highlighted?: boolean; readonly id: string; readonly audience?: 'everyone' | 'leader' | 'not-leader' }
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
/** Structural counterpart of platform PrivateView; no transport or game dependency. */
export type PanelBlock = { readonly audience?: 'everyone'|'leader'|'not-leader' } & (
  | { readonly kind:'text'; readonly text:string; readonly tone?:'title'|'body'|'note' }
  | { readonly kind:'cards'; readonly cards:readonly (Item & { readonly id:string; readonly label:string })[] }
  | { readonly kind:'stat'; readonly label:string; readonly value:string|number }
  | { readonly kind:'grid'; readonly rows:number; readonly cols:number; readonly cells:readonly Item[] }
);
export interface PrivateView { readonly revision:number; readonly blocks:readonly PanelBlock[] }

export interface Size { readonly width:number; readonly height:number }
export interface Rect extends Size { readonly left:number; readonly top:number }
export function visibleParts(layout:Layout, leader:boolean) { return layout.controls.filter(p => !p.audience || p.audience === 'everyone' || (p.audience === 'leader') === leader); }
