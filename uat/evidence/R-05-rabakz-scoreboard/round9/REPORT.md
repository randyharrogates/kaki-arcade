# R-05 Rabakz scoreboard: round 9 evidence (after fix round 22) — not passing

Taken by the integrator in Chromium against the R-05 dev server, 2026-11-17.
Matrix: 480 states, 0 fit failures, 9 tight (the 8-player team finals, as round 8), 6 with name
ellipsis (podium, by design), and **288 with overflow**, every one `rz-header: text outside bounds`
on question, reveal and one-player screens (`matrix-all.json`). Stills: 52 states, 6 with the
same header overflow.
## Integrator's look
Opened r05r22-head.png (1920 non-picture question, header and prompt enlarged 2×) and
r05r22-jacku.png (Jack Ü prompt enlarged 1.5×).
- The prompt's last line keeps its descenders now: the "p" and ")" in "Diplo)" and the "g" in
  "song" are whole, and the "p" in "capital" too. Round 22's must-fix is met on screen.
- The header "Question 1 of 10" is whole, including the Q tail; nothing visible is cut. The 288
  header findings come from round 22's stricter `.rz-copy` clipping rule and do not match what is
  on screen. Sent back as round 23 to make the detector agree with the pixels (or show the
  clipping it claims).
