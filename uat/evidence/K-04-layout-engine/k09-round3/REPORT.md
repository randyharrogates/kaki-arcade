# K-04-layout-engine UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-04-layout-engine --phones 1 --out k09-round3`
Commit: `7366ec966e06f74cd349d75ad07ee7a340d68018`
Viewports: 667×375, 844×390, 932×430

| Timing | ms | Status |
|---|---:|---|
| stick-faces-667x375 | 695.4 | completed |
| options-667x375 | 258.2 | completed |
| peek-pick-667x375 | 196.9 | completed |
| picker-667x375 | 230.2 | completed |
| dpad-only-667x375 | 209.7 | completed |
| text-only-667x375 | 190.3 | completed |
| cards-667x375 | 259.5 | completed |
| hidden-cards-667x375 | 193.1 | completed |
| readonly-hidden-cards-667x375 | 204.4 | completed |
| long-answer-667x375 | 312.6 | completed |
| shoulders-667x375 | 207.5 | completed |
| disabled-options-667x375 | 262.9 | completed |
| disabled-faces-667x375 | 259.7 | completed |
| every-667x375 | 257.7 | completed |
| stick-faces-844x390 | 212.1 | completed |
| options-844x390 | 214.6 | completed |
| peek-pick-844x390 | 228.9 | completed |
| picker-844x390 | 218.3 | completed |
| dpad-only-844x390 | 191.9 | completed |
| text-only-844x390 | 195.1 | completed |
| cards-844x390 | 198.1 | completed |
| hidden-cards-844x390 | 192.5 | completed |
| readonly-hidden-cards-844x390 | 208.9 | completed |
| long-answer-844x390 | 212.6 | completed |
| shoulders-844x390 | 193.8 | completed |
| disabled-options-844x390 | 189.2 | completed |
| disabled-faces-844x390 | 258.4 | completed |
| every-844x390 | 260.6 | completed |
| stick-faces-932x430 | 201.8 | completed |
| options-932x430 | 193.6 | completed |
| peek-pick-932x430 | 214.7 | completed |
| picker-932x430 | 212.8 | completed |
| dpad-only-932x430 | 196.1 | completed |
| text-only-932x430 | 195.7 | completed |
| cards-932x430 | 203.2 | completed |
| hidden-cards-932x430 | 220.0 | completed |
| readonly-hidden-cards-932x430 | 220.4 | completed |
| long-answer-932x430 | 198.7 | completed |
| shoulders-932x430 | 264.8 | completed |
| disabled-options-932x430 | 281.1 | completed |
| disabled-faces-932x430 | 198.1 | completed |
| every-932x430 | 214.9 | completed |
| held face emits press and release with revision | 113.1 | completed |
| stick vector and neutral carry revision | 30.4 | completed |
| removed held control releases at its original revision | 570.5 | completed |
| surviving disabled face retains press revision across layout change | 701.8 | completed |
| state-only grid update advances the wire revision | 112.6 | completed |
| grid index and Lock in id | 145.2 | completed |
| D-pad direction press and release | 163.0 | completed |
| card id and disabled card | 205.8 | completed |
| answer choice transitions to Watch the TV without a blank frame | 2730.9 | completed |
| reduced motion keeps state changes and omits transition animations | 387.7 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-stick-faces-667.jpg](01-phone1-stick-faces-667.jpg) | | |
| ![02-phone1-options-667.jpg](02-phone1-options-667.jpg) | | |
| ![03-phone1-peek-pick-667.jpg](03-phone1-peek-pick-667.jpg) | | |
| ![04-phone1-picker-667.jpg](04-phone1-picker-667.jpg) | | |
| ![05-phone1-dpad-only-667.jpg](05-phone1-dpad-only-667.jpg) | | |
| ![06-phone1-text-only-667.jpg](06-phone1-text-only-667.jpg) | | |
| ![07-phone1-cards-667.jpg](07-phone1-cards-667.jpg) | | |
| ![08-phone1-hidden-cards-667.jpg](08-phone1-hidden-cards-667.jpg) | | |
| ![09-phone1-readonly-hidden-cards-667.jpg](09-phone1-readonly-hidden-cards-667.jpg) | | |
| ![10-phone1-long-answer-667-label.jpg](10-phone1-long-answer-667-label.jpg) | | |
| ![11-phone1-long-answer-667.jpg](11-phone1-long-answer-667.jpg) | | |
| ![12-phone1-shoulders-667.jpg](12-phone1-shoulders-667.jpg) | | |
| ![13-phone1-disabled-options-667.jpg](13-phone1-disabled-options-667.jpg) | | |
| ![14-phone1-disabled-faces-667.jpg](14-phone1-disabled-faces-667.jpg) | | |
| ![15-phone1-every-667.jpg](15-phone1-every-667.jpg) | | |
| ![16-phone1-stick-faces-844.jpg](16-phone1-stick-faces-844.jpg) | | |
| ![17-phone1-options-844.jpg](17-phone1-options-844.jpg) | | |
| ![18-phone1-peek-pick-844.jpg](18-phone1-peek-pick-844.jpg) | | |
| ![19-phone1-picker-844.jpg](19-phone1-picker-844.jpg) | | |
| ![20-phone1-dpad-only-844.jpg](20-phone1-dpad-only-844.jpg) | | |
| ![21-phone1-text-only-844.jpg](21-phone1-text-only-844.jpg) | | |
| ![22-phone1-cards-844.jpg](22-phone1-cards-844.jpg) | | |
| ![23-phone1-hidden-cards-844.jpg](23-phone1-hidden-cards-844.jpg) | | |
| ![24-phone1-readonly-hidden-cards-844.jpg](24-phone1-readonly-hidden-cards-844.jpg) | | |
| ![25-phone1-long-answer-844.jpg](25-phone1-long-answer-844.jpg) | | |
| ![26-phone1-shoulders-844.jpg](26-phone1-shoulders-844.jpg) | | |
| ![27-phone1-disabled-options-844.jpg](27-phone1-disabled-options-844.jpg) | | |
| ![28-phone1-disabled-faces-844.jpg](28-phone1-disabled-faces-844.jpg) | | |
| ![29-phone1-every-844.jpg](29-phone1-every-844.jpg) | | |
| ![30-phone1-stick-faces-932.jpg](30-phone1-stick-faces-932.jpg) | | |
| ![31-phone1-options-932.jpg](31-phone1-options-932.jpg) | | |
| ![32-phone1-peek-pick-932.jpg](32-phone1-peek-pick-932.jpg) | | |
| ![33-phone1-picker-932.jpg](33-phone1-picker-932.jpg) | | |
| ![34-phone1-dpad-only-932.jpg](34-phone1-dpad-only-932.jpg) | | |
| ![35-phone1-text-only-932.jpg](35-phone1-text-only-932.jpg) | | |
| ![36-phone1-cards-932.jpg](36-phone1-cards-932.jpg) | | |
| ![37-phone1-hidden-cards-932.jpg](37-phone1-hidden-cards-932.jpg) | | |
| ![38-phone1-readonly-hidden-cards-932.jpg](38-phone1-readonly-hidden-cards-932.jpg) | | |
| ![39-phone1-long-answer-932.jpg](39-phone1-long-answer-932.jpg) | | |
| ![40-phone1-shoulders-932.jpg](40-phone1-shoulders-932.jpg) | | |
| ![41-phone1-disabled-options-932.jpg](41-phone1-disabled-options-932.jpg) | | |
| ![42-phone1-disabled-faces-932.jpg](42-phone1-disabled-faces-932.jpg) | | |
| ![43-phone1-every-932.jpg](43-phone1-every-932.jpg) | | |
| ![44-phone1-removed-mid-hold.jpg](44-phone1-removed-mid-hold.jpg) | | |
| ![45-phone1-disabled-face-feedback.jpg](45-phone1-disabled-face-feedback.jpg) | | |
| ![72-phone1-reduced-motion-watch.jpg](72-phone1-reduced-motion-watch.jpg) | | |
| ![73-phone1-reduced-motion.jpg](73-phone1-reduced-motion.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![58-strip-answer-transition.jpg](58-strip-answer-transition.jpg) | | |
| ![71-strip-answer-return.jpg](71-strip-answer-return.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
