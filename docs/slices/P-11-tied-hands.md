# P-11 — Tied hands (round 1)

## Goal and requirements

Apply D-223 to the reveal ordering for PP-008 and PP-009, preserving PP-007 hand strength and PP-010 random-fill precedence.

## Acceptance

- Rank by hand strength, round points descending, lock order ascending, then seat ascending.
- A higher-seat +3 speed winner precedes equal hands; equal +1 hands follow lock order.
- Random-filled equal hands follow locked players when points match; complete equality uses seat.
- Keep publicView unchanged and the P-07 hand oracle independent.

## Implementation

`Picker.gained` already holds this round's points. `Picker.lockOrder` already records accepted locks using host-private `State.lockCount` in `applyPicks`; both reset in `deal`. No new state fields or public fields are needed. A null lock order sorts after every recorded lock. Among unlocked hands, a hand picked in full comes before a random fill (`Picker.filled`, integrator fix after review 1, D-261), so random fills are last as D-223 says; seat decides only when all of these are equal. `rankedHands` retains hand strength as the primary comparator.

The existing round rules tests live in `src/rules/game.test.ts`. Four cases cover the requested ordering, including random fill with the same +1 points as a locked player and reversed input order for the seat fallback. The P-07 pin derives expected strength and points from its independent oracle and lock order from its scripted lock sequence; it never calls the game ranking helper.

## Validation

All pnpm commands use `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; each has a 10-minute timeout.

- Vitest: launch 1-minute load 4.32; passed: 15 files, 158 tests (66.54 s).
- Clean `tsc -b tsconfig.build.json`: launch load 4.45; passed, including the checked JavaScript UAT slice. Ran `--clean` before and after to remove build outputs.
- ESLint for Peek Poker and the P-07 slice, zero warnings: launch load 6.85; passed.
- `git diff --check`: passed.

## UAT script and scope

Integrator reruns P-07 with three phones and reviews its evidence. This round performs static UAT checks only, as requested. No verify, UAT, perf, install, tracker edits or commit. No UI or scoring changes.

## Close-out

Implementation, unit tests and static validation are ready for integration review. Browser evidence and independent review remain with the integrator.

## Requests

Run and review P-07's three-phone full match before integration.
