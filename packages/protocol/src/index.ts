// @kaki/protocol: every message between phone, host and pairing server, with validators.
//
//   signal.ts       host or phone ↔ pairing server (JSON over a WebSocket), one decoder per role
//   channel.ts      phone ↔ host, reliable ordered data channel (JSON)
//   wire.ts         phone ↔ host, unreliable data channel (binary input, ping and pong frames)
//   input.ts        the input ticks, the phone's send rule and the host's `expandInput`
//   datachannel.ts  the labels and options of the two data channels
//   names.ts        what a nickname may be
//   limits.ts       the protocol version and every size cap
//
// Decoders and validators accept any value, return a `Result` and never throw. The rules every
// user of the package follows are in the README.

export * from './result';
export * from './limits';
export { utf8Length } from './check';
export type { Json } from './check';
export { PEER_ID_PATTERN, ROOM_CODE_PATTERN, TOKEN_PATTERN } from './fields';
export { checkNameContent, checkNickname, checkTeamName, NAME_PROBLEMS } from './names';
export type { NameCheck, NameProblem } from './names';
export * from './datachannel';
export * from './input';
export * from './wire';
export * from './signal';
export * from './channel';
