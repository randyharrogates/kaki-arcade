# C-09-game-picker UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-09-game-picker --phones 2 --max-mb 24`
Commit: `8ed7b849b8e3557b7dd3f3f4dd7c170f26f0caf1`
Viewports: 1920×1080, 844×390, 1280×720, 3840×2160, 390×844, 320×568, 932×430

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1329.5 | completed |
| Join Cloud Noodle | 603.9 | completed |
| Join Pebble Puff | 988.5 | completed |
| Real leader and watcher follow focus, expand, collapse and start | 2877.7 | completed |
| Host reload during picker restores lobby; leader departure transfers controls | 5174.1 | completed |
| Demo 720p players=0 | 955.4 | completed |
| Demo 720p players=8&state=start | 976.5 | completed |
| Demo 1080p players=0 | 1032.6 | completed |
| Demo 1080p players=8&state=start | 1001.7 | completed |
| Demo 4K players=8 | 1739.8 | completed |
| Demo 4K players=8&state=start | 1763.7 | completed |
| Same-node focus slow10 strip | 4823.4 | completed |
| Same-node expand slow10 strip | 4792.6 | completed |
| Same-node collapse slow10 strip | 4794.5 | completed |
| Reduced motion retains final state without tile animation | 1249.2 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-real-picker.jpg](01-host-real-picker.jpg) | | |
| ![02-phone1-real-picker.jpg](02-phone1-real-picker.jpg) | | |
| ![03-phone2-real-picker.jpg](03-phone2-real-picker.jpg) | | |
| ![04-host-real-focus.jpg](04-host-real-focus.jpg) | | |
| ![05-phone1-real-focus.jpg](05-phone1-real-focus.jpg) | | |
| ![06-phone2-real-focus.jpg](06-phone2-real-focus.jpg) | | |
| ![07-host-real-selected.jpg](07-host-real-selected.jpg) | | |
| ![08-phone1-real-selected.jpg](08-phone1-real-selected.jpg) | | |
| ![09-phone2-real-selected.jpg](09-phone2-real-selected.jpg) | | |
| ![10-host-real-reload-lobby.jpg](10-host-real-reload-lobby.jpg) | | |
| ![11-phone1-real-reload-lobby.jpg](11-phone1-real-reload-lobby.jpg) | | |
| ![12-phone2-real-reload-lobby.jpg](12-phone2-real-reload-lobby.jpg) | | |
| ![13-host-real-leader-left.jpg](13-host-real-leader-left.jpg) | | |
| ![14-phone1-real-leader-left.jpg](14-phone1-real-leader-left.jpg) | | |
| ![15-phone2-real-leader-left.jpg](15-phone2-real-leader-left.jpg) | | |
| ![16-host-real-empty-lobby-code.jpg](16-host-real-empty-lobby-code.jpg) | | |
| ![23-phone1-demo-390x844-picker.jpg](23-phone1-demo-390x844-picker.jpg) | | |
| ![24-phone1-demo-390x844-state-start.jpg](24-phone1-demo-390x844-state-start.jpg) | | |
| ![25-phone1-demo-390x844-state-starting.jpg](25-phone1-demo-390x844-state-starting.jpg) | | |
| ![26-phone1-demo-390x844-players-0.jpg](26-phone1-demo-390x844-players-0.jpg) | | |
| ![27-phone1-demo-390x844-state-start-players-0.jpg](27-phone1-demo-390x844-state-start-players-0.jpg) | | |
| ![28-phone1-demo-390x844-state-start-failure-1.jpg](28-phone1-demo-390x844-state-start-failure-1.jpg) | | |
| ![29-phone2-demo-390x844-picker.jpg](29-phone2-demo-390x844-picker.jpg) | | |
| ![30-phone2-demo-390x844-state-start.jpg](30-phone2-demo-390x844-state-start.jpg) | | |
| ![31-phone2-demo-390x844-state-starting.jpg](31-phone2-demo-390x844-state-starting.jpg) | | |
| ![32-phone2-demo-390x844-players-0.jpg](32-phone2-demo-390x844-players-0.jpg) | | |
| ![33-phone2-demo-390x844-state-start-players-0.jpg](33-phone2-demo-390x844-state-start-players-0.jpg) | | |
| ![34-phone2-demo-390x844-state-start-failure-1.jpg](34-phone2-demo-390x844-state-start-failure-1.jpg) | | |
| ![35-phone1-phone-lobby-leave-320x568-wide.jpg](35-phone1-phone-lobby-leave-320x568-wide.jpg) | | |
| ![36-phone1-phone-rename-leave-320x568-wide.jpg](36-phone1-phone-rename-leave-320x568-wide.jpg) | | |
| ![37-host-load-failure.jpg](37-host-load-failure.jpg) | | |
| ![48-host-demo-focus-settled.jpg](48-host-demo-focus-settled.jpg) | | |
| ![59-host-demo-expand-settled.jpg](59-host-demo-expand-settled.jpg) | | |
| ![70-host-demo-collapse-settled.jpg](70-host-demo-collapse-settled.jpg) | | |
| ![71-host-demo-reduced-focus.jpg](71-host-demo-reduced-focus.jpg) | | |
| ![72-host-demo-reduced-expand.jpg](72-host-demo-reduced-expand.jpg) | | |
| ![73-host-demo-reduced-collapse.jpg](73-host-demo-reduced-collapse.jpg) | | |
| ![74-phone1-demo-reduced-start.jpg](74-phone1-demo-reduced-start.jpg) | | |
| ![75-phone2-demo-reduced-start.jpg](75-phone2-demo-reduced-start.jpg) | | |

## Demo 720p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![17-host-demo-720p-players-0.jpg](17-host-demo-720p-players-0.jpg) | | |
| ![18-host-demo-720p-players-8-state-start.jpg](18-host-demo-720p-players-8-state-start.jpg) | | |

## Demo 1080p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![19-host-demo-1080p-players-0.jpg](19-host-demo-1080p-players-0.jpg) | | |
| ![20-host-demo-1080p-players-8-state-start.jpg](20-host-demo-1080p-players-8-state-start.jpg) | | |

## Demo 4K

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![21-host-demo-4K-players-8.png](21-host-demo-4K-players-8.png) | | |
| ![22-host-demo-4K-players-8-state-start.png](22-host-demo-4K-players-8-state-start.png) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![47-strip-demo-focus-slow10.jpg](47-strip-demo-focus-slow10.jpg) | | |
| ![58-strip-demo-expand-slow10.jpg](58-strip-demo-expand-slow10.jpg) | | |
| ![69-strip-demo-collapse-slow10.jpg](69-strip-demo-collapse-slow10.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
