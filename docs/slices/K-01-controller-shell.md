# Slice K-01 — Controller page shell

## Goal and requirements

Game-independent phone shell: CTRL-004 (viewport, gestures, landscape prompt and wake
lifecycle) and CTRL-008 (seat identity and connection state). PERF-020 is **not advanced**:
the shell remains outside the production bundle; production controller integration is K-08.

## Readings

Round 2: CLAUDE.md, AGENTS.md, PLAN §§5–6, HANDOFF, WORKFLOW, STATUS, PRD and DESIGN;
the previous slice note; every source file in packages/controller-kit/src; controller-demo.tsx
and the /play wiring in main.tsx; the K-01 UAT script; round1/REPORT.md and run.json and
its portrait screenshot 19; C-09's frame-strip usage and tools/uat/harness.ts.
Round 1 also consulted the K backlog, controller board, architecture, performance, F-06,
phone route/browser helpers and decisions D-047/D-048/D-051/D-056.

## Round 2 fixes and choices

- **M1 / CTRL-008:** shell.css:12 gives the name a shrinking column with hidden overflow
  and ellipsis, retaining the beginning of the name. The full string stays in the text node.
  UAT:21 adds 320×568 to the five-size, two-seat, three-link matrix (30 stills).
  UAT:116 measures player right + 13 against link left and header scroll/client width.
  UAT:29 checks the viewport bounds of every nonzero shell element, including descendants,
  rather than document scroll dimensions. UAT:40 uses thirty W characters and verifies
  clipping, then temporarily gives the player max-content width to recreate overflow;
  it asserts measured overlap, restores CSS and checks the repaired layout again.
- **M2 / CTRL-004:** shell.ts:11 removes wakeState from the public props; shell.ts:42
  shows the note solely from keepScreenAwake's state. UAT:7 installs a navigator.wakeLock
  stub before navigation, counts requests and supplies rejection/success through the real
  helper. Matrix rejection runs require the note; UAT:53 checks successful acquisition and
  hidden/visible reacquisition (exactly two requests), with no note. Hidden is stubbed on
  document and visibilitychange dispatched deliberately; no claim of native lifecycle proof.
- **M3, S6 / CTRL-004:** lock.ts:3 stores reference counts per document target at module
  scope. First mount owns class/listeners; last unmount removes them and preserves any
  pre-existing class. Disposers are idempotent. shell.test.ts:73 covers mount/mount/
  unmount/unmount, contextmenu cancellation and prior-class restoration without a DOM.
  UAT:64 checks html's mounted class and computed overscroll-behavior/touch-action on html
  and body, dispatches contextmenu before/after a real shell unmount and checks defaultPrevented.
  controller-demo.tsx:18 exposes a dev-route-only unmount event, avoiding timer races.
- **S1 / CTRL-004:** wake.ts:48 allows one pointerdown retry after visible rejection,
  including visibility changes during a pending request, then waits for visibilitychange.
  No timers or retry loops. shell.test.ts:84 covers ordinary rejection and the pending →
  hidden → visible → reject → pointerdown race, subsequent rejection, deduplication and
  listener cleanup. Existing helper tests remain.
- **S3 / CTRL-004:** shell.css:8 puts the single background treatment on the full shell,
  behind safe-area padding; the board is transparent (shell.css:18).
- **S4 / CTRL-008:** shell.css:10 uses panel-ink and panel-edge with panel-treatment;
  shell.ts:16 accepts ThemeName, defaulting to console at shell.ts:28.
- **S5 / CTRL-004/008:** shell.ts:39 uses a centred inline SVG phone outline;
  shell.css:25 uses ink, phi size/stroke tokens and the existing turn animation.
  controller-demo.tsx:13 supports cycle=1, advancing connected → reconnecting → lost every
  1.5 seconds. A dev event uses the same state updater for deterministic UAT captures.
  UAT:78 captures link-crossfade and portrait-turn strips at slow=10, asserting intermediate
  opacity/animation progress; UAT:95 checks reduced-motion final state and captures a still.
- **N6:** shell.ts:37 removes the ineffective play-div aria-label; index.ts:3 and model.ts
  remove unused isPortrait. Orientation remains CSS-driven.

No dependencies, manifests, lockfile, trackers, contracts, design-lint exemptions or DOM test
environment changed in round 2. Historical correction: the integrator added preact 11.2.0 to
the kit manifest and updated the lockfile during integration; the old claim of unchanged
manifests was inaccurate. The dev demo still imports source relatively and is loaded only
through the existing DEV-gated /play route. No main.tsx change was needed.

## Close-out

CTRL-004/008 fixes are left in the working tree for independent integrator review. Existing
round 1 evidence is preserved; its report records the integrator's review of 25 stills, but
those stills cannot prove the new geometry, lifecycle or motion assertions. Round 2 browser
execution and visual acceptance remain outstanding. No evidence was written in this round.

## Requests and limitations

Integrator: run `pnpm uat -- K-01-controller-shell --phones 1 --out round2` and inspect every
still and strip, then update shared trackers after review. Browser execution is unavailable
for this task. Real notched-phone safe areas, iPhone wake lock, Android pull-to-refresh,
zoom/callout suppression, contrast/accessibility review and actual startup timing still
require integration/device UAT (S-05 / K-08). No PERF-020 progress is claimed.

## Validation

`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0, 328.31 s test phase), with only
one verify process running at any time. The first attempt stopped at UAT ESLint errors;
those were corrected before the successful run. The launcher and recipes tests passed,
so neither required an isolated rerun. Final lint/design lint were repeated after the
last UAT assertion and panel-edge edits. `node --check` and `git diff --check` pass.
No browser was launched for round 2.

Verify tail (existing shared-entry budget output is not shell/PERF-020 progress):

```text
Test Files  149 passed (149)
Tests       3226 passed | 1 skipped (3227)
PERF-022 host: 215185 bytes raw, 72987 bytes gzip / 1500000
PERF-020 controller (shared entry): 215185 bytes raw, 72987 bytes gzip / 300000
PERF-022 deploy: 215185 bytes raw, 72987 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 84 in progress, 1 later, 67 not started
trace check passed
```

## Integrator's corrections at merge (2026-11-17)

- Superseded statements above: "No evidence was written in this round" and "round 2 browser
  execution is outstanding" — the integrator ran UAT round 2 (passes) and kept it in
  `uat/evidence/K-01-controller-shell/round2/`. The proof step does not assert measured
  overlap any more: forcing the name to `max-content` widens the shell's single grid column, so
  the header runs off screen instead of overlapping; `headerFits` now also asserts the header
  and link stay on screen, and the proof passes if overlap, header overflow or off-screen is
  detected (commit a056986). UAT line references in this note may be off by up to 3 lines.
- Review round 2 (Opus): merge. Later items are carried in `docs/backlog/K-controller.md`.
