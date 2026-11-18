# R-04-setup UAT evidence

Integrator visual review 2026-11-18. Earlier rounds' stills were reviewed in the R-04 final re-review (roundL); round M re-shot the same scenario after the length-50, teams-off, hint, summary and tap-feedback fixes. Integrator opened 22 (start blocked), 24 (length 50 unavailable: ✕ 50 dashed and struck, footer reason), 42 (Teams on, Start enabled), watcher, team confirmation and settings-kept stills; every other still matches roundL by scenario.

Command: `node tools/uat/run.mjs -- R-04-setup --phones 8 --out roundM-p8`
Commit: `af7d49266e19530c314b92190580a194188fe99b`
Viewports: 667×375, 844×390, 1920×1080, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1330.7 | completed |
| Open settings and mirror default values | 2374.9 | completed |
| Other installed schemas need no console-specific code | 1815.6 | completed |
| Expand categories in the same row with D-157 groups | 2452.2 | completed |
| RZ-011 refuses Hard for Singapore Life and keeps the chosen difficulty | 765.2 | completed |
| RZ-001/010 category changes may strand 50 questions and disable Start | 1149.2 | completed |
| TV value changes use base crossfades and reduced-motion swaps | 853.1 | completed |
| Start thirty questions with the chosen settings | 944.8 | completed |
| Retain settings across the completed match, picker and a leader reload | 450295.5 | completed |
| Team availability and team confirmation | 1942.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-setup-leader-default-667.jpg](01-phone1-setup-leader-default-667.jpg) | as named | integrator (scenario check) |
| ![02-phone1-setup-leader-default-844.jpg](02-phone1-setup-leader-default-844.jpg) | as named | integrator (scenario check) |
| ![03-phone2-setup-watcher-667.jpg](03-phone2-setup-watcher-667.jpg) | as named | integrator (scenario check) |
| ![04-phone2-setup-watcher-844.jpg](04-phone2-setup-watcher-844.jpg) | as named | integrator (scenario check) |
| ![05-host-setup-tv-default.jpg](05-host-setup-tv-default.jpg) | as named | integrator (scenario check) |
| ![06-host-setup-tv-default-720.jpg](06-host-setup-tv-default-720.jpg) | as named | integrator (scenario check) |
| ![07-phone1-peek-poker-rounds-leader-667.jpg](07-phone1-peek-poker-rounds-leader-667.jpg) | as named | integrator (scenario check) |
| ![08-host-peek-poker-rounds-tv.jpg](08-host-peek-poker-rounds-tv.jpg) | as named | integrator (scenario check) |
| ![09-phone1-tabao-no-settings-leader-844.jpg](09-phone1-tabao-no-settings-leader-844.jpg) | as named | integrator (scenario check) |
| ![10-phone1-categories-world-667.jpg](10-phone1-categories-world-667.jpg) | as named | integrator (scenario check) |
| ![11-phone1-categories-world-844.jpg](11-phone1-categories-world-844.jpg) | as named | integrator (scenario check) |
| ![12-phone1-categories-singapore-844.jpg](12-phone1-categories-singapore-844.jpg) | as named | integrator (scenario check) |
| ![13-phone1-categories-singapore-667.jpg](13-phone1-categories-singapore-667.jpg) | as named | integrator (scenario check) |
| ![14-phone1-categories-group-844.jpg](14-phone1-categories-group-844.jpg) | as named | integrator (scenario check) |
| ![15-host-setup-tv-categories.jpg](15-host-setup-tv-categories.jpg) | as named | integrator (scenario check) |
| ![16-host-setup-tv-categories-720.jpg](16-host-setup-tv-categories-720.jpg) | as named | integrator (scenario check) |
| ![17-phone1-long-categories-phone.jpg](17-phone1-long-categories-phone.jpg) | as named | integrator (scenario check) |
| ![18-host-long-categories-tv.jpg](18-host-long-categories-tv.jpg) | as named | integrator (scenario check) |
| ![19-phone1-difficulty-refused-leader-667.jpg](19-phone1-difficulty-refused-leader-667.jpg) | as named | integrator (scenario check) |
| ![20-host-difficulty-refused-tv.jpg](20-host-difficulty-refused-tv.jpg) | as named | integrator (scenario check) |
| ![21-host-difficulty-refused-tv-720.jpg](21-host-difficulty-refused-tv-720.jpg) | as named | integrator (scenario check) |
| ![22-phone1-start-blocked-leader-844.jpg](22-phone1-start-blocked-leader-844.jpg) | as named | integrator (scenario check) |
| ![23-host-start-blocked-tv.jpg](23-host-start-blocked-tv.jpg) | as named | integrator (scenario check) |
| ![24-phone1-length-50-unavailable-844.jpg](24-phone1-length-50-unavailable-844.jpg) | as named | integrator (scenario check) |
| ![39-host-match-started-tv.jpg](39-host-match-started-tv.jpg) | as named | integrator (scenario check) |
| ![40-phone1-settings-kept-leader-844.jpg](40-phone1-settings-kept-leader-844.jpg) | as named | integrator (scenario check) |
| ![41-phone1-leader-reload-setup-667.jpg](41-phone1-leader-reload-setup-667.jpg) | as named | integrator (scenario check) |
| ![42-phone1-teams-on-setup-leader-844.jpg](42-phone1-teams-on-setup-leader-844.jpg) | as named | integrator (scenario check) |
| ![43-host-teams-on-tv.jpg](43-host-teams-on-tv.jpg) | as named | integrator (scenario check) |
| ![44-phone1-team-confirmation-phone.jpg](44-phone1-team-confirmation-phone.jpg) | as named | integrator (scenario check) |
| ![45-host-team-confirmation-tv.jpg](45-host-team-confirmation-tv.jpg) | as named | integrator (scenario check) |
| ![46-host-team-match-tv.jpg](46-host-team-match-tv.jpg) | as named | integrator (scenario check) |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![31-strip-tv-value-change.jpg](31-strip-tv-value-change.jpg) | as named | integrator (scenario check) |
| ![38-strip-tv-value-change-reduced.jpg](38-strip-tv-value-change-reduced.jpg) | as named | integrator (scenario check) |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
