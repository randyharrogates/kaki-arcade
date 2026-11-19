# C-27 — Local seat participation and phone leadership

Goal: keep private games on phones while preserving TV setup and local play in Tabao Rush.

Requirements: CTRL-009, PLAT-006, PLAT-021, PLAT-024. Decisions: D-230, D-231 (amending D-159).

Acceptance:
- Each game declares `localSeat`; Tabao Rush plays, Peek Poker and Rabakz watch.
- Watching TV seats receive no game membership, controls or private view and appear in no scores or results.
- A lone watching TV seat cannot start; the existing feedback band names the game and asks for a phone.
- The TV seat card reads Watching. The earliest seated phone leads; TV keys keep working through that leader.
- A lone TV seat can still start Tabao Rush with default or kept settings.

UAT: `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5080 KAKI_PORT_SIGNAL=5081 pnpm uat -- C-27-local-seat --phones 1` (UAT allocation 5082). At 1920 × 1080, capture the Peek Poker refusal with the TV seat alone, then the start screen after Fern joins as leader with TV Watching, then phone play with only the phone in the game's public player list, plus the phone hand.

Out of scope: host kick, sound unlock, new styling or motion, game rule changes.

## Close-out

Round 6 addresses review 1: connected-seat leader fallback, shared tile/selection availability, waiting heading and hints, actionable refusal copy, retained Rabakz teams after load failure, snapshot election parity, and preservation of load errors on room changes. Shared participation helpers now sit beside `isLocalSeat`; host-route imports that predicate. No commit, verify, UAT, performance run, installation or tracker changes in this round.

## Requests

Integrator: run verify (including Chromium DOM tests), then UAT on the allocated ports with `--out round2`, inspect every still and review before integration. Leave REPORT.md completion to the integrator. Round-1 UAT has run: `uat/evidence/C-27-local-seat/round1/` contains stills 01–04. Still 02 is the start screen, not the lobby. This round generates no new screenshot evidence.

Coverage gaps: no still shows a lone TV seat starting Tabao Rush; Rabakz watching is covered by its meta test only; the “with the keyboard” heading appears only in round-1 still 01. Round-2 still 01 should instead show “Waiting for a phone”.

Decision text for integrator (no decision number assigned):

- After the existing leader grace or restore wait, elect from connected phones in seating order; when none are connected, fall back to a connected seat, including the TV seat. A connected phone takes leadership back from the TV. Snapshot capture uses the same election rule.
- For a lone watching TV seat, keep the tile selectable with no minimum-player reason and no aria-disabled. Selection and tile availability use the same participation count; “N of 8 players” still counts room seats. The existing refusal band carries the one message.
- While the lone watching seat cannot start, the heading is “Waiting for a phone” and the hints omit “Enter: start”.
- The band says “⟨game⟩ needs a phone. Go back and scan the code in the lobby to join.” Back/Esc goes from start to picker; another Back goes from picker to lobby, where host-route renders the join code. This route is checked in the host keyboard regression.

Validation (round 6, serial, no load gating; every pnpm invocation prefixed `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`):

| Check | Result |
| --- | --- |
| Requested non-DOM Vitest command, `VITEST_MAX_WORKERS=2`, excluding DOM, layout fixtures and team polish | Passed: 164 files, 2,492 tests passed, 1 skipped; 525.84 s |
| Clean `tsc -b tsconfig.build.json`, including UAT slice | Passed; cleaned before build and deleted emitted files afterwards with `--clean` |
| Requested ESLint command, including UAT slice, `--max-warnings 0` | Passed |
| `pnpm run lint:design` | Passed: 512 files scanned |

Every command completed within ten minutes. DOM tests were updated but not executed because Chromium crashes in this sandbox. Verify and UAT remain for the integrator, with evidence destination `round2`.

Validation (round 1):

| Check | One-minute load at launch | Result |
| --- | --- | --- |
| Requested unit/conformance command | 6.26 | 2,445 passed, 1 skipped, 2 failed in 441.34 s: Chromium launch permission failure in existing `team-polish.test.ts`; old lowest-seat restore expectation |
| Focused C-27, picker, restore and per-game meta tests | 6.671 | 51 passed across 7 files; corrected seating-order expectation passes |
| Final `tsc -b tsconfig.build.json` including UAT | 6.413 | Passed; emitted files deleted with `tsc -b tsconfig.build.json --clean` |
| Final requested ESLint command | 6.718 | Passed |
| `lint:design` | 7.253 | Passed, 491 files scanned |

Earlier check launches: typecheck passed at 6.27, 7.939, 7.785, 7.214 and 6.950; failed at 7.380 for missing storage stubs in the new host tests (fixed). A typecheck was mistakenly launched at 9.67 and immediately interrupted. ESLint launched at 7.999, 6.519, 6.846 and 7.804 and found new-test/UAT typing issues, all fixed before the final passing run. Other checks were deferred, without launching, whenever the measured load was 8 or higher. Every completed command took less than ten minutes.

The broad command was not repeated after correcting the old restore assertion; the focused rerun includes that file and the new participation/leadership tests. The existing Chromium failure remains for integrator verification. New DOM tests and UAT were written but not run. No screenshot evidence was generated.

## Close (integrator, 2026-11-19)

Round-2 UAT ran (`uat/evidence/C-27-local-seat/round2/`, stills 01–04); the round-1 notes above that say no new stills exist are superseded. Re-review clean. At merge the integrator: scoped the Rabakz team reopen after a load failure to more than one playing seat (no vacuous `every` when the last phone left); shared the refusal sentence as `NEEDS_PHONE` in `room.ts` so `pickerRoom` clears exactly it; updated ARCHITECTURE §3's local-seat sentence. Not covered by a test: the snapshot leader with a TV seat present (review item 7). D-282.
