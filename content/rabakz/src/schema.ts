// The Rabakz question schema (RZ-022): what a question is in a source file, what it becomes in
// a generated chunk, and the limits the build enforces. Types and constants only.

/** The three kinds the spec allows (RZ-002). There is no type-the-answer question. */
export const QUESTION_TYPES = ['multiple-choice', 'true-false', 'picture'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const REGIONS = ['general', 'singapore'] as const;
export type Region = (typeof REGIONS)[number];

/** Options a question of each type must have (RZ-002): four, two, four. */
export const OPTION_COUNT: Readonly<Record<QuestionType, number>> = {
  'multiple-choice': 4,
  'true-false': 2,
  picture: 4,
};

/** A true-or-false question always offers these two, in this order, with this spelling. */
export const TRUE_FALSE_OPTIONS: readonly [string, string] = ['True', 'False'];

/**
 * Length limits. A length is counted in characters as a player sees them: one per Unicode code
 * point, two for an emoji (see `displayLength`). Only Latin and Greek letters are accepted, so
 * the widths below hold; nothing here depends on how long players have to answer.
 *
 * `prompt` and `option` are the limits of RZ-022. They were checked against the decided Rabakz
 * question frame (board 3, layout 3A, D-046: 1920 x 1080, 55 px padding, picture column to
 * question column 1 : 1.618 with a 34 px gap, answers 2 x 2) and against the phone button
 * (RZ-003 puts the option text on the phone), at the type sizes of DESIGN.md 4.2, taking an
 * average glyph as 0.5 em for the serif heading face and 0.55 em for the bold sans:
 *
 * - TV question column: (1810 - 34) x 1.618 / 2.618 = 1097 px. At 55 px a line holds about 39
 *   characters, so 120 characters is 4 lines, 5 with unlucky wrapping; 5 x 66 px = 330 px, and
 *   the column has 415 px above the answers. Up to about 60 characters fits at 89 px.
 * - `promptWord`: one unbroken word must fit one line of that column at 55 px. 39 average
 *   glyphs fit; the limit is 30, which leaves room for a word in capitals or wide letters.
 * - TV answer cell (2 x 2, 21 px gap): 538 px wide, less 34 px padding each side and the 89 px
 *   shape with its 21 px gap, leaves 360 px of text. A short option is set at 55 px; a long
 *   one must step down to 34 px, where a line holds about 19 characters and the 144 px cell
 *   holds 3 lines, so 40 characters fits. (A requirement on the big-screen view, R-03.)
 * - Phone button (844 x 390, two buttons across): about 292 px of text. At 34 px bold a line
 *   holds about 15 characters; a 40-character option needs the phone to step down to 21 px
 *   (about 25 characters a line) and wrap to as many as 3 lines. (A requirement on the
 *   controller layout, R-02.)
 * - `optionWord`: one unbroken word must fit one 292 px phone line at 34 px, so 15 characters.
 *   That is the tighter of the two screens (the TV line holds 19).
 *
 * The other limits are ours: a category title fits a chip at 21 px, alt text and the credit fit
 * one line at 21 px under a picture, and a source note is never shown on the TV.
 * `pictureBytes` keeps a match inside the 2 MB budget of RZ-020: about 10 pictures of that size
 * fit beside the chunks of a full-size bank (see `poolSize`).
 */
export const LIMITS = {
  prompt: 120,
  promptMin: 8,
  promptWord: 30,
  option: 40,
  optionWord: 15,
  categoryTitle: 24,
  id: 48,
  pictureAlt: 120,
  pictureCredit: 80,
  pictureBytes: 150_000,
  sourceNoteMin: 12,
  sourceNote: 240,
} as const;

/** Lower-case words joined by single hyphens: `geography`, `food-and-drink`, `sg-hist-0042`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A photograph file inside `content/rabakz/pictures/`. */
export const PICTURE_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|jpeg|png|webp)$/;

/** What a picture file really is, from its first bytes. */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

/** A file found in `pictures/`. */
export interface PictureFile {
  readonly bytes: number;
  /** Null when the file does not start like a JPEG, PNG or WebP image. */
  readonly format: ImageFormat | null;
}

/**
 * Licences a picture may carry (RZ-025: freely licensed, with the credit the licence requires).
 * Public domain, CC0 1.0, and CC BY or CC BY-SA in the versions that exist (1.0, 2.0, 2.5, 3.0,
 * 4.0). Non-commercial and no-derivatives licences are not free and are rejected.
 */
export const FREE_LICENCE_PATTERN =
  /^(?:Public domain|CC0 1\.0|CC BY(?:-SA)? (?:1\.0|2\.0|2\.5|3\.0|4\.0))$/;

/** RZ-020: a match's questions and images are at most 2 MB transferred. */
export const MATCH_TRANSFER_BUDGET_BYTES = 2_000_000;

/** RZ-024 launch sizes. */
export const BANK_TARGETS = { total: 1500, singapore: 200, picture: 60 } as const;

/** The version of the generated files. A loader refuses any other. */
export const BANK_FORMAT = 1;

/** A question taken from an openly licensed dataset. */
export interface DatasetSource {
  readonly kind: 'dataset';
  /** The dataset's name as it will appear on the credits page. */
  readonly dataset: string;
  readonly licence: string;
  /** The address of the licence's own text, for the link on the credits page. */
  readonly licenceUrl?: string;
  readonly url?: string;
  /**
   * What the licence requires us to say beside the credit: for a share-alike dataset, that the
   * questions were adapted and that the adapted bank is offered under the same licence
   * (RZ-021). Carried into the index for the credits page. Required when the licence is a
   * share-alike one (its name contains "SA").
   */
  readonly notice?: string;
}

/** A question written for Kaki Arcade. The note says where the fact can be checked. */
export interface OriginalSource {
  readonly kind: 'original';
  readonly note: string;
}

export type QuestionSource = DatasetSource | OriginalSource;

export interface Picture {
  /** File name inside `content/rabakz/pictures/`. */
  readonly file: string;
  /** What the picture shows, without naming the answer. */
  readonly alt: string;
  /** The credit line the licence requires. */
  readonly credit: string;
  readonly licence: string;
  /** Where the photograph was taken from. */
  readonly sourceUrl: string;
}

/** A question as a person writes it in `src/questions/<category>.json`. */
export interface SourceQuestion {
  /** Stable and unique across the bank. Never reused or changed once shipped. */
  readonly id: string;
  readonly type: QuestionType;
  readonly prompt: string;
  readonly options: readonly string[];
  /** The exact text of the one correct option. */
  readonly answer: string;
  readonly difficulty: Difficulty;
  readonly region: Region;
  readonly picture?: Picture;
  /** May be left out when the file has a `defaultSource`. */
  readonly source?: QuestionSource;
}

/** One source file: one category. The file is named `<category>.json`. */
export interface SourceFile {
  readonly category: string;
  readonly title: string;
  readonly defaultSource?: QuestionSource;
  readonly questions: readonly SourceQuestion[];
}

export interface BuiltPicture extends Picture {
  /** Size of the file, for the 2 MB budget. */
  readonly bytes: number;
}

/**
 * A question in a generated chunk: what a match needs and nothing else. The per-question source
 * stays in the source file; the index carries the credits.
 *
 * Option order: this package stores options in source order and never shuffles them. The game
 * rules (R-01) shuffle the four options of a multiple-choice or picture question with the match
 * seed (RZ-026). A true-or-false question stays in the fixed order True, False.
 *
 * A `Question` holds the answer. It belongs to the host's simulation only: never put one in a
 * public view or send one to a phone. Use `toPublicQuestion`.
 */
export interface Question {
  readonly id: string;
  readonly type: QuestionType;
  readonly category: string;
  readonly difficulty: Difficulty;
  readonly region: Region;
  readonly prompt: string;
  readonly options: readonly string[];
  /** Index into `options`. */
  readonly correct: number;
  readonly picture?: BuiltPicture;
}

/**
 * What players may know of a picture before the reveal: where to load it, what it shows and
 * whom to credit. Not the source address, which often names the subject, nor the licence or
 * the size.
 */
export type PublicPicture = Pick<Picture, 'file' | 'alt' | 'credit'>;

/**
 * The only form of a question that may appear in a public view or be sent to a phone before
 * the reveal: a `Question` without `correct`, its picture cut down to a `PublicPicture`.
 * (Chunks carry no source note at all.)
 */
export interface PublicQuestion extends Omit<Question, 'correct' | 'picture'> {
  readonly picture?: PublicPicture;
}

export interface Chunk {
  readonly format: typeof BANK_FORMAT;
  readonly category: string;
  readonly title: string;
  readonly questions: readonly Question[];
}

export interface Counts {
  readonly total: number;
  readonly byDifficulty: Readonly<Record<Difficulty, number>>;
  readonly byRegion: Readonly<Record<Region, number>>;
  readonly byType: Readonly<Record<QuestionType, number>>;
  /** Difficulty by region, so a pool can be sized from the index alone. */
  readonly byDifficultyAndRegion: Readonly<Record<Difficulty, Readonly<Record<Region, number>>>>;
  /** The picture questions among them, the same way. */
  readonly picturesByDifficultyAndRegion: Readonly<
    Record<Difficulty, Readonly<Record<Region, number>>>
  >;
}

/** How the correct answers fall, so a lopsided bank is seen. */
export interface AnswerBalance {
  /** True-or-false questions whose answer is True, and False. */
  readonly trueFalse: { readonly true: number; readonly false: number };
  /**
   * Four-option questions by the source position of the correct option. Only a report: the game
   * shuffles these options, so a skew here never reaches a player.
   */
  readonly sourcePositions: readonly [number, number, number, number];
}

export interface CategoryEntry {
  readonly id: string;
  readonly title: string;
  /**
   * Chunk file name, beside the index: `<id>.<first 12 characters of the hash>.json`, so a
   * cached chunk can never be mistaken for the one a newer index describes.
   */
  readonly file: string;
  /** Hash of the chunk file's exact bytes. */
  readonly hash: string;
  /** Size of the chunk file. */
  readonly bytes: number;
  readonly counts: Counts;
  /** The picture files this category's questions use, sorted by name, each once. */
  readonly pictures: readonly { readonly file: string; readonly bytes: number }[];
}

/** One line for the credits page (RZ-021). */
export interface SourceCredit {
  readonly dataset: string;
  readonly licence: string;
  readonly licenceUrl?: string;
  readonly url?: string;
  /** The adaptation and share-alike statement, when the dataset's licence asks for one. */
  readonly notice?: string;
  readonly questions: number;
}

export interface BankIndex {
  readonly format: typeof BANK_FORMAT;
  readonly totals: Counts;
  readonly answers: AnswerBalance;
  /** Sorted by id. */
  readonly categories: readonly CategoryEntry[];
  /** Datasets used, sorted by name. */
  readonly credits: readonly SourceCredit[];
  /** Questions written for Kaki Arcade. */
  readonly originalQuestions: number;
}
