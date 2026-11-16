# Track G — Design gate

Randy chooses from artifact boards before anything visible is built (PRD NN-6, D-022). Run by the integrator with Randy, one board at a time; renders may be prepared by an agent. Each board: explain in chat, publish the artifact, record the choice in `DECISIONS.md`, write the values into `DESIGN.md` §4, save the source in `docs/design-gate/`.

**Owns:** `docs/design-gate/`, `tools/blender/board*`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story G1 — Randy sets the look before code

Every option is real (rendered or built), includes a golden-ratio variant, and states its cost against the performance budgets.

| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| G-01 | Board 1, 3D art style: the chunky toy cook refined (glossy against matte, lighting mood, camera tilt), the 8 character heads, a properly modelled stall, and the 7 dishes at game size on a 1080p frame | NN-4, NN-6, TR-041, TR-064 | Board 1A (done) | 0 | merged (board 1 decided: C) |
| G-02 | Board 2, visual identity: three directions for palette, type pairing and surface treatment; player colours and the two team colour themes | NN-5, NN-6, PLAT-004, PLAT-025 | G-01 | 0 | merged (boards 2 and 2B decided) |
| G-03 | Board 3, big-screen layouts: landing, lobby with join code, picker, team setup, Rabakz question and reveal, Peek Poker table, Tabao Rush HUD, versus arena with the ways the two kitchens interact, results | NN-6, TR-052, TR-058, RZ-030, PP-030 | G-02 | 0 | todo |
| G-04 | Board 4, phone controller: kit styling and each game's layouts at 844 × 390, cook picker, team picker | NN-6, CTRL-001, CTRL-002, TR-064 | G-02 | 0 | todo |
| G-05 | Board 5, motion: live samples of the key transitions in the shell and in each game | NN-5, NN-6 | G-03, G-04 | 0 | todo |
| G-06 | Close the gate: lock `DESIGN.md` §4, mark boards done, mark `HANDOFF.md` historical | NN-6 | G-01 to G-05 | 0 | todo |
