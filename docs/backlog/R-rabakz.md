# Track R — Rabakz (trivia night)

Spec: `../games/rabakz.md`. The simplest game: a good first full pass through the game interface.

**Owns:** `games/rabakz`, `content/rabakz`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story R1 — We answer the same question at once and fast right answers win



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| R-01 | Rules (pure): match flow as a buzzer race with no timer, first correct answer wins, 0.25 s same-time window, lock-out until everyone has had a turn, leader skip and 30 s auto-skip, scoring in hundreds with streak and double final round, team scoring, mid-match join, ties | RZ-001, RZ-004, RZ-006 to RZ-009, RZ-012, RZ-014, RZ-016, RZ-026 | F-04 | 1 | merged |
| R-02 | Controller layouts and private views: setup, answer buttons, locked out, leader skip, reveal | RZ-003, RZ-005 | R-01, K-05 | 2 | done (merged 2026-11-18; D-203–D-206, OQ-050) |
| R-03 | Big-screen question and reveal views: text at reading size, option shapes, no timer, who has answered and who is locked out, options marked wrong | RZ-003, RZ-005, RZ-006, RZ-030, RZ-031, RZ-034 | R-01, F-06 | 2 | merged |
| R-04 | Setup screen: length, categories, difficulty, free-for-all or teams | RZ-001, RZ-010, RZ-011, RZ-012 | R-03 | 2 | merged 2026-11-18 |
| R-05 | Scoreboard every 5 questions, podium, team totals | RZ-032 | R-03 | 2 | merged |
| R-06 | Solo best per length and recently-seen questions on the host device | RZ-013, RZ-015 | R-01, C-13 | 2 | merged |
| R-07 | Sound effects | RZ-033 | R-03 | 3 | merged 2026-11-18 (part 1 cues and engine; part 2 Effects and Music levels in the pause panel); follow-ups: music playback, real-TV listen, shared Mallet helper between platform and Rabakz |
| R-08 | Full-match UAT in the real console: 1 player, 8 players, teams, a phone reloading mid-question | RZ-001 to RZ-034, PLAT-033 | R-02 to R-06, C-15 | 3 | done (merged 2026-11-18; round2-solo/ffa/teams; gaps → R-15, R-16, R-18; D-254) |
| R-17 | Phone reveal says "Skipped" only for the leader whose Skip ended the question and "No answer" for anyone else without a pick (it said "Skipped" for all); a solo wrong answer reveals within the step so a later same-step Skip does nothing | RZ-006, RZ-007, RZ-005 | R-02 | 3 | done (merged 2026-11-19; D-262) |
| R-15 | Show teams during play: team colour and name on every phone and on the TV question, reveal and lock-out views; turn R-08's "KNOWN GAP PLAT-025" step into a hard assertion (excluding option labels from the name match). Design (D-216): one team chip ("Red team" / "Blue team" in ink bold on the team colour; phone 21 px on 34 px, TV 34 px on 55 px) in the phone header beside the nickname on every play view; the TV "Answered" row split at the centre line, red left and blue right, each half led by its chip with the team total; reveal names carry their chip and the award reads "+100 to Red team"; scoreboard team panels use the same chip; the reveal outcome line keeps R-18's streak text, measured through `revealOutcome` with the chip width included, and the team award agrees with the bonus (+150 / +300 on a streak) | PLAT-025, RZ-012 | R-08 | 3 | todo |
| R-16 | The TV announces the double final round before it starts (10: last 1, 30: last 3, 50: last 5): a 4 s card, "Final round" at 144 px with the line at 55 px and a "×2" badge on a 1.618 : 1 panel, crossfading at `slow`; a "Double points" chip on each final question's header; phones show "Final round · Double points" (D-217); turn R-08's "KNOWN GAP RZ-009" step into a hard assertion of the shown text, and rename the still | RZ-009 | R-08 | 3 | done (merged 2026-11-19; r16-solo4/ffa4/teams4; D-217, D-290; follow-up C-28) |
| R-18 | The TV reveal names a single winner's streak from 2 and the streak bonus from 3 in the outcome line (several winners show none; phones keep every streak); measured fallback never shortens the name (D-260) | RZ-008 | R-03, R-08 | 3 | done (merged 2026-11-19) |
| R-19 | Rabakz phone: the status title pulses only on success (Right, New best); titles in one status strip share the smallest size any needs; Continue is words only; in team mode Place reads "1st · Red team", and in free-for-all shared places show "="; the unlabelled "4" on the locked-out phone gets its label or goes (D-221, D-222, D-235) | RZ-016, RZ-031, RZ-032, PLAT-022 | C-18, R-08 | 3 | todo |
| R-20 | Rabakz TV results: in team mode a podium step per team place (one "Tied for first" step when the teams tie), each listing its players by score with no place numbers; in free-for-all every tied player stands on their step, "Tied for first" when everyone ties; names at 34 px or more; DOM tests at 2, 4 and 8 players; built on C-18 round 4's layout (D-221, D-224, D-233) | RZ-012, RZ-016, RZ-032 | C-18 | 3 | todo |

## Story R2 — There are enough good questions for many nights

Content work. It needs no code from other tracks and starts in Wave 0.

| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| R-10 | Question schema, build and validation script, per-category chunks loaded before a match | RZ-020, RZ-022 | F-01 | 0 | merged |
| R-11 | Import the Open Trivia Database: licence and attribution recorded, length filter, all-ages screen, difficulty mapped | RZ-021, RZ-023, RZ-024 | R-10 | 0 | merged |
| R-12 | Singapore pack: at least 200 questions written by Claude, each with a source note | RZ-021, RZ-024 | R-10 | 1 | merged |
| R-13 | Picture questions: at least 60, with real photographs under a free licence (licence and credit recorded per image); a Codex-generated image, checked for accuracy and logged in `DECISIONS.md`, only where no suitable photograph can be found (D-042) | RZ-002, RZ-024, RZ-025 | R-10, G-02 | 2 | todo |
| R-14 | Randy spot-checks the Singapore pack and a sample of the rest | RZ-021, RZ-023 | R-11, R-12 | 3 | todo |

## Carried from reviews

- **From C-12 (2026-11-18):** with 8 players in teams, the final screen's "Enter: Continue" hint overlaps the last ranking row (`uat/evidence/C-12-host-keyboard/round11/16-host-host-before-results-enter.jpg`). Owner: the Rabakz final screen (R-05 or R-03 follow-up). — fixed by C-18 (round4 stills 13–20; untied teams 19–20).
- **From C-18 review 2 (2026-11-19):** untied 8-player team final list rows sit at 0 px gap, so adjacent highlighted rows butt edges (C-18 round4/19); consider with OQ-047 podium polish.

- **R-01** shuffles the four options of a multiple-choice or picture question with the match
  seed, and its test checks that the correct position is uniform over many seeds on the real
  bank (RZ-026). There are no true-or-false questions (D-049).
- **R-02** steps a long option down from 34 px to 21 px on the phone button and wraps it to at
  most 3 lines; only `PublicQuestion` data is sent to a phone.
- **R-03** steps a long option down from 55 px to 34 px on the TV, renders question text as text
  nodes only, and screenshots a longest-allowed prompt with four longest-allowed options.
- **R-08 or the app build** runs `pnpm --filter @kaki/content-rabakz build` before dev and
  production builds, serves `content/rabakz/generated/`, and fails loudly if it is missing.
- **R-11** changes the real-bank test from "no problems" to "no errors" (imported data raises
  length-giveaway warnings), retitles dataset categories longer than 24 characters, decodes
  HTML entities and strips soft hyphens before validating, and drops what the rules reject
  (about 1% of the Open Trivia Database in a sample of 559).
- **R-12** writes Singapore names in romanised form (OQ-029).
- **R-13** sets a target picture size; at the 150 KB cap about 10 pictures fit beside a full bank
  in one match, because the budget counts uncompressed bytes.
- **D-049 follow-up (small, R track):** remove the true-or-false type from the `content/rabakz`
  schema, validator, selector and tests once R-11 and R-12 have merged with none in the bank.
- **From R-03 (TV views), merged 2026-11-17 after eight Codex fix rounds and five reviews.**
  The screen is a dev page (`games/rabakz/host/`), not yet in the console: C-10/C-15 must load
  it from `"./host"` and feed it `publicView`. **For C-15 (motion polish):** a reveal arriving
  during a wipe is drawn revealed inside the incoming block, then the veil and "✓ Correct"
  snap back and play again; seat chips mounted during a wipe never play their entrance; the
  "✓ Correct" mark and the pulse start loosely ordered. **Tooling:** add a test that
  `pnpm perf` rejects a production build for a `hostPage` scenario, and check that `hostPage`
  resolves inside the repository instead of relying on Vite's `server.fs.strict`. **Evidence
  gaps:** no frame for reduced motion switched on mid-wipe or a reveal during a wipe; the two
  integrator fixes at merge are unit-tested only. **Performance:** one unexplained 217 ms
  frame in the first run, not reproduced; recheck in the PERF-001 round scenario.
- **From R-12's review:** add a "do not co-select" topic group to the schema and selector so
  same-topic questions cannot meet in one match (groups listed in
  `docs/slices/R-12-singapore-pack.md`, Request 7); drop the R-10 sample `his-0003`, which three
  Singapore history prompts give away; a test that holds the pack to at least 200 questions and
  25 per Singapore category; decide whether six Singapore categories show as one group on the
  setup screen (a design choice for Randy, R-04).
- **From the R-11 reviews:** Hard pools too small for long matches (sport 17, general knowledge
  39); sport leans North American; about 20 hard games questions are deep fan trivia. R-01's
  setup screen must handle `bank-too-small`. The validator's `same-options` warning should fire
  only when the two prompts also share a third of their content words (all 34 current warnings
  are different questions sharing a generic option set), so `build --strict` can pass. Imported
  facts were checked from general knowledge, not against sources. `otdb-cd46b7646df6` uses the
  characters ♡ and ♪: check the game font draws them (F-06b).
- **From R-01:** the console hands the game the selected questions in the bank's own shape, in
  order, with category titles (C-10, R-04). Reveal (4 s), final-round announcement (4 s) and
  scoreboard auto-continue (20 s) are provisional until seen on a screen (D-071). Add a skip
  inside the tie window to the long random-match test.

### R-04 follow-ups (from the final re-review)

- `game-setup.dom.test.ts` TV-fit test failed once under load: capture the assertion and check for the
  `--screen-scale` race fixed in UAT `shot()`.
- Keyboard or pad leader cannot change settings (OQ-042).
- Picture slot is not 1.618 : 1 (about 656 × 257 Rabakz, 656 × 213 Peek Poker at 1080p): A-09 fills it. (resolved by A-09, 2026-11-18)
- Refusal copy uses lower-case option names ("mixed", "life"); match the button capitals.
- The two-line start-blocked message has no 720 TV still.
- "Teams on ✓" puts the tick after the word; the other chips put it before.
- Dead `.setup-refusal` rule and `data-refused` attributes; superseded evidence folders (round1, roundK, roundL, checks.md).

### RZ-014 in the console (found 2026-11-18, R-06 UAT)

- The Rabakz rules seat a mid-match joiner at the next question (RZ-014), but the console holds every
  phone that joins during a game on "Waiting for the lobby — You can join when the current game ends"
  (`apps/web/src/phone.ts`). RZ-014 cannot close until the console offers a late-join path to games
  that declare it. Not owned by any issue yet: build it before R-08, which must prove RZ-014 in the
  real console. Evidence: `uat/evidence/R-06-solo-best/round6/37-phone2-friend-waits-for-lobby-phone.jpg`. Built in C-17.
- **From R-06 review 6 (R-03/R-05 transition):** the question-to-results crossfade holds the question block fully opaque until about 400 ms, then cuts it in one frame, with the results body showing between the cards (R-06 `round6/14` and `30` at 244–324 ms). DESIGN §1 asks to overlap old and new states. Fade the outgoing question block.
