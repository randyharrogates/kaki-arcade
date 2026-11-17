# C-09-game-picker UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-09-game-picker --phones 2 --max-mb 24`
Commit: `d1d586c7378d58e192e4f22fc005b965eaa8fbbe`
Viewports: 1920×1080, 844×390, 1280×720, 3840×2160, 390×844, 320×568, 932×430

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1148.2 | completed |
| Join Cloud Noodle | 971.3 | completed |
| Join Pebble Puff | 959.8 | completed |
| Real leader and watcher follow focus, expand, collapse and start | 3940.5 | completed |
| Host reload during picker restores lobby; leader departure transfers controls | 5016.9 | completed |
| Demo 720p players=0 | 927.6 | completed |
| Demo 720p players=8&state=start | 938.2 | completed |
| Demo 1080p players=0 | 981.9 | completed |
| Demo 1080p players=8&state=start | 930.8 | completed |
| Demo 4K players=0 | 1424.5 | completed |
| Demo 4K players=8&state=start | 1284.7 | completed |
| Same-node focus slow10 strip | 4915.4 | completed |
| Same-node expand slow10 strip | 4916.9 | completed |
| Same-node collapse slow10 strip | 4752.0 | completed |
| 1 focus move(s) preserve the first frame and settle to the grid | 1244.8 | completed |
| 2 focus move(s) preserve the first frame and settle to the grid | 1243.2 | completed |
| Two Next presses 60 ms apart keep every tile continuous | 1841.5 | completed |
| Reduced motion retains final state without tile animation | 825.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-real-picker.jpg](01-host-real-picker.jpg) | | |
| ![02-phone1-real-picker.jpg](02-phone1-real-picker.jpg) | | |
| ![03-phone2-real-picker.jpg](03-phone2-real-picker.jpg) | | |
| ![04-host-real-focus-150ms.jpg](04-host-real-focus-150ms.jpg) | | |
| ![05-host-real-focus.jpg](05-host-real-focus.jpg) | | |
| ![06-phone1-real-focus.jpg](06-phone1-real-focus.jpg) | | |
| ![07-phone2-real-focus.jpg](07-phone2-real-focus.jpg) | | |
| ![08-host-real-selected.jpg](08-host-real-selected.jpg) | | |
| ![09-phone1-real-selected.jpg](09-phone1-real-selected.jpg) | | |
| ![10-phone2-real-selected.jpg](10-phone2-real-selected.jpg) | | |
| ![11-host-real-reload-lobby.jpg](11-host-real-reload-lobby.jpg) | | |
| ![12-phone1-real-reload-lobby.jpg](12-phone1-real-reload-lobby.jpg) | | |
| ![13-phone2-real-reload-lobby.jpg](13-phone2-real-reload-lobby.jpg) | | |
| ![14-host-real-leader-left.jpg](14-host-real-leader-left.jpg) | | |
| ![15-phone1-real-leader-left.jpg](15-phone1-real-leader-left.jpg) | | |
| ![16-phone2-real-leader-left.jpg](16-phone2-real-leader-left.jpg) | | |
| ![17-host-real-empty-lobby-code.jpg](17-host-real-empty-lobby-code.jpg) | | |
| ![24-phone1-demo-390x844-picker.jpg](24-phone1-demo-390x844-picker.jpg) | | |
| ![25-phone1-demo-390x844-state-start.jpg](25-phone1-demo-390x844-state-start.jpg) | | |
| ![26-phone1-demo-390x844-state-starting.jpg](26-phone1-demo-390x844-state-starting.jpg) | | |
| ![27-phone1-demo-390x844-players-0.jpg](27-phone1-demo-390x844-players-0.jpg) | | |
| ![28-phone1-demo-390x844-state-start-players-0.jpg](28-phone1-demo-390x844-state-start-players-0.jpg) | | |
| ![29-phone1-demo-390x844-state-start-failure-1.jpg](29-phone1-demo-390x844-state-start-failure-1.jpg) | | |
| ![30-phone2-demo-390x844-picker.jpg](30-phone2-demo-390x844-picker.jpg) | | |
| ![31-phone2-demo-390x844-state-start.jpg](31-phone2-demo-390x844-state-start.jpg) | | |
| ![32-phone2-demo-390x844-state-starting.jpg](32-phone2-demo-390x844-state-starting.jpg) | | |
| ![33-phone2-demo-390x844-players-0.jpg](33-phone2-demo-390x844-players-0.jpg) | | |
| ![34-phone2-demo-390x844-state-start-players-0.jpg](34-phone2-demo-390x844-state-start-players-0.jpg) | | |
| ![35-phone2-demo-390x844-state-start-failure-1.jpg](35-phone2-demo-390x844-state-start-failure-1.jpg) | | |
| ![36-phone1-phone-lobby-leave-320x568-wide.jpg](36-phone1-phone-lobby-leave-320x568-wide.jpg) | | |
| ![37-phone1-phone-rename-leave-320x568-wide.jpg](37-phone1-phone-rename-leave-320x568-wide.jpg) | | |
| ![38-host-load-failure.jpg](38-host-load-failure.jpg) | | |
| ![49-host-demo-focus-settled.jpg](49-host-demo-focus-settled.jpg) | | |
| ![60-host-demo-expand-settled.jpg](60-host-demo-expand-settled.jpg) | | |
| ![71-host-demo-collapse-settled.jpg](71-host-demo-collapse-settled.jpg) | | |
| ![72-host-demo-reduced-focus.jpg](72-host-demo-reduced-focus.jpg) | | |
| ![73-host-demo-reduced-expand.jpg](73-host-demo-reduced-expand.jpg) | | |
| ![74-host-demo-reduced-collapse.jpg](74-host-demo-reduced-collapse.jpg) | | |
| ![75-phone1-demo-reduced-start.jpg](75-phone1-demo-reduced-start.jpg) | | |
| ![76-phone2-demo-reduced-start.jpg](76-phone2-demo-reduced-start.jpg) | | |

## Demo 720p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![18-host-demo-720p-players-0.jpg](18-host-demo-720p-players-0.jpg) | | |
| ![19-host-demo-720p-players-8-state-start.jpg](19-host-demo-720p-players-8-state-start.jpg) | | |

## Demo 1080p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![20-host-demo-1080p-players-0.jpg](20-host-demo-1080p-players-0.jpg) | | |
| ![21-host-demo-1080p-players-8-state-start.jpg](21-host-demo-1080p-players-8-state-start.jpg) | | |

## Demo 4K

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![22-host-demo-4K-players-0.png](22-host-demo-4K-players-0.png) | | |
| ![23-host-demo-4K-players-8-state-start.png](23-host-demo-4K-players-8-state-start.png) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![48-strip-demo-focus-slow10.jpg](48-strip-demo-focus-slow10.jpg) | | |
| ![59-strip-demo-expand-slow10.jpg](59-strip-demo-expand-slow10.jpg) | | |
| ![70-strip-demo-collapse-slow10.jpg](70-strip-demo-collapse-slow10.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
