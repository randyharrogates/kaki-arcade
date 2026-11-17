# C-14 unsupported browser — round 4 (2026-11-17): pass

Runs at commit 47e22e2, exit 0, no errors, no process left:
`pnpm uat -- C-14-unsupported-browser --phones 1` (dev server, 22 steps, dev/) and
`node uat/slices/C-14-unsupported-browser.mjs --production` (vite build and preview, 9 steps,
production/).

## Integrator's look
Opened sheets c14r4-a (1280 and the extra steps), c14r4-b (390 and 320) and c14r4-c
(production) and every image in them.
- App message on /, /host and /play at 1280, 390 and 320: heading, the computer line or (on
  /play) the phone line, and "Missing:" in plain words ("direct connections between devices,
  screen animations"; "live connections" with WebSocket removed). Nothing clipped; wraps
  cleanly at 320.
- Delayed demo chunk (dev/19): the app's own message appears after 3 s and the static
  fallback never shows. The round-3 race is fixed.
- Production, classic browser, failed preflight and unparsable entry: the static message sits
  at the top of the screen on all three paths, phone line on /play and computer line
  elsewhere; #app hidden.
- Normal routes render as before (landing placeholder, lobby, join form).
Not checked: a real old Safari or Android device; WebKit and Firefox engines (X-05).
