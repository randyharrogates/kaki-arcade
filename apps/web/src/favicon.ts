/** Resolve the active console tokens rather than duplicating colour literals in HTML. */
export function installFavicon(): void {
  const tokens = getComputedStyle(document.documentElement);
  const background = tokens.getPropertyValue('--ka-panel-from').trim();
  const ink = tokens.getPropertyValue('--ka-chip').trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><rect width="34" height="34" rx="8" fill="${background}"/><path d="M8 8v18M26 8L8 17l18 9" fill="none" stroke="${ink}" stroke-width="3"/></svg>`;
  const link = document.createElement('link');
  link.rel = 'icon'; link.type = 'image/svg+xml'; link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  document.head.append(link);
}
