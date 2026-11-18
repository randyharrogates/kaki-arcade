# K-11 — Could not connect

## Goal and scope

REL-006, as specified by D-250: help a phone that has remained on the connecting status for 15 seconds reach the big screen. Existing supported-browser handling and reconnect behaviour for seated players remain outside this slice.

## Acceptance

- At 14.9 seconds the phone still shows Joining the room…; at 15 seconds it shows exactly: “This phone could not connect to the big screen. Connect it to the same Wi-Fi as the big screen and scan again.”
- Try again closes the old join attempt and starts a new attempt for the same room and nickname, with a fresh 15-second window and no reload.
- A seat received at 10 seconds prevents the advice; a late seat replaces the advice with the normal connected screen. Leaving connecting cancels its timer.
- Existing status crossfade, panel treatment, contrast tokens and 0.97 press scale apply. Reduced motion retains the state change. The entire retry button is at least 55 px tall. Portrait screens at 390 × 844 and 375 × 667 do not scroll.

## Implementation and automated coverage

`apps/web/src/phone.ts` owns the connecting deadline and retry action. A never-seated phone with an absent host keeps the connecting status; automatic signalling retries cannot reset the deadline or dismiss the advice. Deliberate retry closes the previous reconnect driver before creating its replacement. Existing generation guards reject callbacks from old attempts.

`phone.test.ts` uses the existing fake clock to cover the deadline boundary, old-attempt closure and stale callbacks, room/nickname preservation, a fresh retry deadline, early and late seats, signalling presence changes, and cancellation on edit/leave/stop. `phone-timeout.dom.test.ts` mounts the actual phone page with a fake clock, checks exact copy, measures the full retry target and scroll bounds at both portrait sizes with reduced motion, then presses retry. It builds in memory.

## UAT script

`uat/slices/K-11-could-not-connect.mjs` creates a real room, closes its host tab, opens the retained join link on a phone and submits a name. It waits for the advice, asserts its text and retry target size, takes settled stills at 390 × 844 and 375 × 667, presses Try again and checks that connecting returns on the same link.

Command (run by the integrator on 2026-11-19; evidence `uat/evidence/K-11-could-not-connect/round1/`):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5460 KAKI_PORT_SIGNAL=5461 pnpm uat -- K-11-could-not-connect --phones 1 --phone-browser chromium
```

Expected evidence under `uat/evidence/K-11-could-not-connect/auto/`: two settled timeout stills and a retry connecting still. The existing runner uses the assigned web/signal ports; no extra UAT server is introduced. Chromium is intentional: D-212 says Playwright WebKit cannot prove real Safari phone networking.

## Validation

Round 1b checks (1-minute load measured immediately before each launch; every pnpm invocation used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`):

| Check | Launch load | Result |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web packages/controller-kit` | 5.81 initially; 5.97 final | Final: 643 passed, 26 failed across 79 files. All failures occur at sandbox-denied Chromium launch (25) or local listen (1), before browser assertions; the new timeout unit tests pass. |
| `pnpm exec tsc -b tsconfig.build.json` | 6.78 initially; 7.99 after fix; 6.20 final | Initial run found a missing return in the DOM fixture; fixed. Both subsequent runs pass, including the new UAT slice. Generated TypeScript outputs and build-info files deleted afterwards. |
| `pnpm exec eslint apps/web packages/controller-kit uat/slices/K-11-could-not-connect.mjs --max-warnings 0` | 22.77 initially (mistaken launch above the gate); 7.76 repeat; 6.16 final | All pass. Final run covers the last DOM-test changes. |
| `pnpm run lint:design` | 7.05 | Pass: 485 files. |

No command exceeded 10 minutes. Final check log: `/private/tmp/K-11-final-checks.log` (local, temporary). `git diff --check` passes. Chromium reports `bootstrap_check_in ... Permission denied (1100)`; the existing legal-page test reports `listen EPERM`. Browser fit, contrast, press and reduced-motion assertions remain unproven until Claude runs outside this sandbox. No UAT, verify, perf, install or commit was run.

## Close-out

`pnpm verify` and the 1-phone UAT passed (2026-11-19); the integrator and an independent reviewer looked at all three stills. Review 1's must-fix was fixed by the integrator at merge: a never-seated phone's reconnect hold window ending (`hold-over`, about 120 s) now keeps the advice instead of "Your seat hold has ended", with a unit test (D-267). "Can't reach the room" (pairing server unreachable) keeps its own copy and does not start the window; a screen lock during connecting keeps the original deadline (both recorded in D-267). Real phones on the wrong Wi-Fi are checked at X-09.

## Requests

Claude: run the UAT command above, inspect every still for fit, copy, contrast and crossfade, and complete the independent review. Real Safari and iPhone remain unproven as recorded in D-212.
