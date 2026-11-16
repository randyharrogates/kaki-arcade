# R-01 — Rabakz pure rules

Goal: implement the deterministic buzzer race against the game interface.

Requirements: RZ-001, RZ-004, RZ-006–016, RZ-025–026, RZ-032
(the bank, selector, rendering and persistence remain outside this rules slice).

Acceptance: fixed lengths and highest-total ranking; immutable attempts; inclusive 15-step
ties; connected eligible lock-out; exact 1,800-step idle fallback; 100-point awards,
third-win bonus and final doubling; once-per-team maximum awards; safe departures/rejoins;
next-question eligibility; shared places; seeded shuffle; unchanged bank question payloads;
240-step reveal/final announcements and 1,200-step scoreboards; conformance.

Evidence: rules and attack assertions, twelve seeded 50-question matches, real-bank shuffle
and copied built-chunk tests, conformance output, and full pnpm verify output.
No visual UAT applies: this issue draws nothing.

## Implementation and review-fix round 1

The original build is committed as `01d741b` on `issue/R-01-rabakz-rules`.
Round 1 is committed. Review-fix round 2 is left in the tree, uncommitted, as requested.
Rulings follow D-071, with skip ordering superseded by D-073 as supplied in the round-2 brief, in the main checkout's `docs/DECISIONS.md`; this worktree's log lacks it.
No shared trackers, contracts, dependencies or lockfiles were changed.

The module accepts exactly the selected match's questions in the bank's `Question` shape:
`correct`, `type`, `region`, and `picture` (file, alt, credit, licence, sourceUrl, bytes).
It shuffles options, retaining the correct answer and all other bank metadata. Public pictures
expose only file, alt and credit; the picture file is the preloaded asset key. Duplicate IDs,
short selections and long selections have separate defensive errors. The copied ten-question
fixture comes verbatim from the content builder's general-knowledge chunk; test code reads it
without a content-package dependency or production import.

The 15 steps following the first correct press are inclusive. The next step reveals before
reading new answers. Taps follow host receipt order. A leader skip reveals immediately, preserving earlier winners and ignoring later taps.
Wrong answers consume attempts, reset that player's streak, and never restart the idle clock.
Disconnected players and waiting joiners do not delay unlock. A match with one eligible
member uses solo rules; disconnection alone does not change membership. Marked wrong options
remain disabled after unlock and cannot be selected again.

Reveals and the final-block announcement last exactly 240 steps (4 seconds). A scoreboard
follows questions 5, 10, etc., except that the last question goes to the end screen. The leader's
cross continues a scoreboard, with an automatic continuation at 1,200 steps (20 seconds).
The end screen is already over. An entirely unattended, null-leader 10-question match finishes
at step 21,840. There are no wall clocks or timers in production rules.

A seat incarnation distinguishes a rejoiner from the departed winner even if the same player
ID and info object return. A departed winner still pays their team; the new seat receives no
individual award for that question. Private revisions also increase across rejoins. Joining
during the final announcement permits play on its first question. A skip/no-winner reveal
preserves a streak unless the player answered wrongly. Tied team-mates pay the largest award
once. Future prompts and correct answers are secrets (correct-answer extraction uses a path matcher). Future option texts are not separate secrets because they can also be current option texts; scrambling still changes them to catch leaks.

Settings use Easy, Mixed and Hard; category IDs and labels come from supplied `{id,title}`
entries, with help `none chosen = Mixed`. With fewer than two entries the category picker is omitted; absent categories mean Mixed and init normalises them to an empty array. No mixed category sentinel is emitted.
No categories are invented.

## Tests and evidence

- `rules/attack.test.ts`: all 21 reviewer attacks ported to assertions, plus exact timing,
  null-leader completion, departed team award, wrong-option layout, errors, settings, secrets,
  bank payload and team-place regressions.
- `rules/rules.test.ts`: fixed lengths and highest-total ranking, scoring/streaks/finals,
  immutable answers, joins/departures, solo rules and twelve seeded 50-question matches.
  Multiple players make random taps per step, including duplicate taps, skips, disconnects,
  joins and leaves. Checks cover exact individual award formula, accumulated team awards,
  answer-history immutability, correct-option exclusion from wrong markers, idle timing and
  absence of repeated questions.
- `rules/shuffle.test.ts`: seeded distribution against the real source bank.
- Conformance: solo/eight-player FFA and two/eight-player teams, 5,000 steps per scenario,
  plus membership replays. All kit checks remain unchanged. These scenarios use unfiltered fuzzScript, including skips; repeat-tap checks pass unchanged.
- Tests write no evidence by default. Set `RABAKZ_EVIDENCE=1` explicitly to regenerate the
  conformance text/JSON. Verification logs are captured outside the repository, then copied
  into the evidence directory deliberately.

Final numbers and verification tail: `uat/evidence/R-01-rabakz-rules/REPORT.md`.

## Requests — only outstanding integration/spec work

1. **Console/content handover.** RZ-010: “Before a match the leader chooses categories: any set
   of the bank's categories, or Mixed (default).” RZ-015: “No question repeats within a match.
   Questions recently seen on this host device are avoided until the pool for the chosen
   categories and difficulty runs out (DATA-002).” Supply `categories.json` as bank category
   entries with `id` and `title`; supply `selected-questions.json` as exactly the selected match
   length of unchanged bank `Question` records. Treat absent categories or an empty selection as Mixed. Keep selection, filtering, recent-question avoidance and recovery
   from `bank-too-small` in the selector/console. No answer/image conversion is needed.
2. **Older controls prose.** RZ-003 says “Each phone shows one large button per option,
   carrying the same letter, shape and colour as the option on the TV, and the option's text.”
   RZ-030 says “The question and options are readable from 3 m (NFR-A11Y), and options differ
   by letter and shape as well as colour.” The later Controls section/D-050 requires four
   shapes without letters and still mentions setup teams although the lobby owns teams.
   Integrator: reconcile the old sentences with those decisions. This module follows D-050
   and the lobby team contract.

D-071(a–i) resolves the original Requests concerning progression, connectivity, idle timing,
team maximum awards, preserved streaks, rejoins, skip ordering, solo fallback and bank shape.
Those rulings are implemented and are no longer open questions.

## Close-out — hand-back

Code: `games/rabakz/src/index.ts` and `rules/{model,flow,views,secrets}.ts`.
Tests: `rules/{rules,shuffle,attack}.test.ts`, `rules/bank-sample.json`.
Evidence: `uat/evidence/R-01-rabakz-rules/{REPORT.md,verify.txt,tests.txt,conformance.txt,
conformance.json}`. Performance numbers are host-side kit measurements only.

Branch: `issue/R-01-rabakz-rules`. Original build and round-1 fixes committed; round-2 fixes left uncommitted.
Independent Claude review and integration remain outstanding; no visual output exists.

## Review-fix round 2

RZ-004/RZ-006: D-073 receipt ordering replaces D-071(g); skip ends the question at its
position in the input list. RZ-013: waiting joiners do not turn solo play into multiplayer.
RZ-014: tick-0 joiners are eligible and are not marked joinedMidGame. RZ-004: future option
secret false alarms removed, while future prompt/correct secrets and option scrambling remain.
RZ-010: zero/single-category schemas validate without invented categories. RZ-032: the over
layout has no controls; the console owns the end screen.

Ported B1–B7 and the fixed A15/A20 harnesses, strengthening logging-only observations into
assertions. Conformance runs with skips; no kit, contract, timeout or check was modified.
Evidence regenerated explicitly using RABAKZ_EVIDENCE=1 and VITEST_MAX_WORKERS=2.
See the evidence report for final verification counts and tail. Independent review remains pending.
