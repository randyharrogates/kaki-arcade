# Rabakz question bank: credits and licence

## Open Trivia Database

The questions in `src/questions/` whose ids start with `otdb-` are from the
**Open Trivia Database** (<https://opentdb.com>), a user-contributed trivia question database,
licensed under the Creative Commons Attribution-ShareAlike 4.0 International licence
(**CC BY-SA 4.0**, <https://creativecommons.org/licenses/by-sa/4.0/>).

They have been adapted for Kaki Arcade: a selection of the verified multiple-choice questions
was taken, screened for an all-ages audience, regrouped into Rabakz categories and tidied
(spacing, invisible characters, and misspellings that have one clear correction; each
correction is listed in the import report). No question was otherwise reworded. How the
selection was made is in `scripts/otdb-map.ts` and `scripts/otdb-screen.ts`.

**The adapted questions are offered under the same licence, CC BY-SA 4.0.** That covers the
`otdb-` questions in `src/questions/*.json` and in the generated chunks built from them. The build also writes these `otdb-` questions, with this notice, to `/rabakz/questions.json`, the Credits page's download; no other question is in that file.

The same credit and notice are recorded in each source file (`defaultSource`) and are written
by the build into `generated/index.json` (`credits`), for the game's credits page (RZ-021).

## Questions written for Kaki Arcade

Questions with any other id were written for Kaki Arcade. Each carries a source note saying
where its fact can be checked.
