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
  `defaultSource` once, beside `title`, instead of repeating it on every question.
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
