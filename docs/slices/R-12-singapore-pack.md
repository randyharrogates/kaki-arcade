# Slice R-12 — Rabakz Singapore pack

Issue R-12 in `docs/backlog/R-rabakz.md`, wave 1. Branch `issue/R-12-singapore-pack`.
Lane for this issue: new files `content/rabakz/src/questions/singapore-*.json` only, this note
and `uat/evidence/R-12-singapore-pack/` (R-11 is importing into the same package).

## Goal

At least 200 original questions about Singapore for the Rabakz buzzer race, each with a source
note, in the R-10 file format, passing the R-10 build with no errors and no warnings.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| RZ-021 | partly | "a Singapore pack written by Claude, each question carrying a source note". Randy's spot-check is R-14; the Open Trivia Database half is R-11. |
| RZ-024 | partly | "at least 200 in the Singapore pack". The 1,500 total is R-11's; the 60 pictures are R-13's. |

RZ-023 (all-ages) is applied to the pack by hand, as the brief asks, but is closed by R-11/R-14.

## Acceptance

1. At least 200 new questions, every one with region `singapore` and an `original` source note.
2. 5 to 7 categories, each title at most 24 characters, each with at least 25 questions.
3. Difficulty roughly a third each of easy, medium and hard.
4. Four-option multiple choice only: no true-or-false questions (D-049, which replaced the
   brief's "at most 10%") and no picture questions.
5. Names in romanised form only; no Chinese, Tamil or Jawi script (OQ-029).
6. `pnpm --filter @kaki/content-rabakz build -- --strict` passes: no errors, no warnings.
7. `stats` shows the Singapore pack target of RZ-024 as met.
8. `pnpm verify` passes.
9. A full sceptical read-through was done, and the removals are recorded.
10. The pack is saved in readable form for Randy, with the 15 least certain questions first.
11. Only `singapore-*.json`, this note and the evidence folder changed.

## UAT

Nothing here is drawn, so there are no screenshots. Evidence is text in
`uat/evidence/R-12-singapore-pack/`: `questions.md`, `build.txt`, `stats.txt`, `verify.txt`,
`REPORT.md`.

## Out of scope

The Open Trivia Database import and the blocklist (R-11), pictures (R-13), Randy's spot-check
(R-14), any script, test, schema or README change, the trackers.

---

## What was written

Six categories, 305 questions:

| File | Title | Easy | Medium | Hard | Total |
|---|---|---|---|---|---|
| `singapore-food.json` | Singapore food | 19 | 22 | 16 | 57 |
| `singapore-places.json` | Singapore places | 18 | 19 | 17 | 54 |
| `singapore-history.json` | Singapore history | 10 | 17 | 23 | 50 |
| `singapore-life.json` | Singapore life | 22 | 21 | 8 | 51 |
| `singapore-nature.json` | Singapore nature | 12 | 19 | 15 | 46 |
| `singapore-arts-and-sport.json` | Singapore arts and sport | 9 | 23 | 15 | 47 |
| | | 90 (30%) | 121 (40%) | 94 (31%) | 305 |

- All 305 are four-option multiple choice: no true-or-false (D-049), no pictures.
- Ids are `sg-food-NNNN`, `sg-place-NNNN`, `sg-hist-NNNN`, `sg-life-NNNN`, `sg-nat-NNNN`,
  `sg-arts-NNNN`. Gaps in the numbering are questions removed in the read-through; ids are
  never reused.
- The correct option's source position within this pack is spread 78 / 68 / 86 / 73 (first to
  fourth); across the whole bank it is 78 / 79 / 90 / 73.
- With the 7 Singapore questions among R-10's samples the bank reports 312 Singapore questions.
  The pack does not repeat those 7 facts (independence 1965, Raffles 1819, MRT 1987, the highest
  hill, the oldest reservoir, kopi O, kaya).

### How the facts were chosen

Settled things only: meanings of Malay and Hokkien words in place and food names, ingredients
that are not disputed, dated history, landmarks, flora and fauna, national symbols, well-recorded
sporting firsts. Left out on purpose: current office holders, prices and fares, "tallest" and
"newest" claims, populations, rankings, origins of dishes that two countries claim, the Pedra
Branca lighthouse, the cocktail invented at Raffles Hotel, anything doctrinal or political.
Festivals appear only as public holidays and customs (what is eaten, what is exchanged).

### Source notes: what they are and are not

Every question was written from memory, with no web access. Each note states the fact and names
where it can be checked: mostly National Library Board Singapore Infopedia articles, NParks and
National Heritage Board pages, statutory boards' own pages, Kamus Dewan for Malay words, the
Oxford English Dictionary and Jack Tsen-Ta Lee's Singlish dictionary, Britannica. **The titles
are from memory too and none was opened**: a title may differ slightly from the live page. No
addresses are given, because none was verified. This is why R-14 exists.

### The read-through

320 questions were written. Six were removed as a sceptical editor, leaving 314 (then 307
after D-049, below):

| Removed | Why |
|---|---|
| `sg-life-0055` Speak Good English Movement year | Language policy; not a family question and clumsily worded. |
| `sg-arts-0052` who won the 100 m butterfly in 2016 | The same fact as `sg-arts-0001`. |
| `sg-hist-0012` Singapore's "first university" | "First" is arguable and the four long names read alike on a phone. |
| `sg-nat-0030` degrees north of the equator | Repeats the true-or-false `sg-place-0016`. |
| `sg-nat-0047` who bred Vanda Miss Joaquim | Sources have disagreed on whether Agnes Joaquim bred or found it. |
| `sg-arts-0010` airline whose crew wear the sarong kebaya | Ambiguous: more than one airline's crew wear a kebaya. |

Also changed in the read-through: "which side of the road" became a true-or-false (only two real
answers exist); the Causeway question no longer names Malaysia (it gave away `sg-place-0006`);
"current notes" became "Portrait series notes, issued from 1999"; one option set that only named
the correct person was replaced with four named people; five difficulty labels were moved.

### After D-049: multiple choice only

Randy decided Rabakz has no true-or-false questions (D-049). Of the pack's 21, 15 became
four-option questions and 6 were deleted because the fact did not support three plausible wrong
options or was already asked: `sg-hist-0008` (once part of Malaysia), `sg-life-0017` (side of
the road), `sg-life-0019` (four seasons), `sg-nat-0033` (coral reefs), `sg-nat-0034` (primary
rainforest), `sg-arts-0022` (sepak takraw racket). `sg-arts-0018` (Max Maeder) was dropped
because he was a minor at the time. 314 less 7 is 307. The 15 converted questions keep their
ids: `sg-food-0019` to `0021`, `sg-place-0016` and `0017`, `sg-hist-0030` and `0052`,
`sg-life-0018`, `0020` and `0033`, `sg-nat-0009` and `0022`, `sg-arts-0008`, `0009` and `0036`.

### Review round 1

The independent review read all 307 questions and found no wrong marked answer. Its fixes were
all applied: 2 deleted (`sg-arts-0016`, the same fact as `sg-arts-0001`; `sg-life-0042`, a
near-twin of `sg-place-0019`), leaving 305; 15 prompts reworded so they no longer give away or
depend on another question, or overstate a fact; 4 options changed; 14 difficulty labels moved;
13 source notes rewritten to name the publishing body and subject where no exact title was
known. `sg-nat-0001` keeps its wrong options: I am not sure of real cultivar names in the same
form. `questions.md` now opens with the reviewer's 17 questions to verify and a short
"re-check yearly" list.

## Close-out

### Requirement → code → tests → evidence

| ID | Code | Tests | Evidence |
|---|---|---|---|
| RZ-021 (Singapore pack with source notes) | `content/rabakz/src/questions/singapore-food.json`, `singapore-places.json`, `singapore-history.json`, `singapore-life.json`, `singapore-nature.json`, `singapore-arts-and-sport.json` | Existing: `content/rabakz/scripts/build.test.ts` "builds this package end to end" validates the real bank (source required on every question) on every `pnpm verify` | [`questions.md`](../../uat/evidence/R-12-singapore-pack/questions.md), [`build.txt`](../../uat/evidence/R-12-singapore-pack/build.txt), [`verify.txt`](../../uat/evidence/R-12-singapore-pack/verify.txt) |
| RZ-024 (at least 200 in the Singapore pack) | the same six files | the same test; `stats` counts against the launch sizes | [`stats.txt`](../../uat/evidence/R-12-singapore-pack/stats.txt): "Singapore pack 312 of 200 met" |

Neither row is `done` here: RZ-021 needs Randy's spot-check (R-14) and R-11; RZ-024 needs R-11
and R-13. No test was added, because the lane forbade editing tests; see Requests 1.

Evidence folder: `uat/evidence/R-12-singapore-pack/` (`REPORT.md` maps every statement).

### Files

Six new `content/rabakz/src/questions/singapore-*.json`, this note, the evidence folder. Nothing
else. `pnpm-lock.yaml` did not change.

### Dependencies requested

None.

### Requests

1. **A test for the pack's shape (R track).** Nothing automated holds the pack to "at least 200
   Singapore questions, at least 25 per Singapore category, multiple choice only". `stats
   -- --check` covers the 200 only together with the other launch sizes. A small test on the
   real bank would keep later edits honest.
2. **Trackers (integrator).** `docs/TRACEABILITY.md` rows RZ-021 and RZ-024, `docs/STATUS.md`,
   `CHANGELOG.md` and the R-12 status in `docs/backlog/R-rabakz.md`.
3. **R-14.** Start with the 15 questions at the top of `questions.md`. The source-note titles
   are unverified; a note whose title does not match the live page should be corrected then.
4. **R-04 (setup screen).** Six Singapore categories now sit beside the general ones in the
   category list. A "Singapore" group or toggle may read better than six separate chips; the
   index already carries `byRegion` counts for it. A design choice for Randy, not made here.
5. **R-11.** If R-11 lands first with a filled blocklist, this pack must be rebuilt against it;
   ordinary words here (for example "smashed" in `sg-food-0046` and "blood" in the horseshoe
   crab question `sg-nat-0031`) could match a broad list.
6. **No rule blocked a good question.** The 24-character title limit turned "Singapore sport and
   culture" into "Singapore arts and sport"; nothing else needed rewording for a rule.

7. **Do not co-select (R-01 selection, R track).** These groups share a topic closely enough
   that one question in a match can hint at another. The loader has no notion of a topic group
   today; a `topic` field or a list of id groups would let selection take at most one from each.
   - 'Home': `sg-arts-0015`, `sg-arts-0026`, `sg-arts-0040`
   - The flag: `sg-hist-0006`, `sg-hist-0010`, `sg-hist-0022`, `sg-hist-0040`
   - Vanda Miss Joaquim: `sg-nat-0001`, `sg-nat-0012`, `sg-nat-0015`, `sg-nat-0035`,
     `sg-place-0018`
   - The Occupation: `sg-hist-0016`, `sg-hist-0017`, `sg-hist-0030`, `sg-hist-0033`,
     `sg-hist-0034`, `sg-hist-0035`
   - makan: `sg-life-0010`, `sg-life-0033`
   - kiasu: `sg-life-0011`, `sg-life-0044`

### Unsure

- Facts: the 17 listed in `questions.md`. All are ones I believe true; they are the ones where a
  detail (a date in a note, an "oldest", a count) rests on memory of a single source.
- Stability: `sg-place-0045` (last kampong) and `sg-nat-0042` (four nature reserves) are true
  for decades but not for ever.
- Easy level: "answerable by a ten-year-old who lives here" was judged, not tested. A few easy
  questions lean on things a child may know only from parents (Fandi Ahmad, the 'Home' lyric).
- Living public figures are named only for recorded sporting results (Joseph Schooling, Yip
  Pin Xiu, Loh Kean Yew, Shanti Pereira, Fandi Ahmad), a song (Dick Lee, Kit Chan)
  and published or screened works (Stella Kon, Edwin Thumboo, Jack Neo, Anthony Chen).
