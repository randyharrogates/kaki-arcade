// Development-only entry; never re-export from the platform runtime (PLAT-030, NFR-TEST).
export { createMatch, makeMatchPlayers, replayMatch, parseRecording } from './match';
export type { Match, MatchOptions, MatchEvent, MatchRecording, ReplayDivergence } from './match';
export { createBots, offeredTaps } from './bots';
export type { BotOptions } from './bots';
export { testPredicate } from './scripts';
export type { NamedButton, ViewPredicate, ScriptCommand, PlayerScript } from './scripts';
export { dumpView, diffViews, formatTimeline, headline } from './text';
export type { DumpOptions, TimelineEntry } from './text';
