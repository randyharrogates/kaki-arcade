// Build-time tools: the schema, the validator, the builder and the stats report. Used by the
// scripts in this package and by the import scripts of later issues.

export * from './schema';
export type { Blocklist } from './blocklist';
export { findBlocked, parseBlocklist } from './blocklist';
export type { BuildInput, BuildOutput, BuildResult, TextFile } from './build';
export {
  BALANCE_MAX_SHARE,
  BALANCE_MIN_QUESTIONS,
  HASH_IN_NAME,
  INDEX_FILE,
  answerBalance,
  buildBank,
  countQuestions,
  serialise,
} from './build';
export type { BankStats, TargetLine } from './stats';
export { bankStats, formatStats } from './stats';
export {
  containsPhrase,
  displayLength,
  duplicateJsonKey,
  optionKey,
  promptKey,
  textFault,
  utf8Length,
  wordFold,
  words,
} from './text';
export type { Problem, Rule, ValidQuestion, ValidatedFile, ValidationContext } from './validate';
export {
  GIVEAWAY_MIN_DIFFERENCE,
  GIVEAWAY_RATIO,
  imageFormat,
  lengthGiveaway,
  validateSourceFile,
} from './validate';
