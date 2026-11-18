# C-12 round 3: integrator's look (2026-11-18)

Opened 01–05 and the strip (c12-strip.jpg). Keyboard only, 1920 × 1080: landing focuses "Host a
room" with a visible ring; lobby, picker and the first start all reachable with arrows and Enter;
pause menu takes focus on Resume; quit and back to the lobby; two phones join beside the keyboard
player (3 of 8); the second start reads "Player 1 starts with the keyboard" and starts. The held-key
strip shows the start crossfade, then "This game's screen is not built yet": Tabao Rush's TV
screen is track T, so the keyboard player's movement cannot be shown yet. PLAT-024 met; CTRL-009
keeps its movement evidence open until T-07.

Integrator test fixes: retry the first arrow on the landing page (the link can draw before its
listener attaches); wait for each control's screen before stepping to it (the round-2 "cannot
reach Start" was the test pressing 20 arrows while the picker was still on screen; the focus trail
showed the picker's controls). Exit 0.
