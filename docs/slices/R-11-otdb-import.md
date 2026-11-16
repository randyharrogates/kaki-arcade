# Slice R-11 — Import the Open Trivia Database into the Rabakz bank

Issue R-11 in `docs/backlog/R-rabakz.md`, wave 0. Branch `issue/R-11-otdb-import`.
Owns `content/rabakz`, except files named `src/questions/singapore-*.json` (R-12, in progress
at the same time).

## Goal

The general-knowledge part of the Rabakz bank: the verified questions of the Open Trivia
Database (CC BY-SA 4.0), downloaded by a script that can be run again, mapped into the R-10
schema, screened for an all-ages room and for a buzzer race shown on a TV, and committed as
source files with the dataset credit and share-alike notice carried into the index.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| RZ-021 | partly | The Open Trivia Database source: licence, credit and the "adapted, same licence" notice are recorded per file and emitted in `index.json` credits. The credits page itself is X-track; the Singapore pack is R-12; Randy's spot-check is R-14. |
| RZ-023 | partly | The all-ages screen: `blocklist.txt` filled, an import screen for topics and patterns, and a read-through of a seeded sample. A person still reads more of the bank in R-14. |
| RZ-024 | partly | At least 1,300 general questions towards the 1,500 total. The Singapore pack (R-12) and pictures (R-13) close it. |

## Acceptance

1. `scripts/import-otdb.ts` downloads with a session token, one request per 5.5 s,
   `encode=url3986` decoded with `decodeURIComponent`, handles response codes 0 to 5, resumes
   from a git-ignored cache, and sends only a generic User-Agent. With the API unreachable and
   no cache it stops with a message and writes nothing.
2. Every imported question is `multiple-choice`, `region: general`, with a
   difficulty of easy, medium or hard and an id derived from its content.
3. The 24 dataset categories map onto 8 to 12 Rabakz categories, each with a title of at most
   24 characters. The table is in this note and in the import report.
4. Each file's `defaultSource` names the dataset, its licence, its address and the adaptation
   notice, and `index.json` credits carry all four.
5. The import report counts what was fetched, what each rule dropped, and what was kept per
   category, difficulty and type.
6. (Changed mid-slice by D-049: Rabakz has no true-or-false questions.) Only multiple-choice
   questions are requested and imported, and the true-or-false samples of R-10 are removed.
7. No imported question raises a validator error or a `length-giveaway` warning. `same-options`
   warnings that remain have been read and are different questions.
8. At least 1,300 imported questions (or the number reached, with the reason).
9. The real-bank test checks for no errors; warnings are printed by `stats`; no other test is
   weakened; `pnpm verify` passes.
10. Every chunk and all chunks together are inside the 2 MB match budget (sizes reported).
11. A seeded sample of 60 imported questions was read, twice, with removals and the patterns
    behind them recorded.
12. Sample questions written in R-10 stay unless an imported question asks the same thing.

## UAT

Nothing here is seen by a player on its own, so there are no screenshots. Evidence is text in
`uat/evidence/R-11-otdb-import/`: `import-report.md`, `stats.txt`, `build.txt`, `verify.txt`, `sample.md`
(the bank as committed) and `readthrough/` (every question read in review round 1). The
statement-by-statement evidence table is under "Review round 1" below.

## Out of scope

The credits page (X-track), the Singapore pack (R-12), pictures (R-13), Randy's spot-check
(R-14), shuffling options (R-01), and any rewriting of question text beyond clean-up of
spacing and invisible characters.

---

## What was built

### The download (`scripts/otdb-fetch.ts`)

`api_category.php` and `api_count_global.php` once, a session token, then
`api.php?amount=50&category=<id>&type=multiple&encode=url3986&token=…` category by category,
one request every 5.5 seconds. Every page is written to `content/rabakz/.otdb-cache/pages/`
as it arrives (the folder is ignored by `content/rabakz/.gitignore`), with the token and the
finished categories in `state.json`. Response codes: 0 store; 1 and 4 halve the amount asked
for, down to one, then the category is finished; 3 take a new token and start the half-read
categories again (a new token would repeat questions); 5 and HTTP 429 wait and ask again, six
times at most; 2 or anything else stop. A network fault is retried four times, then the import
stops with a message and writes nothing. The only header sent is `User-Agent:
trivia-import/1.0`.

The download for this slice was made before D-049 arrived, so the cache holds the 789
true-or-false questions too; the mapping drops them and the report counts them. A fresh run
asks for `type=multiple` and never downloads them. The four-option questions are the same
either way.

### The category table

| Dataset category | Rabakz category (file) | Title |
|---|---|---|
| General Knowledge | `general-knowledge` | General knowledge |
| Entertainment: Books, Entertainment: Musicals & Theatres, Art, Mythology | `arts-and-literature` | Arts and literature |
| Entertainment: Film, Entertainment: Television | `film-and-tv` | Film and television |
| Entertainment: Music | `music` | Music |
| Entertainment: Video Games, Entertainment: Board Games | `games` | Video and board games |
| Entertainment: Comics, Entertainment: Japanese Anime & Manga, Entertainment: Cartoon & Animations | `comics-and-animation` | Comics and animation |
| Science & Nature, Science: Mathematics, Animals | `science-and-nature` | Science and nature |
| Science: Computers, Science: Gadgets, Vehicles | `technology` | Technology and vehicles |
| Geography | `geography` | Geography |
| History, Politics | `history` | History |
| Sports | `sport` | Sport |
| Celebrities | left out whole | (who is famous, married or alive changes, and much of it is gossip) |

Eleven imported categories; `food-and-drink` stays as R-10 left it, with its three remaining
sample questions. Titles are in sentence case, as R-10's were.

### Mapping

`multiple` becomes `multiple-choice` with the correct answer first (the game shuffles, R-01);
difficulty is the dataset's own; region `general`; id `otdb-` plus the first 12 hex characters
of the SHA-256 of the folded prompt and the folded answer, so it survives a change of spacing,
case or wrong options. Each file's `defaultSource` is the dataset.

Text is tidied and not otherwise changed: leftover HTML entities decoded (none were left in
this download; the code and its tests are there for the next one), soft hyphens, zero-width
characters, direction marks and the byte-order mark removed, every kind of space made an
ordinary one, runs closed up, NFC.

### Licence data (a schema addition)

`DatasetSource` and `SourceCredit` gained an optional `notice` (12 to 240 characters). The
validator accepts it, the build copies it into `index.json` `credits`, and a credit is now
keyed on it too. The bank format number is unchanged: the field is optional and a loader that
ignores it still works. `content/rabakz/CREDITS.md` says the same in prose.

### Filters, in order

1. True-or-false (D-049) and anything not a four-option question of a known difficulty.
2. The screen, `scripts/otdb-screen.ts`: Celebrities left out whole; options that depend on
   their order; questions needing a sound, a picture or a pronunciation; dated wording;
   records and counts that change; internet fads; alcohol and tobacco; drugs; violence; adult
   or crude themes; titles made for adults (a list of about 175 names and abbreviations of games, films, shows and comics
   rated for adults, with titles that are also ordinary words tried only on video game
   questions).
3. The validator as it stands, `blocklist.txt` included. No rule was loosened.
4. The validator's `length-giveaway` warning, treated as a drop.
5. The same id twice; then near-duplicates: the same answer and half the words in common, or
   the same answer, the same four options and a third of the words.
6. `otdb-removed.txt`: 18 ids taken out by reading, each with its reason.
7. A cap of 240 per Rabakz category (`CATEGORY_CAP`), a third of each difficulty where the
   category has them, lowest ids first. **This is a judgement of mine, not something the issue
   asked for**: see "Unsure".

### `blocklist.txt` against the screen

The blocklist fails the build for the whole bank, R-12's and R-13's questions included, so it
holds only the 204 terms that are wrong in any question (swearing, sexual terms, slurs,
graphic violence, hard drugs). Words that are wrong only in some questions ("beer", "kill",
"casino", "drug") are in the import screen, where they cannot fail somebody else's question
about Tiger Beer or the Opium Wars. Names that only look rude, or are also ordinary names
("Gore", "sperm whale", "Maine Coon", "Rio Negro"), were left out on purpose.

### Tests changed

`scripts/build.test.ts`: "validates with no errors and no warnings" is now "validates with no
errors", and the end-to-end build test expects `0 error(s), ` instead of
`0 error(s), 0 warning(s)`. Nothing else in that file changed. `scripts/stats.ts` prints the
warnings after the stats.

> Everything above this line describes the first hand-back. Where it disagrees with the
> sections below (11 categories, a single cap constant, 2,490 questions, samples of 60, "no
> spelling corrected"), the sections below are the current state.

---

## Review round 1

The reviewer found the screen leaking (a possessive bug meant "Assassin's Creed" was never
matched), a fault rate of 6.6% where the first hand-back claimed about 3%, a README that was
untrue after D-049, and a claim that "each pair was read" that was not accurate. What was done:

| # | Asked | Done |
|---|---|---|
| 1 | Drop tables A and B, the named duplicates and the adult-topic list; fix the screen rather than list ids | Titles now match with a plural or possessive "s" and are held in folded form (`assassins creed`); 20 titles added; the record rule gained "has the most", "is the only", "the only … to", "owned by", "have there been", "largest city" and others; violence and adult rules extended. What no pattern catches is in `otdb-removed.txt`, each line with a reason and the prompt. The import stops, writing nothing, if a listed id is not in the download, and names entries an earlier rule already covers (none at hand-back). |
| 2 | Spelling pass | `MISSPELLINGS` (16, no safe fix: the question is dropped, 14 hit) and `SPELLING_FIXES` (85 corrections with one clear fix, plus 10 "it's" for "its" by id). Fixes are applied after the id is made and are listed in the import report: 92 texts changed in kept questions. |
| 3 | Exceptions for good questions the strict screen dropped | `otdb-allowed.txt`, 16 ids, each read; skips the word screen only. |
| 4 | Audience fit | `CATEGORY_CAPS`: general knowledge, geography, history, science and nature uncapped; the rest 240. Games, comics and anime are one category under one cap, easy and medium and best-known names first (it now holds no hard question: 107 easy, 133 medium). Sport: North American league questions at most a tenth (10 of 101). The three `food-and-drink` samples moved to `general-knowledge`; that category, `games` and `comics-and-animation` are gone. |
| 5 | Read every question | Done: see "The read-through" below. |
| 6 | Licence | `licenceUrl` (optional) in the source and the credits; the notice says "selected, screened for an all-ages audience, regrouped and tidied"; the validator requires `notice` when the licence name contains "SA"; entities are decoded only when the download was not `url3986`. README rewritten (multiple choice only, caps, hand lists, "delete `.otdb-cache/` to download afresh", 20 to 30 minutes). |
| 7 | Re-run, rebuild, re-measure | `import:otdb -- --offline`, build, stats and `pnpm verify` run on the committed state; all evidence regenerated. |

### Evidence, statement by statement

| # | Statement | Result | Evidence (in `uat/evidence/R-11-otdb-import/` unless a path is given) |
|---|---|---|---|
| 1 | Download: session token, one request per 5.5 s, `type=multiple`, `encode=url3986`, codes 0 to 5, resumable git-ignored cache, generic User-Agent, stops writing nothing on failure | pass | `content/rabakz/scripts/otdb-fetch.test.ts` (7 tests against a stand-in API) |
| 2 | Every imported question is multiple choice, `region: general`, of a known difficulty, with an id from its content | pass | `stats.txt`; test "the imported questions in this package" |
| 3 | 24 dataset categories map onto 10 Rabakz categories, titles at most 24 characters | pass | `import-report.md`; tests "the category table" |
| 4 | Dataset, licence, licence address, dataset address and notice in each file and in the index credits; share-alike without a notice is an error | pass | tests "are credited in the index…", `src/validate.test.ts`, `src/build.test.ts` |
| 5 | The import report counts fetched, dropped per rule, kept per category and difficulty, spelling fixes, hand lists | pass | `import-report.md` |
| 6 | No true-or-false question imported (D-049) | pass | `stats.txt`; 789 dropped in `import-report.md` |
| 7 | No validator error and no `length-giveaway` warning from an imported question | pass | `build.txt` (0 errors, 35 warnings, all `same-options`) |
| 8 | At least 1,200 imported (the review's target) | pass: 2,349 | `import-report.md`, `stats.txt` |
| 9 | `pnpm verify` passes | pass | `verify.txt` (894 tests, 23 files) |
| 10 | Inside the 2 MB match budget | pass: largest chunk 82,163 bytes (history); all 16 together 721,851 bytes, 36%; 180,997 bytes gzipped | `stats.txt`, `build.txt` |
| 11 | Every question in the bank read, removals and reasons recorded | pass, within the limits stated below | `readthrough/<category>.md`; `content/rabakz/otdb-removed.txt` |
| 12 | The Singapore pack builds against the blocklist; no `singapore-*.json` touched | pass | `build.txt` (0 errors) |
| 13 | A hand-list id missing from the download stops the import | pass | tests in "the lists kept by hand"; `import-report.md` "Hand lists" |

### The read-through

**2,514 questions were read**, each in full with its four options: the 2,481 that the repaired
screen and the caps first let through, then the 33 that came in as removals made room in the
capped categories (31, then 1, then 1), until a run brought in none. All 2,349 questions in
the bank are among the 2,514 (checked by script against the listings).

Read per category: arts and literature 200, film and TV 257, games, comics and anime 251,
general knowledge 306, geography 275, history 324, music 244, science and nature 330,
sport 111, technology 216.

**165 of the 2,514 are not in the bank**: 160 removed by id, 4 by a pattern added because of
what was read (three film titles, "fidget spinners"), and 1 sport question that left through
the league share when its category shrank. 164 faults in 2,514 is 6.5%.

| Category | Removed by id | Reasons |
|---|---:|---|
| arts-and-literature | 5 | unsuitable 2, wrong 1, broken 1, misspelt 1 |
| film-and-tv | 14 | unanswerable here 5, dated 3, wrong 1, unsuitable 1, ambiguous 1, given away 1, broken 1, duplicate 1 |
| games-comics-and-anime | 11 | unsuitable 4, ambiguous 2, given away 2, wrong 1, dated 1, broken 1 |
| general-knowledge | 35 | unanswerable here 17, unsuitable 5, dated 5, ambiguous 4, duplicate 2, wrong 1, given away 1 |
| geography | 23 | unanswerable here 8, duplicate 6, ambiguous 4, dated 3, wrong 1, given away 1 |
| history | 23 | unanswerable here 8, unsuitable 5, duplicate 4, ambiguous 3, wrong 2, given away 1 |
| music | 4 | unsuitable 2, unanswerable here 1, broken 1 |
| science-and-nature | 21 | duplicate 8, wrong 5, unanswerable here 3, ambiguous 3, dated 1, given away 1 |
| sport | 9 | unanswerable here 4, unsuitable 2, dated 1, ambiguous 1, duplicate 1 |
| technology | 15 | unanswerable here 4, ambiguous 4, duplicate 4, dated 3 |
| **All** | **160** | unanswerable here 50, duplicate 26, ambiguous 22, unsuitable 21, dated 17, wrong 12, given away 7, broken 4, misspelt 1 |

"Unanswerable here": only someone living in one other country could answer. "Broken": the
prompt does not parse.

What the reading was not:

- It was one reader's judgement from general knowledge; no question was checked against a
  reference. A wrong answer that looks plausible will have got through.
- Duplicates across categories were caught only where the earlier question was remembered
  (26 found); there will be more.
- "Unsuitable" and "unanswerable here" are judgements. School history of wars, American state
  capitals and presidents were kept; American brands, local nicknames, college mascots and
  league trivia were removed.
- Correct but niche questions stay (one game's lore, one band's track list).

### For Randy to decide: factual questions on adult topics, dropped by default

All 14 are out of the bank. To restore one, delete its line (first six) or add its id to
`otdb-allowed.txt` (the rest, which a screen pattern now drops), then run
`import:otdb -- --offline`.

| Id | About | Dropped by |
|---|---|---|
| `otdb-383b7b3e6e58` | Oscar Wilde "imprisoned for being gay" | `otdb-removed.txt` |
| `otdb-449cc18beba3` | the first lesbian rights organisation in the United States | `otdb-removed.txt` |
| `otdb-39ae74798aba` | the artist who cut off his ear | `otdb-removed.txt` |
| `otdb-943bbf2cc672` | the cancer Steve Jobs died of | `otdb-removed.txt` |
| `otdb-5efe695968b2` | why a Pokémon episode was banned | `otdb-removed.txt` |
| `otdb-9c399d0e1517` | the odds of a royal flush in poker | `otdb-removed.txt` |
| `otdb-73ca239b11fc` | "My Scientology Movie" | screen: `scientology` |
| `otdb-2b1d0ed0442d` | "Mein Kampf" | screen: `mein kampf` |
| `otdb-88935f01e1f1` | "Two and a Half Men" | screen: title |
| `otdb-29e678deb5d6`, `otdb-cbf1dabf9cc0` | "It's Always Sunny in Philadelphia" | screen: title |
| `otdb-1a419ec7af65` | "Mad Men" | screen: title |
| `otdb-26580b37ee01` | "House of Cards" | screen: title |
| `otdb-42da9d357890` | who designed the minigun | screen: `minigun` |

### Recheck before each release

Right today, in the bank, and able to become wrong. 25 questions.

| Id | Question | What could change |
|---|---|---|
| `otdb-85d1e28b7d04` | capital of Indonesia: Jakarta | the move to Nusantara |
| `otdb-7208c46ffec9` | largest Muslim country: Indonesia | population figures (Pakistan) |
| `otdb-5ca24bded222` | youngest Nobel laureate | a younger one |
| `otdb-87571b086791` | New York City Subway, 472 stations | station counts |
| `otdb-575fc8db2953` | Russia's 11 time zones | changed in 2010 and 2014 |
| `otdb-2dc8588133b1` | American cities under a million people | census figures |
| `otdb-79cc23393543` | actors who have NOT played Billy Flynn | new casting |
| `otdb-e347925bc75c` | actors who have NOT played Spider-Man | new casting |
| `otdb-edaf01bc5b2e` | El Teniente, largest underground copper mine | a larger mine |
| `otdb-15fbaa433ff1` | Catalonia's bullfighting ban | already annulled by a court in 2016; the ban of 2010 is still a fact |
| `otdb-37353c65d81d` | busiest port in Europe: Rotterdam | traffic figures |
| `otdb-50ded5a182d0` | Cyprus, in the eurozone and outside Schengen | Cyprus joining Schengen |
| `otdb-fd594703e69a` | which country claims Kosovo | politics |
| `otdb-3028a6f5490c` | 14 countries border Russia | borders |
| `otdb-5172d54cf970` | UN Trusteeship Council, suspended since 1994 | it resuming |
| `otdb-4a53fd5431aa` | the 45th President of the United States | still right; he is also the 47th |
| `otdb-2ec91d3b0ca9` | a co-prince of Andorra | constitutional change |
| `otdb-fbef31a6de97` | Pluto's five moons | a discovery |
| `otdb-4aed68bd109b` | dwarf planets named after Polynesian deities | a new dwarf planet |
| `otdb-123701a22dec` | eight planets | a reclassification |
| `otdb-7ea28efbb2d1` | Manchester United's top Premier League scorer | a new record |
| `otdb-912037da4028` | Etihad Stadium | a sponsor's name |
| `otdb-a1a9a404f231` | largest maker of motorcycles: Honda | sales figures |
| `otdb-8ae8656c3b53` | brands that belong to General Motors | a sale |
| `otdb-4edd0f56a41e` | Infiniti is to Nissan | a sale |

Four of the reviewer's ten are no longer in the bank, so need no recheck: moon landings
(`otdb-1ea1fd07151d`, now caught by "have there been"), the manga with the most volumes
(`otdb-0063b2c4a8e1`) and the NHL points record (`otdb-41680854cd7b`), both caught by the
record rule, and the award two people do not have (`otdb-d0e47da4f53c`, removed by id as dated).

### The 35 `same-options` warnings

Two questions sharing four options and the answer. All 35 pairs were printed side by side and
read; each is two different questions (number and colour sets that coincide). Four pairs
include a Singapore question. Because of them `build -- --strict` exits 1 with "0 error(s),
35 warning(s)"; the ordinary build, which `pnpm verify` and the real-bank test use, passes.

---

## Close-out

### Requirement → code → tests → evidence

| ID | Code | Tests | Evidence |
|---|---|---|---|
| RZ-021 (dataset part) | `content/rabakz/scripts/import-otdb.ts`, `otdb-fetch.ts`, `otdb-map.ts` (`OTDB_SOURCE`); `src/schema.ts`, `src/validate.ts`, `src/build.ts` (`notice`, `licenceUrl`); `CREDITS.md`; `src/questions/*.json` | `scripts/otdb-fetch.test.ts` (7), `scripts/otdb-map.test.ts` (44: "the category table", "mapping a question", "are credited in the index…"), `src/build.test.ts`, `src/validate.test.ts` | `import-report.md`, `build.txt` |
| RZ-023 (first screen and a full read) | `content/rabakz/blocklist.txt`, `scripts/otdb-screen.ts`, `otdb-removed.txt`, `otdb-allowed.txt`, `SPELLING_FIXES` in `scripts/otdb-map.ts` | `scripts/otdb-screen.test.ts` (15), `scripts/otdb-map.test.ts` "what the import drops", "the lists kept by hand", "spelling fixes", "hold none of the ids removed after reading" | `import-report.md`, `readthrough/`, "The read-through" above |
| RZ-024 (general part) | `src/questions/<category>.json` (10 files, 2,349 imported questions) | `scripts/otdb-map.test.ts` "are at least 1,200…"; `scripts/build.test.ts` | `stats.txt`, `build.txt` |

Evidence folder: `uat/evidence/R-11-otdb-import/`. None of the three requirements is closed by
this issue alone: RZ-021 needs the credits page, RZ-023 needs R-14, RZ-024 needs R-13.

### Numbers

- Fetched 5,299 verified questions (4,510 multiple choice, 789 true-or-false).
- Kept **2,349**: easy 835 (35.5%), medium 1,009 (43.0%), hard 505 (21.5%).

| Category | easy | medium | hard | imported |
|---|---:|---:|---:|---:|
| arts-and-literature | 56 | 88 | 51 | 195 |
| film-and-tv | 108 | 75 | 57 | 240 |
| games-comics-and-anime | 107 | 133 | 0 | 240 |
| general-knowledge | 133 | 98 | 39 | 270 |
| geography | 76 | 118 | 58 | 252 |
| history | 73 | 147 | 81 | 301 |
| music | 89 | 89 | 62 | 240 |
| science-and-nature | 90 | 133 | 86 | 309 |
| sport | 43 | 42 | 16 | 101 |
| technology | 60 | 86 | 55 | 201 |

- Dropped 2,950: 848 over a category cap, 789 true-or-false, 412 titles made for adults,
  215 removed after reading (`otdb-removed.txt` has 222 lines; a few of them lose their place to a cap or a twin first), 147 violence, 104 records and
  counts, and the rest as in `import-report.md`.
- With the Singapore pack (R-12) and the 13 remaining R-10 samples the bank is 2,667 questions
  in 16 chunks.
- Arts and literature (195) is under its cap of 240: the dataset has no more that pass.

### Files

`content/rabakz/`: `scripts/import-otdb.ts`, `otdb-fetch.ts`, `otdb-map.ts`, `otdb-screen.ts`
and their tests; `otdb-removed.txt`, `otdb-allowed.txt` (new in round 1), `blocklist.txt`,
`CREDITS.md`, `README.md`, `.gitignore`, `package.json`; `src/schema.ts`, `src/validate.ts`,
`src/build.ts` and tests (`notice`, `licenceUrl`); `scripts/build.test.ts`, `scripts/stats.ts`;
`src/questions/`: ten category files (`games-comics-and-anime.json` new; `games.json`,
`comics-and-animation.json`, `food-and-drink.json` deleted). No `singapore-*.json` file was
read by the import or changed. This note and the evidence folder. `pnpm-lock.yaml` unchanged.

### Dependencies wanted

None.

### Requests

1. **Credits page (X-track).** Read `credits` from `index.json`; show the dataset name linked
   to `url`, the `notice`, and the licence name linked to `licenceUrl`.
2. **R-14.** The whole bank has now had one read, by the builder, without reference checks.
   The best use of Randy's time is the `sample.md` of 60 (or any category file in
   `readthrough/`), the "for Randy to decide" list and whether the judgement calls above
   (school war history kept, American state capitals kept) are his.
3. **Mixed matches and category weight (R-01 or `select.ts`).** A Mixed match draws by pool
   size, so the Singapore pack is 311 of 2,667 (12%). If it should come up more often the
   selector needs a weight; the PRD does not state one.
4. **`same-options` and `--strict`.** 35 coincidental pairs make the strict build fail. Either
   the warning should ignore pairs whose prompts share no content word, or a reviewed-pairs
   list is wanted. Not changed here: it is the validator's rule and four pairs involve R-12's
   files.
5. **Follow-up to D-049.** The schema's type list, the true-or-false validator rules and the
   "True-or-false answers" line in `stats` are unused; left alone as told.
6. **Decision log.** `notice`, `licenceUrl`, the caps table, the merged category, the league
   share and "misspellings are corrected" are choices that may want lines in `DECISIONS.md`.
7. **The fetch's wasted requests.** The API's per-category counts include true-or-false, so
   each category ends with a few shrinking requests. It costs minutes, not correctness; a
   `type`-aware count does not exist in the API.
8. **`REPORT.md`.** The evidence folder has none this round: the tool that writes files refused
   a file of that name from this agent. Its content is the "Review round 1" section above.

### Unsure

- **Residual faults.** 6.5% of what was read had a fault and was removed. What remains passed
  one reader with no reference books. I would expect an independent sample to still find
  some: plausible wrong answers, cross-category duplicates, and questions another reader
  would call too American.
- **Breadth of the record rule.** "is the only", "has the most" and "owned by" also catch
  facts that never change; 16 were read and let back through `otdb-allowed.txt`, but the 104
  dropped by that rule were not all read.
- **Games, comics and anime has no hard question.** That follows from "prefer easy and medium":
  the cap fills before hard ones are offered. Say if a share of hard ones is wanted.
- **The live download was made once**, before the `type=multiple` change; the changed request
  was checked with one live call and the stand-in API, not a second full download.


---

## Review round 2

This section supersedes the round 1 counts and the earlier zero-hard-games limitation.
Changes are left uncommitted on `issue/R-11-otdb-import`, as requested. No network,
installation, dependency, lockfile or Singapore-pack change was made. Generated category
files were written only by `import:otdb -- --offline`.

### Fixes (RZ-021, RZ-023, RZ-024)

- Added all 18 requested MUST/SHOULD removals to `otdb-removed.txt`, including all eight
  all-ages breaches. The original downloaded ids remain stable.
- Extended the existing text-correction stage in `otdb-map.ts` with corrections keyed by id:
  Rosalina's prompt now refers only to Mario Kart; the Flying Shuttle year is 1733; RAID 10
  becomes RAID 6; Solid State Disk becomes Super Speed Disk; Eskimos becomes Yetis;
  Contraceptive prevalence rate becomes Cardiac pressure response; Masta Killa becomes
  MC Lars (another rapper, a wrong answer). These run before the screen, validator and
  duplicate checks, and appear in the report's corrections section.
- Added the six requested spelling fixes to `SPELLING_FIXES`. Also corrected Uwe Rosenburg
  to Uwe Rosenberg when reading a newly offered board-game question.
  The corrected Minecraft option (`otdb-6b30f4aadf75`) and December ordinal
  (`otdb-e4a73e09fd4b`) are covered by the importer but their questions are displaced by
  the new games difficulty allocation; the remaining requested corrections are in the bank.
- Left `otdb-6805f9a88ac3` at its dataset difficulty: there is no existing difficulty override.
  Its difficulty remains easy, as the brief explicitly permits in that case.
- Removed folded `cod` from the adult-title list. `call of duty` still matches; the title
  abbreviation `CoD` is checked with case preserved, so ordinary cod fish and the Cod Wars
  pass, including fish in a video-game question. Narrowed standalone pill/pills to phrases
  for birth control, abortion and recreational/ecstasy pills.
- The pattern change brought back `otdb-8951964877d5` (Cod Wars: UK/Iceland fishing rights).
  Read it and all options: kept. It also offered `otdb-316118c8fbd1` (the song “I Took A Pill
  In Ibiza”): read it and all options, rejected for its recreational-drug subject through the
  removed-id list. No other pattern-restored question survives in the final bank.
- Reserved 80 of the 240 games/comics/anime places for hard questions. Familiar names are
  still preferred within hard questions and within easy/medium questions. Removed questions
  do not consume the hard quota. Final games split: 106 easy / 54 medium / 80 hard.
- Sport: restored two fixed historical facts through `otdb-allowed.txt`: Mazda's Le Mans win
  before the 2018 cutoff (`otdb-139c1d0f0c42`), and the 2014 World Cup top scorer
  (`otdb-ff964705c2ba`). Corrected the league classifier for the Mongolian Naadam festival
  (`otdb-91c49ef5510f`): American Football is just the distractor, not the question's subject.
  Read the prompts and all options of all three; they are safe and correct from general
  knowledge. North American leagues retain their 10% ceiling.

### Counts before and after

Imported: 2,349 → 2345. Newly kept: 92; prior imported ids removed or displaced: 96. Newly offered candidates read: 123; of those kept: 92.

| Category | Easy before → after | Medium before → after | Hard before → after | Total before → after |
|---|---:|---:|---:|---:|
| arts-and-literature | 56 → 56 | 88 → 85 | 51 → 51 | 195 → 192 |
| film-and-tv | 108 → 107 | 75 → 79 | 57 → 54 | 240 → 240 |
| games-comics-and-anime | 107 → 106 | 133 → 54 | 0 → 80 | 240 → 240 |
| general-knowledge | 133 → 133 | 98 → 98 | 39 → 39 | 270 → 270 |
| geography | 76 → 76 | 118 → 118 | 58 → 58 | 252 → 252 |
| history | 73 → 73 | 147 → 147 | 81 → 81 | 301 → 301 |
| music | 89 → 87 | 89 → 91 | 62 → 62 | 240 → 240 |
| science-and-nature | 90 → 89 | 133 → 132 | 86 → 86 | 309 → 307 |
| sport | 43 → 42 | 42 → 44 | 16 → 17 | 101 → 103 |
| technology | 60 → 60 | 86 → 85 | 55 → 55 | 201 → 200 |


Final imported difficulty totals: **829 easy / 933 medium / 583 hard** (2,345).
Fetched stays 5,299; dropped changes 2,950 → 2,954. With 318 existing non-imported
questions, the full bank changes 2,667 → **2,663**. Validation: zero errors, 34
`same-options` warnings (previously 35).

Sport cannot reach 50 per difficulty from this cache without compromising the screen or
reviewed quality. Its entire multiple-choice cache is **55 easy / 77 medium / 28 hard**,
before screening, duplicates, quality removals and the North American league share. All 60
sport questions absent after the initial round-2 regeneration were read in full while looking
for safe additions; changing records, duplicates, fatal accidents, poor wording and local
league trivia were left out. Hard is impossible even before screening. Final sport:
**42 easy / 44 medium / 17 hard**, up from 101 to 103 overall despite the required Bari drop.
No additional sound easy/medium questions were found within the existing screen and league
policy. The two historical exceptions and Naadam above are the quality-preserving gains.

### Reading and newly admitted ids

Read **123 newly offered candidates** in full, prompts and all four options, against RZ-023
and for correctness. Kept **92**, rejected **31**, repeating offline regeneration until no
unread candidate remained. The rejected candidates include adult horror/sexual/violent works,
a drug-themed song, ambiguous/version-dependent claims, and a cartoon question misfiled as
music. All rejection reasons and original prompts are in `otdb-removed.txt`.

Correctness was assessed from general knowledge and the offline material only; no external
reference checks were possible under the no-network instruction. Uncertain claims were
removed rather than asserted as verified. These are the 92 final newly admitted ids, including
80 hard games questions, three sport additions, Cod Wars and eight cap replacements:

- `otdb-019fb6519c2b`, `otdb-0203de8b0c0a`, `otdb-05b33374dcaa`, `otdb-07be2d992e14`
- `otdb-0a352bdfb249`, `otdb-0a565a441094`, `otdb-0f677ee22844`, `otdb-11562accf5bd`
- `otdb-129296498ecd`, `otdb-139c1d0f0c42`, `otdb-13a425ff7695`, `otdb-14b46ad8e8a1`
- `otdb-15646363b2a2`, `otdb-1604e92bf6d7`, `otdb-1a9019855919`, `otdb-1f2b24b94c16`
- `otdb-2033d128f17a`, `otdb-27335b6a028e`, `otdb-282613b0f90b`, `otdb-28cdabe4b8dd`
- `otdb-36534fd857cf`, `otdb-37942f25cd35`, `otdb-39c99a9eca19`, `otdb-3ca10f072d64`
- `otdb-40bc37523b8b`, `otdb-41bb5bb76890`, `otdb-469f9a18f521`, `otdb-46b6ddd00f00`
- `otdb-4acd0616e3e1`, `otdb-4de20e1c43aa`, `otdb-527511bc74a9`, `otdb-56b85f1750f9`
- `otdb-590b42e29011`, `otdb-5979976fb8bf`, `otdb-67e87b45348d`, `otdb-69cb8a64f216`
- `otdb-6b079b4161f0`, `otdb-6d47ebacf617`, `otdb-6ddca76f0a36`, `otdb-6fb874314760`
- `otdb-730e1a61a6a4`, `otdb-74efda3dcfb4`, `otdb-750aba7fd3f0`, `otdb-76ad233e0e2a`
- `otdb-7818b163b333`, `otdb-7bc90f5d76a2`, `otdb-7c1c14dc32b8`, `otdb-82312598813d`
- `otdb-82f185810117`, `otdb-84b5073047e0`, `otdb-858fad5beefe`, `otdb-8951964877d5`
- `otdb-90517b567083`, `otdb-90b77baffc9a`, `otdb-90f3bdff8898`, `otdb-91c49ef5510f`
- `otdb-9248624ca809`, `otdb-9292fe61d787`, `otdb-95a9d1dbac81`, `otdb-9628a00fec76`
- `otdb-9c6e1c9017e3`, `otdb-a0eba8e221bf`, `otdb-a299abe1a2b1`, `otdb-a86a3629eab9`
- `otdb-aace7fa2b904`, `otdb-aaf2ca221f41`, `otdb-ad70370c662e`, `otdb-b2b32fa61e1f`
- `otdb-b37b83002d4f`, `otdb-b43a96285baf`, `otdb-bbb0c659657b`, `otdb-bcbcba41a4c7`
- `otdb-bdd6dde9edbc`, `otdb-bef7f78859a8`, `otdb-c45aa49dbe90`, `otdb-ccc57a24cc92`
- `otdb-cd46b7646df6`, `otdb-cf06d421ba75`, `otdb-cf78c42e54ca`, `otdb-d64c62b8d9a1`
- `otdb-d7b77b4d6713`, `otdb-d7fe8930204a`, `otdb-dc5af7438ed3`, `otdb-de9c7d68591e`
- `otdb-df24263db3c3`, `otdb-e200de17c54a`, `otdb-ebfb7382b6f4`, `otdb-ed0cdadca9fb`
- `otdb-ef728ce79db9`, `otdb-f7fe8cfa8e1f`, `otdb-fcb80cd2f5cf`, `otdb-ff964705c2ba`

Full prompts, options, answers and kept/removed status for all 123 newly offered candidates:
`uat/evidence/R-11-otdb-import/review-round-2-readthrough.md`. The final admitted-id list is
also in `review-round-2-new-ids.txt`; before/after counts in `review-round-2-counts.md`.
Earlier read-through evidence is historical and remains unchanged.

### Verification and close-out

- Regenerated `import-report.md` and the 60-question `sample.md` with seed 11 offline.
- Two consecutive final offline runs are byte-identical across all 16 source category files,
  the report and the seeded sample: `review-round-2-determinism.txt` records their SHA-256s.
- Regenerated `build.txt` and `stats.txt`; no validator errors.
- `pnpm verify`: **23 test files, 898 tests passed**, typecheck, ESLint, design lint, build
  and trace check passed. Full output: `verify.txt`. `git diff --check` passes.
- Regression coverage: requested substantive text corrections preserve ids and run before
  screening; games retain 80 hard places after removals; the Naadam distractor does not
  consume the league allowance; cod fish and harmless pill uses pass while adult titles and
  adult pill phrases fail. Tests stay in `scripts/otdb-map.test.ts` and `otdb-screen.test.ts`.
- Requirements remain partial at issue level as recorded in the existing Close-out: RZ-021
  needs the credits page; RZ-023 needs independent R-14 review; RZ-024 needs picture content.

Requests: independent review of this round and the newly admitted hard questions. No further
permission or dependency requested; no commit, push or merge performed. Existing requests
outside this issue's paths remain with the integrator.


## Review round 3

Applied both requested drops through `otdb-removed.txt` and eight in-place corrections
through the ID-keyed text-correction mechanism. The two removed hard games questions
consume their original cap places without being kept, leaving the category two short.
Before/after ID comparison: exactly the two requested drops, no new IDs, no backfill;
exactly eight retained questions changed. IDs and answers are preserved.

Blocked correction: the exact requested prompt for `otdb-15646363b2a2` is 122 characters,
exceeding the validator’s 120-character limit. An offline trial dropped it and offered
`otdb-43c9ecd86481`; that trial was discarded. The original Smash Bros. wording remains
in the final bank. Request: provide an approved prompt of at most 120 characters.
No validator limit was changed.

Final imported per-category difficulty counts:

| Category | Easy | Medium | Hard | Total |
|---|---:|---:|---:|---:|
| arts-and-literature | 56 | 85 | 51 | 192 |
| film-and-tv | 107 | 79 | 54 | 240 |
| games-comics-and-anime | 106 | 54 | 78 | 238 |
| general-knowledge | 133 | 98 | 39 | 270 |
| geography | 76 | 118 | 58 | 252 |
| history | 73 | 147 | 81 | 301 |
| music | 87 | 91 | 62 | 240 |
| science-and-nature | 89 | 132 | 86 | 307 |
| sport | 42 | 44 | 17 | 103 |
| technology | 60 | 85 | 55 | 200 |
| **All imported** | **829** | **933** | **581** | **2,343** |

Full bank: **2,661**, including 318 non-imported questions. Regenerated report, seed-11
sample, build and stats evidence offline. Validation: zero errors, 34 `same-options`
warnings. `pnpm verify` passes (23 files, 898 tests); full output in
`uat/evidence/R-11-otdb-import/verify.txt`. Left uncommitted for independent review.
Existing Close-out and Requests remain applicable; round 3 is incomplete pending the
prompt-length conflict above.
