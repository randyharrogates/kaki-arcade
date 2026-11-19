# R-16 — Final-round card

Goal: announce Rabakz's double-points block before its first question (RZ-009).

Acceptance: one four-second simulation phase before questions 10 / 28 / 46, with the full question clock starting afterwards. The TV shows a golden-ratio panel, a 144 px title, a 55 px count-specific line and the plain mono ×2 numeral, using the normal paired slow crossfade in both directions. Reduced motion drops the fade and keeps the four seconds. The 34 px Double points chip remains through each final question's reveal. Every active phone, including the free-for-all joiner, shows Final round · Double points during the card and drops it when the question opens.

Round 1 is committed, including the `r16-solo` and `r16-ffa` UAT evidence. Review 1 was not clean: it identified the unpaired card fade, missing chip/transition/teams/letterbox evidence, missing card perf coverage and stale close-out text. Those runs do not establish round 2's visual acceptance.

Round 2 removes the card's `exitOnly` path without changing shared UI. One exported `finalRoundCount` helper supplies the scoring boundary and card count. Literal copy expectations cover 10, 30 and 50 questions. The TV DOM test now lives in `apps/web/src/rabakz-host.dom.test.ts`, runs with and without reduced motion, exercises both boundary directions and checks the header with the longest category title, Double points and solo Best text at 1920 × 1080 and 1280 × 720. The phone DOM tests remain in the phone file.

The R-08 slice captures card entrance and exit strips, card stills at 1920 × 1080, 1280 × 720 and letterboxed 1440 × 900, final-question chip stills at both TV sizes, and all-phone card stills. It checks chip containment and non-overlap, the announcement on every phone, and its removal on every phone. Teams use the same final-round step for the seven active phones; the teams joiner waits for the lobby and never sees the card. The perf demo driver now advances real rules into a `final` fixture, and the scenario cycles into and out of it.

Round 3 adds `isolation: isolate` to `.rz-block`, so the incoming screen paints above the outgoing screen in every Rabakz screen change, including card, scoreboard and podium. Crossfade timing is unchanged. UAT checks title hit testing on the last card-entrance and podium-strip frames, plus the centre of every incoming podium step and name on the last podium frame. The host DOM test probes those same podium centres during its `over` pass, alongside titles and computed isolation. Both temporarily lift outgoing inert attributes to let hit testing detect an outgoing layer painting above the podium. The podium-centre assertion runs before the computed-isolation assertion. Source-text chip and crossfade assertions are replaced by rendered VNode and animation-call behaviour checks.

The duplicate host still is omitted from `shots('final-round-double-points')`; the 1440 × 900 letterbox still remains. Card strips remain at 1920 × 1080; the integrator decided to use `--max-mb 18` for eight-phone runs: the four 1920 strips are about 1.8–1.9 MB each. Eight-phone runs also capture the question 10 reveal with its Double points chip.

Before podium stills, UAT advances the host clock past `countUpDuration()` plus every player/team row's `STAGGER_MS` delay and two animation frames. It then compares every displayed player/team total with `view()`, including the solo total.

The integrator runs verify, then UAT to r16-solo4, r16-ffa4 and r16-teams4, then perf on a quiet machine.

Commands for the integrator:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm verify
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5780 KAKI_PORT_SIGNAL=5781 KAKI_PORT_UAT=5782 pnpm uat -- R-08-full-match --phones 1 --out r16-solo4
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5780 KAKI_PORT_SIGNAL=5781 KAKI_PORT_UAT=5782 pnpm uat -- R-08-full-match --phones 8 --max-mb 18 --out r16-ffa4
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5780 KAKI_PORT_SIGNAL=5781 KAKI_PORT_UAT=5782 R08_TEAMS=1 pnpm uat -- R-08-full-match --phones 8 --max-mb 18 --out r16-teams4
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5780 KAKI_PORT_SIGNAL=5781 KAKI_PORT_UAT=5782 pnpm perf -- rabakz-screen --phones 8 --headless --slice R-16-final-round-card
```

## Close-out

Review-3 follow-up: the requested non-DOM Rabakz suite passes (18 files, 337 tests). A clean TypeScript build including the UAT slice initially caught an import-extension error, now corrected; the rerun reports only out-of-scope Tabao Rush errors from missing `pixi.js` modules and consequent implicit-any parameters. The full TypeScript check therefore fails. Emitted files are cleaned with `tsc -b --clean`. Scoped ESLint passes with zero warnings after removing an unnecessary optional chain; design lint passes (508 files). Checks run one at a time without load gating. The DOM test and planted-isolation check are left to the integrator because Chromium crashes in this sandbox. No CSS, evidence, REPORT tables, shared trackers or dependencies changed; no verify, UAT, perf or commit was run.

Earlier round-3 implementation: the permitted non-browser suite passes (19 files, 339 tests). TypeScript initially found a Preact type-narrowing error in the new behavioural assertion; it was corrected. TypeScript including the UAT slice passes after correction; emitted files are cleaned. Scoped ESLint passes with zero warnings after correcting two lint findings; design lint passes (488 files). The results title now uses an h1 with the existing typography so card and podium hit tests target the incoming title consistently. No evidence folders or REPORT tables are changed by this issue agent.

Round 2's non-DOM tests pass: 18 files, 337 tests (final launch load 4.65). TypeScript including the UAT slice and perf scenario passes (final launch load 4.13). Scoped ESLint, including the moved host DOM test, passes with zero warnings (final launch load 3.96); design lint passes (3.96). Emitted files are cleaned after TypeScript. An initial test run caught the final fixture being included in question-only fixture tests; the perf fixture now lives in the demo driver. Two lint findings were corrected. No DOM tests, verify, UAT, perf, install or commit are run by this issue agent.

## Requests

A paired crossfade blends the centre colour by design, so the UAT asserts instead that a fully drawn screen (opacity 1) is under the card panel centre in every strip frame; the frame background can never show through.

Integrator: run the host and phone DOM tests in verify, run the three UAT commands and perf command above, open every new still and strip, and fill in the REPORT tables. REPORT tables are left for the integrator. Visual and performance acceptance remain open pending those runs and independent review.
