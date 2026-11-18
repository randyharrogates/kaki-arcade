# X-01 — Landing keyboard reach

Requirement: REL-002 (landing accessibility portion). Round 2.

## Goal and plan

Keep the approved A-09 landing (D-176, D-199) and its single primary
“Host a game” action. Let keyboard and TV directional keys reach all four
links in reading order: Host a game, Put this on your TV, Privacy, Credits.

1. Focus Host a game when the landing mounts on the TV layout only
   (≥1001 px, `preventScroll`). Recover lost focus with any arrow. Scope navigation to landing
   links: Down/Right advance, Up/Left retreat, stopping at either end.
2. Preserve native Enter and Tab behaviour; make Space click the focused
   link, or Host a game when body is focused (D-156 precedent). Ignore
   repeated Space and Alt/Ctrl/Meta combinations. Leave editable fields alone. Reuse the existing global token focus
   outline; no new CSS, layout, motion or button styling.
3. Add a real-browser DOM test for initial focus, all four directions and
   boundaries, forward/reverse Tab order, Enter/Space on every link, and
   unconsumed arrows/Space in an injected text input.
4. Provide a UAT slice and hand visual review to Claude.

## Acceptance and UAT proof

Run (round 2 ran clean at a6252d02; evidence `uat/evidence/X-01-landing/round2/`):

```sh
KAKI_PORT_WEB=6710 KAKI_PORT_SIGNAL=6711 pnpm uat -- X-01-landing --out round2
```

The harness manages the web and signal servers. The allocated UAT port is
6712; this slice does not open another server.

- At 1920 × 1080, 1280 × 720 and 390 × 844, load the real landing and
  assert initial Host focus on TV widths, reading order and no horizontal
  scroll. At 390, assert no initial focus and press ArrowDown first.
  Capture the initial landing to show the approved copy and single action.
- Traverse every link with Down and return with Up, then repeat with
  Right/Left. Assert each focus target. Capture every forward focus state
  at each size; TV stills prove the visible token ring and unchanged
  secondary text link. Claude must inspect all stills.
- At 1920, click the picture to lose focus, press ArrowDown and capture
  the recovered Host focus ring.
- Reload at 1080p, press Enter on the initially focused Host link, wait for
  the room code and capture the room screen to prove real navigation.
- The harness rejects unexpected console/page/request errors; its existing
  narrowly declared favicon 404 exception applies. No other errors are
  allowed or declared by this slice.

Round 2 evidence destination: `uat/evidence/X-01-landing/round2/`.
Round 1 evidence remains in `uat/evidence/X-01-landing/round1/`.

## Validation

Round 1 UAT ran successfully at commit `9fd54a62`, with no unexpected errors.
Claude reviewer inspected all 22 stills on 2026-11-18; the completed round 1
REPORT records that review. The reviewer also ran the original DOM test in
headless Chromium: one file / one test passed. These results establish round 1,
not the round 2 assertions.

Round 2 adds lost-focus recovery and body Space activation, TV-only mount
focus, browser modifier passthrough and a repeated-Space guard. The DOM test
now covers those changes, including phone load and ArrowDown recovery. UAT
now records lost-focus recovery at 1920 and starts phone navigation with an
arrow. Round 2 results (all launches below load 8; none exceeded ten minutes):

| Command | One-minute load at launch | Result |
|---|---:|---|
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web` | 5.00 | 51 files / 528 tests passed; 19 files / 26 tests failed because Chromium launch or local server binding was denied by the sandbox. Updated landing assertions could not run. |
| `pnpm exec tsc -b tsconfig.build.json` | 6.99 | Passed. No new emitted `.js`, `.js.map` or `.d.ts` files remained (none were created). |
| `pnpm exec eslint apps/web uat/slices/X-01-landing.mjs --max-warnings 0` | 6.67 | Passed. |
| `pnpm run lint:design` | 6.22 | Passed; 485 files scanned. |

Browser-capable rerun required: the updated
`apps/web/src/landing-keyboard.dom.test.ts` (lost focus, body Space,
TV/phone mount behaviour, modifiers, Space repeat and existing navigation).
Run it with:

```sh
VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/landing-keyboard.dom.test.ts
```

For a clean web suite, rerun `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web`
outside the sandbox. The 19 blocked files under `apps/web/src/` were:
`Overlap.dom.test.ts`, `PeekPoker.dom.test.ts`, `game-setup-host.dom.test.ts`,
`game-setup.dom.test.ts`, `host-keyboard.dom.test.ts`, `host-peek-poker.dom.test.ts`,
`kit-label-performance.dom.test.ts`, `landing-keyboard.dom.test.ts`,
`late-join.dom.test.ts`, `layout-fixtures.test.ts`, `pause-panel.dom.test.ts`,
`phone-coverage.dom.test.ts`, `phone-setup.dom.test.ts`, `poker-results.dom.test.ts`,
`rabakz-phone.dom.test.ts`, `shell-imagery.dom.test.ts`, `team-polish.test.ts`,
`pages/legal.dom.test.ts` and `pages/tv-help.dom.test.ts`.

## Not covered

Real TV remote input, TV browser behaviour and readability on the real TV
belong to X-09. This slice does not add a favicon (requires a design board),
change the approved artwork or layout, or assess performance budgets.

## Close-out and Requests

REL-002 round 2 code is in `apps/web/src/landing-route.tsx`, with browser
assertions in `apps/web/src/landing-keyboard.dom.test.ts` and real-server
steps in `uat/slices/X-01-landing.mjs`. Round 1 UAT passed and its images were
reviewed by Claude; round 1 DOM assertions passed in Chromium, as review 1
records. Round 2 was committed as a6252d02 (code) and aadd631f (UAT). Round 2 UAT ran clean at a6252d02 (`round2/`, 23 stills, no errors) and Claude reviewed it on 2026-11-18 (X-01 review 2, clean). The DOM test passes in Chromium (reviewer run and `pnpm verify`: 244 files, 4048 tests). The browser launch failures in the table above were sandbox limits of the implementation run only. The footer ring offset is left for X-09.
