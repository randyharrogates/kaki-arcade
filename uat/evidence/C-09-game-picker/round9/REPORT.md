# C-09-game-picker UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-09-game-picker --phones 2 --max-mb 24`
Commit: `014a48b53996302082dfdb9fcf100b365aede345`
Viewports: 1920×1080, 844×390, 1280×720, 3840×2160, 390×844, 320×568, 932×430

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 980.7 | completed |
| Join Cloud Noodle | 1011.1 | completed |
| Join Pebble Puff | 953.5 | completed |
| Real leader and watcher follow focus, expand, collapse and start | 3722.7 | completed |
| Host reload during picker restores lobby; leader departure transfers controls | 4989.8 | completed |
| Demo 720p players=0 | 917.3 | completed |
| Demo 720p players=8&state=start | 917.3 | completed |
| Demo 1080p players=0 | 922.2 | completed |
| Demo 1080p players=8&state=start | 924.6 | completed |
| Demo 1080p players=1&state=start | 943.6 | completed |
| Demo 4K players=0 | 1222.3 | completed |
| Demo 4K players=8&state=start | 1244.1 | completed |
| Stable stage band 720p with wide names | 1672.5 | completed |
| Stable stage band 1080p with wide names | 1663.3 | completed |
| Same-node focus slow10 strip | 4918.6 | completed |
| Same-node expand slow10 strip | 4902.8 | completed |
| Same-node collapse slow10 strip | 4747.5 | completed |
| Interrupted focus at 60 ms preserves every rectangle | 1317.3 | completed |
| Interrupted focus at 144 ms preserves every rectangle | 1405.0 | completed |
| Reduced motion retains final state without tile animation | 1010.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-real-picker.jpg](01-host-real-picker.jpg) | host real picker | |
| ![02-phone1-real-picker.jpg](02-phone1-real-picker.jpg) | phone1 real picker | |
| ![03-phone2-real-picker.jpg](03-phone2-real-picker.jpg) | phone2 real picker | |
| ![04-host-real-focus-150ms.jpg](04-host-real-focus-150ms.jpg) | host real focus 150ms | |
| ![05-host-real-focus.jpg](05-host-real-focus.jpg) | host real focus | |
| ![06-phone1-real-focus.jpg](06-phone1-real-focus.jpg) | phone1 real focus | |
| ![07-phone2-real-focus.jpg](07-phone2-real-focus.jpg) | phone2 real focus | |
| ![08-host-real-selected.jpg](08-host-real-selected.jpg) | host real selected | |
| ![09-phone1-real-selected.jpg](09-phone1-real-selected.jpg) | phone1 real selected | |
| ![10-phone2-real-selected.jpg](10-phone2-real-selected.jpg) | phone2 real selected | |
| ![11-host-real-reload-lobby.jpg](11-host-real-reload-lobby.jpg) | host real reload lobby | |
| ![12-phone1-real-reload-lobby.jpg](12-phone1-real-reload-lobby.jpg) | phone1 real reload lobby | |
| ![13-phone2-real-reload-lobby.jpg](13-phone2-real-reload-lobby.jpg) | phone2 real reload lobby | |
| ![14-host-real-leader-left.jpg](14-host-real-leader-left.jpg) | host real leader left | |
| ![15-phone1-real-leader-left.jpg](15-phone1-real-leader-left.jpg) | phone1 real leader left | |
| ![16-phone2-real-leader-left.jpg](16-phone2-real-leader-left.jpg) | phone2 real leader left | |
| ![17-host-real-empty-lobby-code.jpg](17-host-real-empty-lobby-code.jpg) | host real empty lobby code | |
| ![25-phone1-demo-390x844-picker.jpg](25-phone1-demo-390x844-picker.jpg) | phone1 demo 390x844 picker | |
| ![26-phone1-demo-390x844-state-start.jpg](26-phone1-demo-390x844-state-start.jpg) | phone1 demo 390x844 state start | |
| ![27-phone1-demo-390x844-state-starting.jpg](27-phone1-demo-390x844-state-starting.jpg) | phone1 demo 390x844 state starting | |
| ![28-phone1-demo-390x844-players-0.jpg](28-phone1-demo-390x844-players-0.jpg) | phone1 demo 390x844 players 0 | |
| ![29-phone1-demo-390x844-state-start-players-0.jpg](29-phone1-demo-390x844-state-start-players-0.jpg) | phone1 demo 390x844 state start players 0 | |
| ![30-phone1-demo-390x844-state-start-failure-1.jpg](30-phone1-demo-390x844-state-start-failure-1.jpg) | phone1 demo 390x844 state start failure 1 | |
| ![31-phone2-demo-390x844-picker.jpg](31-phone2-demo-390x844-picker.jpg) | phone2 demo 390x844 picker | |
| ![32-phone2-demo-390x844-state-start.jpg](32-phone2-demo-390x844-state-start.jpg) | phone2 demo 390x844 state start | |
| ![33-phone2-demo-390x844-state-starting.jpg](33-phone2-demo-390x844-state-starting.jpg) | phone2 demo 390x844 state starting | |
| ![34-phone2-demo-390x844-players-0.jpg](34-phone2-demo-390x844-players-0.jpg) | phone2 demo 390x844 players 0 | |
| ![35-phone2-demo-390x844-state-start-players-0.jpg](35-phone2-demo-390x844-state-start-players-0.jpg) | phone2 demo 390x844 state start players 0 | |
| ![36-phone2-demo-390x844-state-start-failure-1.jpg](36-phone2-demo-390x844-state-start-failure-1.jpg) | phone2 demo 390x844 state start failure 1 | |
| ![37-phone1-phone-lobby-leave-320x568-wide.jpg](37-phone1-phone-lobby-leave-320x568-wide.jpg) | phone1 phone lobby leave 320x568 wide | |
| ![38-phone1-phone-rename-leave-320x568-wide.jpg](38-phone1-phone-rename-leave-320x568-wide.jpg) | phone1 phone rename leave 320x568 wide | |
| ![39-host-load-failure.jpg](39-host-load-failure.jpg) | host load failure | |
| ![50-host-demo-focus-settled.jpg](50-host-demo-focus-settled.jpg) | host demo focus settled | |
| ![61-host-demo-expand-settled.jpg](61-host-demo-expand-settled.jpg) | host demo expand settled | |
| ![72-host-demo-collapse-settled.jpg](72-host-demo-collapse-settled.jpg) | host demo collapse settled | |
| ![73-host-demo-reduced-focus.jpg](73-host-demo-reduced-focus.jpg) | host demo reduced focus | |
| ![74-host-demo-reduced-expand.jpg](74-host-demo-reduced-expand.jpg) | host demo reduced expand | |
| ![75-host-demo-reduced-collapse.jpg](75-host-demo-reduced-collapse.jpg) | host demo reduced collapse | |
| ![76-phone1-demo-reduced-start.jpg](76-phone1-demo-reduced-start.jpg) | phone1 demo reduced start | |
| ![77-phone2-demo-reduced-start.jpg](77-phone2-demo-reduced-start.jpg) | phone2 demo reduced start | |

## Demo 720p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![18-host-demo-720p-players-0.jpg](18-host-demo-720p-players-0.jpg) | host demo 720p players 0 | |
| ![19-host-demo-720p-players-8-state-start.jpg](19-host-demo-720p-players-8-state-start.jpg) | host demo 720p players 8 state start | |

## Demo 1080p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![20-host-demo-1080p-players-0.jpg](20-host-demo-1080p-players-0.jpg) | host demo 1080p players 0 | |
| ![21-host-demo-1080p-players-8-state-start.jpg](21-host-demo-1080p-players-8-state-start.jpg) | host demo 1080p players 8 state start | |
| ![22-host-demo-1080p-players-1-state-start.jpg](22-host-demo-1080p-players-1-state-start.jpg) | host demo 1080p players 1 state start | |

## Demo 4K

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![23-host-demo-4K-players-0.png](23-host-demo-4K-players-0.png) | host demo 4K players 0 | |
| ![24-host-demo-4K-players-8-state-start.png](24-host-demo-4K-players-8-state-start.png) | host demo 4K players 8 state start | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![49-strip-demo-focus-slow10.jpg](49-strip-demo-focus-slow10.jpg) | strip demo focus slow10 | |
| ![60-strip-demo-expand-slow10.jpg](60-strip-demo-expand-slow10.jpg) | strip demo expand slow10 | |
| ![71-strip-demo-collapse-slow10.jpg](71-strip-demo-collapse-slow10.jpg) | strip demo collapse slow10 | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
