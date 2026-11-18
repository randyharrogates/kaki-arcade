# C-15-console-e2e UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-15-console-e2e --phones 8 --max-mb 64 --out round2-p8`
Commit: `59737bd4cb78a6fd4f0c4f65ddc2adb7d6c48d7e`
Viewports: 1920×1080, 844×390, 667×375, 932×430

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1296.2 | completed |
| Join Phone 1 | 274.7 | completed |
| Join Phone 2 | 222.0 | completed |
| Join Phone 3 | 219.7 | completed |
| Join Phone 4 | 219.8 | completed |
| Join Phone 5 | 236.0 | completed |
| Join Phone 6 | 228.6 | completed |
| Join Phone 7 | 221.2 | completed |
| Join Phone 8 | 218.3 | completed |
| Eight seated browsers | 1535.9 | completed |
| Completed scores checkpoint before interrupted round | 1991.7 | completed |
| Leader picks and starts the module | 1583.2 | completed |
| All eight phones send play inputs | 719.9 | completed |
| Keyboard pause and phone resume | 2946.7 | completed |
| Phone pause and keyboard resume | 1600.7 | completed |
| Phone eight reload retains seat, private state and controller | 739.9 | completed |
| Host reload loses round and restores room and all seats automatically | 6051.2 | completed |
| Fresh round then quit retains players | 1497.5 | completed |
| D-099 room gone keeps linked play and offers new room after quit | 5083.6 | completed |
| Phone 1 | 121.5 | joined |
| Phone 2 | 107.1 | joined |
| Phone 3 | 109.0 | joined |
| Phone 4 | 110.1 | joined |
| Phone 5 | 119.2 | joined |
| Phone 6 | 108.2 | joined |
| Phone 7 | 111.1 | joined |
| Phone 8 | 108.1 | joined |

Expected errors (count):
- 2 × host: net::ERR_CONNECTION_REFUSED
- 2 × host: Failed to load resource: net::ERR_CONNECTION_REFUSED
- 1 × host: WebSocket connection to 'ws://127.0.0.1:5231/rooms/KHJS8WW5/host' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED
- 1 × host: WebSocket connection to 'ws://127.0.0.1:5231/rooms/KHJS8WW5/host' failed: Error during WebSocket handshake: Unexpected response code: 404
- 1 × host: Failed to load resource: the server responded with a status of 404 (Not Found)
- 1 × host: net::ERR_ABORTED

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-01-seated-tv.jpg](01-host-01-seated-tv.jpg) | | |
| ![02-phone1-01-seated-phone1.jpg](02-phone1-01-seated-phone1.jpg) | | |
| ![03-phone8-01-seated-phone8.jpg](03-phone8-01-seated-phone8.jpg) | | |
| ![04-host-01-completed-results-tv.jpg](04-host-01-completed-results-tv.jpg) | | |
| ![05-phone1-01-completed-results-phone1.jpg](05-phone1-01-completed-results-phone1.jpg) | | |
| ![06-phone8-01-completed-results-phone8.jpg](06-phone8-01-completed-results-phone8.jpg) | | |
| ![07-host-02-started-tv.jpg](07-host-02-started-tv.jpg) | | |
| ![08-phone1-02-started-phone1.jpg](08-phone1-02-started-phone1.jpg) | | |
| ![09-phone8-02-started-phone8.jpg](09-phone8-02-started-phone8.jpg) | | |
| ![10-phone1-menu-667-375.jpg](10-phone1-menu-667-375.jpg) | | |
| ![11-phone1-menu-844-390.jpg](11-phone1-menu-844-390.jpg) | | |
| ![12-phone1-menu-932-430.jpg](12-phone1-menu-932-430.jpg) | | |
| ![13-host-03-play-tv.jpg](13-host-03-play-tv.jpg) | | |
| ![14-phone1-03-play-phone1.jpg](14-phone1-03-play-phone1.jpg) | | |
| ![15-phone8-03-play-phone8.jpg](15-phone8-03-play-phone8.jpg) | | |
| ![23-host-04-keyboard-paused-tv.jpg](23-host-04-keyboard-paused-tv.jpg) | | |
| ![24-phone1-04-keyboard-paused-phone1.jpg](24-phone1-04-keyboard-paused-phone1.jpg) | | |
| ![25-phone8-04-keyboard-paused-phone8.jpg](25-phone8-04-keyboard-paused-phone8.jpg) | | |
| ![26-phone1-paused-leader-667-375.jpg](26-phone1-paused-leader-667-375.jpg) | | |
| ![27-phone8-paused-non-leader-667-375.jpg](27-phone8-paused-non-leader-667-375.jpg) | | |
| ![28-phone1-paused-leader-932-430.jpg](28-phone1-paused-leader-932-430.jpg) | | |
| ![29-phone8-paused-non-leader-932-430.jpg](29-phone8-paused-non-leader-932-430.jpg) | | |
| ![37-host-05-phone-resumed-tv.jpg](37-host-05-phone-resumed-tv.jpg) | | |
| ![38-phone1-05-phone-resumed-phone1.jpg](38-phone1-05-phone-resumed-phone1.jpg) | | |
| ![39-phone8-05-phone-resumed-phone8.jpg](39-phone8-05-phone-resumed-phone8.jpg) | | |
| ![40-host-06-phone-paused-tv.jpg](40-host-06-phone-paused-tv.jpg) | | |
| ![41-phone1-06-phone-paused-phone1.jpg](41-phone1-06-phone-paused-phone1.jpg) | | |
| ![42-phone8-06-phone-paused-phone8.jpg](42-phone8-06-phone-paused-phone8.jpg) | | |
| ![50-host-07-keyboard-resumed-tv.jpg](50-host-07-keyboard-resumed-tv.jpg) | | |
| ![51-phone1-07-keyboard-resumed-phone1.jpg](51-phone1-07-keyboard-resumed-phone1.jpg) | | |
| ![52-phone8-07-keyboard-resumed-phone8.jpg](52-phone8-07-keyboard-resumed-phone8.jpg) | | |
| ![53-host-08-phone-recovered-tv.jpg](53-host-08-phone-recovered-tv.jpg) | | |
| ![54-phone1-08-phone-recovered-phone1.jpg](54-phone1-08-phone-recovered-phone1.jpg) | | |
| ![55-phone8-08-phone-recovered-phone8.jpg](55-phone8-08-phone-recovered-phone8.jpg) | | |
| ![62-phone1-connection-lost-leader.jpg](62-phone1-connection-lost-leader.jpg) | | |
| ![63-phone8-connection-lost-non-leader.jpg](63-phone8-connection-lost-non-leader.jpg) | | |
| ![67-host-09-host-recovered-lobby-tv.jpg](67-host-09-host-recovered-lobby-tv.jpg) | | |
| ![68-phone1-09-host-recovered-lobby-phone1.jpg](68-phone1-09-host-recovered-lobby-phone1.jpg) | | |
| ![69-phone8-09-host-recovered-lobby-phone8.jpg](69-phone8-09-host-recovered-lobby-phone8.jpg) | | |
| ![79-host-09-second-host-recovered-lobby-tv.jpg](79-host-09-second-host-recovered-lobby-tv.jpg) | | |
| ![80-phone1-09-second-host-recovered-lobby-phone1.jpg](80-phone1-09-second-host-recovered-lobby-phone1.jpg) | | |
| ![81-phone8-09-second-host-recovered-lobby-phone8.jpg](81-phone8-09-second-host-recovered-lobby-phone8.jpg) | | |
| ![82-host-10-quit-picker-tv.jpg](82-host-10-quit-picker-tv.jpg) | | |
| ![83-phone1-10-quit-picker-phone1.jpg](83-phone1-10-quit-picker-phone1.jpg) | | |
| ![84-phone8-10-quit-picker-phone8.jpg](84-phone8-10-quit-picker-phone8.jpg) | | |
| ![85-host-11-quit-keeps-eight-tv.jpg](85-host-11-quit-keeps-eight-tv.jpg) | | |
| ![86-phone1-11-quit-keeps-eight-phone1.jpg](86-phone1-11-quit-keeps-eight-phone1.jpg) | | |
| ![87-phone8-11-quit-keeps-eight-phone8.jpg](87-phone8-11-quit-keeps-eight-phone8.jpg) | | |
| ![88-host-12-gone-keeps-play-tv.jpg](88-host-12-gone-keeps-play-tv.jpg) | | |
| ![89-phone1-12-gone-keeps-play-phone1.jpg](89-phone1-12-gone-keeps-play-phone1.jpg) | | |
| ![90-phone8-12-gone-keeps-play-phone8.jpg](90-phone8-12-gone-keeps-play-phone8.jpg) | | |
| ![91-phone1-closed-room-phone-1.jpg](91-phone1-closed-room-phone-1.jpg) | | |
| ![92-phone2-closed-room-phone-2.jpg](92-phone2-closed-room-phone-2.jpg) | | |
| ![93-phone3-closed-room-phone-3.jpg](93-phone3-closed-room-phone-3.jpg) | | |
| ![94-phone4-closed-room-phone-4.jpg](94-phone4-closed-room-phone-4.jpg) | | |
| ![95-phone5-closed-room-phone-5.jpg](95-phone5-closed-room-phone-5.jpg) | | |
| ![96-phone6-closed-room-phone-6.jpg](96-phone6-closed-room-phone-6.jpg) | | |
| ![97-phone7-closed-room-phone-7.jpg](97-phone7-closed-room-phone-7.jpg) | | |
| ![98-phone8-closed-room-phone-8.jpg](98-phone8-closed-room-phone-8.jpg) | | |
| ![99-host-13-gone-new-room-offer-tv.jpg](99-host-13-gone-new-room-offer-tv.jpg) | | |
| ![100-phone1-13-gone-new-room-offer-phone1.jpg](100-phone1-13-gone-new-room-offer-phone1.jpg) | | |
| ![101-phone8-13-gone-new-room-offer-phone8.jpg](101-phone8-13-gone-new-room-offer-phone8.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![22-strip-keyboard-pause.jpg](22-strip-keyboard-pause.jpg) | | |
| ![36-strip-phone-resume.jpg](36-strip-phone-resume.jpg) | | |
| ![49-strip-keyboard-resume.jpg](49-strip-keyboard-resume.jpg) | | |
| ![66-strip-host-reload-phone1.jpg](66-strip-host-reload-phone1.jpg) | | |
| ![78-strip-host-reload-tv.jpg](78-strip-host-reload-tv.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
