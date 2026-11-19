# Browser performance scenarios

`lobby-8.mjs` is available at 1, 4 and 8 phones through `--phones`.

**Reserved slot: `picker.mjs` — pending the integrated picker screen.** `pnpm perf -- picker`
fails with a pending-slot explanation until that scenario exists; it cannot report a pass.

T-, P-, R- and K-track issues each add a `<name>.mjs` exporting the `Scenario` interface in
`tools/perf/browser.ts`. Discovery is automatic. The API, timing-hook connection steps,
sample minima, budget applicability and schema are in [the harness README](../../tools/perf/README.md).

Reports default to `<scenario>/perf-<phones>` under `uat/evidence/`.
Use `--slice <name> --out <name>` to select another marked run folder and
`--build production` to build with the local pairing origins and serve Vite preview.
The report records the actual perf command and development/production build type.
Lobby host/phone screenshots run in `afterCapture`, after frame collection has stopped.
Game scenarios bracket the real round with `await capture.roundStart()` and
`await capture.roundEnd()`; lobby frames and lobby duration cannot satisfy PERF-001.

`peek-poker-console` drives the real five-round match, including all scoreboards and
the podium. Per the P-09 integrator decision, its marked measurement window is the
whole match, from first memorise entry to podium. Each pick phase stays open for at
least 15 seconds within the existing 20-second timer. Run it twice at eight phones:
production Chrome for PERF-001, then development for PERF-010/012 (D-227). The latter
uses 160 trusted grid presses, including deselection/reselection, with local pressed
feedback and simulation application observed separately. Commands and assessment
conditions are in [the P-09 slice note](../../docs/slices/P-09-perf-match.md).
