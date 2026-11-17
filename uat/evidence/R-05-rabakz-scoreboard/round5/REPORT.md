# R-05 Rabakz scoreboard — design pass (D-114), integrator's look (2026-11-17): pass

Dev page after `rzReady`, `at=3000`. Round 6 (design pass) shots are `pass6-*`; round 7 plus
the integrator's merge fix are the unprefixed shots. Opened sheets r05d-a, r05d-b, r05d-strip,
r05e, the full-size crop r05d-crop and 1920-scoreboard-teams-8 at full size, and r05e-cat.

- One list (D-112, D-114): rows on the plum, leaders' rows as white panels, name : score areas
  1.618 : 1, "Points" and "This round" headings at 21 px, names, totals and placings at 55 px,
  rose change chips at 34 px, a zero change without a chip. Team totals in two panels split
  1.618 : 1 with the leader first; team squares after names.
- Entry strip (90 ms apart): rows arrive staggered and totals count up; nothing bounces.
- Final results: podium with the rest in the same row style; team podium with colour squares.
- Question screen: category shows "General knowledge", not the raw id.
- `__rzOverflow()` reports 0 on all 12 dev-page states at 1280 × 720, 1920 × 1080 and
  3840 × 2160 (36 checks), after the integrator's fix: the placing digit's font content area
  (about 75 px) overran its 71.5 px line box; `padding-block: var(--ka-space-5)` on `.rz-place`
  (no new token, row height unchanged).
Notes: the team podium leaves the upper half of the screen empty; fonts are fallbacks until
the token fonts ship (F backlog). Not checked: reduced motion by eye, a real TV.
