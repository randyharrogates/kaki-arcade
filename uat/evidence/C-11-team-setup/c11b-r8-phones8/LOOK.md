# C-11b round 8: integrator's look (2026-11-18, D-153)

Opened ../c11b-r8-8.jpg (21, 22, 23, 24 at 667 × 375, 8 players). 7-1 split: "Red" and "Blue"
headings at 21 px over the halves, every ordinary name untruncated, actions in one bottom row, all
inside the phone. Refusal (22): "⚠ Red needs at least one player." takes the heading row; no button
moves; the divider starts below the row so it does not cross the text. Cleared (23): headings back,
identical positions. Balanced (24) unchanged. 4-phone run exit 0; 8-phone run exit 0.

Integrator test fixes this round: clip checks use the padding box (where overflow clips) and name
the failing control; target size is read from layout (offsetWidth/offsetHeight) because the
just-tapped button is mid press-scale (0.97) and its on-screen box measured 54.85 px.
