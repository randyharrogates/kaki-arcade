import { ROOM_CODE_PATTERN } from '@kaki/protocol';
export function normaliseCode(code: string): string {
  const clean = code.replace(/[\s-]/g, '').toUpperCase();
  return ROOM_CODE_PATTERN.test(clean) ? clean : '';
}
export function joinLink(origin: string, code: string, override = ''): string {
  const clean = normaliseCode(code);
  if (!clean) return '';
  try {
    const url = new URL(override || origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    // Deliberately discard credentials, path, query and fragment from the supplied origin.
    return `${url.origin}/play?code=${clean}`;
  } catch { return ''; }
}
