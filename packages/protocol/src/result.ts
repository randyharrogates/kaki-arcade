// What every decoder and validator returns. Nothing in this package throws on bad input.

/**
 * Why a message was refused.
 *
 * - `not-text`      a text decoder was given something that is not a string
 * - `not-json`      the text is not JSON
 * - `not-object`    the value is not an object
 * - `too-large`     the message, or one field of it, is over its size cap
 * - `bad-version`   the protocol version is missing or is not ours
 * - `unknown-type`  the message type is not one this direction accepts
 * - `bad-field`     a field is missing or has the wrong shape (`field` names it)
 * - `bad-frame`     a binary frame is not bytes, is empty or has the wrong length for its kind
 */
export type ProtocolErrorCode =
  | 'not-text'
  | 'not-json'
  | 'not-object'
  | 'too-large'
  | 'bad-version'
  | 'unknown-type'
  | 'bad-field'
  | 'bad-frame';

export interface ProtocolError {
  readonly code: ProtocolErrorCode;
  /** The top-level field at fault, when one can be named. */
  readonly field: string | null;
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProtocolError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(code: ProtocolErrorCode, field: string | null = null): Result<never> {
  return { ok: false, error: { code, field } };
}
