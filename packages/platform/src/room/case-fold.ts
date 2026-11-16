/** Identity folding after compatibility normalisation. */
export function caseFold(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/ß/gu, 'ss').replace(/ς/gu, 'σ')
    .replace(/ᾲ/gu, 'ὰι');
}
