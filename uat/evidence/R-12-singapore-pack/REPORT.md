# R-12 Singapore pack — evidence report

Nothing in this issue is drawn, so the evidence is text. Every file here was regenerated after
the last change to the question files and opened and read.

| # | Acceptance statement | Result | Shown by |
|---|---|---|---|
| 1 | At least 200 new questions, all region `singapore`, all with an `original` source note | Pass: 305 | `questions.md` (header counts; every entry shows its note); `stats.txt` (singapore column equals the total in all six `singapore-*` rows) |
| 2 | 5 to 7 categories, titles at most 24 characters, at least 25 questions each | Pass: 6 categories, 46 to 57 each, longest title 24 | `stats.txt` rows `singapore-*`; `build.txt` (a longer title is a build error) |
| 3 | Difficulty roughly a third each | Pass: easy 90 (30%), medium 121 (40%), hard 94 (31%) | `questions.md` header; `stats.txt` |
| 4 | Multiple choice only (D-049); no pictures | Pass: 0 true-or-false in the pack; picture column 0 | `questions.md` header; `stats.txt` (the 5 true-or-false it still counts are R-10's samples, outside this lane) |
| 5 | Romanised names only | Pass | `build.txt`: the build rejects any non-Latin script and reports 0 errors |
| 6 | Strict build passes | Pass: 325 questions, 0 errors, 0 warnings | `build.txt` |
| 7 | Stats show the Singapore target met | Pass: "Singapore pack 312 of 200 met" | `stats.txt` |
| 8 | `pnpm verify` passes | Pass: exit code 0, 315 tests | `verify.txt` |
| 9 | Sceptical read-through done, removals recorded | Pass: 320 written, 6 removed in the read-through, 7 more after D-049, 2 more in review round 1, 305 kept | `docs/slices/R-12-singapore-pack.md`, "The read-through" and "After D-049" |
| 10 | Readable list with the questions to verify first | Pass: the reviewer's 17, then a re-check-yearly list | `questions.md` |
| 11 | Only the allowed paths changed | Pass | `git show --stat` of the commit: six `singapore-*.json`, the slice note, this folder |

Not claimed: that any fact was checked against its source. The pack was written from memory with
no web access, and the titles in the source notes are unverified. That check is R-14.
