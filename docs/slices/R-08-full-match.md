# R-08 full-match UAT — round-2 evidence, round-3 documentation

Goal: exercise Rabakz through real console pairing, inputs and normal simulation progression.
Requirements considered: RZ-001–016, RZ-020–026, RZ-030–034 and PLAT-025/033; coverage is limited below.

## Runs and acceptance

`round2-solo`, `round2-ffa` and `round2-teams` all passed their hard assertions. Evidence is in
`uat/evidence/R-08-full-match/round2-solo/`, `round2-ffa/` and `round2-teams/`.
The runs used b485254e; review 1 assessed the subsequent script changes through HEAD 11b8f690
as typing and a tightening assertion, with no loosened checks. This round changes documentation
and evidence names only; it runs no browser, UAT, verify or performance check and makes no commit.

Each run uses default Mixed categories/difficulty and ten questions. Solo uses one phone.
Free-for-all starts seven seated players; the eighth joins during question 2, waits, then enters
question 3 with zero. Teams also seats seven (Red four, Blue three), plus an eighth, held joiner
on “Waiting for the lobby” throughout play (D-202, OQ-048). It does not use a ninth overflow context.

Hard assertions cover ten unique prompts, correct reveal indices, every player's independently
calculated score after each question, first-correct wins (100/100/150), idle reveal, leader skip,
lock-out followed by another winner, and later awards (100/100/150/300). They also cover the
free-for-all joiner's waiting/entry state and zero score, reload retaining seat and score,
team assignment, two team scoreboard panels, held joiner during every question, final team names
and totals equal to individual sums, solo Best, and the still-settling timeout.
Teams per-player lock-out is visual only, not a hard assertion.

The reload occurs before the leader answers question 4. Solo's wrong first answer and immediate
reveal are visible, but the script accepts reveal or lockedOut and could later reach idle reveal.
The 0.25 s tie window and unlock-after-all-wrong remain unit-test evidence only.

Privacy assertions sample other nicknames in phone DOMs and received `t: 'view'` messages at
question entry and question 6 lock-out. Team-setup and null views are excluded. The top-level
players/answers/winners collection check cannot fire on `{revision, blocks}` views; it adds no
coverage. Layout, room and picker-state messages, answer attribution without nicknames, the held
teams joiner, and other live-answer moments are not checked. Secrecy belongs to RZ-005 and the
architecture rule; PLAT-033 is Rabakz end to end through the registry.

## Known-gap steps and product gaps

Only two UAT steps are softened; neither is product acceptance:

- **PLAT-025 → R-15:** the named known-gap step records question 1 phone assigned teams,
  seat colours, body/team-name text and TV colours/text in `round2-teams/known-gap-PLAT-025.json`.
  It does not assert team colour/name appearance during play. `teamNameText: ["Red"]` is a
  false positive from question 1's option label “Red” (Hair / Sweet / Lantern / Red), not a team name.
- **RZ-009 → R-16:** each run's `known-gap-RZ-009.json` records simulation phase `final` and
  retained TV text from question 9's reveal, with no final-round announcement. The doubled
  question-10 award of 300 still passes the independent score oracle.

A third product gap was found at review: **RZ-008 → R-18**. The TV never shows the streak.
`games/rabakz/host/view-model.ts` passes `streak`, but nothing in `games/rabakz/host/*.tsx`
renders it. Phones show “Streak N”; TV reveal stills show points such as “+150 · 700 pts”.
The TV half of RZ-008 remains unaccepted and should remain `in progress` in the integrator's tracker.

The renamed stills describe what is visible, not an announcement:

- `round2-solo/16-host-final-phase-no-announcement-tv.jpg`
- `round2-ffa/48-host-final-phase-no-announcement-tv.jpg`
- `round2-teams/46-host-final-phase-no-announcement-tv.jpg`

Each shows question 9's reveal retained during phase `final`. REPORT.md and run.json screenshot
lists use these names. The script remains unchanged, so a future run still needs the deferred naming fix.

## Requirement coverage

This table follows review 1's Coverage section. A partial entry does not close the whole requirement.
Evidence numbers below are relative to `uat/evidence/R-08-full-match/`.

| Requirement | Scope | Evidence and limits |
|---|---|---|
| RZ-001: | Can evidence | a default 10-question match to the end, with totals. |
| RZ-003: | Can evidence | TV options plus matching shape and colour phone buttons. |
| RZ-004: | Can evidence | a press is final; the grid is disabled after the pick (lock-out stills). |
| RZ-005: | Can evidence | TV "Locked out" and wrong-option marking; no other identity on phones. |
| RZ-006: | Can evidence | first correct answer ends the question, lock-out with another winner, leader skip, idle reveal, and the reveal shows the correct option, who got it and points. The 0.25 s tie window and unlock-after-all-wrong are unit-tested only. |
| RZ-007 | Can evidence | . |
| RZ-008: | Can evidence | scoring and the phone streak. The TV streak is missing. |
| RZ-009: | Can evidence | the doubled award (300). The announcement is missing. |
| RZ-010/011: | Can evidence | defaults only. |
| RZ-012: | Can evidence | team scoring, team totals and individual scores shown. Per-player lock-out is visual only; same-time dedup is not exercised. |
| RZ-013: | Can evidence | solo run, wrong first answer scores 0 and reveals (visual), New best. |
| RZ-014: | Can evidence | ffa in the real console. Teams is held per D-202, OQ-048. |
| RZ-015: | Can evidence | no repeats within the match. |
| RZ-016: | Can evidence | "=2"/"=3" shared placings on TV (`round2-ffa/30`, `56`). |
| RZ-026: | Can evidence | only that shuffled options are used. |
| RZ-030 and RZ-031: | Can evidence | stills only. Locked-out is marked with an icon plus text; the count-up stops with no overshoot (strips `round2-ffa/15`, `round2-teams/53`). No 3 m reading. |
| RZ-032: | Can evidence | scoreboard after 5 and the podium, teams first. |
| RZ-034: | Can evidence | seat number, colour and nickname; no cooks. |
| PLAT-033: | Can evidence | Rabakz end to end through the registry, which is Rabakz's share only. |
| RZ-002: | Cannot evidence | no picture questions; R-13. |
| RZ-020: | Cannot evidence | no network observation during play. |
| RZ-021 to RZ-025 | Cannot evidence | . |
| RZ-033: | Cannot evidence | no sound. |
| PLAT-025 | Cannot evidence | during play. |
| RZ-009 | Cannot evidence | announcement. |
| RZ-008 | Cannot evidence | TV half. |

There is no `perf.json`, and none is required: R-08 adds no product drawing. The assessed
8-phone Rabakz performance run is owned elsewhere (D-198/D-211 pattern). Real phones, TV/HDMI
latency, relay/mobile data and listening remain untested.

## Deferred to R-15/R-16/R-18

Review 1's should-fixes require product or script work and reruns, outside this docs-only round:

- Assert a Red team-mate is unlocked before that team-mate wins question 6; current evidence
  is visual only (`round2-teams/41`).
- Assert solo phase is reveal immediately after the wrong click (RZ-013).
- Inspect received view blocks for another phone's wrong option text at lock-out and include
  the held joiner; repair the ineffective top-level collection check and preserve the stated privacy limits.
- Reload while locked out and assert the lock-out and disabled grid survive (RZ-004).
- Assert the D-202 held teams joiner is released at results.
- Convert both known-gap branches to hard assertions when fixed: exclude option labels from
  PLAT-025's name match (R-15); assert the actual announcement text rather than silently recording
  differing wording as a gap, and correct future still naming (R-16).
- Resolve/log the RZ-016 team placing consistency question: TV ranks within team (Blue zeros
  “=1” in teams/30), phone ranks globally (“2nd · 0” in teams/32), without an equals sign for ties.
- Resolve/log Continue's red cross glyph (teams/31 and 55), under OQ-050 or a new open question.
- Render the missing TV streak (RZ-008, R-18).

## Close-out and Requests

All three existing round-2 runs completed successfully with the two named known-gap steps.
Their REPORT.md tables now describe opened images and acceptance limits. “Claude reviewer,
2026-11-18” is recorded only for the stills/strips review 1 says Claude opened. Codex inspected
all table images during this round (labelled still contact sheets and separate strips); remaining
Claude inspections are explicitly pending. A passing script alone is not full visual acceptance.

The integrator owns clean re-review, remaining Claude image review, queued verify, tracker and
backlog updates and merge. Record the three product gaps under R-15/R-16/R-18 and retain the
partial coverage above; do not mark unsupported requirements done from these runs. No trackers,
backlog, requirements, design, performance, decisions, contracts, lockfile, script or product code
were changed in this round. No commit was made.
