# C-09-game-picker UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-09-game-picker --max-mb 24`
Commit: `21dcbee063b4e5ed4c86923e3183ba28039db992`
Viewports: 1920×1080, 844×390, 1280×720, 3840×2160, 390×844

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1154.0 | completed |
| Join Cloud Noodle | 985.1 | completed |
| Join Pebble Puff | 947.9 | completed |
| Real leader and watcher follow focus, expand, collapse and start | 4252.5 | completed |
| Host reload during picker restores lobby; leader departure transfers controls | 4673.6 | completed |
| Demo 720p players=0 | 906.3 | completed |
| Demo 720p players=1 | 899.7 | completed |
| Demo 720p players=1&state=start | 923.7 | completed |
| Demo 720p players=8 | 924.8 | completed |
| Demo 720p players=8&state=start | 924.1 | completed |
| Demo 720p players=8&state=starting | 922.4 | completed |
| Demo 1080p players=0 | 928.9 | completed |
| Demo 1080p players=1 | 928.0 | completed |
| Demo 1080p players=1&state=start | 928.0 | completed |
| Demo 1080p players=8 | 909.2 | completed |
| Demo 1080p players=8&state=start | 910.5 | completed |
| Demo 1080p players=8&state=starting | 911.2 | completed |
| Demo 4K players=8 | 1335.4 | completed |
| Demo 4K players=8&state=start | 1297.2 | completed |
| Same-node focus slow10 strip | 6233.2 | completed |
| Same-node expand slow10 strip | 6206.4 | completed |
| Same-node collapse slow10 strip | 6256.7 | completed |
| Reduced motion retains final state without tile animation | 6870.0 | completed |

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
| ![10-host-real-back.jpg](10-host-real-back.jpg) | | |
| ![11-phone1-real-back.jpg](11-phone1-real-back.jpg) | | |
| ![12-phone2-real-back.jpg](12-phone2-real-back.jpg) | | |
| ![13-host-real-reselected.jpg](13-host-real-reselected.jpg) | | |
| ![14-phone1-real-reselected.jpg](14-phone1-real-reselected.jpg) | | |
| ![15-phone2-real-reselected.jpg](15-phone2-real-reselected.jpg) | | |
| ![16-host-real-starting.jpg](16-host-real-starting.jpg) | | |
| ![17-phone1-real-starting.jpg](17-phone1-real-starting.jpg) | | |
| ![18-phone2-real-starting.jpg](18-phone2-real-starting.jpg) | | |
| ![19-host-real-reload-lobby.jpg](19-host-real-reload-lobby.jpg) | | |
| ![20-phone1-real-reload-lobby.jpg](20-phone1-real-reload-lobby.jpg) | | |
| ![21-phone2-real-reload-lobby.jpg](21-phone2-real-reload-lobby.jpg) | | |
| ![22-host-real-leader-left.jpg](22-host-real-leader-left.jpg) | | |
| ![23-phone1-real-leader-left.jpg](23-phone1-real-leader-left.jpg) | | |
| ![24-phone2-real-leader-left.jpg](24-phone2-real-leader-left.jpg) | | |
| ![25-host-real-empty-unavailable.jpg](25-host-real-empty-unavailable.jpg) | | |
| ![26-phone1-real-empty-unavailable.jpg](26-phone1-real-empty-unavailable.jpg) | | |
| ![27-phone2-real-empty-unavailable.jpg](27-phone2-real-empty-unavailable.jpg) | | |
| ![42-phone1-demo-portrait-picker.jpg](42-phone1-demo-portrait-picker.jpg) | | |
| ![43-phone1-demo-portrait-state-start.jpg](43-phone1-demo-portrait-state-start.jpg) | | |
| ![44-phone1-demo-portrait-state-starting.jpg](44-phone1-demo-portrait-state-starting.jpg) | | |
| ![45-phone1-demo-portrait-players-0.jpg](45-phone1-demo-portrait-players-0.jpg) | | |
| ![46-phone2-demo-portrait-picker.jpg](46-phone2-demo-portrait-picker.jpg) | | |
| ![47-phone2-demo-portrait-state-start.jpg](47-phone2-demo-portrait-state-start.jpg) | | |
| ![48-phone2-demo-portrait-state-starting.jpg](48-phone2-demo-portrait-state-starting.jpg) | | |
| ![49-phone2-demo-portrait-players-0.jpg](49-phone2-demo-portrait-players-0.jpg) | | |
| ![50-phone1-demo-landscape-picker.jpg](50-phone1-demo-landscape-picker.jpg) | | |
| ![51-phone1-demo-landscape-state-start.jpg](51-phone1-demo-landscape-state-start.jpg) | | |
| ![52-phone1-demo-landscape-state-starting.jpg](52-phone1-demo-landscape-state-starting.jpg) | | |
| ![53-phone1-demo-landscape-players-0.jpg](53-phone1-demo-landscape-players-0.jpg) | | |
| ![54-phone2-demo-landscape-picker.jpg](54-phone2-demo-landscape-picker.jpg) | | |
| ![55-phone2-demo-landscape-state-start.jpg](55-phone2-demo-landscape-state-start.jpg) | | |
| ![56-phone2-demo-landscape-state-starting.jpg](56-phone2-demo-landscape-state-starting.jpg) | | |
| ![57-phone2-demo-landscape-players-0.jpg](57-phone2-demo-landscape-players-0.jpg) | | |
| ![68-host-demo-focus-settled.jpg](68-host-demo-focus-settled.jpg) | | |
| ![79-host-demo-expand-settled.jpg](79-host-demo-expand-settled.jpg) | | |
| ![90-host-demo-collapse-settled.jpg](90-host-demo-collapse-settled.jpg) | | |
| ![91-host-demo-reduced-focus.jpg](91-host-demo-reduced-focus.jpg) | | |
| ![92-host-demo-reduced-expand.jpg](92-host-demo-reduced-expand.jpg) | | |
| ![93-host-demo-reduced-collapse.jpg](93-host-demo-reduced-collapse.jpg) | | |
| ![94-phone1-demo-reduced-start.jpg](94-phone1-demo-reduced-start.jpg) | | |
| ![95-phone2-demo-reduced-start.jpg](95-phone2-demo-reduced-start.jpg) | | |

## Demo 720p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![28-host-demo-720p-players-0.jpg](28-host-demo-720p-players-0.jpg) | | |
| ![29-host-demo-720p-players-1.jpg](29-host-demo-720p-players-1.jpg) | | |
| ![30-host-demo-720p-players-1-state-start.jpg](30-host-demo-720p-players-1-state-start.jpg) | | |
| ![31-host-demo-720p-players-8.jpg](31-host-demo-720p-players-8.jpg) | | |
| ![32-host-demo-720p-players-8-state-start.jpg](32-host-demo-720p-players-8-state-start.jpg) | | |
| ![33-host-demo-720p-players-8-state-starting.jpg](33-host-demo-720p-players-8-state-starting.jpg) | | |

## Demo 1080p

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![34-host-demo-1080p-players-0.jpg](34-host-demo-1080p-players-0.jpg) | | |
| ![35-host-demo-1080p-players-1.jpg](35-host-demo-1080p-players-1.jpg) | | |
| ![36-host-demo-1080p-players-1-state-start.jpg](36-host-demo-1080p-players-1-state-start.jpg) | | |
| ![37-host-demo-1080p-players-8.jpg](37-host-demo-1080p-players-8.jpg) | | |
| ![38-host-demo-1080p-players-8-state-start.jpg](38-host-demo-1080p-players-8-state-start.jpg) | | |
| ![39-host-demo-1080p-players-8-state-starting.jpg](39-host-demo-1080p-players-8-state-starting.jpg) | | |

## Demo 4K

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![40-host-demo-4K-players-8.png](40-host-demo-4K-players-8.png) | | |
| ![41-host-demo-4K-players-8-state-start.png](41-host-demo-4K-players-8-state-start.png) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![67-strip-demo-focus-slow10.jpg](67-strip-demo-focus-slow10.jpg) | | |
| ![78-strip-demo-expand-slow10.jpg](78-strip-demo-expand-slow10.jpg) | | |
| ![89-strip-demo-collapse-slow10.jpg](89-strip-demo-collapse-slow10.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
