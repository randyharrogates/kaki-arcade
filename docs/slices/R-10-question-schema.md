# Slice R-10 — Rabakz question schema, build script and match loader

Issue R-10 in `docs/backlog/R-rabakz.md`, wave 0. Branch `issue/R-10-question-schema`.
Owns `content/rabakz` (new package `@kaki/content-rabakz`).

## Goal

A question bank that a person can edit, a build that refuses a bad bank, generated per-category
chunks, and a pure loader that picks a match's questions and can say, before the match starts,
that everything it needs is loaded.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| RZ-022 | yes | Every question has category, difficulty, type, text, options, the correct option and a source; the build rejects a prompt over 120 characters and an option over 40. |
| RZ-020 | partly | The bank ships as files; the loader names the chunks and pictures a match needs, refuses to select until the chunks are loaded, and keeps a match within 2 MB. Actually fetching them before the first question is the game's (R-01 to R-03), and the transferred size is measured in R-08. |
| RZ-015, RZ-023, RZ-024, RZ-025 | hooks only | Recently-used list parameter (R-06 stores it); blocklist file (R-11 fills it); stats against launch sizes (R-11 to R-13 fill the bank); picture file, credit and free-licence checks (R-13 adds pictures). None of these is closed here. |

## Acceptance

1. Schema: the three types only (no type-the-answer); 4, 2 and 4 options with exactly one
   correct; category, difficulty, region; a picture (file, alt, credit, licence, source address)
   on picture questions only; a source on every question.
2. A prompt over 120 characters or an option over 40 is rejected.
3. The same prompt with the same options twice, or the same id twice, is rejected.
4. A correct option given away by its length is flagged (warning).
5. A picture's file must exist and carry a credit and a free licence.
6. The all-ages blocklist file is applied to every shown text.
7. A failed build writes nothing.
8. The build writes one chunk per category and an index with counts per category, difficulty
   and region and a content hash per chunk.
9. Two builds of the same sources give the same bytes.
10. 12 to 20 real sample questions, at least 3 categories, all 3 difficulties, a source note each.
11. The loader selects 10, 30 or 50 questions by difficulty, categories and region using a
    caller-supplied `() => number`, with no repeats, avoiding recently used questions until the
    pool runs out.
12. The loader reports before a match that every needed chunk is loaded and lists every picture.
13. A selected match never exceeds the 2 MB budget.
14. A stats command prints counts against the RZ-024 launch sizes.
15. `pnpm verify` passes.
16. The build never deletes a file it did not write (`--out`).
17. Picture files are real images of at most 150 KB that do not give the answer away.
18. A question can leave the host only without its answer (`toPublicQuestion`).

## UAT

Nothing here is visible to a player, so there are no screenshots. Evidence is text in
`uat/evidence/R-10-question-schema/`: `verify.txt`, `build.txt` (two builds, same hashes),
`stats.txt`, `fail-build.txt` (one fault per rule, from the committed fixture
`content/rabakz/fixtures/bad-bank/`), `out-safety.txt`, `REPORT.md`.

## Out of scope

The Open Trivia Database import and the blocklist's contents (R-11), the Singapore pack (R-12),
pictures (R-13), fetching and caching chunks, the recently-seen store (R-06), shuffling options
(RZ-026, R-01), anything drawn.

---

## Design

Rabakz is an untimed buzzer race (first correct answer wins; a wrong answer locks that player
out). Nothing below depends on an answer time, and the schema has no time field.

### Source format

`content/rabakz/src/questions/<category>.json`, one file per category; see
`content/rabakz/README.md` for the fields. `answer` is the option's text, not an index, so a
reordered list cannot silently change the right answer. Unknown fields are errors, so a typo is
caught; so is a key written twice in one object, which `JSON.parse` would silently resolve to
the last. A file may carry one `defaultSource` so an imported dataset does not repeat its
attribution 1,300 times.

### Option order

This package stores options in source order and never shuffles them. The game rules (R-01)
shuffle the four options of a multiple-choice or picture question with the match seed (RZ-026).
A true-or-false question stays in the fixed order True, False. The index therefore reports two
balances: True against False (a build warning from 20 questions when one side is 70% or more,
because that order is never shuffled) and the source position of four-option answers (printed,
never a warning, because it is shuffled away).

### Limits and how they were derived

A length is counted in characters as a player sees them: one per Unicode code point, two for an
emoji. Only Latin and Greek letters are accepted (see "Scripts"), so the widths hold.

The layout is decided: board 3, **layout 3A** (D-046), picture beside the question at
1 : 1.618, answers in a 2 × 2 block. The option text is also on the phone button (RZ-003), so
every option limit is the tighter of the TV and the phone. Glyph widths are taken as 0.5 em for
the serif heading face and 0.55 em for the bold sans.

| Limit | Value | From |
|---|---|---|
| Prompt | 8 to 120 | RZ-022 (120). TV question column: (1810 − 34) × 1.618 / 2.618 = 1097 px. At 55 px a line holds about 39 characters, so 120 characters is 4 to 5 lines = 330 px of the 415 px above the answers. Up to about 60 characters fits at 89 px. The minimum of 8 only catches stubs. |
| One unbroken word in a prompt | 30 | One word must fit one line of the 1097 px column at 55 px. 39 average glyphs fit; 30 leaves room for capitals and wide letters. |
| Option | 1 to 40 | RZ-022. TV answer cell: 538 px less 2 × 34 px padding and the 89 px shape with its 21 px gap = 360 px of text; at 34 px a line holds about 19 characters and the 144 px cell 3 lines. Phone button (844 × 390, two across): about 292 px of text; at 21 px a line holds about 25 characters, so 40 characters is 2 lines, 3 with unlucky wrapping. |
| One unbroken word in an option | 15 | The phone is the tighter screen: one word must fit one 292 px line at 34 px bold (about 15 characters). The TV line holds 19. |
| Category title | 24 | Ours: a chip at 21 px. |
| Picture alt, credit | 120, 80 | Ours: one line at 21 px. |
| Picture file | 150,000 bytes | Ours, for RZ-020: see "Pictures and the 2 MB budget". |
| Source note | 12 to 240 | Ours: never shown on the TV. |

Two requirements follow for the views, because the limits only hold if they do this:

- **R-03 (TV):** a short option is set at 55 px; an option that does not fit its 360 px cell at
  55 px **steps down to 34 px** and wraps to as many as 3 lines. A prompt over about 60
  characters is set at 55 px rather than 89 px.
- **R-02 (phone):** an option that does not fit at 34 px **steps down to 21 px and wraps to as
  many as 3 lines**. A 40-character option needs this.

Words are split at spaces, hyphens, dashes and slashes, and the brackets and punctuation
around a word do not count towards its length ("(Constantinople)" is 14). A non-breaking hyphen
does not split.
Non-breaking spaces, narrow no-break spaces and the word joiner are rejected in text outright
(simpler than modelling them, and a question never needs one), so they cannot hide a long word.

### Scripts

The bank is English. A text may contain Latin and Greek letters only (Greek for π and the like);
any other script is rejected with a message naming the character, its script and the reason
(the limits were measured for Latin text). This was chosen over a per-script character limit
because it is simpler and no requirement asks for other scripts; if the Singapore pack wants to
show a Chinese or Tamil word, the rule to add is a per-script width in `displayLength`. A word
that mixes Latin with another alphabet (a Cyrillic "а" inside "What") gets its own message,
since a look-alike letter is the usual cause. Greek beside Latin in one word is rejected only
when the Greek letter is a Latin look-alike (Α, Β, Ο, ο, ν, ρ and the like), so "πr²", "2πr",
"kΩ" and "MΩ" pass. Letters that belong to no one script (the micro sign in "µm", the okina in
"Hawaiʻi") are neutral.

### Validation rules

Errors (the build fails): `json` (invalid, or a key twice in one object), `file`,
`unknown-field`, `id`, `type`, `prompt`, `options` (count by type, length, unbroken word,
uniqueness, `True`/`False` spelling), `answer`, `difficulty`, `region`, `picture`, `source`,
`blocklist`, `duplicate-id`, `duplicate-question`, `budget` (one chunk over 2 MB).

Text must be trimmed, single-spaced with ordinary spaces, NFC, one line, with no invisible
format character (a zero-width joiner gets its own message, since joined emoji are how it
arrives), no HTML entity, and no `<` directly before a letter. An entity is `&name;`, `&#39;`
or `&#x27;`; one of `&amp`, `&lt`, `&gt`, `&quot`, `&apos`, `&nbsp` without its semicolon; or
`&#` before a digit. An ampersand in a name is ordinary text: "AT&T", "R&B", "M&M's", "Q&A" and
"S&P 500" pass.

Warnings (printed; `--strict` makes them fail): `length-giveaway` (the correct option is the
longest or the shortest by 1.5 times and at least 10 characters); `same-options` (two
four-option questions share their option set and their correct answer); `answer-balance`
(True against False, above); a file in `pictures/` that no question uses.

**What counts as the same.** Two options are the same when they match after compatibility
folding, case folding and collapsing spaces, and nothing else: `C / C++ / C# / Java`,
`+ / - / × / ÷`, `-5 / 5`, emoji and accented words are all distinct. Two questions are the same
when they have the same prompt (case, Latin accents, apostrophes and sentence punctuation
ignored; signs and symbols kept, so "What is 5 + 3?" and "What is 5 - 3?" differ) **and** the
same set of options in any order, and for a picture question the same photograph. So "Which of
these is a prime number?" may be asked twice with different options. Only Latin accents are
stripped; the marks of other scripts are kept.

### Pictures and the 2 MB budget

A picture file must be a real image (JPEG, PNG or WebP by its first bytes, matching its
extension), not empty, and at most 150,000 bytes. Its alt text, credit and file name must not
contain the correct answer, since all three reach the screen or the network. Licences: Public
domain, CC0 1.0, CC BY and CC BY-SA in the versions that exist (1.0, 2.0, 2.5, 3.0, 4.0).

The budget counts chunk files plus pictures, uncompressed, against 2,000,000 bytes:

- The build fails if one chunk alone is over it.
- `selectQuestions` returns `over-budget` if the chunks a match needs are over it together.
- A picture question that would take the match over it is passed over.
- `poolSize` counts picture questions only as far as the budget is certain to hold them: the
  room left after the chunks divided by the largest picture in those categories (the index lists
  each category's picture files and sizes). So a length `poolSize` allows never fails, whatever
  the seed. With pictures at the cap, 13 fit beside a small bank and about 10 beside a
  full-size one.

### Generated output: git-ignored

`content/rabakz/generated/` holds `<category>.<hash>.json`, `index.json` and `pictures/`. A
chunk's name carries the first 12 characters of its content hash, so a cached chunk can never be
taken for the one a newer index describes; the loader checks the full hash as well. The folder
is **ignored** (`content/rabakz/.gitignore`), because:

- R-11, R-12 and R-13 add questions on separate branches at the same time; a committed index
  with counts and hashes would conflict on every merge.
- The source files are the record; the output is a pure function of them (compact JSON, files
  and questions sorted by code unit, no timestamp), so nothing is lost by not committing it.
- Leaving it out of git does not leave the bank unchecked: `scripts/build.test.ts` validates the
  real bank inside `pnpm test`, so `pnpm verify` fails on a bad question.

**What the integrator must do:** whichever issue serves or bundles the game must run
`pnpm --filter @kaki/content-rabakz build` before `dev` and before the production build, and
serve `content/rabakz/generated/` as static files. `index.json` must not be cached for long;
the chunk files may be cached for ever.

**Where the build may write.** `--out` is refused unless the folder is new, empty, or holds an
`index.json` of this format. Even then the build removes only names of the shape it writes
(`<category>.<12 hex>.json`, `index.json`, `pictures/<picture file>`) that the old index lists
and the new build did not write; a forged index naming `geography.json` or `notes.txt` removes
nothing. A `pictures` entry in the output that is a link, or that is the folder the pictures
are read from, is refused. New chunks and pictures are written first, the index last, and old
files are removed only after that, so a failure part-way leaves the previous build usable. A
file-system error prints one line, not a stack trace. `--out .` or `--out src/questions`
deletes nothing. An option with no value, or followed by another option, is an error.

Chunks hold only what play needs: the per-question source stays in the source file, and the
index carries `credits` (dataset, licence, count) for the credits page (RZ-021). Picture credit
and licence stay on the question.

### Loader (`src/select.ts`)

- `chunksNeeded(index, settings)` → the files to fetch. `poolSize(index, settings)` → how many
  questions a match can be sure of, from the index alone.
- `checkChunks(index, settings, loaded)` → `{ ready, needed, missing, invalid }`. A loaded chunk
  is checked for format, category, question count and hash; the caller must supply the SHA-256
  of the bytes it fetched.
- `selectQuestions({ index, settings, chunks, random, recentlyUsed?, transferBudgetBytes? })`
  → the questions in play order plus `pictures`, `reusedRecent` and `transferBytes`; or
  `bad-settings`, `chunks-not-ready`, `over-budget`, or `bank-too-small` with the number
  available.
- `picturesMissing(pictures, loadedFiles)` → what is still to load.
- `toPublicQuestion(question)` → a `PublicQuestion`: the question without `correct`, and of
  its picture only `file`, `alt` and `credit` (the source address of a photograph usually names
  its subject; it is not added to the answer check, it is simply never sent). **Only
  this may go in a public view or to a phone** (the architecture rule that secrets stay
  private). A `Question` stays in the host's simulation.

Choices the spec does not make, taken here and listed under Requests:

- **Easy** is easy only, **Hard** is hard only, **Mixed** is a third of each (3/4/3, 10/10/10,
  17/17/16), filled from the other difficulties when one runs short.
- **Too small a pool gives no match** (`bank-too-small`), never a short one.
- **Fresh before balanced** (RZ-015): fresh questions in the mix, then any fresh question, then
  recently used ones, oldest first.
- **Region** is `mixed` (default), `general`, `singapore` or `{ singaporeShare }`. The spec has
  no leader setting for region; the parameter exists because the brief asked for it.

Fairness is tested with fixed seeds over 3,000 matches: every question is picked about equally
often, lands in every place of the running order about equally often, and categories are drawn
in proportion to their size.

### Running TypeScript in plain Node

The scripts run as `node --import ./scripts/register.ts scripts/build.ts`. Node 24 strips types
itself; `register.ts` is a 10-line resolve hook that adds the `.ts` the workspace's
extensionless imports leave off. No dependency. The scripts have their own
`tsconfig.node.json` (Node types); the library project stays free of Node and DOM types.

---

## Close-out

### Requirement → code → tests → evidence

| ID | Code | Tests | Evidence |
|---|---|---|---|
| RZ-022 | `content/rabakz/src/schema.ts`, `validate.ts`, `text.ts`, `blocklist.ts`, `build.ts`; `scripts/build.ts`, `scripts/io.ts`; `src/questions/*.json` | `src/validate.test.ts` (50), `src/build.test.ts` (32), `src/text.test.ts` (16), `scripts/build.test.ts` (27) | `fail-build.txt`, `build.txt`, `out-safety.txt`, `verify.txt` |
| RZ-020 (loader part) | `content/rabakz/src/select.ts`, `src/index.ts`; chunk and index writing in `build.ts`, `scripts/io.ts` | `src/select.test.ts` (51); `scripts/build.test.ts` "builds this package end to end" | `build.txt`, `verify.txt` |
| RZ-024 (report only) | `content/rabakz/src/stats.ts`, `scripts/stats.ts` | `src/stats.test.ts` (4) | `stats.txt` |

Evidence folder: `uat/evidence/R-10-question-schema/` (`REPORT.md` maps every statement).
RZ-022 has code, tests and evidence. RZ-020 stays in progress until a game loads the files.

### Files

`content/rabakz/**` (package, 20 sample questions, empty `blocklist.txt`, README,
`fixtures/bad-bank/`), this note, the evidence folder. Changed outside the lane, as PLAN §5
allows: one line in `tsconfig.build.json`. `pnpm-lock.yaml` did not change.

### Review round 1

| # | Finding | Change |
|---|---|---|
| 1 | `--out` emptied any folder | `outFolderFault` refuses a folder that is not new, empty or an earlier build's output; `writeOutput` removes only the plain file names the earlier index lists. `--out` with no value or an option as its value is an error, as is any unknown argument. Tests: "where the build may write (--out)", "the build command line". |
| 2 | Note out of date | "Limits", "Unsure" and the design opening rewritten for D-046 (layout 3A) and the untimed buzzer race. |
| 3 | Duplicate rules rejected good content | Options compared on `optionKey` (NFKC, case, spacing). Questions are duplicates on `promptKey` plus the sorted option set (plus the photograph). Only Latin accents are stripped. Tests for each example given. |
| 4 | Mixed scripts; shared answers | A word mixing alphabets is an error with its own message; `same-options` warning. |
| 5 | Option order | Stated in `schema.ts`, the README and here. True/False balance and source positions are in the index and the stats report; `answer-balance` warning. |
| 6 | Phone button | Option word limit 15; the R-02 and R-03 step-down requirements are recorded under "Limits". |
| 7 | Prompt word, special spaces, scripts | Prompt word limit 30. Non-breaking spaces and the word joiner are rejected. Other scripts are rejected with a clear message (the simpler choice; see "Scripts"). |
| 8 | Chunks over the budget | `over-budget` from `selectQuestions`; `budget` error from the build. |
| 9 | Pictures | 150 KB cap, signature check, empty file rejected; picture files and sizes per category in the index; `poolSize` is budget-aware and is a guarantee. |
| 10 | Public question | `PublicQuestion`, `toPublicQuestion`; alt, credit and file name may not contain the answer. |
| 11 | Smaller gaps | Real CC versions only; duplicate JSON keys; `&`/`<` before a letter; accurate zero-width-joiner message; `checkChunks` requires the hash; hashed chunk file names. |
| 12 | Tests and evidence | Seeded fairness tests; `fixtures/bad-bank/` committed and exercised by a test; all evidence regenerated. |

### Review round 2

| # | Finding | Change |
|---|---|---|
| 1 | The `&` rule rejected names | Only real HTML entities are rejected (see "Validation rules"). Fixture question `bad-entity-open` is now "fish &amp chips". |
| 2 | Public picture | `toPublicQuestion` returns `file`, `alt` and `credit` only; `PublicPicture` type. |
| 3 | Deletes | Only build-shaped names are removed; linked or shared `pictures` refused; new files first, index last, old files after; one line on a file-system error. |
| 4 | Scripts and words | Common-script letters neutral; Greek beside Latin rejected only for look-alikes; surrounding punctuation not counted in a word's length. |

### Dependencies wanted

None.

### Requests

1. **Run the bank build before the app's dev and production builds** and serve
   `content/rabakz/generated/` (see "Generated output").
2. **R-02 and R-03 must step long text down** as set out under "Limits": the option limits hold
   only if the phone goes to 21 px on 3 lines and the TV to 34 px.
3. **R-01 to R-03 must show players `toPublicQuestion(question)` only.** The game's conformance
   kit (F-04) should catch a `correct` field in a public view.
4. **Randy to confirm, or the PRD to state** (`OPEN-QUESTIONS.md`): what Mixed difficulty means
   (here: a third of each); that Hard is hard questions only; that a pool too small for the
   chosen length refuses the match; whether there is a region setting at all.
5. **Generated images (D-042)** have no licence or source address in the usual sense; the
   schema requires both. R-13 should extend the picture rule when the first one is needed.
6. **`TRACEABILITY.md`:** RZ-022 and RZ-020 rows can take the paths above.
7. **R-11** will change the real-bank test in `scripts/build.test.ts` ("validates with no
   errors and no warnings") from "no problems" to "no errors": an imported bank will carry
   warnings (`same-options`, `length-giveaway`) that a person then reads.
8. **The 20 sample questions** were written from knowledge with a named reference each; nothing
   was looked up online. They fall under Randy's spot-check (R-14) like the rest.

### Unsure

- Glyph widths are estimates (0.5 and 0.55 em), not measured in the real faces, and the phone's
  292 px of text is the reviewer's figure for an 844 × 390 phone; board 4 (the controller) is
  not decided. R-02 and R-03 should screenshot a 120-character prompt with four 40-character
  options, and a 15-character word, on both screens.
- The budget uses uncompressed sizes, which overstates what is transferred. It is safe, but it
  means `poolSize` promises fewer picture questions than would really fit.
- The `same-options` warning will fire on honest pairs (two history questions over the same four
  years with the same answer). It is a warning for that reason.
- The index shape changed in this round but the format number is still 1, since nothing has
  shipped. From the first release on, a change of shape must raise it.
