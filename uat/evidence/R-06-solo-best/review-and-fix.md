# R-06 round1 failure review

The integrator reported from its uncommitted round1 screenshots: TV is still on Question 1 of 10 in match 2, Best 100; phone score is 0, answer options and Skip are present. This is a second read of an unchanged question, not evidence that the simulation selected a duplicate. The integrator’s uncommitted run log reported match 1 completed and match 2 failed after 2.4 seconds.

Root cause: repeated Playwright clock installation resets accelerated wall time backwards; the real peer receive allowance uses elapsed wall time and becomes negative, dropping phone taps. Install once before play, and require observable round/answer progress. The Mixed source bank contains 2,660 unique IDs and prompts, so two ten-question matches do not exhaust it.

Added regression through the actual cached console adapter, game loader, preload resolver and session completion path: ten unique IDs per match, progress-v1 persistence after both completions, and no cross-match overlap with seed 42. Existing selector coverage verifies oldest-first fallback when all IDs are recent. That regression has since been updated for the merged Start path; round4 also changes the save guards and Best layout.

Historical round1 checks: Vitest 1,851 passed / 1 skipped / 5 sandbox Chromium-launch failures; TypeScript, ESLint and design lint pass. See the slice note for commands and load readings. Corrected browser UAT has not been run here and requires external execution and visual review. Round1 evidence is not committed; copied root failure log deleted. No commit made in that fix round.

Round 3 replaces the wrapper and separate recent/best keys with pure save/context.saved and a shell-owned progress-v1 record. The integrator supplied round3 evidence, which the round4 review inspected; it predates main’s settings/Start merge. Round4 updates the script for Select → Game settings → Start and adds success-pulse frame strips. Merged-path UAT, overflow measurement, visual review, completed REPORT tables and perf remain for the integrator; none was run in this sandbox.
