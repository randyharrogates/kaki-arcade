# X-10 — Credits question-bank download

## Goal and requirements

Offer the adapted Rabakz bank from Credits under CC BY-SA 4.0 (RZ-021,
DATA-004; D-232). No question edits, dependencies or separate package.

## Acceptance and implementation

- Exact link: “Download our questions (CC BY‑SA 4.0)” →
  `/rabakz/questions.json`, beside the existing Open Trivia Database attribution.
- Existing `.legal-links` and `.legal-page a` styles supply token-based styling,
  wrapping and a minimum 55 px target. Native anchors preserve keyboard order.
- Previously the production bank was only in the `virtual:rabakz-bank` lazy JS
  chunk. The existing `content/rabakz/scripts/vite-bank.ts` plugin now emits one
  additional static asset, `rabakz/questions.json`, and serves that same envelope
  in development. Round 2 emits `{ questions, credits }`: exactly the shipped bank’s `otdb-`
  questions, with unchanged fields, and its scoped credits notice (2,342 questions
  today). Singapore and other Kaki Arcade-written questions are excluded and are
  not offered under CC BY-SA 4.0. The build hook reuses the validated result from
  `load` and emits only when the bundle contains the full bank module.
- Nothing imports, fetches or preloads the JSON asset. The normal shell,
  controller and game transfer paths are unchanged; no transfer budget is raised.
  D-232 is read as allowing a second copy in another format, built from the
  shipped bank in the same build. It counts against the PERF-022 deploy-shell
  figure and is not exempted: the file is 632,913 B raw, and the deploy-shell figure goes from 532,530 B to 684,398 B gzip of 1,500,000 (+151,868 B). PERF-020 and PERF-023 are unchanged.
  The browser-free `legal-download.test.ts` checks exact equality with the
  shipped bank’s OTDB subset and the credit count, and the DOM/UAT checks guard against an automatic request.
- DOM checks cover exact text/href, keyboard Tab order, phone target height,
  horizontal fit and existing TV clearance/no-scroll checks at 1920 and 1280.
  390 already scrolls vertically (X-03); it retains that expectation.

## UAT script

`uat/slices/X-10-credits-download.mjs` captures Credits with the link visible at
1920×1080, 1280×720 and 390×844, records fit, and requests the target to check
200, application/json and the CC BY-SA 4.0 notice. Round 2 activates the link
by keyboard Enter at 1920 and by touch at 390 in a touch-enabled context, waits
for each download, and records question count and the OTDB-only ID check. Fit
records include the reading panel’s viewport rectangle and screen scale. It writes
`download.json` alongside the stills. Run:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=6800 KAKI_PORT_SIGNAL=6801 KAKI_PORT_UAT=6802 pnpm uat -- X-10-credits-download --phones 1 --out round2
```

The standard UAT runner uses development Vite. The automated build-output test
separately verifies production emission; production-host HTTP verification remains
an integrator check.

## Round-1 validation

All launch loads below are the 1-minute load, each below 8.

- Vitest requested scope, load 7.63: 299 passed, 2 failed (301 total).
  New production-emission test passed. Legal DOM failed on local listen EPERM;
  existing TV-help DOM failed on Chromium MachPortRendezvous permission denial.
  This environment therefore supplied no new rendered fit measurements.
- Initial typecheck, load 7.78: failed on a Vite type import unavailable to the
  content package. Replaced with structural hook types using existing Node types.
- Typecheck, load 7.46: passed, including the new UAT slice.
- Initial ESLint, load 7.16: four findings in new test/slice code; corrected.
- Design lint, load 6.82: passed (485 files).
- Typecheck output cleaned with `tsc -b tsconfig.build.json --clean`, load 6.65.
- Final ESLint, load 6.31: passed.
- Final typecheck after lint fixes, load 6.42: passed, including UAT.
- Final typecheck output clean, load 7.59: passed; emitted files removed.

## Round 2

- Applied review 1’s must-fix using integrator option (a), and should-fixes 1–8.
- Link copy uses U+00A0 and U+2011; native `download` names the file
  `kaki-arcade-rabakz-questions.json`. Dev responses use the same attachment name,
  exact mounted path only and the same trailing newline as production.
- Back autofocus is asserted before the Tab step; the test no longer refocuses it.
- Requested non-DOM Vitest scope: 12 files, 269 tests passed (launch load 2.80).
- Typecheck including UAT passed (2.29); design lint passed, 487 files (2.56).
- Initial ESLint (2.47) found unsafe JSON/rectangle values and an unused initial
  assignment in the UAT slice; corrected with explicit rectangle fields and runtime
  JSON checks. Final ESLint passed (2.21); final typecheck including UAT passed
  (2.35). Final emitted-output clean passed (2.46); `git diff --check` passed.
- Initial typecheck outputs cleaned (2.56).

## Close-out

Round 2 is committed (0a918196). `pnpm verify` passed, including the browser test. The round-2 UAT passed (`uat/evidence/X-10-credits-download/round2/`): Credits at 1920, 1280 and 390 with the link, and the file downloaded by keyboard Enter at 1920 and by tap at 390, 2,342 `otdb-` questions each. The integrator and review 2 looked at all three stills; review 2 is clean.

## Open

Serving `/rabakz/questions.json` on production hosting is checked when web hosting exists (X-06). The 390 tap does not yet assert the saved filename (the 1920 path does); add it at the next change to the slice.
