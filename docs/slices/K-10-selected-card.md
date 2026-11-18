# K-10 — Selected face-down card

Goal: make private face-down selection clear without identifying a card (PP-005; D-218,
D-164 and D-166).

Acceptance:

- Selected backs retain the red treatment and white inset frame and show a centred cream
  34 px disc with a 21 px ink tick. No rank, suit or position is drawn by the marker.
- Disc contrast against the red base is at least 5.1 : 1, measured from computed colours.
- Opacity and scale enter from 0.95 over fast with ease-out; exit uses fast-exit (115 ms,
  approximately 20% shorter than 144 ms). Reduced motion has no transition.
- Decoration adds no layout space and does not apply to selected face-up cards.

Implementation uses CSS pseudo-elements and an inline SVG mask, without renderer changes.
The existing spacing tokens provide the exact 34/21 sizes; no nearest-value substitution was
needed. Cream uses panel-to and ink uses seat-numeral; both are existing UI tokens. SVG path
coordinates describe the tick geometry, not new UI sizes or colours.

DOM coverage in apps/web/src/layout-fixtures.test.ts measures dimensions, symmetric centring,
visibility, geometry preservation, computed contrast, motion durations, reduced motion and
face-up isolation. Existing renderer tests cover aria-pressed and anonymous face-down contents.

UAT script: uat/slices/K-10-selected-card.mjs creates a real two-phone room, starts Peek Poker,
advances the host clock to pick, pauses there, picks one and then two cards on phone 1, checks
all backs and the other phone, and saves four settled CSS-resolution stills. No game code,
contracts, tokens, trackers, dependencies or lockfiles are changed.

## Validation

Requested checks use PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false, a 600-second command timeout,
and launch only below load 8.

| Check | Launch 1-minute load | Result |
| --- | --- | --- |
| VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit apps/web/src/layout-fixtures.test.ts | 2.6123 | 108 passed; two DOM tests blocked at Chromium launch by macOS sandbox MachPortRendezvous permission denial (includes the pre-existing DOM test) |
| pnpm exec tsc -b tsconfig.build.json | 2.5913 | Passed after clean; root includes uat/**/*.mjs; emitted outputs removed with tsc -b --clean |
| pnpm exec eslint packages/controller-kit uat/slices/K-10-selected-card.mjs --max-warnings 0 | 2.7212 | Passed |
| pnpm run lint:design | 2.7212; final 3.4790 | Passed (485 files) |

## Close-out

`pnpm verify` passed, including the DOM test (3 of 3 again in review). The 2-phone UAT `round1` passed at 48e06d42 after three integrator fixes to the UAT slice only: expected host errors registered inside a step; the paused host clock stepped so the authoritative host accepts the picks; picks cleared through the selected cards. The integrator and an independent reviewer looked at all four stills. The Codex-round validation table above predates those runs (its DOM rows were blocked by the Codex sandbox). Not proven: WebKit and real phones; phone 2 is asserted, not pictured. D-218's 5.1 : 1 is against the base colour; over the lighter stripes the disc is about 4 : 1 (D-269).

## Requests

Viewport resolved by the integrator: Peek Poker phones play in landscape (D-164, P-07), so the stills are 667 × 375 and 844 × 390 (the brief's 375 × 667 and 390 × 844 turned sideways). The script also clears the selection before each size, so its clicks select rather than toggle off.

Run the browser DOM tests in an environment that permits Chromium to launch, then run and
visually review the UAT slice with agreed viewport orientation. Proposed command:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5450 KAKI_PORT_SIGNAL=5451 pnpm uat -- K-10-selected-card --phones 2 --max-mb 12 --timeout-min 10
```
