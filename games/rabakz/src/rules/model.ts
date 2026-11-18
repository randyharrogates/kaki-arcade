import type { RabakzRecord } from '../records';
import type { PlayerInfo } from '@kaki/platform';
import type { RngState } from '@kaki/sim-core';

export interface Question {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correct: number;
  readonly category: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly type: 'multiple-choice' | 'true-false' | 'picture';
  readonly region: 'general' | 'singapore';
  readonly picture?: {
    readonly file: string; readonly alt: string; readonly credit: string;
    readonly sourceUrl: string; readonly licence: string;
    readonly bytes: number;
  };
}
export interface Settings {
  readonly length: 10 | 30 | 50;
  readonly categories?: readonly string[];
  readonly difficulty: 'easy' | 'mixed' | 'hard';
}
export interface Seat {
  readonly info: PlayerInfo;
  readonly incarnation: number;
  readonly score: number;
  readonly streak: number;
  readonly gained: number;
  readonly pick: number | null;
  readonly answers: readonly number[];
  /** This player ended the current question with an accepted skip. */
  readonly skipped: boolean;
  readonly privateRevision: number;
  readonly eligible: boolean;
  readonly joinedMidGame: boolean;
}
/** Public totals only; absent until the first scoreboard (zero baseline). */
export interface ScoreboardTotals {
  readonly players: readonly { readonly incarnation: number; readonly score: number }[];
  readonly teams: readonly [number, number];
}
export interface State {
  readonly savedRecord: RabakzRecord;
  readonly soloEligible: boolean;
  readonly soloBest?: number;
  readonly scoreboardTotals?: {
    readonly current: ScoreboardTotals;
    readonly previous?: ScoreboardTotals;
  };
  /** Accepted wrong presses per seat for this question; no answer choices or timing. */
  readonly wrongPresses: Readonly<Record<number, number>>;
  readonly rng: RngState;
  readonly nextSeat: number;
  readonly retiredRevisions: Readonly<Record<string, number>>;
  readonly questions: readonly Question[];
  readonly settings: Settings;
  readonly players: readonly Seat[];
  readonly teams: boolean;
  readonly teamScores: readonly [number, number];
  readonly round: number;
  readonly phase: 'question' | 'final' | 'reveal' | 'scoreboard' | 'over';
  readonly tick: number;
  readonly elapsed: number;
  readonly firstCorrect: number | null;
  readonly wrong: readonly number[];
  readonly winners: readonly Seat[];
}
export const QUESTION_DATA = 'selected-questions.json';
export const CATEGORY_DATA = 'categories.json';
export const DEFAULT_SETTINGS: Settings = {
  length: 10, categories: [], difficulty: 'mixed',
};
export function seat(info: PlayerInfo, joinedMidGame = false, incarnation = 0): Seat {
  return { info, incarnation, score: 0, streak: 0, gained: 0, pick: null, answers: [], skipped: false, privateRevision: 0,
    eligible: !joinedMidGame, joinedMidGame };
}
export function question(state: State): Question {
  const current = state.questions[state.round];
  if (!current) throw new Error('Missing question');
  return current;
}
export function finalRound(state: State): boolean {
  return state.round >= state.settings.length * 0.9;
}
