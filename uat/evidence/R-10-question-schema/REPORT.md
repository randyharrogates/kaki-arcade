# R-10 — evidence report

Nothing in this issue is visible to a player, so the evidence is command output. Every file was
regenerated after review round 2 and read afterwards. `fail-build.txt` comes from the committed
fixture `content/rabakz/fixtures/bad-bank/` (the command is at its top), so it can be made again.

| # | Acceptance statement | Result | Evidence |
|---|---|---|---|
| 1 | Schema: the three types only, 4/2/4 options with exactly one correct, category, difficulty, region, optional picture with file, alt, credit, licence and source address, and a source on every question | pass | `verify.txt` (`validate.test.ts`, 50 tests); `fail-build.txt`: bad-type, bad-option-count, bad-true-false, bad-answer, bad-difficulty, bad-region, bad-no-source, bad-unknown-field, `#12` (bad id) |
| 2 | A prompt over 120 characters or an option over 40 is rejected (RZ-022); so is an unbroken word over 30 in a prompt or 15 in an option | pass | `fail-build.txt`: bad-prompt-long (122), bad-option-long (41), bad-prompt-word, bad-option-word; tests accept exactly 120 and 40 |
| 3 | The same prompt with the same options twice, or the same id twice, is rejected; legitimate near-twins are not | pass | `fail-build.txt`: bad-duplicate (differs from good-0001 in case, punctuation and option order), good-0002 `[duplicate-id]`; `build.test.ts` "buildBank: duplicates" (prime numbers, 5 + 3 against 5 - 3); `validate.test.ts` "sets that differ only by a symbol" (C / C++ / C#, + - × ÷, -5 / 5, emoji) |
| 4 | An answer given away by its length is flagged; so are two questions sharing options and answer | pass | `fail-build.txt`: warn-giveaway, warn-same-options |
| 5 | A picture's file must exist, be a real image of at most 150 KB, carry a credit and a free licence, and not give the answer away | pass | `fail-build.txt`: the bad-picture-* lines |
| 6 | The all-ages blocklist file is applied | pass | `fail-build.txt`: bad-blocklist, with the fixture's list; the shipped list is empty for R-11 to fill |
| 7 | Text that is not plain is rejected with an accurate message | pass | `fail-build.txt`: bad-entity, bad-entity-open (`&amp` with no semicolon), bad-tag, bad-nbsp, bad-zwj, bad-mixed-script, bad-script; twice.json (a key twice), broken.json |
| 8 | A failed build writes nothing | pass | `fail-build.txt`: exit code 1, no output folder |
| 9 | The build writes one chunk per category, named with its content hash, and an index with counts per category, difficulty and region, a hash per chunk, picture sizes and answer balance | pass | `build.txt` |
| 10 | The build is deterministic | pass | `build.txt`: identical SHA-256 of every file on two runs; `build.test.ts` "buildBank: deterministic"; `scripts/build.test.ts` "writes the same bytes on every run" |
| 11 | 12 to 20 real sample questions over at least 3 categories and all 3 difficulties, each with a source note | pass | `stats.txt`: 20 questions, 4 categories, easy 7 / medium 6 / hard 7, 7 Singapore |
| 12 | The loader selects 10, 30 or 50 by difficulty, categories and region with a caller's random function, with no repeats, avoiding recently used questions until the pool runs out, and without bias | pass | `verify.txt` (`select.test.ts`, 51 tests, including "selectQuestions: fairness") |
| 13 | The loader reports before a match that every needed chunk is loaded (hash required) and lists every picture to load (RZ-020) | pass | `select.test.ts` "chunks: what a match needs and whether it is loaded"; `scripts/build.test.ts` "builds this package end to end" |
| 14 | A match never exceeds the 2 MB budget; chunks over it fail clearly; a length `poolSize` allows never fails | pass | `select.test.ts` "pictures and the 2 MB budget", "chunks over the budget", "poolSize with pictures"; `build.test.ts` "fails when one chunk alone is over the 2 MB match budget" |
| 15 | The stats command prints counts against the RZ-024 launch sizes, the True/False balance and source positions | pass | `stats.txt`: short by 1480 / 193 / 60, as expected for the sample bank; `--check` exits 1 |
| 16 | The build never deletes a file it did not write | pass | `out-safety.txt`: `--out .`, `--out src/questions` and `--out src` refused with the sources intact; a folder holding `thesis.txt` refused and untouched; a stray `notes.txt` survives a rebuild; a forged index cannot make the build remove `geography.json`, `notes.txt` or a file outside the folder; a linked `pictures` folder is refused; `--out` with no value refused |
| 17 | A question can leave the host only without its answer | pass | `select.test.ts` "toPublicQuestion" (no `correct`; of a picture only file, alt and credit) |
| 18 | `pnpm verify` passes | pass | `verify.txt`: exit code 0, 315 tests |

Not shown by this evidence: the transferred (compressed) size of a real match, which needs the
real bank and a server (R-08); that the limits fit the real faces on the TV and the phone, which
needs R-02 and R-03 to draw them; and the facts in the 20 sample questions, which were written
from knowledge with a named reference each and were not looked up online.
