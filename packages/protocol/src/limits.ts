// The protocol version and every size cap, in one place.

/**
 * Sent in every message. Binary frames carry it in four bits, so it must stay between 0 and 15.
 */
export const PROTOCOL_VERSION = 1;

/** Players in a room (PLAT-003). Seats are numbered 1 to this. */
export const MAX_PLAYERS = 8;

/** Largest signalling message, in bytes of UTF-8. */
export const MAX_SIGNAL_BYTES = 16_384;

/**
 * Largest reliable data-channel message, in bytes of UTF-8. 16 KiB is the size every browser
 * sends in one piece.
 */
export const MAX_CHANNEL_BYTES = 16_384;

/**
 * Largest session description, in bytes as it sits inside the JSON message (UTF-8, with JSON
 * escapes counted). A data-channel-only description is about 1,000.
 */
export const MAX_SDP_BYTES = 8_192;

/** Largest ICE candidate line, in bytes as it sits inside the JSON message. */
export const MAX_CANDIDATE_BYTES = 1_024;

/** Largest controller layout payload, in bytes of JSON. Its shape belongs to the game interface. */
export const MAX_LAYOUT_BYTES = 4_096;

/** Largest private view payload, in bytes of JSON. Its shape belongs to the game interface. */
export const MAX_VIEW_BYTES = 8_192;

/** Largest action payload, in bytes of JSON. Its shape belongs to the game interface. */
export const MAX_ACTION_BYTES = 1_024;

/** Deepest nesting allowed in a layout, view or action payload. */
export const MAX_JSON_DEPTH = 16;

/** Longest nickname, in characters as a player sees them (PLAT-004). */
export const MAX_NICKNAME_CHARS = 12;

/**
 * Most code points in any name. One visible character can be several code points (a letter
 * with accents, an emoji built from joined parts); this stops a short-looking name being huge.
 */
export const MAX_NAME_CODE_POINTS = 48;

/** Longest team name, in characters as a player sees them. */
export const MAX_TEAM_NAME_CHARS = 24;

/** Most ICE servers in one grant, and most URLs in one server. */
export const MAX_ICE_SERVERS = 4;
export const MAX_ICE_URLS = 4;

/**
 * Longest ICE server URL, username or credential, in characters. They must be printable ASCII
 * with no spaces, so characters and bytes are the same. A grant at every maximum is under
 * 7,000 bytes, well inside `MAX_SIGNAL_BYTES`.
 */
export const MAX_ICE_TEXT_CHARS = 256;

/** Largest counter value (layout and view revisions): the largest unsigned 32-bit integer. */
export const MAX_COUNTER = 0xffff_ffff;
