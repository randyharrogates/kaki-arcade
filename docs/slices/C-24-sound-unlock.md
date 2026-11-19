# C-24 — Sound unlock

Goal: a TV started from the landing retains the audio gesture; a blocked TV explains how to enable sound (D-229).

Requirements: RZ-033, TR-063. Decisions: D-168, D-229, D-255.

Acceptance:
- Host a game remains a real link; primary activation synchronously starts audio and changes route within the document. Modified and middle clicks retain native behaviour. Enter and Space retain X-01 behaviour.
- One shared engine survives landing to host. While blocked, the existing lobby hint reads exactly “Click or press a key on this screen to turn on sound”. One shared callback handles click/keydown and is removed from both while running, then re-armed if suspended or interrupted; disposal also removes it.
- The pause volume values read “Sound is off” while blocked and restore their numbers once running. Blocked words use the body font and slider aria-valuetext; numbers remain mono. The panel retains its normal width across unlock. No additional gameplay UI, tokens or motion.

UAT: `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- C-24-sound-unlock --host-browser chromium --out round5`

The slice records 1920 × 1080 lobby stills after landing activation, before direct-host activation, and after a key; it asserts actual AudioContext state. It also captures the paused volume rows with the real context suspended programmatically (allows inspection without a TV gesture immediately unlocking it). The harness has no per-slice browser launch arguments, so `--autoplay-policy=user-gesture-required` cannot be supplied by this slice. The integrator must assess this limitation when running Chromium UAT.

Out of scope: game cues, platform contracts, new artwork/styles, harness changes.

## Close-out

Implemented same-document host navigation, shared audio lifecycle/state subscription, existing-row blocked copy and DOM/unit coverage. Validation launch 1-minute loads:

| Check | Load | Result |
| --- | --- | --- |
| Requested Vitest apps/web + platform sound | 7.33 | 534 pass, 29 fail; Chromium cannot launch under the sandbox (MachPortRendezvous Permission denied) |
| Initial tsc build | 6.05 | Pass, including UAT slice |
| ESLint attempts | 5.73, 4.81, 4.58, 4.26, 4.20, 4.02 | Initial mock/JSDoc lint failures corrected; final pass |
| Design lint | 3.38 | Pass (489 files) |
| Focused sound tests after mock correction | 3.19 | 8 pass |
| Clean tsc build after fixes | 3.51 | Pass, including UAT slice |
| Final tsc and ESLint after UAT key adjustment | 2.76 each | Both pass |
| tsc output cleanup | 2.80 | Pass; emitted files deleted | UAT, visual review and integration belong to Claude; not run in this round by instruction. No commit.

## Requests

Run the UAT command, inspect every still and independently review before integration. No trackers changed.

## Round 2 — review fixes (RZ-033, TR-063)

The value's `data-off` hook switches words to DM Sans; a token-sized numeric column and a spanning blocked text line keep the panel width independent of sound state. Sliders announce “Sound is off” through `aria-valuetext`. The shared capture callback is re-armed on every non-running state and resumes suspended or WebKit-interrupted contexts. A disposed engine cannot re-arm through a pending resume promise.

The landing is rendered by Preact. There is no JavaScript-off landing/link path; the real anchor preserves browser semantics once rendered.

What each layer proves:
- Unit tests use fake contexts and an EventTarget: one shared click/key callback, removal while running, re-arming after running → suspended or interrupted, next-gesture recovery, no duplicate resume on subsequent gestures, and disposal.
- DOM tests (written, not executed here) use bundled components and fake audio: synchronous resume on the initial landing click, same-document navigation for click/Enter/Space, synthetic modified/middle-click pass-through, hint and row state, body type for words, blocked slider accessibility, and equal blocked/running panel width. Enter/Space passes reuse the already-running fake; they prove navigation, not a fresh unlock.
- Round-2 UAT (prepared, not executed here) uses real Chromium contexts: landing activation, a fresh `/host` no-input `new AudioContext().state` probe saved to `sound-policy.json`, key unlock, suspension followed by click recovery, lobby and pause stills at 1080p/720p, and a measured width comparison plus post-unlock stills. The probe determines whether this Chromium actually enforced autoplay blocking; a blocked hint before any engine exists alone cannot prove that. The harness still has no per-slice autoplay launch arguments.
- UAT also goes Back from the live host to landing and activates Host a game again, both restoring saved credentials and creating a new room after clearing them. It checks room identity, one shared context and single join/leave behaviour after each re-entry. This checks observable cleanup; it is not a heap/leak profile.

Left for X-09: real TV autoplay policy, sound actually heard, remote OK counting as a gesture, and sound after TV sleep or input switch. A pad-only TV needs one click or key.

Round-2 validation results are recorded below. UAT stills and REPORT.md acceptance/visual-review tables are left for the integrator; none are claimed as reviewed here. No verify, UAT, perf, install or commit was run.

| Round-2 check | 1-minute load at launch | Result |
| --- | --- | --- |
| Requested Vitest command with both exclusions | 3.75 | 532 pass; 1 existing Chromium-launch failure in team-polish.test.ts (MachPortRendezvous permission denied) |
| Clean tsc build including UAT | 3.91 | Pass |
| ESLint initial | 4.19 | Two new lint findings; corrected |
| ESLint retry | 4.01 | Pass |
| Design lint | 3.73 | Pass, 489 files |
| Final clean tsc build including updated UAT | 3.67 | Pass |
| Focused sound tests including suspended and interrupted recovery | 5.14 | 9 pass |
| Final ESLint | 4.28 | Pass |
| Delete TypeScript emitted files (`tsc -b --clean`) | 4.28 | Pass |

The permitted test command still includes `team-polish.test.ts`, which launches Chromium despite its filename lacking `.dom.test.ts`. That sandbox failure is left for integrator verify. Every command completed within ten minutes. No round-2 evidence files have been generated by this implementation pass.

## Round 3 — stable pause geometry (RZ-033, TR-063)

Each level row reserves a second line exactly `--ka-type-34` × `--ka-line-body` tall in both states. The bar is vertically centred in that line when running; blocked copy replaces the hidden bar in body type. The number column stays empty while blocked and reserves `--ka-space-55` + `--ka-space-13`, enough for three mono digits. No new tokens or motion. No brief/design/token disagreement found.

The DOM test now compares the full panel rect and all six button rects (Resume, each −, each + and Quit) blocked versus unlocked at 1920 × 1080 and 1280 × 720. It checks both level values at 100 for scroll overflow and text bounds inside their columns. These browser tests are written for integrator verification, not executed here.

The UAT slice compares the same panel/button rects at both sizes, retains all existing stills and adds an unlocked 1080p pause still with Effects at 100 plus an overflow/bounds assertion. The integrator runs round 3's UAT to round3:

`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- C-24-sound-unlock --host-browser chromium --out round3`

Review caveat for the integrator's REPORT text: this Chromium does not block sound without a gesture (`round2/sound-policy.json`: `noGestureState` is `running`), so the gesture requirement is shown only by DOM and unit fakes; a real block is checked on X-09. Programmatic suspension in UAT proves recovery and row layout, not autoplay enforcement. The pre-existing heading-click focus behaviour is unchanged.

Close-out: round-3 implementation and assertions prepared; permitted validation results follow. No evidence folders, REPORT, trackers or decision logs edited. No commit, verify, UAT, perf or install run.

Requests: integrator runs browser tests and round-3 UAT, inspects every still, fills REPORT including the caveat above, and handles integration records.

| Round-3 check | 1-minute load at launch | Result |
| --- | --- | --- |
| Requested Vitest (2 workers; three requested exclusions) | 7.69 | Pass: 52 files, 538 tests |
| Initial TypeScript build (includes UAT slice) | 7.29 | Failed: missing `pixi.js` / `pixi.js/prepare` in Tabao Rush host; related implicit-any errors in its tests |
| Initial ESLint | 6.63 | Failed: rect `toJSON()` returns any in UAT; replaced with explicit x/y/width/height objects |
| Design lint | 7.87 | Pass: 510 files |
| TypeScript output cleanup | 7.87 | Pass |
| Clean TypeScript build after rect fix | 7.51 | Same out-of-scope missing `pixi.js` and associated Tabao Rush errors; no slice errors reported |
| Final ESLint | 7.10 | Pass |
| Final TypeScript output cleanup | 7.01 | Pass: emitted files deleted |

All commands finished within ten minutes. TypeScript cannot pass in this worktree without resolving the missing existing dependency; no dependency installation or out-of-scope edits attempted. Browser DOM tests and UAT remain for the integrator.

## Round 4 — wait for host disposal (C-24 / PLAT-009)

Cause: the slice raced passive unmount cleanup. `ShellRoute` can render the landing link before `HostLobby`'s `useEffect` cleanup runs. The installed Preact hooks implementation explicitly queues passive unmount cleanups in `unmountCleanups` for `flushAfterPaintEffects`, before new passive effects. The old host's `stop()` intentionally calls `checkpoints.flush()` before `retire()` stops checkpoints and removes lifecycle subscriptions. Clearing sessionStorage merely after seeing the landing link can therefore be undone by that final synchronous flush. This is a test synchronisation issue, not a write after completed disposal or reuse of an old host session. No reconnect-store or host disposal behaviour was changed.

The host effect now exposes development-only `data-host-lifecycle="live"`, changing to `"disposed"` only after `host.stop()` returns. The slice checks live before Back and waits for disposed after the landing appears, before clearing the record or re-entering on either restore pass. This waits for the actual checkpoint flush and transport/session shutdown, without a fixed delay. Existing room-identity, join/leave and single AudioContext assertions remain. The integrator's uncommitted game-start wait before Escape is retained.

Evidence: the added host unit test first queues a room checkpoint, clears storage before stopping and proves the final flush writes the latest player back. It then clears after stop, sends pagehide/hidden/pageshow, advances timers beyond the checkpoint interval and attempts to restart the stopped host: storage stays empty. A subsequent host dials with undefined credentials, proving the new-room path. The installed Preact implementation also drains old passive cleanups before mounting new passive effects, so the old and new host effects do not overlap. Browser timing and the existing one-context assertion remain for integrator UAT.

Close-out: the integrator runs verify and UAT to round4. No verify, UAT, perf, install or commit run here; no evidence folders, REPORT or shared trackers edited. The Chromium autoplay caveat and X-09 requests from round 3 still apply.

`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- C-24-sound-unlock --phones 1 --host-browser chromium --out round4`

Requests: run verify and round4 UAT on ports web 5320, signal 5321, uat 5322; inspect stills and fill REPORT. Validation is sequential with no load gating, per the round-4 brief; results follow.

| Round-4 check | Result |
| --- | --- |
| Requested Vitest (2 workers; three exclusions) | Pass: 52 files, 539 tests, including disposal regression |
| TypeScript build including UAT slice | Pass |
| ESLint apps/web and UAT slice | Pass |
| Design lint | Pass: 510 files |
| TypeScript output cleanup (`tsc -b --clean`) | Pass |

All checks completed within ten minutes, one at a time without load gating. Verify and browser UAT were left for the integrator as instructed.

## Round 5 (integrator, 2026-11-19)

UAT round5 passed at 1567fb66 and was looked at by the integrator and reviewer 3 (clean). The integrator changed the UAT's `rects()` to measure the pause rows only after finite animations finish: the Paused popover's 0.95 entrance gave sub-pixel differences on the first measurement. The DOM test still compares rects with no wait under reduced motion, and round5's pause stills match round4's byte for byte, so no layout shift is hidden. Review 3 fixes: the disposal test now dispatches click and keydown after `dispose()` (it fails if disposal stops removing the listeners); a stray `;` removed from the UAT. Superseded evidence folders round1, round2 and round4 were removed when round5 was committed (D-290 practice). The running pause panel is about 72 px taller than R-07's at 1080p, recorded in the merge decision.

