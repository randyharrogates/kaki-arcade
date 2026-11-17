# K-04-layout-engine UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-04-layout-engine --phones 1`
Commit: `0be9cce1f74053c047d547d38042c724afb1fdf8`
Viewports: 667×375, 844×390, 932×430

| Timing | ms | Status |
|---|---:|---|
| stick-faces-667x375 | 546.4 | completed |
| options-667x375 | 239.4 | completed |
| picker-667x375 | 206.6 | completed |
| dpad-only-667x375 | 187.5 | completed |
| text-only-667x375 | 237.6 | completed |
| cards-667x375 | 222.5 | completed |
| shoulders-667x375 | 187.7 | completed |
| disabled-options-667x375 | 221.1 | completed |
| disabled-faces-667x375 | 220.5 | completed |
| every-667x375 | 238.9 | completed |
| stick-faces-844x390 | 259.4 | completed |
| options-844x390 | 190.0 | completed |
| picker-844x390 | 192.0 | completed |
| dpad-only-844x390 | 188.7 | completed |
| text-only-844x390 | 239.9 | completed |
| cards-844x390 | 223.9 | completed |
| shoulders-844x390 | 242.0 | completed |
| disabled-options-844x390 | 189.5 | completed |
| disabled-faces-844x390 | 188.3 | completed |
| every-844x390 | 241.2 | completed |
| stick-faces-932x430 | 244.7 | completed |
| options-932x430 | 225.9 | completed |
| picker-932x430 | 244.1 | completed |
| dpad-only-932x430 | 192.4 | completed |
| text-only-932x430 | 243.4 | completed |
| cards-932x430 | 226.5 | completed |
| shoulders-932x430 | 242.9 | completed |
| disabled-options-932x430 | 247.3 | completed |
| disabled-faces-932x430 | 193.8 | completed |
| every-932x430 | 192.5 | completed |
| held face emits press and release with revision | 144.1 | completed |
| stick vector and neutral carry revision | 30.0 | completed |
| removed held control releases at its original revision | 551.9 | completed |
| surviving disabled face retains press revision across layout change | 697.7 | completed |
| state-only grid update advances the wire revision | 143.7 | completed |
| grid index and Lock in id | 176.0 | completed |
| D-pad direction press and release | 93.9 | completed |
| card id and disabled card | 165.6 | completed |
| answer choice transitions to Watch the TV without a blank frame | 2660.5 | completed |
| reduced motion keeps state changes and omits transition animations | 362.6 | completed |

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
| ![07-phone1-shoulders-667.jpg](07-phone1-shoulders-667.jpg) | | |
| ![08-phone1-disabled-options-667.jpg](08-phone1-disabled-options-667.jpg) | | |
| ![09-phone1-disabled-faces-667.jpg](09-phone1-disabled-faces-667.jpg) | | |
| ![10-phone1-every-667.jpg](10-phone1-every-667.jpg) | | |
| ![11-phone1-stick-faces-844.jpg](11-phone1-stick-faces-844.jpg) | | |
| ![12-phone1-options-844.jpg](12-phone1-options-844.jpg) | | |
| ![13-phone1-picker-844.jpg](13-phone1-picker-844.jpg) | | |
| ![14-phone1-dpad-only-844.jpg](14-phone1-dpad-only-844.jpg) | | |
| ![15-phone1-text-only-844.jpg](15-phone1-text-only-844.jpg) | | |
| ![16-phone1-cards-844.jpg](16-phone1-cards-844.jpg) | | |
| ![17-phone1-shoulders-844.jpg](17-phone1-shoulders-844.jpg) | | |
| ![18-phone1-disabled-options-844.jpg](18-phone1-disabled-options-844.jpg) | | |
| ![19-phone1-disabled-faces-844.jpg](19-phone1-disabled-faces-844.jpg) | | |
| ![20-phone1-every-844.jpg](20-phone1-every-844.jpg) | | |
| ![21-phone1-stick-faces-932.jpg](21-phone1-stick-faces-932.jpg) | | |
| ![22-phone1-options-932.jpg](22-phone1-options-932.jpg) | | |
| ![23-phone1-picker-932.jpg](23-phone1-picker-932.jpg) | | |
| ![24-phone1-dpad-only-932.jpg](24-phone1-dpad-only-932.jpg) | | |
| ![25-phone1-text-only-932.jpg](25-phone1-text-only-932.jpg) | | |
| ![26-phone1-cards-932.jpg](26-phone1-cards-932.jpg) | | |
| ![27-phone1-shoulders-932.jpg](27-phone1-shoulders-932.jpg) | | |
| ![28-phone1-disabled-options-932.jpg](28-phone1-disabled-options-932.jpg) | | |
| ![29-phone1-disabled-faces-932.jpg](29-phone1-disabled-faces-932.jpg) | | |
| ![30-phone1-every-932.jpg](30-phone1-every-932.jpg) | | |
| ![31-phone1-removed-mid-hold.jpg](31-phone1-removed-mid-hold.jpg) | | |
| ![32-phone1-disabled-face-feedback.jpg](32-phone1-disabled-face-feedback.jpg) | | |
| ![59-phone1-reduced-motion-watch.jpg](59-phone1-reduced-motion-watch.jpg) | | |
| ![60-phone1-reduced-motion.jpg](60-phone1-reduced-motion.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![45-strip-answer-transition.jpg](45-strip-answer-transition.jpg) | | |
| ![58-strip-answer-return.jpg](58-strip-answer-return.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- K-04-layout-engine --phones 1`, exit 0, 40 steps, no process left, after one
integrator change: the diamond's axis checks allow 1 CSS px instead of 0.01 px (sub-pixel
rounding on a 3x screen failed a correct square diamond; seen in the failure shot at 667).
The 667 failure shot was in the run's auto folder, which was replaced by the passing rerun, so it is not kept here. Opened k04r8-a.jpg (844: stick and faces, options, picker, D-pad, cards, shoulders, disabled
options, disabled faces, every-kind, disabled-face feedback) and the 667 failure shot at full
size before the fix.
- Faces form board 4's square diamond (triangle top, circle right, cross bottom, square left)
  beside the stick area; at 667 × 375 it fits; the face floor there is 89 px (D-122) and the faces grow to about 103 px (shot 01).
- Options in the TV's order fill the area; picker grid with Lock in; D-pad grown; cards keep a
  card shape with a drawn rank and suit; L and R placed top right; disabled options and faces
  dimmed; the every-kind stress layout overlaps as expected and reports not fitting.
Note: dimmed controls still let the dot surface show through (opacity), a small look point for
the reviewer.
