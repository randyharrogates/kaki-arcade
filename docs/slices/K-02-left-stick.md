# K-02 — Left stick

Goal: a floating, locally responsive left stick in the controller shell.

Requirements: CTRL-005 and PERF-012; CTRL-001/CTRL-004 constraints retained.

Acceptance: first pointer owns the stick until release/cancel; other pointers cannot move or release it; vector is bounded, dead zone is deterministic; visual follows directly without a render or frame delay; release emits zero; reduced motion retains state without stretch or animation.

Decisions: 55 px travel radius (capped to half the smaller area dimension); 5 px radial dead zone suppresses thumb jitter, remapped continuously to full output. Visual travel remains 1:1 inside the radius, with asymptotic resistance beyond it capped at another quarter-radius. Stretch uses UI knobStretch(magnitude), from no stretch in the dead zone to 12% at full deflection. Outline uses the per-theme D-056 stick-outline token, 3 px dashed with the large radius.

UAT: landscape 844 × 390 and 667 × 375; drag frame strip, rubber-band, release, concurrent second touch and reduced motion with vector assertions.

Out of scope: game inputs/network wiring, buttons, layout engine, shared trackers, dependencies.

## Close-out

- Code: `packages/controller-kit/src/stick-model.ts` (deterministic model and pointer router), `stick.ts` (direct pointer feedback), `stick.css` (floating visuals and reduced motion), `index.ts` exports; `apps/web/src/controller-demo.tsx` adds imperative vector readout without renders during drag.
- Tests: `packages/controller-kit/src/stick.test.ts`: centre/dead zone, edge/12% stretch, beyond-edge rubber-band and bounded diagonals, deterministic outputs, pointer ownership and secondary release, owner release/cancel zero, out-of-area rejection. Controller-kit: 2 files / 13 tests passed.
- UAT: `uat/slices/K-02-left-stick.mjs` covers both landscape sizes, native CDP touch drag, frame strips and numeric visual/vector assertions, multi-touch and reduced motion. Attempted `pnpm uat -- K-02-left-stick`; blocked before browser launch by mandatory memory gate: `sysctl: sysctl fmt -1 1024 1: Operation not permitted`. No evidence directory created; no visual pass claimed.
- PERF-012: transform is assigned synchronously before invoking onChange, without network, timers, rAF or Preact state in the move path. Browser timing budget remains unassessed; integrator must measure on a quiet machine.
- Full verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0): workspace, typecheck, ESLint, design lint, full tests (153 files; 3,344 passed, 1 skipped), build/transfer budgets and trace check. Controller shared entry: 222,594 bytes raw / 75,268 gzip, below 300,000 raw budget. Initial attempts exposed TypeScript and lint findings in new files, since corrected. Runs were sequential.
- Original implementation and round-2 fixes were committed by the integrator; round-2 event delivery is `bbf2fd0`, followed by integrator fixes in `a169a0c`. The earlier uncommitted status is superseded.
- Independent Claude review and visual UAT approval remain pending; this slice is not claimed closed.

## Round 2 — UAT event delivery (CTRL-005, PERF-012)

- Changed only the UAT script and this note. Every CDP touch now crosses the animation-frame delivery boundary and waits for the expected vector, inline offset and held state before assertions, including unchanged states during second-touch checks.
- Held checks retain the <0.1 px tolerance, verify both computed translation axes, require transition-duration 0s and an empty knob `getAnimations()` list. Rubber-band offset uses the existing model formula. Existing vector, stretch, ownership and reduced-motion assertions remain.
- Release waits for the zero state before the frame strip, then waits for computed re-centring and hidden base before the final assertions; reduced motion uses the same waits.
- Validation: `pnpm exec eslint uat/slices/K-02-left-stick.mjs --max-warnings 0` passed; `pnpm exec vitest run packages/controller-kit` passed (2 files, 13 tests). Full verify was not run, as requested.
- Browser launch probe blocked by sandbox: Chromium `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. No round-2 browser or visual pass claimed; integrator UAT remains required.

## Round 3 — review fixes (CTRL-005, PERF-012; CTRL-004 guard regression)

- Area matches board 4 / UI specimen: 3 px dashed `var(--ka-stick-outline)` and `var(--ka-radius-large)`. Base anchors clamp by the travel radius; border-box sizing keeps the whole disc inside, and its diameter follows the capped model radius.
- Stretch grows with remapped magnitude via `knobStretch`; held transforms remain synchronous. The area rectangle is read only on acquisition. Reduced-motion media query is created on mount and its changes are listened for.
- Component imperative handlers are tested without a DOM for pointer cancel, lost capture, secondary cancellation, capture release and one rectangle read. Hidden visibility, blur and pagehide route through the same cancel path; listeners are removed on disposal.
- Unit diagonal assertions now check unit length and x = y = 1/√2 at (200, 200), and length (50 − 5) / 50 at (30, 40). Edge anchors exercise full deflection in all four directions.
- UAT adds off-centre landings with base-centre error ≤0.5 px and shots, diagonal x/y assertions, edge landing bounds and shots, and touchCancel zero/re-centring. Release strips begin while held, dispatch touchEnd at frame 1 without a two-rAF wait, and request ten frames at 24 ms intervals, covering the full release; the final frame asserts centred knob and faded base. Actual screenshot timestamps remain recorded by the harness for integrator inspection.
- The second finger is not rendered in the demo. The former shots 08 and 22 (and their renumbered equivalents) cannot visually prove its presence: only the CDP input and ownership assertions prove second-touch behaviour.
- `.ka-stick-readout` styling now belongs to the demo, not the kit.
- Integrator change `a169a0c` in `lock.ts` guards multi-touch preventDefault with `event.cancelable`; added a non-cancelable multi-touch test asserting no throw and no preventDefault call.
- Builder checks: `pnpm exec vitest run packages/controller-kit` passed (2 files, 16 tests); `pnpm exec tsc -b tsconfig.build.json` and scoped ESLint passed. No full verify or UAT was run by the builder. The integrator subsequently ran `pnpm uat -- K-02-left-stick --phones 1` successfully at both viewports and with reduced motion, with no browser errors. Its visual inspection is recorded in `uat/evidence/K-02-left-stick/round3/REPORT.md`: release had only one intermediate screenshot, prompting round 4.
- Round 3 was committed by the integrator as `1aefd83`; its UAT evidence was committed as `f371181`. The earlier builder commit failure is superseded.
- CTRL-005 remains incomplete: stick plus two buttons requires K-03. PERF-012 browser/device timing remains unassessed. Round 3 awaits independent review and integrator visual acceptance.

## Round 4 — D-116 and re-review fixes (CTRL-005)

- Binding ruling: main-checkout `docs/DECISIONS.md` D-116 (2026-11-17). Acquisition retains the clamped anchor and evaluates the actual finger immediately, eliminating the first-move jump. The DOM router supplies the padding box, inset by clientLeft/clientTop, so the disc clears the dashed outline.
- Unit coverage adds four edge landings and a corner followed by a 1 px move (vector delta ≤0.021), with a central landing still zero. A component check reads the base's actual position relative to the area's non-zero origin; the redundant full-deflection half of the clamp test was removed.
- Resize now cancels through the existing cancellation path. Tests cover resize, idle cancel, all cancellation events after listener removal, failed pointer capture without acquiring ownership, and retaining the last stretch angle on release.
- UAT now asserts corner landing knob-centre error ≤0.5 px, non-zero output toward the corner, continuity on a 1 px move, and base bounds against the padding box, with landing and nudge shots. Release strips clip to the area and target 16 ms spacing; independent browser rAF samples record computed transforms, require multiple strictly decreasing intermediate distances, verify the fast-exit transition token and settling within one frame (34 ms) of its 115 ms duration. Actual screenshot cadence still needs integrator inspection.
- Checks: `pnpm exec vitest run packages/controller-kit` passed (2 files, 20 tests); `pnpm exec tsc -b tsconfig.build.json` and `pnpm exec eslint packages/controller-kit/src apps/web/src/controller-demo.tsx uat/slices/K-02-left-stick.mjs --max-warnings 0` passed. No full verify or round-4 UAT run, per brief; no new browser evidence claimed. PERF-012 is not assessed here.
- Committed by the integrator as `1fc4a98` ("fix(controller-kit): review round fixes (K-02)"); round-4 UAT ran (exit 0), evidence in `uat/evidence/K-02-left-stick/round4/`.
- Independent review and integrator round-4 UAT/visual acceptance remain required. CTRL-005 still needs K-03's two buttons.

## Requests

Claude integrator owns independent review, visual UAT approval and shared tracker updates. No evidence is retained by this builder, per brief.


## Integrator's fixes at merge

- `stick.test.ts`: the padding-box inset test expected a 77 px string the design lint rejects; it now compares numbers on both axes with a free landing (87, 77) and a corner landing (55, 55), and fails when the inset is removed (checked by setting the outline to 0). The clamp test is renamed to what it asserts.
- D-116 now says that in the deep corner, beyond one radius from the moved base, the knob is rubber-banded toward the thumb like any drag past the edge.
- Note: a down exactly on the 3 px dashed outline is outside the padding box and does nothing (harmless; touch-action none). The knob fades with its base on release, so the return shows for about two frames before both are gone (fast-exit, 115 ms).