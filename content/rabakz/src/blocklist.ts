// The all-ages screen hook (RZ-023): a list of terms no question may contain. Pure.

import { wordFold } from './text';

export interface Blocklist {
  /** Folded terms, sorted, no duplicates. */
  readonly terms: readonly string[];
}

/** Reads the word list file: one term per line, `#` comments and blank lines ignored. */
export function parseBlocklist(text: string): Blocklist {
  const terms = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const term = wordFold(trimmed);
    if (term.length > 0) terms.add(term);
  }
  return { terms: [...terms].sort() };
}

/**
 * The listed terms found in a text, whole words only: "ass" is found in "kick-ass" and not in
 * "class". A phrase is found when its words appear together in order.
 */
export function findBlocked(text: string, blocklist: Blocklist): string[] {
  if (blocklist.terms.length === 0) return [];
  const padded = ` ${wordFold(text)} `;
  return blocklist.terms.filter((term) => padded.includes(` ${term} `));
}
