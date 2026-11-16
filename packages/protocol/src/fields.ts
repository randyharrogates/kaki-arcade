// Checks for the identifiers and names that appear in more than one message family.

import { BAD, BIG, int, text } from './check';
import type { Check } from './check';
import { MAX_COUNTER, MAX_NAME_CODE_POINTS, MAX_PLAYERS } from './limits';
import { checkNameContent } from './names';

/**
 * A room code as the pairing server stores it: 4 to 8 capital letters and digits. How long it
 * is and which characters it avoids is the pairing server's choice (C-01).
 */
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,8}$/;
export const roomCode: Check<string> = text(4, 8, ROOM_CODE_PATTERN);

/**
 * A secret token (host token, room token, seat token): 16 to 128 URL-safe characters. Whoever
 * issues a token decides what is inside it; nobody else reads it.
 */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
export const token: Check<string> = text(16, 128, TOKEN_PATTERN);

/** The pairing server's name for one phone's connection: 1 to 32 URL-safe characters. */
export const PEER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const peerId: Check<string> = text(1, 32, PEER_ID_PATTERN);

/**
 * A name the host has already accepted and is now telling a phone: a nickname in `seat`, a
 * team name in `room`. It is checked for content only (size in code points, forbidden
 * characters, something that shows), not for its count of visible characters. The host made
 * that count with `checkNickname`, and the host's count is the authority: a phone whose
 * browser counts differently must never refuse a name its host accepted.
 */
export const acceptedName: Check<string> = (value) => {
  const result = checkNameContent(value);
  if (result === 'ok') return value as string;
  return result === 'too-long' ? BIG : BAD;
};

/**
 * A name a phone is asking for. It is checked only for size here, so that the host can read
 * it, run `checkNickname` and the blocked-words filter itself, and tell the phone why if it
 * says no.
 */
export const requestedName: Check<string> = text(0, MAX_NAME_CODE_POINTS * 2);

/** A seat number, 1 to 8. */
export const seatNumber: Check<number> = int(1, MAX_PLAYERS);

/** An index into the eight player colours defined in `packages/ui`, 0 to 7. */
export const colourIndex: Check<number> = int(0, MAX_PLAYERS - 1);

/** A revision or other counter: a whole number from 0 to 2^32 - 1. */
export const counter: Check<number> = int(0, MAX_COUNTER);
