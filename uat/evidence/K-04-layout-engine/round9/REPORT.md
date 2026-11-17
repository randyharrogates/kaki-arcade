# K-04-layout-engine UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-04-layout-engine --phones 1`
Commit: `798dbf89486321b19b4f99eb92c6ff8331db8e0f`
Viewports: 667×375, 844×390, 932×430

| Timing | ms | Status |
|---|---:|---|
| stick-faces-667x375 | 533.7 | completed |
| options-667x375 | 239.4 | completed |
| picker-667x375 | 188.3 | completed |
| dpad-only-667x375 | 238.3 | completed |
| text-only-667x375 | 238.0 | completed |
| cards-667x375 | 186.4 | completed |
| hidden-cards-667x375 | 236.9 | completed |
| long-answer-667x375 | 338.7 | completed |
| shoulders-667x375 | 205.3 | completed |
| disabled-options-667x375 | 238.3 | completed |
| disabled-faces-667x375 | 186.4 | completed |
| every-667x375 | 203.7 | completed |
| stick-faces-844x390 | 190.7 | completed |
| options-844x390 | 239.7 | completed |
| picker-844x390 | 191.0 | completed |
| dpad-only-844x390 | 239.7 | completed |
| text-only-844x390 | 240.3 | completed |
| cards-844x390 | 188.3 | completed |
| hidden-cards-844x390 | 192.3 | completed |
| long-answer-844x390 | 241.0 | completed |
| shoulders-844x390 | 240.6 | completed |
| disabled-options-844x390 | 241.6 | completed |
| disabled-faces-844x390 | 189.9 | completed |
| every-844x390 | 189.7 | completed |
| stick-faces-932x430 | 192.8 | completed |
| options-932x430 | 245.4 | completed |
| picker-932x430 | 209.9 | completed |
| dpad-only-932x430 | 192.7 | completed |
| text-only-932x430 | 244.8 | completed |
| cards-932x430 | 191.7 | completed |
| hidden-cards-932x430 | 276.8 | completed |
| long-answer-932x430 | 245.1 | completed |
| shoulders-932x430 | 193.9 | completed |
| disabled-options-932x430 | 244.7 | completed |
| disabled-faces-932x430 | 245.3 | completed |
| every-932x430 | 244.5 | completed |
| held face emits press and release with revision | 144.9 | completed |
| stick vector and neutral carry revision | 28.8 | completed |
| removed held control releases at its original revision | 551.3 | completed |
| surviving disabled face retains press revision across layout change | 646.2 | completed |
| state-only grid update advances the wire revision | 144.1 | completed |
| grid index and Lock in id | 175.3 | completed |
| D-pad direction press and release | 93.7 | completed |
| card id and disabled card | 131.8 | completed |
| answer choice transitions to Watch the TV without a blank frame | 2559.3 | completed |
| reduced motion keeps state changes and omits transition animations | 363.0 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-stick-faces-667.jpg](01-phone1-stick-faces-667.jpg) | | |
| ![02-phone1-options-667.jpg](02-phone1-options-667.jpg) | | |
| ![03-phone1-picker-667.jpg](03-phone1-picker-667.jpg) | | |
| ![04-phone1-dpad-only-667.jpg](04-phone1-dpad-only-667.jpg) | | |
| ![05-phone1-text-only-667.jpg](05-phone1-text-only-667.jpg) | | |
| ![06-phone1-cards-667.jpg](06-phone1-cards-667.jpg) | | |
| ![07-phone1-hidden-cards-667.jpg](07-phone1-hidden-cards-667.jpg) | | |
| ![08-phone1-long-answer-667-label.jpg](08-phone1-long-answer-667-label.jpg) | | |
| ![09-phone1-long-answer-667.jpg](09-phone1-long-answer-667.jpg) | | |
| ![10-phone1-shoulders-667.jpg](10-phone1-shoulders-667.jpg) | | |
| ![11-phone1-disabled-options-667.jpg](11-phone1-disabled-options-667.jpg) | | |
| ![12-phone1-disabled-faces-667.jpg](12-phone1-disabled-faces-667.jpg) | | |
| ![13-phone1-every-667.jpg](13-phone1-every-667.jpg) | | |
| ![14-phone1-stick-faces-844.jpg](14-phone1-stick-faces-844.jpg) | | |
| ![15-phone1-options-844.jpg](15-phone1-options-844.jpg) | | |
| ![16-phone1-picker-844.jpg](16-phone1-picker-844.jpg) | | |
| ![17-phone1-dpad-only-844.jpg](17-phone1-dpad-only-844.jpg) | | |
| ![18-phone1-text-only-844.jpg](18-phone1-text-only-844.jpg) | | |
| ![19-phone1-cards-844.jpg](19-phone1-cards-844.jpg) | | |
| ![20-phone1-hidden-cards-844.jpg](20-phone1-hidden-cards-844.jpg) | | |
| ![21-phone1-long-answer-844.jpg](21-phone1-long-answer-844.jpg) | | |
| ![22-phone1-shoulders-844.jpg](22-phone1-shoulders-844.jpg) | | |
| ![23-phone1-disabled-options-844.jpg](23-phone1-disabled-options-844.jpg) | | |
| ![24-phone1-disabled-faces-844.jpg](24-phone1-disabled-faces-844.jpg) | | |
| ![25-phone1-every-844.jpg](25-phone1-every-844.jpg) | | |
| ![26-phone1-stick-faces-932.jpg](26-phone1-stick-faces-932.jpg) | | |
| ![27-phone1-options-932.jpg](27-phone1-options-932.jpg) | | |
| ![28-phone1-picker-932.jpg](28-phone1-picker-932.jpg) | | |
| ![29-phone1-dpad-only-932.jpg](29-phone1-dpad-only-932.jpg) | | |
| ![30-phone1-text-only-932.jpg](30-phone1-text-only-932.jpg) | | |
| ![31-phone1-cards-932.jpg](31-phone1-cards-932.jpg) | | |
| ![32-phone1-hidden-cards-932.jpg](32-phone1-hidden-cards-932.jpg) | | |
| ![33-phone1-long-answer-932.jpg](33-phone1-long-answer-932.jpg) | | |
| ![34-phone1-shoulders-932.jpg](34-phone1-shoulders-932.jpg) | | |
| ![35-phone1-disabled-options-932.jpg](35-phone1-disabled-options-932.jpg) | | |
| ![36-phone1-disabled-faces-932.jpg](36-phone1-disabled-faces-932.jpg) | | |
| ![37-phone1-every-932.jpg](37-phone1-every-932.jpg) | | |
| ![38-phone1-removed-mid-hold.jpg](38-phone1-removed-mid-hold.jpg) | | |
| ![39-phone1-disabled-face-feedback.jpg](39-phone1-disabled-face-feedback.jpg) | | |
| ![66-phone1-reduced-motion-watch.jpg](66-phone1-reduced-motion-watch.jpg) | | |
| ![67-phone1-reduced-motion.jpg](67-phone1-reduced-motion.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![52-strip-answer-transition.jpg](52-strip-answer-transition.jpg) | | |
| ![65-strip-answer-return.jpg](65-strip-answer-return.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- K-04-layout-engine --phones 1`, exit 0, 46 steps, no process left, after one
integrator change: the long-answer check no longer demands exactly two lines (that was the
integrator's own guess in the brief); it checks the label stays at 34 px and inside its button.
Opened k04r9-a.jpg and 08 at full size.
- 01: board 4's square diamond beside the stick area at 667 × 375 (D-122).
- 07, 20: face-down cards draw board 4's red striped back; a disabled face-down card is plain grey.
- 08, 09: "Albus Percival Wulfric Brian Dumbledore" wraps to three centred lines at 34 px inside
  its button at 667.
- 19: disabled card "10 ♥" is an opaque grey fill with a dark edge and no dots showing through
  (D-125). The grey reads heavy; to be shown to Randy as a before and after.
| Shot | What it shows | Looked at by |
|---|---|---|
| 01, 07–09, 19, 20 | Diamond at 667, card backs, long answer, disabled card | Claude (integrator) |
