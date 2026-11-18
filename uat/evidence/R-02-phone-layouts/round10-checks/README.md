# Round 10 — RZ-003 / RZ-005

The permitted Vitest command started at one-minute load 2.79. Results:
725 passed, one pure placement regression failed, six browser tests not run
(Chromium launch failed with PLAYWRIGHT_BROWSERS_PATH=/nonexistent).

Adding Cretaceous-Paleogene to the existing long-option placement regression
makes placed.fits false. LayoutEngine renders the private section only when
placement.fits is true; it does not reject the fixture draw by revision.
The third option set is the whitespace-token set, not Mentsuyu.

The strip fallback in packages/platform/src/game/private-placement.ts calls
controlContentFits, whose optionLabelStep estimate treats whitespace tokens
as indivisible in packages/platform/src/game/option-metrics.ts. The hyphenated
token exceeds the narrow label capacity. The browser can wrap at the hyphen,
but the pure placement rejects the strip before the DOM can measure it.

The DOM test now has separate cases for each option set and each contrast
colour scheme, retaining all assertions and the 30-second timeout. Browser
runtime at load 2 has not been measured.

TypeScript, ESLint and design lint passed before the final test split;
TypeScript and ESLint were repeated after it. Every check started below load 8.
No verify, UAT, perf, installation, node_modules linking or commit was run.

Product repair is pending explicit scope permission to edit the shared
platform implementation outside the R-02 paths. No contract change is needed.
