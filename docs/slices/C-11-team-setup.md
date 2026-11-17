# C-11 — Team setup

Requirement: PLAT-025 (partial). Decisions: D-143 option C (centre line), D-149
(read in the primary checkout; no merge performed).

## Acceptance and implementation

- The leader starts on Red; remaining seats alternate in seat order. Joins choose the
  smaller side (ties Red). Leaves preserve choices unless a side empties, which triggers
  a balanced split. Held seats keep their choices until they leave.
- D-149 removes the team-size cap. Both self-switches and leader moves permit uneven
  teams, including at eight players. Only emptying a side is refused. The session runner
  accepts complete uneven splits and rejects missing assignments or an empty side.
- Only a chip changing team follows the UI arc; row reflows travel straight with the
  in-out easing and base duration tokens. Moving chips rise above resting neighbours;
  the crossing chip also rises above reflows. Reduced motion lands immediately.
- TV chips use true TV type and spacing tokens, without zoom. Names fit one line using
  the shared name fitter and a reused measurement canvas; title/accessible label keep
  the full name. The leader marker uses the lobby icon and secondary panel colour.
- Refusals name the side and go only to the tapping seat, with the picker weak icon and
  refusal text treatment. TV copy attributes the refusal to the affected player and
  clears on the next team/roster change. Leader moves notify the moved player's phone;
  that notice clears on their next action, including tapping their current side.
- Optional teams default off on a new selection. Play again and Continue from results
  retain the leader's choice and last split, reconciled through joins/leaves. Continue
  restores the Teams toggle; it can disable teams for the rematch. Required metadata
  enters setup; none skips it. Phone and TV Start use the primary button treatment.
- The host authenticates seats, leader-only controls and current view revisions. Phone
  notices are projected per seat inside existing opaque view envelopes; game/protocol
  contracts are unchanged. Authoritative room assignments reach game initialisation.

## Tests and UAT script

- `packages/platform/src/teams.test.ts`: deterministic balance, immutable switches,
  uneven eight-player switch, empty-side refusal, reconciliation.
- `packages/platform/src/session/team-setup.test.ts`: invalid splits rejected before
  init; a seven-to-one eight-player split reaches init.
- `apps/web/src/team-setup.test.ts` and `team-required.test.ts`: metadata boundaries,
  authentication/stale fencing, eight-player switch and leader move without a leave,
  private refusal and move notices, both results paths, rematch toggle off and split
  reconciliation after leave/join.
- `uat/slices/C-11-team-setup.mjs`: four/eight-phone pairing, Teams off/on phone shots,
  balanced split, maximum-length TV name, switch strip, reduced-motion switch with no
  active chip animations, leader grid and moved-player phone, singleton-side refusal
  on tapping phone/other phone/TV, leave then replacement, both phone sizes and team
  game/controller handoff. The eight-phone switch and leader move precede any leave;
  the leave screenshot is captured only after authoritative removal.

## Validation

Round 4 runs only the four checks requested by the integrator. No UAT, whole-suite test,
memcheck, install, verify, commit or merge is run. New screenshots are scripted, not
captured or visually approved in this sandbox. Existing evidence is historical.

Final results:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/platform apps/web`: exit 1;
  75 files passed, one failed; 1,432 tests passed, one skipped, one failed. The only
  final failure is `Overlap.dom.test.ts`: Chromium cannot launch because this sandbox
  denies its Mach port (`bootstrap_check_in`, permission denied 1100). The unchanged
  conformance test timed out during two busier intermediate runs, then passed on the
  final run without code or timeout changes.
- `pnpm exec tsc -b tsconfig.build.json`: passed, exit 0.
- `pnpm exec eslint packages/platform apps/web uat/slices`: passed, exit 0.
- `pnpm run lint:design`: passed, exit 0; 377 files scanned.

The first Vitest launch accidentally followed an uptime reading above 8. Subsequent
checks used an automatic uptime gate and waited for one-minute load below 8.

## Close-out

Changes are uncommitted on the supplied issue branch. Code lives in platform team/session
logic and web host/team routes, styles and phone announcements. Regression coverage and
UAT capture steps are updated alongside it. Shared trackers, requirements, decisions,
design, dependencies and lockfile are untouched.

PLAT-025 stays **in progress**: team names/colours during play belong to the games' own
issues (Rabakz R-04/R-08 and Tabao Rush versus), and new UAT/review remains outstanding.
The Teams on/off toggle overlaps R-04: R-04 must reuse this toggle, not rebuild it.

## Requests

Integrator: rerun the permitted Vitest command outside the Chromium sandbox restriction,
then run and visually inspect C-11 UAT with four and eight phones, including all newly
scripted captures. No new evidence or visual pass is claimed by this handoff.
