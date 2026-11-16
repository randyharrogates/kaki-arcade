# @kaki/content-rabakz

The Rabakz question bank: source files, the validator and build script, and the loader a match
uses. Design notes and how the limits were derived: `docs/slices/R-10-question-schema.md`.

## Adding questions

One file per category in `src/questions/<category>.json`. The file name is the category id.

```json
{
  "category": "geography",
  "title": "Geography",
  "questions": [
    {
      "id": "geo-0001",
      "type": "multiple-choice",
      "prompt": "What is the capital city of Australia?",
      "options": ["Sydney", "Canberra", "Melbourne", "Perth"],
      "answer": "Canberra",
      "difficulty": "easy",
      "region": "general",
      "source": { "kind": "original", "note": "Where the fact can be checked." }
    }
  ]
}
```

- `type`: `multiple-choice` (4 options), `true-false` (options exactly `["True", "False"]`) or
  `picture` (4 options and a `picture`).
- `answer` is the exact text of the one correct option.
- `difficulty`: `easy`, `medium`, `hard`. `region`: `general`, `singapore`.
- `id` is stable and unique across the bank; never reuse or change one that has shipped.
- `source`: `{ "kind": "original", "note": "…" }` for a question written here, or
  `{ "kind": "dataset", "dataset": "…", "licence": "…", "url": "https://…" }`. A file may give a
  `defaultSource` once, beside `title`, instead of repeating it on every question. A dataset
  source may carry a `notice` (12 to 240 characters): what its licence makes us say beside the
  credit. It is copied into the `credits` of `index.json` for the credits page.
- `picture`: `{ "file", "alt", "credit", "licence", "sourceUrl" }`. The file goes in `pictures/`:
  a real JPEG, PNG or WebP of at most 150,000 bytes, with a lower-case hyphenated name. Licence
  is written `Public domain`, `CC0 1.0`, `CC BY 4.0` or `CC BY-SA 4.0` (versions 1.0, 2.0, 2.5,
  3.0, 4.0). The alt text, the credit and the file name must not contain the answer.
- Limits: prompt 8 to 120 characters with no unbroken word over 30; option at most 40 with no
  unbroken word over 15; title 24. An emoji counts as two characters.
- Text is plain English text: Latin (and Greek) letters only, ordinary spaces, one line. No
  HTML entities (`&amp;`, `&#39;`; "AT&T" and "R&B" are fine), no `<` directly before a letter,
  no joined emoji.
- The same prompt with the same options twice is an error. The same prompt with different
  options is allowed.
- `blocklist.txt` holds the all-ages word list, one term per line.

### Option order

Write the options in any order. This package stores them in source order and never shuffles
them. The game rules (R-01) shuffle the four options of a multiple-choice or picture question
with the match seed; a true-or-false question always shows True, then False. So where the
correct option sits in a four-option source question does not matter, but the balance of True
and False answers does: the build warns when one of them is 70% or more of 20 or more
true-or-false questions, and `stats` prints both balances.

## Commands

| Command | Does |
|---|---|
| `pnpm --filter @kaki/content-rabakz build` | Validates everything and writes `generated/`: one chunk per category (`<category>.<hash>.json`), `index.json`, and `pictures/` in use. Fails, writing nothing, on any error. |
| `… build -- --strict` | Also fails on warnings. |
| `… build -- --out <folder>` | Writes elsewhere. The folder must be new, empty, or an earlier build's output; only that build's own files (`<category>.<hash>.json`, `index.json`, `pictures/<picture>`) are replaced, and a `pictures` entry that is a link is refused. `--sources`, `--pictures` and `--blocklist` point the build at another bank (see `fixtures/bad-bank/`). |
| `pnpm --filter @kaki/content-rabakz stats` | Counts against the launch sizes of RZ-024, answer balance and picture sizes. `-- --check` exits 1 while short. |

`generated/` is git-ignored. `pnpm test` validates the bank on every `pnpm verify`.

## Using the bank in a game

```ts
import {
  checkChunks, chunksNeeded, picturesMissing, poolSize, selectQuestions, toPublicQuestion,
} from '@kaki/content-rabakz';
```

1. Fetch `index.json`. `poolSize(index, settings)` tells a setup screen whether a length can be
   played: a length it allows never fails later.
2. Fetch the files of `chunksNeeded(index, settings)`. For each, pass the parsed JSON **and the
   SHA-256 of the fetched bytes in lower-case hex** (`crypto.subtle.digest`); `checkChunks` says
   when all are loaded and match the index.
3. `selectQuestions({ index, settings, chunks, random, recentlyUsed })` returns the match's
   questions and its `pictures`. Load every picture (`picturesMissing` empty) before the first
   question. Nothing is fetched after that (RZ-020).

**A `Question` holds its answer (`correct`). It stays in the host's simulation.** Only
`toPublicQuestion(question)` — a `PublicQuestion`: the same without `correct`, and with only
the picture's `file`, `alt` and `credit` (a source address usually names the subject) — may be
put in a public view or sent to a phone before the reveal.

Build-time tools (validator, builder, stats) are exported from `@kaki/content-rabakz/tools`.

## The Open Trivia Database import (R-11)

The general-knowledge questions (ids starting `otdb-`) come from the
[Open Trivia Database](https://opentdb.com), licensed CC BY-SA 4.0. They are adapted (selected,
screened for an all-ages audience, regrouped into our categories and tidied), and the adapted
questions are offered under the same licence: see `CREDITS.md`. Do not edit an `otdb-` question
by hand; the next import would undo it. Use the hand lists below and run the import.

| Command | Does |
|---|---|
| `pnpm --filter @kaki/content-rabakz import:otdb` | Downloads every verified multiple-choice question into `.otdb-cache/` (git-ignored, resumable), then rewrites the `otdb-` questions in `src/questions/<category>.json`. Hand-written questions in those files are kept. Files named `singapore-*.json` are never read or written. |
| `… import:otdb -- --offline` | Uses the cache as it is: for changing a filter or a hand list without downloading again. |
| `… -- --dry-run` | Writes no question file. |
| `… -- --report <file> --sample <file> [--seed <n>]` | Writes the import report (fetched, dropped per rule, kept per category and difficulty, spelling fixes, hand lists) and a seeded read-through sample of 60. |

The download takes 20 to 30 minutes: one request every 5.5 seconds (the API allows one per 5
seconds), about 100 pages of 50, and some short requests at the end of each category, because
the API's counts include true-or-false questions that are not asked for. A stopped download
carries on where it left off. **To download afresh, delete `.otdb-cache/`**; the cache is never
refreshed on its own. A cache made before D-049 may hold true-or-false questions; they are
dropped.

If the API cannot be reached, or the download is incomplete, the import stops and writes
nothing. It never makes a question up.

What the import drops, in order (`scripts/otdb-map.ts`):

1. Anything that is not a four-option multiple-choice question of a known difficulty.
   Rabakz has no true-or-false questions (D-049): the import asks for `type=multiple` only.
2. What the screen in `scripts/otdb-screen.ts` rejects: one dataset category left out whole,
   alcohol, tobacco, drugs, violence, adult themes, titles made for adults, wording that dates
   ("currently", "as of 2016"), records and counts that change ("has the most", "is the only",
   "owned by"), internet fads, questions that need a sound or a picture, options that depend on
   their order ("All of the above"), and misspellings with no safe fix.
3. What the validator rejects, `blocklist.txt` included. The rules are not loosened to fit.
4. A correct option given away by its length (the validator's `length-giveaway` warning).
5. Ids listed in `otdb-removed.txt`.
6. Duplicates, near-duplicates (the same answer and mostly the same words) and the reverse of
   a question already kept.
7. Questions over their category's cap (`CATEGORY_CAPS`). General knowledge, geography,
   history and science and nature keep everything that passes; every other category keeps at
   most 240, a third from each difficulty where it has them. Games, comics and anime are one
   category under one cap, which takes easy and medium questions and the best-known names
   first. In sport, questions only a follower of the North American leagues could answer are
   at most a tenth of the category. These are audience choices for a family room in Singapore,
   set at the review of R-11; the constants carry the reasoning.

Misspellings with one clear fix are corrected (`SPELLING_FIXES`), after the id is made, and every
fix is listed in the import report.

Two lists are kept by hand. Each line is an id, a reason, and after ` ## ` the question's
prompt, so the question can be found again if the dataset edits it and its id changes.

| File | Holds |
|---|---|
| `otdb-removed.txt` | Questions a person read and took out: wrong, likely to date, ambiguous, unsuitable, given away, or unanswerable outside one country. Only what no pattern can catch; a fault that is a pattern belongs in the screen. |
| `otdb-allowed.txt` | Questions a person read and cleared, which the word screen would otherwise drop (the god of wine, the alcohol functional group). The validator and every later rule still apply. |

The import **stops and writes nothing** if an id in either list is not in the download, and it
names removal entries that an earlier rule already covers.

`blocklist.txt` fails the build for the whole bank, so it holds only words that are wrong in any
question. Judgements that depend on the dataset live in the screen.

Dataset categories map to ours as listed in `CATEGORY_MAP` (`scripts/otdb-map.ts`).
