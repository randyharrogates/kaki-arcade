# C-15-console-e2e UAT evidence

Automated run completed; visual review by the integrator (Claude) on 2026-11-18, every still and strip listed below.

Command: `node tools/uat/run.mjs -- C-15-console-e2e --phones 8 --out round6-p8`
Commit: `c62e3a643fb6e28806f2b9897ec66048fd861f11`
Viewports: 1920×1080, 844×390, 667×375, 932×430

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1408.0 | completed |
| Join Phone 1 | 274.2 | completed |
| Join Phone 2 | 260.5 | completed |
| Join Phone 3 | 263.1 | completed |
| Join Phone 4 | 257.4 | completed |
| Join Phone 5 | 247.5 | completed |
| Join Phone 6 | 243.9 | completed |
| Join Phone 7 | 269.4 | completed |
| Join Phone 8 | 290.0 | completed |
| Eight seated browsers | 1524.9 | completed |
| Completed scores checkpoint before interrupted round | 2032.7 | completed |
| Leader picks and starts the module | 1585.0 | completed |
| All eight phones send play inputs | 721.5 | completed |
| Keyboard pause and phone resume | 2979.0 | completed |
| Phone pause and keyboard resume | 1653.9 | completed |
| Phone eight reload retains seat, private state and controller | 808.5 | completed |
| Host reload loses round and restores room and all seats automatically | 5972.2 | completed |
| Fresh round then quit retains players | 1468.3 | completed |
| D-099 room gone keeps linked play and offers new room after quit | 4865.9 | completed |
| Phone 1 | 110.6 | joined |
| Phone 2 | 118.1 | joined |
| Phone 3 | 113.9 | joined |
| Phone 4 | 113.1 | joined |
| Phone 5 | 113.2 | joined |
| Phone 6 | 110.9 | joined |
| Phone 7 | 117.9 | joined |
| Phone 8 | 126.6 | joined |

Expected errors (count):
- 2 × host: net::ERR_CONNECTION_REFUSED
- 2 × host: Failed to load resource: net::ERR_CONNECTION_REFUSED
- 1 × host: WebSocket connection to 'ws://127.0.0.1:5231/rooms/CKCTV774/host' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED
- 1 × host: WebSocket connection to 'ws://127.0.0.1:5231/rooms/CKCTV774/host' failed: Error during WebSocket handshake: Unexpected response code: 404
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


## Visual review (integrator, 2026-11-18): every image

| Images | What they show | Verdict |
|---|---|---|
| 01–03 | TV lobby with eight seats, Phone 1 Leader; phone 1 "You're in. You're the leader" with Pick a game; phone 8 waiting for the leader | Pass |
| 04–06 | Completed fixture round: TV final scores, all eight on 16 points ("8 players share first"); leader phone Play again / Back to game picker; phone 8 "Results · Watch the TV" | Pass |
| 07–09 | Fixture started: TV "Console test, Steps 32, Inputs 0"; phones 1 and 8 show their own secret text, Advance, inputs 0, Menu pill in the ID bar | Pass |
| 10–12 | Menu pill at 667×375, 844×390 and 932×430: ink pill top right, clear of Advance and the private text | Pass |
| 13–15 | All eight phones sent play inputs: TV Inputs 8, phones show 1 | Pass |
| 22 (strip) | Keyboard pause: the TV pause card (Resume focused, Effects 70, Music 55, Quit to picker) fades in over the game | Pass |
| 23–25 | Keyboard pause on TV; phones 1 and 8 show the Paused veil, filled red Resume, white ghost Quit to picker, Menu pill dimmed under the veil | Pass |
| 26–29 | Paused veil for leader and non-leader at 667×375 and 932×430. Non-leader buttons look the same as the leader's (deferred: C-15b) | Pass, with C-15b carried |
| 36 (strip) | Phone resume: TV pause card at 2 ms, game shown from 100 ms with steps advancing; exit shorter than entrance | Pass |
| 37–39 | Resumed: TV Steps 159, Inputs 8; phones back to play with Menu | Pass |
| 40–42 | Phone pause: same TV card and phone veils as 23–25 | Pass |
| 49 (strip) | Keyboard resume, as 36 | Pass |
| 50–52 | Keyboard resumed, play continues | Pass |
| 53–55 | Phone 8 reloaded mid-round: seat, secret text and controller kept; its input count 2 | Pass |
| 62–63 | Host gone: "Reconnecting… Your seat is kept for 2 minutes. Host disconnected" on leader and non-leader; Menu dimmed under the veil | Pass |
| 66 (strip) | Phone 1 through the host reload: play, then the veil fades in by about 1.3 s with no blank frame | Pass |
| 67–69, 79–81 | TV restored to the lobby after a host reload, all eight Connected, Phone 1 Leader; phones back in the lobby (79–81 are the second reload, identical by design) | Pass |
| 78 (strip) | TV reload first paint: about 0–750 ms an empty join panel and seats filling in before "Restoring your room" (backlog C-15d) | Pass, with C-15d carried |
| 82–84 | Quit lands on the game picker ("8 of 8 players", Console test fixture); leader phone shows Previous / Next / Select / Back, phone 8 "Phone 1 is choosing" | Pass |
| 85–87 | Escape back to the lobby: all eight still seated and Good, Phone 1 Leader; same as 01 by design | Pass |
| 88–90 | Room gone during play: the TV keeps the game running, phones keep playing | Pass |
| 91–98, 100–101 | After quit with the room gone: all eight phones "This room has closed · Join the new room on the TV" with Join another room (100–101 repeat 91 and 98 by design). Phones drop their seat badge (backlog C-15e) | Pass, with C-15e carried |
| 99 | TV "This room is closed to new players" with Create a new room; eight seats kept | Pass |

Recovery timings this run: phone reconnect 151.8 ms, host recovery 2181.6 ms (no duration budget; PLAT-007 seat hold 120 s).
