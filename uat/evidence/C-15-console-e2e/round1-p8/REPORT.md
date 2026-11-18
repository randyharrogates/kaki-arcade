# C-15-console-e2e UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-15-console-e2e --phones 8 --max-mb 64 --out round1-p8`
Commit: `746b4ba5db2f3010ef324e3cb3900ef8030c4754`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1322.4 | completed |
| Join Phone 1 | 285.3 | completed |
| Join Phone 2 | 229.6 | completed |
| Join Phone 3 | 229.2 | completed |
| Join Phone 4 | 222.4 | completed |
| Join Phone 5 | 228.2 | completed |
| Join Phone 6 | 240.1 | completed |
| Join Phone 7 | 241.4 | completed |
| Join Phone 8 | 293.1 | completed |
| Eight seated browsers | 1554.2 | completed |
| Completed scores checkpoint before interrupted round | 1662.8 | completed |
| Leader picks and starts the module | 1176.9 | completed |
| All eight phones send play inputs | 668.0 | completed |
| Keyboard pause and phone resume | 2278.8 | completed |
| Phone pause and keyboard resume | 1501.8 | completed |
| Phone eight reload retains seat, private state and controller | 715.1 | completed |
| Host reload loses round and restores room and all seats automatically | 5776.6 | completed |
| Fresh round then quit retains players | 1344.4 | completed |
| D-099 room gone keeps linked play and offers new room after quit | 4048.3 | completed |
| Phone 1 | 118.1 | joined |
| Phone 2 | 109.7 | joined |
| Phone 3 | 112.4 | joined |
| Phone 4 | 108.3 | joined |
| Phone 5 | 112.6 | joined |
| Phone 6 | 117.9 | joined |
| Phone 7 | 117.3 | joined |
| Phone 8 | 117.5 | joined |

Expected errors (count):
- 2 × host: net::ERR_CONNECTION_REFUSED
- 2 × host: Failed to load resource: net::ERR_CONNECTION_REFUSED
- 1 × host: WebSocket connection to 'ws://127.0.0.1:5231/rooms/2VQXQY6X/host' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED
- 1 × host: WebSocket connection to 'ws://127.0.0.1:5231/rooms/2VQXQY6X/host' failed: Error during WebSocket handshake: Unexpected response code: 404
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
| ![10-host-03-play-tv.jpg](10-host-03-play-tv.jpg) | | |
| ![11-phone1-03-play-phone1.jpg](11-phone1-03-play-phone1.jpg) | | |
| ![12-phone8-03-play-phone8.jpg](12-phone8-03-play-phone8.jpg) | | |
| ![20-host-04-keyboard-paused-tv.jpg](20-host-04-keyboard-paused-tv.jpg) | | |
| ![21-phone1-04-keyboard-paused-phone1.jpg](21-phone1-04-keyboard-paused-phone1.jpg) | | |
| ![22-phone8-04-keyboard-paused-phone8.jpg](22-phone8-04-keyboard-paused-phone8.jpg) | | |
| ![30-host-05-phone-resumed-tv.jpg](30-host-05-phone-resumed-tv.jpg) | | |
| ![31-phone1-05-phone-resumed-phone1.jpg](31-phone1-05-phone-resumed-phone1.jpg) | | |
| ![32-phone8-05-phone-resumed-phone8.jpg](32-phone8-05-phone-resumed-phone8.jpg) | | |
| ![33-host-06-phone-paused-tv.jpg](33-host-06-phone-paused-tv.jpg) | | |
| ![34-phone1-06-phone-paused-phone1.jpg](34-phone1-06-phone-paused-phone1.jpg) | | |
| ![35-phone8-06-phone-paused-phone8.jpg](35-phone8-06-phone-paused-phone8.jpg) | | |
| ![43-host-07-keyboard-resumed-tv.jpg](43-host-07-keyboard-resumed-tv.jpg) | | |
| ![44-phone1-07-keyboard-resumed-phone1.jpg](44-phone1-07-keyboard-resumed-phone1.jpg) | | |
| ![45-phone8-07-keyboard-resumed-phone8.jpg](45-phone8-07-keyboard-resumed-phone8.jpg) | | |
| ![46-host-08-phone-recovered-tv.jpg](46-host-08-phone-recovered-tv.jpg) | | |
| ![47-phone1-08-phone-recovered-phone1.jpg](47-phone1-08-phone-recovered-phone1.jpg) | | |
| ![48-phone8-08-phone-recovered-phone8.jpg](48-phone8-08-phone-recovered-phone8.jpg) | | |
| ![58-host-09-host-recovered-lobby-tv.jpg](58-host-09-host-recovered-lobby-tv.jpg) | | |
| ![59-phone1-09-host-recovered-lobby-phone1.jpg](59-phone1-09-host-recovered-lobby-phone1.jpg) | | |
| ![60-phone8-09-host-recovered-lobby-phone8.jpg](60-phone8-09-host-recovered-lobby-phone8.jpg) | | |
| ![70-host-09-second-host-recovered-lobby-tv.jpg](70-host-09-second-host-recovered-lobby-tv.jpg) | | |
| ![71-phone1-09-second-host-recovered-lobby-phone1.jpg](71-phone1-09-second-host-recovered-lobby-phone1.jpg) | | |
| ![72-phone8-09-second-host-recovered-lobby-phone8.jpg](72-phone8-09-second-host-recovered-lobby-phone8.jpg) | | |
| ![73-host-10-quit-picker-tv.jpg](73-host-10-quit-picker-tv.jpg) | | |
| ![74-phone1-10-quit-picker-phone1.jpg](74-phone1-10-quit-picker-phone1.jpg) | | |
| ![75-phone8-10-quit-picker-phone8.jpg](75-phone8-10-quit-picker-phone8.jpg) | | |
| ![76-host-11-quit-keeps-eight-tv.jpg](76-host-11-quit-keeps-eight-tv.jpg) | | |
| ![77-phone1-11-quit-keeps-eight-phone1.jpg](77-phone1-11-quit-keeps-eight-phone1.jpg) | | |
| ![78-phone8-11-quit-keeps-eight-phone8.jpg](78-phone8-11-quit-keeps-eight-phone8.jpg) | | |
| ![79-host-12-gone-keeps-play-tv.jpg](79-host-12-gone-keeps-play-tv.jpg) | | |
| ![80-phone1-12-gone-keeps-play-phone1.jpg](80-phone1-12-gone-keeps-play-phone1.jpg) | | |
| ![81-phone8-12-gone-keeps-play-phone8.jpg](81-phone8-12-gone-keeps-play-phone8.jpg) | | |
| ![82-host-13-gone-new-room-offer-tv.jpg](82-host-13-gone-new-room-offer-tv.jpg) | | |
| ![83-phone1-13-gone-new-room-offer-phone1.jpg](83-phone1-13-gone-new-room-offer-phone1.jpg) | | |
| ![84-phone8-13-gone-new-room-offer-phone8.jpg](84-phone8-13-gone-new-room-offer-phone8.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![19-strip-keyboard-pause.jpg](19-strip-keyboard-pause.jpg) | | |
| ![29-strip-phone-resume.jpg](29-strip-phone-resume.jpg) | | |
| ![42-strip-keyboard-resume.jpg](42-strip-keyboard-resume.jpg) | | |
| ![57-strip-host-reload-phone1.jpg](57-strip-host-reload-phone1.jpg) | | |
| ![69-strip-host-reload-tv.jpg](69-strip-host-reload-tv.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
