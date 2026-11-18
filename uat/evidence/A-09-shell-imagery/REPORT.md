# A-09 round 2 — implementation checks, visual review pending

- Selected delivery: landing B, Tabao Rush B, Peek Poker A, Rabakz B.
- Delivery bytes: 66,760 + 32,744 + 26,248 + 22,700 = **148,452 / 500,000**.
- Pillow 11.1.0 / libwebp 1.5.0 already available; no installation.
- TypeScript: **pass**.
- ESLint (`apps/web/src uat/slices tools --max-warnings 0`): **pass**.
- Design lint: **pass**, 434 files scanned at that invocation.
- Production build: **pass**. Full deployment **465,045 gzip / 1,500,000**
  (1,339,696 raw). Shared-entry controller **253,272 gzip / 300,000**.
- Static production accounting: `/` 171,496 gzip (402,421 raw); `/host`
  186,469 gzip (417,353 raw); unique union 253,272 gzip (484,113 raw).
  This is file accounting, not observed browser traffic. Full deployment is the
  conservative bound including all lazy game/content chunks.
- Final Vitest: **468 pass; 11 browser-launch failures**, 53 files, 15.36 s.
  Exact output: [vitest-round2.log](vitest-round2.log).
- All 11 failures occur at `chromium.launch`: macOS sandbox rejects
  `bootstrap_check_in … MachPortRendezvousServer` with Permission denied (1100).
  Tests blocked: `Overlap.dom`, `PeekPoker.dom`, `game-setup-host.dom`,
  `game-setup.dom`, `host-keyboard.dom`, `layout-fixtures`, `pause-panel.dom`,
  `phone-coverage.dom`, `phone-setup.dom`, `shell-imagery.dom`, `team-polish`.
- No UAT, screenshots, visual inspection, browser geometry results, standalone
  perf, verify, Blender or install run. No commit.
- Load: final Vitest started below 8 (preceding sample 3.84); final TypeScript
  sample 3.96, final ESLint 6.18, design lint 6.09, build 5.55. An earlier
  TypeScript invocation sampled 17.56 at launch after the first Vitest started;
  that invocation did not meet the requested load condition. It was rerun below 8.

## Acceptance awaiting browser review

Meaningful alt text and image presence, 1.618 ±0.02 media ratios, shared tile identity,
decode gating, and absence of overflow at 1080p and 720p have assertions in
`apps/web/src/shell-imagery.dom.test.ts`. They could not execute after Chromium launch.
The code moves start metadata above settings in the right column without reducing
type. No exact rendered overflow measurement or visual fit pass is asserted.

Run outside this sandbox and inspect the 21 stills:

```sh
pnpm uat -- A-09-shell-imagery --phones 1 --out round2
```

The UAT uses real pairing and selection, captures landing and all three picker/start
states at 1920×1080, 1280×720 and 390×844, and checks ratios, decoded images, alt text,
containment and the shared tile. R-04's real settings mirror is included.
