# Track K — The controller

The phone as a console-style controller, assembled from a standard kit. A game asks for parts through the layout schema (F-04); the kit draws them. The kit contains no game code.

**Owns:** `packages/controller-kit`, the `/play` route shell in `apps/web`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story K1 — My phone feels like a controller, not a web page



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| K-01 | Controller page shell: landscape, fills the screen, no scroll, zoom, selection or pull-to-refresh, screen stays awake; shows colour, seat, nickname and connection | CTRL-004, CTRL-008 | F-06, S-05 | 2 | merged |
| K-02 | Left stick: tracks the thumb 1:1 with no smoothing, re-centres on release, multi-touch with buttons | CTRL-005, PERF-012 | K-01 | 2 | merged |
| K-03 | D-pad, the four shape buttons (cross, circle, square, triangle; D-047), L and R, Start: face buttons at least 110 px, other in-play controls 89 px, nothing under 55 px (D-051), press scale and feedback within one frame, vibration where supported | CTRL-001, CTRL-005, CTRL-006, PERF-012 | K-01 | 2 | merged |
| K-08 | Controller size and start-up budget check in verify | PERF-020 | K-02, K-03 | 2 | todo |

**From K-01 (controller shell), merged 2026-11-17 after two Codex rounds and two reviews.**
`ControllerShell` (seat, name, link, theme, children) owns the page lock (reference-counted) and
the wake lock (retries once on the next touch after a refusal). **For C-16:** mount it on the
real `/play` once seated; it must become the only wake-lock owner (PhonePage holds one too);
align the link words and icons with the lobby ("Disconnected" against "Lost") and switch the
relative import to `@kaki/controller-kit` (add the dependency and a `./shell.css` export).
**For K-04/K-05:** the page lock cancels `contextmenu` and `dblclick` on the whole document and
sets touch-action none on html; scope them to the shell root if a panel needs selection or
scrolling; the "Keep your screen on" note sits at the bottom centre where K-03 controls go.
**Later:** measure the name's text box (not the player box) in the 13 px check and assert which
proof condition fires; a `data-wake` attribute so held and released can be told apart in UAT;
`installPageLock` ignores a new root on later mounts; no shot of a real safe-area inset or a
non-console theme; the portrait strip ends before the turn does. **S-05** still decides wake
lock on iPhone Safari and pull-to-refresh on Android Chrome.

## Story K2 — Each game gets exactly the controls it needs



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| K-04 | Layout engine: draws only the parts a game asks for in the current phase, and grows them to fill the space | CTRL-002 | K-02, K-03, F-04 | 2 | merged |
| K-05 | Private display panel: text, cards, choices and a tappable grid, seen only on that phone | CTRL-003 | K-04 | 2 | todo |
| K-06 | Tilt, shake and swipe parts, with the tap-to-enable step on iPhone and a button fallback | CTRL-003, CTRL-007 | K-04, S-05 | 2 | todo |
| K-07 | Controller UAT on emulated phones and on Randy's real iPhone and Android | CTRL-001 to CTRL-008 | K-04 to K-06 | 3 | todo |

### K-05 follow-up for C-15 (from the K-05 review, 2026-11-17)

K-05's privacy is covered by the session unit test (a private view goes only to its own
player's connection, never into the public view). Its UAT cannot check a real room, because the
phone route does not yet mount the layout engine or handle private views. C-15 must join two
phones to a real room running a game with a private view (the session fixture or Rabakz) and
assert phone A's private text is in A's DOM and absent from B's DOM and the host's (CTRL-003).

### K-04 follow-ups for K-05 (from the final review, 2026-11-17)
1. D-127 never applies to a long action label: the action's width is its full 34 px label width,
   so a long label widens the part and the layout reports fits=false (`layout-placement.ts:42`,
   `layout-renderer.ts:117`). Cap the action at the space beside the other parts so it steps.
2. At 21 px the glyph moves to the left edge (`layout.css`, `[data-label-step="21"] > span
   { flex: 1 1 0 }`); keep glyph and text centred as a group.
3. A label steps whenever it would wrap at 34 px, even if two 34 px lines fit (for example "Ho Chi
   Minh City"), so one question mixes 34 and 21 px answers. Decide: test the wrapped height at
   34 px first, or keep the current reading of D-127 and say so.
4. The label step is not re-measured when a web font finishes loading; handle it when fonts ship.
