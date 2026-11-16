// Human-readable diagnostics for deterministic rules tests (PLAT-030, NFR-TEST).
function json(value: unknown): string {
  const result: unknown = JSON.stringify(value);
  return typeof result === 'string' ? result : '<absent>';
}
export interface DumpOptions { maxArray?: number; maxDepth?: number; maxLines?: number; width?: number }
/** Sorted JSON, bounded to one screen. Truncation always says what was omitted. */
export function dumpView(value: unknown, options: DumpOptions = {}): string {
  const { maxArray = 5, maxDepth = 5, maxLines = 24, width = 100 } = options;
  function bounded(item: unknown, depth: number): unknown {
    if (typeof item === 'string') return item.length > width ? `${item.slice(0, width)}… (${String(item.length)} chars)` : item;
    if (item === null || typeof item !== 'object') return item;
    if (depth >= maxDepth) return Array.isArray(item) ? `[${String(item.length)} items]` : `{${String(Object.keys(item).length)} keys}`;
    if (Array.isArray(item)) {
      const array: unknown[] = (item as unknown[]).slice(0, maxArray).map((entry) => bounded(entry, depth + 1));
      if (item.length > maxArray) array.push(`… ${String(item.length - maxArray)} more (${String(item.length)} total)`);
      return array;
    }
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, bounded((item as Record<string, unknown>)[key], depth + 1)]));
  }
  const lines = JSON.stringify(bounded(value, 0), null, 2).split('\n');
  const shown = lines.slice(0, maxLines).map((line) => line.length > width ? `${line.slice(0, width - 1)}…` : line);
  if (lines.length > maxLines) shown[maxLines - 1] = `… ${String(lines.length - maxLines + 1)} more lines`;
  return shown.join('\n');
}
export interface TimelineEntry { step: number; text: string }
/** Override the selector for games with a different headline convention. */
export function headline(view: unknown): string {
  if (view !== null && typeof view === 'object') {
    const record = view as Record<string, unknown>;
    return ['phase', 'headline', 'round', 'over'].filter((key) => record[key] !== undefined)
      .map((key) => `${key}=${JSON.stringify(record[key])}`).join(' ') || 'match';
  }
  return String(view);
}
export function formatTimeline(entries: readonly TimelineEntry[]): string {
  return entries.map((entry) => `${String(entry.step).padStart(6)}  ${entry.text}`).join('\n');
}
/** Full, untruncated public JSON diff paths; secrets are never read here. */
export function diffViews(before: unknown, after: unknown, path = '$'): string[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before !== null && after !== null && typeof before === 'object' && typeof after === 'object') {
    const a = before as Record<string, unknown>, b = after as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
      .flatMap((key) => diffViews(a[key], b[key], `${path}.${key}`));
  }
  return [`${path}: ${json(before)} -> ${json(after)}`];
}
