// What a game needs at play time: the question types and the match loader. The validator and
// the builder are in `@kaki/content-rabakz/tools`.
//
// A `Question` holds its answer and stays in the host's simulation. Only a `PublicQuestion`
// (from `toPublicQuestion`) may be put in a public view or sent to a phone.

export type {
  BankIndex,
  BuiltPicture,
  CategoryEntry,
  Chunk,
  Counts,
  Difficulty,
  PublicPicture,
  PublicQuestion,
  Question,
  QuestionType,
  Region,
  SourceCredit,
} from './schema';
export {
  BANK_FORMAT,
  DIFFICULTIES,
  LIMITS,
  MATCH_TRANSFER_BUDGET_BYTES,
  OPTION_COUNT,
  QUESTION_TYPES,
  REGIONS,
} from './schema';
export type {
  ChunkFault,
  ChunkReadiness,
  DifficultySetting,
  LoadedChunk,
  MatchLength,
  MatchSettings,
  RegionSetting,
  SelectInput,
  Selection,
} from './select';
export {
  MATCH_LENGTHS,
  checkChunks,
  chunkBytesNeeded,
  chunksNeeded,
  difficultyQuota,
  parseChunk,
  picturesMissing,
  poolSize,
  selectQuestions,
  settingsFault,
  toPublicQuestion,
} from './select';
