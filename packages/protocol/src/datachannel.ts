// How the two data channels between a phone and the host are opened. The host creates both
// (see the handshake rules in `signal.ts`); the phone finds them by label.
//
// Both channels must have `binaryType` set to `'arraybuffer'` on both sides before any message
// arrives: the frame decoders do not take a `Blob`.

/** The unreliable, unordered channel: binary input, ping and pong frames (`wire.ts`). */
export const INPUT_CHANNEL_LABEL = 'kaki-input';

/** The reliable, ordered channel: JSON messages (`channel.ts`). */
export const CONTROL_CHANNEL_LABEL = 'kaki-control';

/**
 * Options for the input channel, as `RTCPeerConnection.createDataChannel` takes them: a lost
 * frame is never sent again and a late one is not waited for, because the next frame replaces
 * it.
 */
export const INPUT_CHANNEL_OPTIONS: { readonly ordered: false; readonly maxRetransmits: 0 } =
  Object.freeze({ ordered: false, maxRetransmits: 0 });

/** Options for the control channel: every message arrives, in order. */
export const CONTROL_CHANNEL_OPTIONS: { readonly ordered: true } = Object.freeze({ ordered: true });

/** What `binaryType` must be on both channels. */
export const CHANNEL_BINARY_TYPE = 'arraybuffer';
