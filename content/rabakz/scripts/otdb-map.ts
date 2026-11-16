// The pure half of the Open Trivia Database import (RZ-021, RZ-023): turns downloaded
// questions into Rabakz source questions, drops what is not fit for the bank, and counts why.
// No file system, no network, no clock: the caller supplies the hash and the word list.

import type {
  Blocklist,
  DatasetSource,
  Difficulty,
  Rule,
  SourceFile,
  SourceQuestion,
} from '../src/tools';
import {
  DIFFICULTIES,
  lengthGiveaway,
  optionKey,
  promptKey,
  validateSourceFile,
  wordFold,
} from '../src/tools';
import { EXCLUDED_CATEGORIES, screenQuestion } from './otdb-screen';

/** A category as the dataset lists it. */
export interface OtdbCategory {
  readonly id: number;
  readonly name: string;
}

/** A downloaded question, already percent-decoded. */
export interface OtdbRawQuestion {
  readonly categoryId: number;
  /** `multiple` or `boolean`. */
  readonly type: string;
  readonly difficulty: string;
  readonly question: string;
  readonly correct: string;
  readonly incorrect: readonly string[];
}

/** Every imported id starts with this, so a later import can tell its own questions apart. */
export const ID_PREFIX = 'otdb-';

/** Recorded on every imported file and carried into the index for the credits page. */
export const OTDB_SOURCE: DatasetSource = {
  kind: 'dataset',
  dataset: 'Open Trivia Database',
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  url: 'https://opentdb.com',
  notice:
    'Questions from the Open Trivia Database (opentdb.com), licensed under CC BY-SA 4.0. Adapted for Kaki Arcade: selected, screened for an all-ages audience, regrouped and tidied. The adapted questions are offered under the same licence.',
};

/** The Rabakz categories the import fills: file name (the category id) and title. */
export const CATEGORY_TITLES: Readonly<Record<string, string>> = {
  'arts-and-literature': 'Arts and literature',
  'film-and-tv': 'Film and television',
  'games-comics-and-anime': 'Games, comics and anime',
  'general-knowledge': 'General knowledge',
  geography: 'Geography',
  history: 'History',
  music: 'Music',
  'science-and-nature': 'Science and nature',
  sport: 'Sport',
  technology: 'Technology and vehicles',
};

/** Dataset category (by its id in the API) to Rabakz category. */
export const CATEGORY_MAP: Readonly<Record<number, string>> = {
  9: 'general-knowledge', // General Knowledge
  10: 'arts-and-literature', // Entertainment: Books
  11: 'film-and-tv', // Entertainment: Film
  12: 'music', // Entertainment: Music
  13: 'arts-and-literature', // Entertainment: Musicals & Theatres
  14: 'film-and-tv', // Entertainment: Television
  15: 'games-comics-and-anime', // Entertainment: Video Games
  16: 'games-comics-and-anime', // Entertainment: Board Games
  17: 'science-and-nature', // Science & Nature
  18: 'technology', // Science: Computers
  19: 'science-and-nature', // Science: Mathematics
  20: 'arts-and-literature', // Mythology
  21: 'sport', // Sports
  22: 'geography', // Geography
  23: 'history', // History
  24: 'history', // Politics
  25: 'arts-and-literature', // Art
  26: 'film-and-tv', // Celebrities
  27: 'science-and-nature', // Animals
  28: 'technology', // Vehicles
  29: 'games-comics-and-anime', // Entertainment: Comics
  30: 'technology', // Science: Gadgets
  31: 'games-comics-and-anime', // Entertainment: Japanese Anime & Manga
  32: 'games-comics-and-anime', // Entertainment: Cartoon & Animations
};

/**
 * Questions kept per Rabakz category, at most; `null` keeps every question that passes.
 *
 * Audience fit, decided by the integrator at the review of R-11 (the owner may change it): the
 * dataset is lopsided (a quarter of it is video games), a Mixed match draws from the whole
 * bank, and the room is a family in Singapore. So the four categories everyone can answer keep
 * everything; games, comics and anime share one category and one cap; the rest are capped. A
 * capped category keeps a third of each difficulty where it has them.
 */
export const CATEGORY_CAPS: Readonly<Record<string, number | null>> = {
  'arts-and-literature': 240,
  'film-and-tv': 240,
  'games-comics-and-anime': 240,
  'general-knowledge': null,
  geography: null,
  history: null,
  music: 240,
  'science-and-nature': null,
  sport: 240,
  technology: 240,
};

/** The category that prefers easier questions and the best-known names (see `WELL_KNOWN`). */
export const NICHE_CATEGORY = 'games-comics-and-anime';

/**
 * Games, comics, cartoons and anime that a room of mixed ages has a fair chance of knowing.
 * In `NICHE_CATEGORY` a question naming one is taken before one that does not. Folded words.
 */
const WELL_KNOWN = new RegExp(
  `\\b(${[
    'mario', 'luigi', 'nintendo', 'zelda', 'pokemon', 'pikachu', 'sonic', 'minecraft', 'tetris',
    'pac man', 'pacman', 'donkey kong', 'kirby', 'animal crossing', 'playstation', 'xbox', 'sega',
    'game boy', 'gameboy', 'wii', 'atari', 'angry birds', 'the sims', 'sims', 'lego', 'roblox',
    'street fighter', 'final fantasy', 'space invaders', 'pong', 'monopoly', 'chess', 'scrabble',
    'cluedo', 'clue', 'uno', 'checkers', 'draughts', 'backgammon', 'dominoes', 'jenga', 'risk',
    'rubiks cube', 'playing cards', 'dice', 'disney', 'pixar', 'mickey mouse', 'donald duck',
    'simpsons', 'spongebob', 'scooby doo', 'tom and jerry', 'looney tunes', 'bugs bunny',
    'peppa pig', 'my little pony', 'adventure time', 'avatar the last airbender', 'ben 10',
    'powerpuff girls', 'teenage mutant ninja turtles', 'transformers', 'winnie the pooh',
    'batman', 'superman', 'spider man', 'spiderman', 'wonder woman', 'iron man',
    'captain america', 'hulk', 'avengers', 'x men', 'marvel', 'dc comics', 'justice league',
    'peanuts', 'snoopy', 'charlie brown', 'garfield', 'tintin', 'asterix', 'calvin and hobbes',
    'studio ghibli', 'totoro', 'spirited away', 'dragon ball', 'naruto', 'one piece', 'doraemon',
    'sailor moon', 'hello kitty', 'digimon', 'yu gi oh', 'astro boy', 'shrek', 'frozen',
    'toy story', 'finding nemo', 'lion king', 'aladdin', 'kung fu panda', 'despicable me',
    'minions',
  ].join('|')})\\b`,
);

/** A category whose questions about one country's leagues are kept to a share of it. */
export const SPORT_CATEGORY = 'sport';
/** The largest share of `SPORT_CATEGORY` that may be about the North American leagues. */
export const NORTH_AMERICAN_LEAGUE_SHARE = 0.1;

/**
 * Questions only a follower of the NHL, NFL, NBA or MLB could answer: the leagues, their
 * finals, their teams and their positions. Folded words.
 */
const NORTH_AMERICAN_LEAGUES = new RegExp(
  `\\b(${[
    'nhl', 'nfl', 'nba', 'mlb', 'ahl', 'ncaa', 'wnba', 'super bowl', 'superbowl', 'stanley cup',
    'world series', 'national hockey league', 'national football league',
    'national basketball association', 'major league baseball', 'american football',
    'college football', 'quarterback', 'touchdown', 'touchdowns', 'home run', 'home runs',
    'pitcher', 'inning', 'innings', 'heisman', 'baseball', 'ice hockey', 'hockey team',
    'patriots', 'lakers', 'celtics', 'yankees', 'red sox', 'cubs', 'dodgers', 'packers',
    'steelers', 'broncos', 'seahawks', 'falcons', 'cowboys', '49ers', 'raiders', 'warriors',
    'cavaliers', 'chicago bulls', 'knicks', 'maple leafs', 'canadiens', 'bruins', 'penguins',
    'blackhawks', 'red wings', 'oilers', 'canucks', 'raptors', 'spurs', 'miami heat', 'astros',
    'mets', 'braves', 'cardinals', 'ravens', 'dolphins', 'vikings', 'redskins', 'chargers',
  ].join('|')})\\b`,
);

/**
 * Misspellings in the dataset's text that have one clear fix. Applied to the prompt and every
 * option after the id is made, so an id never changes when a fix is added. Each fix made is
 * listed in the import report. A misspelling with no safe fix is in `MISSPELLINGS`
 * (otdb-screen.ts) and drops the question instead.
 */
export const SPELLING_FIXES: readonly (readonly [RegExp, string])[] = [
  [/\bBrodway\b/g, 'Broadway'],
  [/\bGeorge Bizet\b/g, 'Georges Bizet'],
  [/\bTItanic\b/g, 'Titanic'],
  [/\bGannymede\b/g, 'Ganymede'],
  [/\bKing of Leon\b/g, 'Kings of Leon'],
  [/\bRed Hot Chill Pepper's\b/g, "Red Hot Chili Peppers'"],
  [/\bNothern\b/g, 'Northern'],
  [/\bfitfh\b/g, 'fifth'],
  [/\bsuchs as\b/g, 'such as'],
  [/\bdelevoped\b/g, 'developed'],
  [/\bestabilishment\b/g, 'establishment'],
  [/\bsucceded\b/g, 'succeeded'],
  [/\bshepards\b/g, 'shepherds'],
  [/\bscientifically know as\b/g, 'scientifically known as'],
  [/\bheros\b/g, 'heroes'],
  [/\bvillian\b/g, 'villain'],
  [/\bmytological\b/g, 'mythological'],
  [/\bFinancal\b/g, 'Financial'],
  [/\bDoolitte\b/g, 'Doolittle'],
  [/\bMary Shelly\b/g, 'Mary Shelley'],
  [/\bAlexander Flemming\b/g, 'Alexander Fleming'],
  [/\bRonald Regan\b/g, 'Ronald Reagan'],
  [/\bNelson Mandella\b/g, 'Nelson Mandela'],
  [/\bSenoir Chang\b/g, 'Señor Chang'],
  [/\bBayonnetta\b/g, 'Bayonetta'],
  [/\bMichael Walltrip\b/g, 'Michael Waltrip'],
  [/\bCheslea\b/g, 'Chelsea'],
  [/\bSan Fransisco\b/g, 'San Francisco'],
  [/\bPhilidelphia\b/g, 'Philadelphia'],
  [/\bLos Angelas\b/g, 'Los Angeles'],
  [/\bSaskachewan\b/g, 'Saskatchewan'],
  [/\bLiechenstein\b/g, 'Liechtenstein'],
  [/\bSeth Rogan\b/g, 'Seth Rogen'],
  [/\bGerman Shepard\b/g, 'German Shepherd'],
  [/\bFeburary\b/g, 'February'],
  [/\bSholder\b/g, 'Shoulder'],
  // Found in the full read-through of review round 1.
  [/\bexpoited\b/g, 'exploited'],
  [/\bSteven Sondheim\b/g, 'Stephen Sondheim'],
  [/\bJohn Phillips Sousa\b/g, 'John Philip Sousa'],
  [/\bEmily Dickenson\b/g, 'Emily Dickinson'],
  [/\bShirley Basey\b/g, 'Shirley Bassey'],
  [/\bMelisa Joan Hart\b/g, 'Melissa Joan Hart'],
  [/\bWill Arnet\b/g, 'Will Arnett'],
  [/\bDetecive\b/g, 'Detective'],
  [/\borignal\b/g, 'original'],
  [/\bAuquatic Reseach\b/g, 'Aquatic Research'],
  [/\bsuperheros\b/g, 'superheroes'],
  [/\bRayquazza\b/g, 'Rayquaza'],
  [/\bAntoine Lavoiser\b/g, 'Antoine Lavoisier'],
  [/\bChuck Paluhniuk\b/g, 'Chuck Palahniuk'],
  [/\bSqiudward\b/g, 'Squidward'],
  [/\bRio de Janero\b/g, 'Rio de Janeiro'],
  [/\bMediterranian\b/g, 'Mediterranean'],
  [/\bAustrailia\b/g, 'Australia'],
  [/\bAntartica\b/g, 'Antarctica'],
  [/\bSanto Dominigo\b/g, 'Santo Domingo'],
  [/\bLos Angles\b/g, 'Los Angeles'],
  [/\bNorthwest Terrirories\b/g, 'Northwest Territories'],
  [/\bIsmuth\b/g, 'Isthmus'],
  [/\btrack of land\b/g, 'tract of land'],
  [/\bphycisists\b/g, 'physicists'],
  [/\bPhillipines\b/g, 'Philippines'],
  [/\bSemetic\b/g, 'Semitic'],
  [/\bLydon B\. Johnson\b/g, 'Lyndon B. Johnson'],
  [/\bLudvig Van Beethoven\b/g, 'Ludwig van Beethoven'],
  [/\baiport\b/g, 'airport'],
  [/\bbasist\b/g, 'bassist'],
  [/\b72th\b/g, '72nd'],
  [/\bAsiimov\b/g, 'Asimov'],
  [/\blangauge\b/g, 'language'],
  [/\bColbalt\b/g, 'Cobalt'],
  [/\bcircadium\b/g, 'circadian'],
  [/\boccuring\b/g, 'occurring'],
  [/\bSimien Jackel\b/g, 'Simien Jackal'],
  [/\bMyofiaments\b/g, 'Myofilaments'],
  [/\btendancy\b/g, 'tendency'],
  [/\boriginiate\b/g, 'originate'],
  [/\bMarshmellow\b/g, 'Marshmallow'],
  [/\bcommerically\b/g, 'commercially'],
  [/\bphysical typologies\b/g, 'physical topologies'],
  [/\bT\.S\. Elliot\b/g, 'T.S. Eliot'],
  [/\bDan the Automater\b/g, 'Dan the Automator'],
  [/\bZack Synder\b/g, 'Zack Snyder'],
  [/\bJosh Whedon\b/g, 'Joss Whedon'],
  // Review round 2.
  [/\bUwe Rosenburg\b/g, 'Uwe Rosenberg'],
  [/\bKing Ghidora\b/g, 'King Ghidorah'],
  [/\bAlec Travelyan\b/g, 'Alec Trevelyan'],
  [/\bZavoc\b/g, 'Zavok'],
  [/\bDecember 31th\b/g, 'December 31st'],
  [/\bSatchell Paige\b/g, 'Satchel Paige'],
  [/\bNewton and Leibnitz\b/g, 'Newton and Leibniz'],
  // A backtick used as a quotation mark.
  [/`/g, "'"],
];

/**
 * "it's" written for "its", by question id: the word is right in most prompts, so this cannot
 * be a pattern. Each was read.
 */
export const ITS_FIXES: ReadonlySet<string> = new Set([
  'otdb-9422b7962c6f',
  'otdb-694941bc5a91',
  'otdb-82a9284c88ab',
  'otdb-b90b11d75873',
  'otdb-48e9a5bf15d0',
  'otdb-d7dba8b0049b',
  'otdb-24223bae6eb1',
  'otdb-cc89b7ebecc4',
  'otdb-ff41b0ac5966',
  'otdb-3d6a46d4f825',
]);

/** Two prompts with the same answer are one question when their words overlap this much. */
export const NEAR_DUPLICATE_OVERLAP = 0.5;
/** ... or this much when they also offer the same four options. */
export const NEAR_DUPLICATE_OVERLAP_SAME_OPTIONS = 0.3;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '\u00AD',
  lrm: '\u200E', rlm: '\u200F', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', deg: '°',
  eacute: 'é', egrave: 'è', ecirc: 'ê', aacute: 'á', agrave: 'à',
  acirc: 'â', auml: 'ä', aring: 'å', iacute: 'í', iuml: 'ï',
  oacute: 'ó', ocirc: 'ô', ouml: 'ö', oslash: 'ø', uacute: 'ú',
  uuml: 'ü', ntilde: 'ñ', ccedil: 'ç', szlig: 'ß', Eacute: 'É',
  Ouml: 'Ö', Uuml: 'Ü', Aring: 'Å', pi: 'π', micro: 'µ',
  times: '×', divide: '÷', sup2: '²', sup3: '³', frac12: '½',
  pound: '£', euro: '€', trade: '™', reg: '®', copy: '©',
};

/**
 * Replaces HTML entities with the characters they stand for: `&quot;`, `&#039;`, `&#x27;`,
 * and `&amp;quot;` (an entity encoded twice). An entity this does not know is left as it is,
 * and the validator then rejects the question.
 */
export function decodeEntities(text: string): string {
  const once = (input: string): string =>
    input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, name: string) => {
      if (name.startsWith('#')) {
        const code =
          name[1] === 'x' || name[1] === 'X'
            ? Number.parseInt(name.slice(2), 16)
            : Number.parseInt(name.slice(1), 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? whole;
    });
  return once(once(text));
}

/** Soft hyphens, zero-width characters, direction marks and the byte-order mark. */
const INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/gu;

/**
 * Tidies a text without changing what it says: invisible characters removed, every kind of
 * space made an ordinary one, runs of spaces closed up, no space before a comma, NFC form.
 * HTML entities are decoded only when `entities` is set: a `url3986` download has none, and
 * decoding would alter a question that is about `&amp;` itself.
 */
export function cleanText(text: string, entities = false): string {
  return (entities ? decodeEntities(text) : text)
    .replace(INVISIBLE, '')
    .replace(/[\s\p{Zs}\p{Zl}\p{Zp}]+/gu, ' ')
    .replace(/(?<=\p{L}) ([,;:])(?= |$)/gu, '$1')
    .trim()
    .normalize('NFC');
}

/** Why a question was not imported. One question is counted under one rule: the first to hit. */
export type DropRule =
  | 'shape'
  | 'true-or-false (not used in Rabakz)'
  | 'unmapped-category'
  | `screen: ${string}`
  | `validator: ${Rule}`
  | 'answer given away by length'
  | 'duplicate'
  | 'near-duplicate'
  | 'removed after reading'
  | 'sport: over the share for North American leagues'
  | 'category over its cap';

export interface ImportedQuestion {
  readonly category: string;
  readonly sourceCategory: string;
  readonly question: SourceQuestion;
}

export interface Dropped {
  readonly rule: DropRule;
  readonly sourceCategory: string;
  readonly prompt: string;
  /** What hit, where the rule can say. */
  readonly detail?: string;
}

export interface ImportInput {
  readonly categories: readonly OtdbCategory[];
  readonly questions: readonly OtdbRawQuestion[];
  readonly blocklist: Blocklist;
  /** Lower-case hex hash of a text, for example SHA-256. */
  readonly hash: (text: string) => string;
  /** Questions already in the bank that the import did not write (the hand-written ones). */
  readonly existing: readonly SourceQuestion[];
  /** Ids removed by a person after reading, with the reason. */
  readonly removed: ReadonlyMap<string, string>;
  /** Ids a person read and cleared, which the word screen would otherwise drop. */
  readonly allowed?: ReadonlyMap<string, string>;
  /** True when the download may hold HTML entities (any encoding but `url3986`). */
  readonly entities?: boolean;
}

export interface Correction {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface ImportResult {
  readonly kept: readonly ImportedQuestion[];
  readonly dropped: readonly Dropped[];
  /** Hand-written questions an imported one asks again: the imported one replaces them. */
  readonly replaced: readonly { readonly existing: string; readonly by: string }[];
  /** Questions whose text was changed by `cleanText`. */
  readonly cleaned: number;
  /** Spelling fixes made, among the kept questions. */
  readonly corrections: readonly Correction[];
  /**
   * Ids in the removal list or the exceptions list that are not in the download at all. An id
   * is a hash of the question's words: if the dataset edits a question its id changes, and a
   * removed question would come back unnoticed. The import fails loudly on these.
   */
  readonly unmatched: readonly string[];
  /** Ids in the removal list that an earlier rule already drops: the entry is not needed. */
  readonly redundant: readonly string[];
}

const STOP_WORDS = new Set(
  'a an the of in on at to for from by with and or is are was were be been which what who whom whose when where why how does do did has have had this that these those it its as into than then following one name called known'.split(
    ' ',
  ),
);

function contentWords(prompt: string): Set<string> {
  return new Set(
    wordFold(prompt)
      .split(' ')
      .filter((word) => word.length > 0 && !STOP_WORDS.has(word)),
  );
}

/** Shared words over all words (Jaccard), 0 to 1. */
export function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** The id of an imported question: from its prompt and its correct answer, so it is stable. */
export function questionId(
  prompt: string,
  answer: string,
  hash: (text: string) => string,
): string {
  return `${ID_PREFIX}${hash(`${promptKey(prompt)}\u0000${optionKey(answer)}`).slice(0, 12)}`;
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

interface Worded {
  readonly question: SourceQuestion;
  readonly words: ReadonlySet<string>;
  /** The option set, whatever its order. */
  readonly options: string;
  /** The prompt and the answer as whole folded words, padded with spaces. */
  readonly prompt: string;
  readonly answer: string;
}

interface Candidate extends ImportedQuestion, Worded {
  readonly corrections: readonly Correction[];
}

const optionSet = (question: SourceQuestion): string =>
  question.options.map(optionKey).sort().join('\u0000');

function worded(question: SourceQuestion): Worded {
  return {
    question,
    words: contentWords(question.prompt),
    options: optionSet(question),
    prompt: ` ${wordFold(question.prompt)} `,
    answer: wordFold(question.answer),
  };
}

/** An answer this short is too likely to turn up in another prompt by chance. */
const REVERSE_PAIR_MIN_ANSWER = 4;

/**
 * True when two questions ask the same thing: the same answer and mostly the same words, or
 * each one's answer named in the other's prompt ("What is the capital of Estonia?" and
 * "Tallinn is the capital of which country?").
 */
function sameQuestion(a: Worded, b: Worded): boolean {
  if (a.answer === b.answer) {
    const shared = overlap(a.words, b.words);
    return (
      shared >= NEAR_DUPLICATE_OVERLAP ||
      (a.options === b.options && shared >= NEAR_DUPLICATE_OVERLAP_SAME_OPTIONS)
    );
  }
  return (
    a.answer.length >= REVERSE_PAIR_MIN_ANSWER &&
    b.answer.length >= REVERSE_PAIR_MIN_ANSWER &&
    a.prompt.includes(` ${b.answer} `) &&
    b.prompt.includes(` ${a.answer} `)
  );
}

/** Review rounds 2 and 3 text corrections, keyed by the unchanged downloaded id (RZ-023). */
const TEXT_FIXES: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  "otdb-d7fe8930204a": [["The Legend of Zelda: Four Swords", "The Legend of Zelda: Skyward Sword"], ["in the The Legend of Zelda franchise", "in The Legend of Zelda franchise"]],
  "otdb-d7b77b4d6713": [["What programming language was used to create the game \"Minecraft\"?", "What programming language was \"Minecraft\" originally written in?"]],
  "otdb-139c1d0f0c42": [["which car company is the only Japanese company which won the 24 Hours of Le Mans?", "which car company was the only Japanese company to have won the 24 Hours of Le Mans?"]],
  "otdb-6d47ebacf617": [["what update did foods like steak become stackable?", "in which update did foods like steak become stackable?"]],
  "otdb-9248624ca809": [["\"Tower Heist?\"", "\"Tower Heist\"?"]],
  "otdb-ef728ce79db9": [[", What was King K. Rool's", ", what was King K. Rool's"]],
  "otdb-282613b0f90b": [["halloween-related", "Halloween-related"]],
  "otdb-0203de8b0c0a": [["which of these hunter arts are exclusive", "which of these hunter arts is exclusive"]],

  "otdb-1dfec393c83f": [
    [
      "In the Mario Kart and Smash Bros. Games, Princess Rosalina is considered what weight class?",
      "In the Mario Kart games, Rosalina is in which weight class?"
    ]
  ],
  "otdb-7191652df59d": [
    [
      "1738",
      "1733"
    ]
  ],
  "otdb-1042a9266c7a": [
    [
      "RAID 10",
      "RAID 6"
    ]
  ],
  "otdb-248cbb5c2678": [
    [
      "Solid State Disk",
      "Super Speed Disk"
    ]
  ],
  "otdb-6b30f4aadf75": [
    [
      "Eskimos",
      "Yetis"
    ]
  ],
  "otdb-3d0ec7aac84f": [
    [
      "Contraceptive prevalence rate",
      "Cardiac pressure response"
    ]
  ],
  "otdb-c8d5a331b87a": [
    [
      "Masta Killa",
      "MC Lars"
    ]
  ]
};

/** Applies the spelling fixes to one text and records what changed. */
function fixSpelling(text: string, id: string, made: Correction[]): string {
  let fixed = text;
  for (const [pattern, replacement] of SPELLING_FIXES) fixed = fixed.replace(pattern, replacement);
  if (ITS_FIXES.has(id)) fixed = fixed.replace(/\bit['\u2019]s\b/g, 'its');
  for (const [from, to] of TEXT_FIXES[id] ?? []) fixed = fixed.replace(from, to);
  if (fixed !== text) made.push({ id, from: text, to: fixed });
  return fixed;
}

const byId = (a: Candidate, b: Candidate): number =>
  a.question.id < b.question.id ? -1 : a.question.id > b.question.id ? 1 : 0;

/**
 * The order in which a category's questions are offered a place. Most categories: a third of
 * the cap from each difficulty, then what is left, easier first. `NICHE_CATEGORY`: well-known
 * names before the rest, with a third of the cap reserved for hard questions.
 */
function offerOrder(category: string, inCategory: readonly Candidate[], cap: number | null): Candidate[] {
  const of = (difficulty: Difficulty): Candidate[] =>
    inCategory.filter((candidate) => candidate.question.difficulty === difficulty);
  if (category === NICHE_CATEGORY) {
    const known = (candidate: Candidate): boolean =>
      WELL_KNOWN.test(`${candidate.prompt}| ${candidate.question.options.map(wordFold).join(' | ')} `);
    const gentle = [...of('easy'), ...of('medium')];
    return [
      ...of('hard').filter(known),
      ...of('hard').filter((candidate) => !known(candidate)),
      ...gentle.filter(known),
      ...gentle.filter((candidate) => !known(candidate)),
    ];
  }
  if (cap === null) return [...inCategory];
  const share = Math.floor(cap / DIFFICULTIES.length);
  const first = DIFFICULTIES.flatMap((difficulty) => of(difficulty).slice(0, share));
  const rest = DIFFICULTIES.flatMap((difficulty) => of(difficulty).slice(share));
  return [...first, ...rest];
}

/**
 * Maps and filters the whole download. Deterministic: the same input gives the same output,
 * whatever order the questions were downloaded in.
 */
export function importQuestions(input: ImportInput): ImportResult {
  const names = new Map(input.categories.map((category) => [category.id, category.name]));
  const dropped: Dropped[] = [];
  const candidates: Candidate[] = [];
  let cleaned = 0;
  const context = { pictures: new Map<string, never>(), blocklist: input.blocklist };
  const allowed = input.allowed ?? new Map<string, string>();
  const entities = input.entities === true;
  /** Every id the download holds, whatever became of the question. */
  const inDownload = new Set<string>();

  for (const raw of input.questions) {
    const sourceCategory = names.get(raw.categoryId) ?? `category ${String(raw.categoryId)}`;
    const prompt = cleanText(raw.question, entities);
    const drop = (rule: DropRule, detail?: string): void => {
      dropped.push(
        detail === undefined
          ? { rule, sourceCategory, prompt }
          : { rule, sourceCategory, prompt, detail },
      );
    };
    const category = CATEGORY_MAP[raw.categoryId];
    if (category === undefined) {
      drop('unmapped-category');
      continue;
    }
    const answer = cleanText(raw.correct, entities);
    const others = raw.incorrect.map((text) => cleanText(text, entities));
    if (
      prompt !== raw.question ||
      answer !== raw.correct ||
      others.some((text, at) => text !== raw.incorrect[at])
    ) {
      cleaned += 1;
    }
    // Rabakz has no true-or-false questions (D-049). The import asks for multiple choice only;
    // a boolean question in an older download is dropped here.
    if (raw.type === 'boolean') {
      drop('true-or-false (not used in Rabakz)');
      continue;
    }
    if (raw.type !== 'multiple' || !isDifficulty(raw.difficulty) || others.length !== 3) {
      drop('shape', `${raw.type}, ${raw.difficulty}, ${String(others.length + 1)} options`);
      continue;
    }
    // The id comes from the text as downloaded, so a spelling fix never changes it.
    const id = questionId(prompt, answer, input.hash);
    inDownload.add(id);
    const corrections: Correction[] = [];
    const fixedAnswer = fixSpelling(answer, id, corrections);
    const question: SourceQuestion = {
      id,
      type: 'multiple-choice',
      prompt: fixSpelling(prompt, id, corrections),
      options: [fixedAnswer, ...others.map((text) => fixSpelling(text, id, corrections))],
      answer: fixedAnswer,
      difficulty: raw.difficulty,
      region: 'general',
    };

    const screened = allowed.has(id) ? null : screenQuestion(question, raw.categoryId);
    if (screened !== null) {
      drop(`screen: ${screened.rule}`, screened.match);
      continue;
    }

    const validated = validateSourceFile(
      `${category}.json`,
      {
        category,
        title: CATEGORY_TITLES[category] ?? category,
        defaultSource: OTDB_SOURCE,
        questions: [question],
      },
      context,
    );
    const error = validated.problems.find((problem) => problem.severity === 'error');
    if (error !== undefined) {
      drop(`validator: ${error.rule}`, error.message);
      continue;
    }
    const giveaway = lengthGiveaway(question.options, question.answer);
    if (giveaway !== null) {
      drop('answer given away by length', giveaway);
      continue;
    }
    candidates.push({ category, sourceCategory, corrections, ...worded(question) });
  }

  // From here on the order matters, so it is fixed: by id. An id is a hash, so "lowest id
  // first" is an even draw that never changes between runs.
  candidates.sort(byId);

  const existing: Worded[] = input.existing.map(worded);
  const replaced: { existing: string; by: string }[] = [];
  const kept: Candidate[] = [];
  const seenIds = new Set<string>();
  const dropCandidate = (candidate: Candidate, rule: DropRule, detail?: string): void => {
    const base = {
      rule,
      sourceCategory: candidate.sourceCategory,
      prompt: candidate.question.prompt,
    };
    dropped.push(detail === undefined ? base : { ...base, detail });
  };
  /**
   * Gives a question its place unless it is a duplicate, was removed by a person, or asks what
   * a question already kept asks. Duplicates are judged against kept questions only, so a
   * question is never lost to a twin that the cap then drops.
   */
  const take = (candidate: Candidate): boolean => {
    const { question } = candidate;
    if (seenIds.has(question.id)) {
      dropCandidate(candidate, 'duplicate', question.id);
      return false;
    }
    seenIds.add(question.id);
    const reason = input.removed.get(question.id);
    if (reason !== undefined) {
      dropCandidate(candidate, 'removed after reading', reason);
      return false;
    }
    const same = kept.find((earlier) => sameQuestion(earlier, candidate));
    if (same !== undefined) {
      dropCandidate(candidate, 'near-duplicate', `${same.question.id}: ${same.question.prompt}`);
      return false;
    }
    kept.push(candidate);
    for (const written of existing) {
      if (sameQuestion(written, candidate)) {
        replaced.push({ existing: written.question.id, by: question.id });
      }
    }
    return true;
  };

  for (const category of [...new Set(candidates.map((candidate) => candidate.category))].sort()) {
    const cap = CATEGORY_CAPS[category] ?? null;
    const inCategory = candidates.filter((candidate) => candidate.category === category);
    const isLeague = (candidate: Candidate): boolean =>
      category === SPORT_CATEGORY &&
      // Naadam asks about Mongolia; American Football is only the wrong-sport distractor.
      !/\bnaadam\b/.test(candidate.prompt) &&
      NORTH_AMERICAN_LEAGUES.test(
        `${candidate.prompt}| ${candidate.question.options.map(wordFold).join(' | ')} `,
      );
    let taken = 0;
    let hardTaken = 0;
    for (const candidate of offerOrder(category, inCategory.filter((item) => !isLeague(item)), cap)) {
      const hardShareFull = category === NICHE_CATEGORY && cap !== null &&
        candidate.question.difficulty === 'hard' && hardTaken >= Math.floor(cap / 3);
      if ((cap !== null && taken >= cap) || hardShareFull) {
        dropCandidate(candidate, 'category over its cap');
      } else if (take(candidate) || (
        // RZ-023 round 3: these removals consume their old places without backfill.
        input.removed.has(candidate.question.id) &&
        ['otdb-74efda3dcfb4', 'otdb-ebfb7382b6f4', 'otdb-15646363b2a2'].includes(candidate.question.id)
      )) {
        taken += 1;
        if (candidate.question.difficulty === 'hard') hardTaken += 1;
      }
    }
    // League questions come last and may be at most their share of the finished category.
    const share = NORTH_AMERICAN_LEAGUE_SHARE;
    const leagueRoom = Math.floor((taken * share) / (1 - share));
    let leagues = 0;
    for (const candidate of offerOrder(category, inCategory.filter(isLeague), cap)) {
      if (leagues >= leagueRoom) {
        dropCandidate(candidate, 'sport: over the share for North American leagues');
      } else if (cap !== null && taken >= cap) dropCandidate(candidate, 'category over its cap');
      else if (take(candidate)) {
        taken += 1;
        leagues += 1;
      }
    }
  }
  kept.sort(byId);

  const listed = [...input.removed.keys(), ...allowed.keys()];
  // Ids that passed the screen and the validator: only those need an entry in the removal list.
  const reachedRemoval = new Set(candidates.map((candidate) => candidate.question.id));
  return {
    kept: kept.map(({ category, sourceCategory, question }) => ({ category, sourceCategory, question })),
    dropped,
    replaced,
    cleaned,
    corrections: kept.flatMap((candidate) => candidate.corrections),
    unmatched: listed.filter((id) => !inDownload.has(id)).sort(),
    redundant: [...input.removed.keys()]
      .filter((id) => inDownload.has(id) && !reachedRemoval.has(id))
      .sort(),
  };
}

/**
 * The source file of one category: the questions the import did not write, in the order they
 * were in, then the imported ones by id. `replaced` hand-written questions are left out.
 */
export function mergeIntoFile(
  category: string,
  current: SourceFile | null,
  imported: readonly SourceQuestion[],
  replaced: ReadonlySet<string>,
): SourceFile {
  const own = (current?.questions ?? []).filter(
    (question) => !question.id.startsWith(ID_PREFIX) && !replaced.has(question.id),
  );
  return {
    category,
    title: CATEGORY_TITLES[category] ?? current?.title ?? category,
    defaultSource: OTDB_SOURCE,
    questions: [...own, ...imported],
  };
}

/**
 * Parses a list of question ids kept by hand (`otdb-removed.txt`, `otdb-allowed.txt`). One per
 * line: the id, the reason, and after ` ## ` the question's prompt, there for the reader only.
 */
export function parseRemoved(text: string): Map<string, string> {
  const removed = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^(otdb-[0-9a-f]{12})\s+(.+)$/.exec(line.trim());
    if (match?.[1] === undefined || match[2] === undefined) continue;
    const reason = match[2].split(' ## ')[0]?.trim() ?? '';
    if (reason.length > 0) removed.set(match[1], reason);
  }
  return removed;
}

/**
 * `count` questions chosen with the seed: those whose id, hashed with the seed, comes first.
 * So taking a question out of the bank changes the sample by that one question only.
 */
export function sampleQuestions(
  questions: readonly ImportedQuestion[],
  count: number,
  seed: number,
  hash: (text: string) => string,
): ImportedQuestion[] {
  return questions
    .map((item) => ({ item, key: hash(`${String(seed)}:${item.question.id}`) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, count)
    .map(({ item }) => item);
}

export function formatSample(sample: readonly ImportedQuestion[], seed: number, total: number): string {
  const lines = [
    '# Read-through sample of the imported questions',
    '',
    `${String(sample.length)} of ${String(total)} imported questions, chosen with seed ${String(seed)}. The correct option is in bold.`,
    '',
  ];
  sample.forEach(({ category, question }, at) => {
    const options = question.options
      .map((option) => (option === question.answer ? `**${option}**` : option))
      .join(' · ');
    lines.push(
      `${String(at + 1)}. \`${question.id}\` ${category}, ${question.difficulty}, ${question.type}`,
      `   ${question.prompt}`,
      `   ${options}`,
      '',
    );
  });
  return lines.join('\n');
}

type Table = Map<string, Map<string, number>>;

function tally(table: Table, row: string, column: string): void {
  const cells = table.get(row) ?? new Map<string, number>();
  cells.set(column, (cells.get(column) ?? 0) + 1);
  table.set(row, cells);
}

function formatTable(head: string, table: Table, columns: readonly string[]): string[] {
  const lines = [
    `| ${head} | ${columns.join(' | ')} | total |`,
    `|---|${columns.map(() => '---:').join('|')}|---:|`,
  ];
  const totals = new Map<string, number>();
  for (const row of [...table.keys()].sort()) {
    const cells = table.get(row) ?? new Map<string, number>();
    const values = columns.map((column) => cells.get(column) ?? 0);
    columns.forEach((column, at) => totals.set(column, (totals.get(column) ?? 0) + (values[at] ?? 0)));
    lines.push(
      `| ${row} | ${values.map(String).join(' | ')} | ${String(values.reduce((sum, value) => sum + value, 0))} |`,
    );
  }
  const sums = columns.map((column) => totals.get(column) ?? 0);
  lines.push(
    `| **All** | ${sums.map(String).join(' | ')} | ${String(sums.reduce((sum, value) => sum + value, 0))} |`,
  );
  return lines;
}

const percent = (part: number, whole: number): string =>
  whole === 0 ? '0%' : `${String(Math.round((part / whole) * 1000) / 10)}%`;

/** The import report, as Markdown. */
export function formatReport(input: ImportInput, result: ImportResult, undecodable: number): string {
  const names = new Map(input.categories.map((category) => [category.id, category.name]));
  const lines: string[] = ['# Open Trivia Database import report', ''];
  const total = input.questions.length;
  lines.push(
    `Fetched: **${String(total)}** verified questions in ${String(input.categories.length)} dataset categories` +
      ` (${String(undecodable)} record(s) could not be decoded).`,
    `Kept: **${String(result.kept.length)}** (${percent(result.kept.length, total)}). Dropped: **${String(result.dropped.length)}**.`,
    `Text tidied (invisible characters, spacing) on ${String(result.cleaned)} question(s). Spelling fixed in ${String(result.corrections.length)} text(s) of kept questions.`,
    '',
    '## Fetched, by dataset category',
    '',
  );
  const fetched: Table = new Map();
  for (const raw of input.questions) {
    const name = names.get(raw.categoryId) ?? String(raw.categoryId);
    const target =
      raw.categoryId in EXCLUDED_CATEGORIES
        ? 'left out whole'
        : (CATEGORY_MAP[raw.categoryId] ?? 'not imported');
    tally(fetched, `${name} → ${target}`, raw.type);
  }
  lines.push(...formatTable('Dataset category → Rabakz category', fetched, ['multiple', 'boolean']), '');

  lines.push('## Dropped, by rule', '', 'A question is counted once, under the first rule that dropped it, in this order: true-or-false, shape, screen, validator, length giveaway, then, as each category is filled, duplicate, removed after reading, near-duplicate, the share for North American leagues in sport, category cap.', '');
  const rules = new Map<string, Dropped[]>();
  for (const item of result.dropped) rules.set(item.rule, [...(rules.get(item.rule) ?? []), item]);
  lines.push('| Rule | Dropped |', '|---|---:|');
  const ordered = [...rules.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [rule, items] of ordered) lines.push(`| ${rule} | ${String(items.length)} |`);
  lines.push(`| **All** | ${String(result.dropped.length)} |`, '');

  lines.push('## Kept, by Rabakz category and difficulty', '');
  const byDifficulty: Table = new Map();
  const bySource: Table = new Map();
  for (const { category, sourceCategory, question } of result.kept) {
    tally(byDifficulty, category, question.difficulty);
    tally(bySource, sourceCategory, question.difficulty);
  }
  lines.push(...formatTable('Category', byDifficulty, DIFFICULTIES), '');
  const count = (difficulty: Difficulty): number =>
    result.kept.filter((item) => item.question.difficulty === difficulty).length;
  lines.push(
    `Difficulty split: easy ${percent(count('easy'), result.kept.length)}, medium ${percent(count('medium'), result.kept.length)}, hard ${percent(count('hard'), result.kept.length)}.`,
    '',
    '## Kept, by dataset category',
    '',
    ...formatTable('Dataset category', bySource, DIFFICULTIES),
    '',
    '## Hand-written questions replaced',
    '',
  );
  if (result.replaced.length === 0) lines.push('None: no imported question asks what a hand-written one asks.');
  for (const item of result.replaced) lines.push(`- \`${item.existing}\` replaced by \`${item.by}\``);
  lines.push('', '## Spelling fixes made (kept questions)', '');
  if (result.corrections.length === 0) lines.push('None.');
  for (const fix of result.corrections) lines.push(`- \`${fix.id}\` "${fix.from}" → "${fix.to}"`);
  lines.push('', '## Hand lists', '');
  lines.push(
    result.unmatched.length === 0
      ? 'Every id in the removal and exceptions lists is in the download.'
      : `**Not in the download (the dataset may have edited the question; find it again):** ${result.unmatched.join(', ')}`,
    result.redundant.length === 0
      ? 'No removal entry is redundant.'
      : `Removal entries an earlier rule already covers (can be deleted): ${result.redundant.join(', ')}`,
  );
  lines.push('', '## Examples of what each rule dropped', '');
  for (const [rule, items] of ordered) {
    lines.push(`**${rule}** (${String(items.length)})`, '');
    for (const item of items.slice(0, 5)) {
      const detail = item.detail === undefined ? '' : ` — ${item.detail}`;
      lines.push(`- [${item.sourceCategory}] ${item.prompt}${detail}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
