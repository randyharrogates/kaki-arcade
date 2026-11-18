# C-17 — Late join

Requirements: PLAT-008, RZ-014, PP-013, TR-056.
Branch: `issue/C-17-late-join`. Round 4 committed at c6099a67; UAT r4-p3 at 6d59417c; reviewed clean (C-17 review 3).

## Findings

- `apps/web/src/host.ts` hard-coded `allowRunningJoin: false` at Start and
  pause/resume. The integrator's new `GameMeta.midGameJoin` was therefore not
  reaching room admission. No further change to `game/types.ts` was needed.
- `packages/platform/src/room/room.ts` admits a fresh hello in lobby/results,
  or while `allowRunningJoin` is true. Otherwise it returns `game-running`.
  `reconnect/host-room.ts` sends the refusal and broadcasts room status to all
  attached peers, including unseated peers. Pairing introduces the connection;
  the host room reducer owns seating, not the signalling server.
- `reconnect/phone.ts` retains a pending hello after refusal and tries again on
  an eligible room broadcast. That normal path already existed in round 1.
  However, the host discarded the refused request, and a failed `sendPhone`
  during the eligible broadcast left the phone awaiting another broadcast.
  With no later room event, the phone stayed on “Waiting for the lobby” forever.
- Before changing the reconnect host, `reconnect/late-join.test.ts` reproduced
  that permanent wait for both lobby and results: deliver the first hello and
  refusal, force subsequent phone sends to return false, then return the TV to
  an eligible phase. Both tests failed because zero players were admitted.
  This establishes a deterministic backpressure failure path; it does **not**
  establish that backpressure caused the original R-06 still 30. The normal
  successful-send retry path was already present; the original browser incident
  still needs the integrator's UAT investigation if it recurs.
- `session/index.ts` already identifies new membership by seat token, calls
  `game.join`, and sends each connected member its layout and private view.
  Resuming an existing token resets delivery/input caches without another join.
  Games own safe waiting output and the transition to their join point.
- Rabakz already defers question joiners with `eligible: false`, score zero and
  “Next question”; the next question enables answers. Peek Poker already uses
  `waiting: true`, score zero, a “Join next round” layout and null private view;
  the next deal enables that player. No gameplay changes were necessary.
- Tabao Rush's current module already creates a spectating participant without
  spawning a cook mid-round, and returns “Watch until the next round” controls.
  Its scaffold runs one round per module initialisation; the next match initialises
  all room players as active. Its declaration is true. This slice adds no Tabao
  Rush gameplay or multi-round progression.

## Changes

- All three v1 game metadata declarations enable mid-game joining. Platform
  fixtures declare their join support; the existing development console fixture
  declares false so UAT can exercise a holding game without changing v1 rules.
- Start and pause/resume take admission policy from the selected running game's
  metadata, with a false fallback. The conformance kit rejects a missing or
  non-boolean declaration; broken-game tests cover invalid values.
- The reconnect host retains refused requests by live connection. On an eligible
  host room update it retries those requests itself, through the same reducer,
  identity binding, seat acknowledgement and session update path as a hello.
  This does not depend on another phone send. Successful admission, explicit
  leave, disconnect and host shutdown clear the request. Capacity still uses
  the existing room-full refusal. The normal phone retry remains compatible.
- Session tests cover denied membership, allowed zero-score membership, one join
  per token, resume and leave. Reconnect regressions cover lobby/results release
  under failed phone sends and cancellation on leave/disconnect. Host tests cover
  enabled/disabled declarations, pause/resume and release on returning to picker.
- Rabakz and Peek Poker tests cover safe waiting output, zero-score entry at the
  next question/round, and unchanged earned scores on join. Session tests exercise
  real per-phone delivery and privacy checks. Peek Poker compares existing players'
  next-round scores with an otherwise identical match without the newcomer.
- Added a browser DOM test of the held-phone heading, promise and Leave action.
  Existing copy, tokens and motion remain in use; no new visual treatment.
- Updated `docs/ARCHITECTURE.md` for the declaration, admission flow and game-owned
  join points, including the existing team assignment guard.
- Added `uat/slices/C-17-late-join.mjs` for TV plus three phone contexts: Rabakz,
  Peek Poker, then a fresh room with the explicitly enabled holding fixture.
  Every checkpoint captures the TV and all three phones. The script observes
  public views through a development source seam and advances browser time
  through the normal Peek Poker simulation; it never edits game state.

## Validation

Each permitted check was launched with one-minute load below 8.

- Before the host fix: both held-phone admission regressions failed as described
  above. The first broad run also overlapped fixture metadata edits; its temporary
  console metadata mismatch is not a baseline defect and is fixed in the final run.
- Final authorised Vitest command: **1,959 passed, 1 skipped, 13 failed** across
  132 files (119 passed, 13 failed). Every remaining failure is a Playwright
  browser-launch failure caused by `PLAYWRIGHT_BROWSERS_PATH=/nonexistent`,
  including the new held-phone DOM test. All executable non-browser tests pass.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- ESLint on every changed TypeScript/TSX/MJS file: passed.
- `pnpm run lint:design`: passed, 453 files scanned.
- `git diff --check`: passed. No generated JS, source maps or declarations were
  left beside sources; existing checked-in style declarations were preserved.
- No verify, UAT, performance, install or link commands were run. No dependencies,
  contracts, lockfile, shared trackers or game specs were edited. No commit/push.

## Close-out

Implementation is ready for integrator review for non-team late joining and
held-request recovery. Browser DOM execution, UAT still capture/inspection and
review remain with the integrator. No visual pass or completed issue is claimed.
The exact cause of R-06 still 30 has not been proven in a browser.

## Requests

Randy: how should a mid-match joiner receive a team in an already running
Rabakz team match? PLAT-025 defines automatic balancing before a game, but does
not define mid-match allocation or a phone choice flow. D-079(f) explicitly says
“a mid-match joiner is not seated in the game until the room has given them a
team”. Until Randy answers, the integrator has decided that running team matches hold
new phones on “Waiting for the lobby”, admitting them at picker/results. Round 3
applies that game-agnostic policy; no team allocation flow is invented. Full
RZ-014 team-mode completion remains outstanding.

Integrator: run the authorised browser tests and C-17 UAT with `--phones 3`,
inspect all stills, and investigate the original R-06 waiting incident if it
persists with the retained-request admission path.


## Review close-out — integrator fixes and round 3

- `926278dc`: corrected the picker UAT check to use “3 of 8 players”; the picker
  has no seat list. Review 1 confirmed this in r2-p3c still 45.
- `66419d46`: kept Leave within the held-phone action row and added a viewport
  bounding-box assertion. Review 1 confirmed it in r2-p3c still 44.
- `r2-p3c`: the reviewer opened all 48 stills. Free-for-all joining and held-phone
  release passed behaviour review. Peek Poker stills 22/23/26/27/30/31 had the
  contrast defect fixed by D-194 on main, now merged by the integrator. New UAT
  and visual review remain required; this round does not claim a visual pass.
- Round 3 (PLAT-008, RZ-014, PP-013): successful Start captures admission from
  the game declaration and confirmed team setup. Pause/resume reuse that policy.
  Running team matches hold newcomers until picker/results; free-for-all still
  admits immediately. Host tests cover both and pause/resume.
- Held-hello replay checks current pending membership, current eligibility and
  existing seating after synchronous callbacks. Tests cover phone retries and
  nested host changes, asserting one seat acknowledgement with the name-taken
  notice intact.
- Waiting phones now say “You join at the next question” / “You join at the next
  round”, with game tests. UAT answers Rabakz question 1 from the source bank,
  asserts Fern 100 and Cloud 0 at question 2, and adds team holding/release steps.
- No commit, verify, UAT, perf, install or node_modules linking in this round.
  Browser execution, refreshed evidence and independent review remain with the
  integrator. Validation results for this round follow below.


### Round 3 validation

One-minute load at every authorised check launch:

| Check | Load | Result |
|---|---|---|
| Vitest, first run | 7.32 | 613 passed; 2 expected browser-launch failures and 2 incorrect new test expectations for duplicate-name notices |
| Vitest, corrected run | 7.56 | 615 passed; only 2 browser-launch failures (`host-keyboard.dom` and `host-peek-poker.dom`), executable absent at `/nonexistent` as requested |
| TypeScript, first run | 7.73 | UAT bank lookup callback needed an explicit type |
| TypeScript, second run | 6.78 | UAT answer needed an assertion that narrows its type |
| TypeScript, third run | 6.19 | Passed |
| ESLint, first run | 5.63 | New test type imports/empty fakes and UAT JSON assignment needed lint fixes |
| ESLint, corrected run | 4.62 | Passed, zero warnings |
| Design lint | 4.88 | Passed, 461 files scanned |
| TypeScript, final run after lint typing fixes | 4.52 | Passed |

No new `.js`, `.js.map` or `.d.ts` files remained beside sources (none were
emitted there). Only the authorised C-17 paths were edited. UAT was edited but
not run; the integrator must execute and inspect its new score/team steps.


## Round 4 — review 2 close-out (PLAT-008, RZ-014, PP-013)

- Integrator commits: `59efc187` applied the round-3 fixes; `718685a0`
  allowed the host reconnect probe during clock winds; `99d49829` increased
  the Rabakz wind to 60 s. Main was merged at `1f58e2a5`, retaining both
  main's `minPlayers` fixture parameter and `midGameJoin: true`. No further merge.
- `r3-p3b` is superseded: the Peek Poker clock wind tripped host signalling
  keepalive and the reconnect probe's 426 failed the run. `r3-p3c` is superseded:
  the 30 s wind was too short after joining at question 2. `r3-p3d` is the
  reviewed run: its report now transcribes the reviewer's screenshot and
  acceptance tables, preserving the assertion-only Peek Poker score and
  script-only team-mode limitations of that historical run.
- D-201 combines the per-game `GameMeta.midGameJoin` declaration and conformance
  requirement with reconnect-host held-hello replay. D-202 combines the team
  hold until picker/results, admission captured at Start and reused through
  pause/resume, and replay guards. OQ-048 remains the team-allocation question;
  RZ-014 remains incomplete for running team matches.
- ARCHITECTURE §3 now states the team admission hold (D-202; OQ-048).
  The integrator owns the contract comment; this round leaves it untouched.
- Added the real network-order regression: host replay seats Fern 2 once and
  invokes one seated callback; a later phone hello only acknowledges that
  same seat as resumed, preserving the name and token.
- UAT now captures team setup before Start and asserts team assignments in the
  TV public view. Peek Poker captures the round-1 scoreboard, asserts Fern has
  earned points while Cloud has 0, and checks both scores at round 2. Normal
  timeout fills Fern's picks and awards hand points; no state is injected.
- Clock-wind expected errors now match only the signal origin's
  `/rooms/[A-Z0-9]{8}/host` endpoint. After each clock resumes, all three phones
  must show Connected. The integrator ran `pnpm uat -- C-17-late-join --phones 3 --out r4-p3`
  at c6099a67: all 12 steps completed, with 1 × 426 and 1 × ERR_ABORTED at
  `/rooms/P2D2ZNHQ/host`, both expected. The integrator and the Claude reviewer opened every
  still; the round-4 re-review (review 3) found no code defects.

### Round 4 validation

Results and one-minute load at each permitted check launch are recorded below.
No commit, merge, verify, UAT, perf, install or node_modules linking in round 4.


| Check | One-minute load at launch | Result |
|---|---|---|
| Authorised Vitest set, first run | 3.00 | 619 passed; 2 expected browser-launch failures and 1 new test expectation failure (room broadcast and token field); corrected |
| Authorised Vitest set, corrected run | 5.30 | 620 passed; only 2 expected browser-launch failures (`host-keyboard.dom`, `host-peek-poker.dom`) at `/nonexistent` |
| `pnpm exec tsc -b tsconfig.build.json` | 5.09 | Passed |
| Authorised ESLint command | 6.05 | Passed, zero warnings |
| `pnpm run lint:design` | 5.75 | Passed, 464 files scanned |

`git diff --check` passed. No emitted `.js`, `.js.map` or `.d.ts` remained beside
sources; the three existing tracked source declarations were preserved.
The pre-existing edit in `packages/platform/src/game/types.ts` belongs to the
integrator and was not changed by this round.
