// Lettering: three font stacks and the type sizes (docs/DESIGN.md §4.2).
//
// HOW THE FONTS WILL BE BUNDLED
// Nothing here loads a font from a CDN, and nothing may. DM Serif Display, DM Sans and
// JetBrains Mono are all under the SIL Open Font License, so they can be self-hosted. The
// plan, for the issue that builds the first real page (C track), is: woff2 files in
// `packages/ui/fonts/` (Latin subset; DM Serif Display 400, DM Sans 400/500/700, JetBrains
// Mono 500/700, about 120 KB together), a generated `fonts.css` with one `@font-face` per file
// using the family names below and `font-display: swap`, and a `<link rel="preload">` for the
// two files the first screen needs. Until those files are added every stack below falls back
// to fonts already on the device, so the layout works and only the letterforms differ.

/** Family names, as `@font-face` will declare them. */
export const fontFamily = {
  display: 'DM Serif Display',
  body: 'DM Sans',
  mono: 'JetBrains Mono',
} as const;

/** Complete `font-family` values with real fallbacks. */
export const fontStack = {
  /** Headings. */
  display: '"DM Serif Display", "Iowan Old Style", "Palatino Linotype", Georgia, "Times New Roman", serif',
  /** Everything else. */
  body: '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Codes and numbers. */
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;
export type FontRole = keyof typeof fontStack;

/** Weights the three families are bundled in. */
export const fontWeight = {
  regular: 400,
  medium: 500,
  bold: 700,
} as const;

/** Small text on a team colour is bold (700); at 21 px it clears the large-text floor. */
export const TEAM_TEXT_WEIGHT = fontWeight.bold;

/** Type sizes on the big screen, in px at true size on 1920 × 1080 (§4.2). */
export const tvType = {
  /** Smallest text on the TV: labels and captions nobody must read in play. */
  label: 21,
  /** Smallest text a player must read in play (§6: 34 px at 1080p). */
  body: 34,
  title: 55,
  display: 89,
  /** Room code, final score. */
  hero: 144,
  roomCode: 233,
} as const;
export const TV_TYPE_SIZES = [21, 34, 55, 89, 144, 233] as const;

/** Phone type scale in px (D-056). */
export const phoneType = {
  /** Hints and captions only; never a control's label. */
  caption: 13,
  body: 21,
  /** Button labels. */
  title: 34,
  display: 55,
  hero: 89,
} as const;
export const PHONE_TYPE_SIZES = [13, 21, 34, 55, 89] as const;

/** Line heights: headings sit tight, running text is open. */
export const lineHeight = {
  display: 1,
  body: 1.3,
} as const;
