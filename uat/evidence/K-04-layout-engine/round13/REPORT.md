# K-04-layout-engine UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-04-layout-engine --phones 1`
Commit: `464f1c8941514cd29a4f05b93a18ea0062f26bd2`
Viewports: 667×375, 844×390, 932×430

| Timing | ms | Status |
|---|---:|---|
| stick-faces-667x375 | 360.1 | completed |
| options-667x375 | 244.6 | completed |
| picker-667x375 | 207.5 | completed |
| dpad-only-667x375 | 190.7 | completed |
| text-only-667x375 | 211.9 | completed |
| cards-667x375 | 192.3 | completed |
| hidden-cards-667x375 | 191.0 | completed |
| readonly-hidden-cards-667x375 | 191.3 | completed |
| long-answer-667x375 | 289.4 | completed |
| shoulders-667x375 | 190.1 | completed |
| disabled-options-667x375 | 196.1 | completed |
| disabled-faces-667x375 | 246.7 | completed |
| every-667x375 | 256.3 | completed |
| stick-faces-844x390 | 200.1 | completed |
| options-844x390 | 243.9 | completed |
| picker-844x390 | 244.1 | completed |
| dpad-only-844x390 | 194.2 | completed |
| text-only-844x390 | 242.4 | completed |
| cards-844x390 | 244.2 | completed |
| hidden-cards-844x390 | 243.8 | completed |
| readonly-hidden-cards-844x390 | 242.2 | completed |
| long-answer-844x390 | 259.5 | completed |
| shoulders-844x390 | 259.7 | completed |
| disabled-options-844x390 | 188.2 | completed |
| disabled-faces-844x390 | 243.2 | completed |
| every-844x390 | 210.9 | completed |
| stick-faces-932x430 | 212.1 | completed |
| options-932x430 | 194.8 | completed |
| picker-932x430 | 266.7 | completed |
| dpad-only-932x430 | 266.0 | completed |
| text-only-932x430 | 199.2 | completed |
| cards-932x430 | 263.5 | completed |
| hidden-cards-932x430 | 266.4 | completed |
| readonly-hidden-cards-932x430 | 265.3 | completed |
| long-answer-932x430 | 249.9 | completed |
| shoulders-932x430 | 194.3 | completed |
| disabled-options-932x430 | 211.0 | completed |
| disabled-faces-932x430 | 194.2 | completed |
| every-932x430 | 212.8 | completed |
| held face emits press and release with revision | 97.9 | completed |
| stick vector and neutral carry revision | 27.8 | completed |
| removed held control releases at its original revision | 567.7 | completed |
| surviving disabled face retains press revision across layout change | 681.6 | completed |
| state-only grid update advances the wire revision | 92.9 | completed |
| grid index and Lock in id | 125.1 | completed |
| D-pad direction press and release | 92.8 | completed |
| card id and disabled card | 183.0 | completed |
| answer choice transitions to Watch the TV without a blank frame | 2627.1 | completed |
| reduced motion keeps state changes and omits transition animations | 346.0 | completed |

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
| ![08-phone1-readonly-hidden-cards-667.jpg](08-phone1-readonly-hidden-cards-667.jpg) | | |
| ![09-phone1-long-answer-667-label.jpg](09-phone1-long-answer-667-label.jpg) | | |
| ![10-phone1-long-answer-667.jpg](10-phone1-long-answer-667.jpg) | | |
| ![11-phone1-shoulders-667.jpg](11-phone1-shoulders-667.jpg) | | |
| ![12-phone1-disabled-options-667.jpg](12-phone1-disabled-options-667.jpg) | | |
| ![13-phone1-disabled-faces-667.jpg](13-phone1-disabled-faces-667.jpg) | | |
| ![14-phone1-every-667.jpg](14-phone1-every-667.jpg) | | |
| ![15-phone1-stick-faces-844.jpg](15-phone1-stick-faces-844.jpg) | | |
| ![16-phone1-options-844.jpg](16-phone1-options-844.jpg) | | |
| ![17-phone1-picker-844.jpg](17-phone1-picker-844.jpg) | | |
| ![18-phone1-dpad-only-844.jpg](18-phone1-dpad-only-844.jpg) | | |
| ![19-phone1-text-only-844.jpg](19-phone1-text-only-844.jpg) | | |
| ![20-phone1-cards-844.jpg](20-phone1-cards-844.jpg) | | |
| ![21-phone1-hidden-cards-844.jpg](21-phone1-hidden-cards-844.jpg) | | |
| ![22-phone1-readonly-hidden-cards-844.jpg](22-phone1-readonly-hidden-cards-844.jpg) | | |
| ![23-phone1-long-answer-844.jpg](23-phone1-long-answer-844.jpg) | | |
| ![24-phone1-shoulders-844.jpg](24-phone1-shoulders-844.jpg) | | |
| ![25-phone1-disabled-options-844.jpg](25-phone1-disabled-options-844.jpg) | | |
| ![26-phone1-disabled-faces-844.jpg](26-phone1-disabled-faces-844.jpg) | | |
| ![27-phone1-every-844.jpg](27-phone1-every-844.jpg) | | |
| ![28-phone1-stick-faces-932.jpg](28-phone1-stick-faces-932.jpg) | | |
| ![29-phone1-options-932.jpg](29-phone1-options-932.jpg) | | |
| ![30-phone1-picker-932.jpg](30-phone1-picker-932.jpg) | | |
| ![31-phone1-dpad-only-932.jpg](31-phone1-dpad-only-932.jpg) | | |
| ![32-phone1-text-only-932.jpg](32-phone1-text-only-932.jpg) | | |
| ![33-phone1-cards-932.jpg](33-phone1-cards-932.jpg) | | |
| ![34-phone1-hidden-cards-932.jpg](34-phone1-hidden-cards-932.jpg) | | |
| ![35-phone1-readonly-hidden-cards-932.jpg](35-phone1-readonly-hidden-cards-932.jpg) | | |
| ![36-phone1-long-answer-932.jpg](36-phone1-long-answer-932.jpg) | | |
| ![37-phone1-shoulders-932.jpg](37-phone1-shoulders-932.jpg) | | |
| ![38-phone1-disabled-options-932.jpg](38-phone1-disabled-options-932.jpg) | | |
| ![39-phone1-disabled-faces-932.jpg](39-phone1-disabled-faces-932.jpg) | | |
| ![40-phone1-every-932.jpg](40-phone1-every-932.jpg) | | |
| ![41-phone1-removed-mid-hold.jpg](41-phone1-removed-mid-hold.jpg) | | |
| ![42-phone1-disabled-face-feedback.jpg](42-phone1-disabled-face-feedback.jpg) | | |
| ![69-phone1-reduced-motion-watch.jpg](69-phone1-reduced-motion-watch.jpg) | | |
| ![70-phone1-reduced-motion.jpg](70-phone1-reduced-motion.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![55-strip-answer-transition.jpg](55-strip-answer-transition.jpg) | | |
| ![68-strip-answer-return.jpg](68-strip-answer-return.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- K-04-layout-engine --phones 1`, exit 0, every step completed, no process left.
Opened k04r13-a.jpg (shots 01, 03, 07, 08, 09, 12, 13, 20).
- 03 picker at 667: "Lock in" on one line at 34 px beside the X glyph, button about 200 px wide
  as in round 9 (the round 10-12 regression is gone).
- 09 long answer "Modular Interface of Digital Instruments": steps to 21 px (D-127) and sits on
  two centred lines inside its button.
- 12, 13 disabled options and faces: opaque grey panel with dark ink, no dots showing through,
  no filter (D-125).
- 07, 08 face-down cards: board 4's red striped back; the disabled one keeps a greyed striped
  back; 08 is the read-only path.
- 20 cards at 844: "Q ♠" enabled, "10 ♥" disabled grey.
- 01 stick and faces at 667: diamond as before.
| Shot | What it shows | Looked at by |
|---|---|---|
| 01, 03, 07, 08, 09, 12, 13, 20 | Picker, long answer, disabled style, card backs | Claude (integrator) |
