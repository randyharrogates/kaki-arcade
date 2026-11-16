import type { ControllerLayout, PrivateView, LayoutControl, PanelBlock, CardItem, GridCell, OptionItem } from '../game/layout';

// Known schema fields only. Indexed loops allocate no keys, iterators or callbacks.
function cards(a: readonly CardItem[], b: readonly CardItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) return false;
    if (x.id !== y.id || x.label !== y.label || x.mark !== y.mark || x.colour !== y.colour || x.faceDown !== y.faceDown || x.state !== y.state || x.focus !== y.focus) return false;
  }
  return true;
}
function cells(a: readonly GridCell[], b: readonly GridCell[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) return false;
    if (x.label !== y.label || x.colour !== y.colour || x.state !== y.state || x.focus !== y.focus) return false;
  }
  return true;
}
function options(a: readonly OptionItem[], b: readonly OptionItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) return false;
    if (x.id !== y.id || x.label !== y.label || x.face !== y.face || x.colour !== y.colour || x.state !== y.state || x.focus !== y.focus) return false;
  }
  return true;
}
function control(a: LayoutControl, b: LayoutControl): boolean {
  if (a === b) return true;
  if (a.id !== b.id || a.audience !== b.audience) return false;
  switch (a.kind) {
    case 'stick': return b.kind === 'stick';
    case 'dpad': return b.kind === 'dpad';
    case 'tilt': return b.kind === 'tilt';
    case 'button': return b.kind === 'button' && (a.button === b.button && a.label === b.label && a.colour === b.colour && a.disabled === b.disabled);
    case 'shake': return b.kind === 'shake' && (a.button === b.button);
    case 'swipe': return b.kind === 'swipe' && (a.label === b.label);
    case 'options': return b.kind === 'options' && (a.size === b.size && options(a.options, b.options));
    case 'grid': return b.kind === 'grid' && (a.rows === b.rows && a.cols === b.cols && cells(a.cells, b.cells));
    case 'cards': return b.kind === 'cards' && (a.tappable === b.tappable && cards(a.cards, b.cards));
    case 'text': return b.kind === 'text' && (a.text === b.text && a.tone === b.tone);
  }
}
function block(a: PanelBlock, b: PanelBlock): boolean {
  if (a === b) return true;
  if (a.audience !== b.audience) return false;
  switch (a.kind) {
    case 'text': return b.kind === 'text' && (a.text === b.text && a.tone === b.tone);
    case 'cards': return b.kind === 'cards' && cards(a.cards, b.cards);
    case 'stat': return b.kind === 'stat' && (a.label === b.label && a.value === b.value);
    case 'grid': return b.kind === 'grid' && (a.rows === b.rows && a.cols === b.cols && cells(a.cells, b.cells));
  }
}
export function sameLayout(a: ControllerLayout | undefined, b: ControllerLayout): boolean {
  if (a === b) return true;
  if (a?.revision !== b.revision || a.controls.length !== b.controls.length) return false;
  for (let i = 0; i < a.controls.length; i++) {
    const x = a.controls[i], y = b.controls[i];
    if (!x || !y || !control(x, y)) return false;
  }
  return true;
}
export function sameView(a: PrivateView | null | undefined, b: PrivateView | null): boolean {
  if (a === b) return true;
  if (a === undefined || a === null || b === null) return false;
  if (a.revision !== b.revision || a.blocks.length !== b.blocks.length) return false;
  for (let i = 0; i < a.blocks.length; i++) {
    const x = a.blocks[i], y = b.blocks[i];
    if (!x || !y || !block(x, y)) return false;
  }
  return true;
}
