# C-09-game-picker UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-09-game-picker --phones 2 --max-mb 24`
Commit: `7cca71f0844340c068f50998b775578908619eb3`
Viewports: 1920×1080, 844×390, 1280×720, 3840×2160, 390×844, 320×568, 932×430

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1268.6 | completed |
| Join Cloud Noodle | 698.2 | completed |
| Join Pebble Puff | 1032.4 | completed |
| Real leader and watcher follow focus, expand, collapse and start | 3109.5 | completed |
| Host reload during picker restores lobby; leader departure transfers controls | 5262.7 | completed |
| Demo 720p players=0 | 943.1 | completed |
| Demo 720p players=8&state=start | 940.7 | completed |
| Demo 1080p players=0 | 956.4 | completed |
| Demo 1080p players=8&state=start | 973.1 | completed |
| Demo 4K players=8 | 1574.6 | completed |
| Demo 4K players=8&state=start | 1617.3 | completed |
| Same-node focus slow10 strip | 4763.0 | completed |
| Same-node expand slow10 strip | 4754.3 | completed |
| Same-node collapse slow10 strip | 4765.9 | completed |
| Reduced motion retains final state without tile animation | 763.0 | completed |

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
| ![37-host-load-failure.png](37-host-load-failure.png) | | |
| ![43-host-demo-focus-settled.jpg](43-host-demo-focus-settled.jpg) | | |
| ![49-host-demo-expand-settled.jpg](49-host-demo-expand-settled.jpg) | | |
| ![55-host-demo-collapse-settled.jpg](55-host-demo-collapse-settled.jpg) | | |
| ![56-host-demo-reduced-focus.jpg](56-host-demo-reduced-focus.jpg) | | |
| ![57-host-demo-reduced-expand.jpg](57-host-demo-reduced-expand.jpg) | | |
| ![58-host-demo-reduced-collapse.jpg](58-host-demo-reduced-collapse.jpg) | | |
| ![59-phone1-demo-reduced-start.jpg](59-phone1-demo-reduced-start.jpg) | | |
| ![60-phone2-demo-reduced-start.jpg](60-phone2-demo-reduced-start.jpg) | | |

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
| ![42-strip-demo-focus-slow10.jpg](42-strip-demo-focus-slow10.jpg) | | |
| ![48-strip-demo-expand-slow10.jpg](48-strip-demo-expand-slow10.jpg) | | |
| ![54-strip-demo-collapse-slow10.jpg](54-strip-demo-collapse-slow10.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
