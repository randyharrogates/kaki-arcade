# C-06 — Room state (pure)

Goal: deterministic JSON room state for PLAT-003/004/005/006/008, with retention and
serialisation hooks for PLAT-007/009. D-060 supplies nickname and leadership rulings.

Acceptance: eight seats; safe, unique twelve-visible-character names; replacement notices;
fixed seat colours; leadership with ten-second disconnect grace; explicit game join policy;
two-minute seat retention; private credentials excluded from the public projection.
Tests and verify logs provide evidence for this pure code; no visual UAT applies.

Out of scope: UI, transport, storage orchestration, game/session logic and automatic team
allocation. Team and quality fields are inert hooks for C-11 and C-07 respectively.

## Close-out

Original build committed as `d9b441c` on `issue/C-06-room-state`. Review rounds 1 and 2
and 3 are committed. Review round 4 is left in the working tree for the integrator. No dependencies,
contracts or shared trackers changed. Independent Claude review remains required.

## Review round 1

Added moderation, uniqueness, defensive event validation, separate host/phone entry points,
private notices, public projection, finite-clock clamping and deterministic stress tests.
The shared lossy name skeleton over-blocked ordinary names and rewrote accepted spelling.
Restore incorrectly refreshed expired seats and protected the leader for only ten seconds.
These are corrected below; the round-1 restore and spelling claims were not accurate.

## Review round 2

Historical record; round 3 below supersedes the filter and restore matching rules.

1. PLAT-004: storedName trims only; protocol-accepted joiners, selectors, tags and script code
   points survive exactly. Tests include twelve ZWJ emoji, flags, Sinhala, Persian, hearts,
   Muhammad, twelve accented letters, blank/control refusals and the reviewer's other names.
2. PLAT-004: uniquenessKey independently uses NFKC, case folding, invisibles removal,
   bounded Greek/Cyrillic confusables and whitespace collapse. It preserves accents, doubled
   letters and digits. Every reviewer collision pair has an individual parameterised case.
3. PLAT-005: filterSkeleton additionally removes marks and maps leet. It never collapses
   doubled letters. Each data letter compiles to a repeatable pattern. Roots match within
   tokens; whole tokens accept simple plurals. Han runs and other letter runs are separate
   tokens. Consecutive single-letter tokens yield an additional matching token.
4. PLAT-005: per-token exceptions protect ordinary names in longer names too. Short ambiguous
   syllables and Sunni are removed. CB is restricted to single-letter runs; babi requires
   the whole name or a single-letter run. Explicit chee bai/chee bye/ci bai phrases preserve
   local coverage without concatenating arbitrary multi-letter tokens.
5. PLAT-006/007/009: restore prunes expired holds before marking retained players disconnected.
   Existing holds retain their original start; previously connected seats get a new hold.
   The persisted leader awaits resume for the seat hold, without the normal drop grace.
   After resume, ordinary ten-second drop grace applies again. Explicit leave transfers
   leadership immediately. Slow-resume, hold-lapse and expired-seat repros are tests.
6. PLAT-004: only blocked replacement sets nameReplaced. Uniqueness emits name-suffixed with
   nameSuffixed, givenName and the assigned name; protocol Seat remains unchanged.
7. PLAT-007: token resume transfers device ownership and closes the old active connection.
   The old device's subsequent join allocates another seat rather than reclaiming the first.
8. PLAT-003/004: join from an already seated connection returns the existing seat unchanged.
   Claimed identity seats cannot turn join into rename. Rename/leave require matching device,
   connection and seat. Both forgery probes are retained as explicit tests.
9. Every reviewer vocabulary probe is represented by a named parameterised case; expected
   outcomes follow the round-2 rulings rather than the probe's original array labels.
   Results-phase joining is restored. All test titles begin with requirement IDs.
10. Package lines are at most 100 characters, statements are separated, vocabulary entries
    are individually listed, and test tables use individual rows. The deterministic hash
    was regenerated after behavior changes and checked by two independent 2,500-event runs.

Authored data entries (substring roots / whole tokens):

| Group | Roots | Tokens | Total |
|---|---:|---:|---:|
| English | 11 | 68 | 79 |
| Singlish/Hokkien | 10 | 9 | 19 |
| Malay | 1 | 16 | 17 |
| Romanised Tamil | 3 | 10 | 13 |
| Pinyin | 1 | 3 | 4 |
| Chinese | 16 | 4 | 20 |
| Total | 42 | 110 | 152 |

CB and babi token entries use the contextual restrictions above. The three explicit local
phrase alternatives are matching rules, not additional authored list entries.

Evidence: `uat/evidence/C-06-room-state/verify-review-2.log` and
`uat/evidence/C-06-room-state/REPORT-review-2.md`.
Golden final-state SHA-256:
`9ed19a1b312bb103c36f4fb6b8dc88e2ee6a569d26784d57a5185af13a22ecaa`.

## Review round 3

PLAT-005 final matching rules (D-060/D-064 and the round-3 brief):

A. Strong roots match within tokens and the fully squashed name, which also covers every
   adjacent token pair. NFKC, case folding, invisible removal, bounded confusables, accent
   removal and leet mapping precede matching. Repeated letters remain supported. `fuk` and
   `fuq` are whole tokens, allowing Fukuda, Fukushima, Fukuyama, Fukui, Fuqiang and Fuqing.
B. Protection belongs to each root match: only a match wholly inside one protected token is
   ignored. Other matches in the same name still block. The 43 protected tokens include the
   existing list, Pornthip, Pornpimol, Shiitake, Shitara, Shithil and Shittu; tokens ending in
   `shita` are protected by a rule. Only `shit` skips matches across token gaps, keeping
   Mash It, Push It and Bash It. A whole-name single-letter run still blocks `s h i t`.
C. Short entries match whole tokens with repeated letters and endings s/es/ed/ies/y/ty.
   Final-y plurals include `pussies`. `babi` requires a single-token name (or whole-name
   letter run); `cb` is run-only. Sial, otha and pussycat entries are removed. Initials
   followed by a surname, including C. B. Tan and CB Tan, pass.
D. Ten explicit token-sequence phrases are retained, including chee bai from round 2.
   The number 1488 is checked before leet mapping removes digits. Whole-name single-letter
   runs use the token rules; a run forming a strong root can also block inside a longer name.
E. Symbols inside a token may consume one root letter each, including inside a longer
   token: c*nt, f**k, sh*t, b*tch and xxc*ntyy block. Plain protected tokens remain protected.

Authored entries, counted directly from BLOCKED_GROUPS:

| Group | Roots | Tokens | Total |
|---|---:|---:|---:|
| English | 29 | 68 | 97 |
| Singlish/Hokkien | 11 | 9 | 20 |
| Malay | 1 | 19 | 20 |
| Romanised Tamil | 4 | 10 | 14 |
| Pinyin | 1 | 6 | 7 |
| Chinese | 20 | 4 | 24 |
| Total | 66 | 116 | 182 |

Also: 10 phrases, 43 protected tokens, one `shita` suffix rule, and one numeric check.
Contextual cb/babi entries remain included in the token counts.

PLAT-006/007/009: a restored leader waits until 20,000 ms after the FIRST other seat resumes.
Later resumes do not extend the deadline. A leader dropped before reload gets the same limit;
seat retention never extends leadership. At the deadline the lowest connected seat leads.
Tests cover exact boundaries, out-of-order resumes, reused seat ordering, late ex-leader
return, all fresh stall
probe times, empty restore, and seat 2 at +3 s / seat 3 at +11 s / leader at +15 s.

PLAT-004: case-fold.ts now contains NFKC, runtime lowercase, sharp-s and final-sigma handling,
plus the single Greek expansion `ᾲ` → `ὰι`, justified by the retained explicit test.
Compatibility ligatures, Greek sigma and Cherokee equivalence retain regression cases.

Tests are consolidated into filter, names, seats-and-leader, restore and invariants files.
All vocabulary cases from both reviewer probe files and the old tests are unioned without
repeated filter cases: 191 BLOCK and 263 PASS cases. Pure state probes are assertions rather
than logging. The existing two independent 2,500-event deterministic runs retain their golden
hash. Package formatting uses two spaces and lines no longer than 100 characters.

Conflicting earlier expectations, resolved by the explicitly newer rules: Paki, fu-ck,
kan ni na, lan jiao and pu ki previously passed and now block; Pussycat, sial and sial lah
previously blocked and now pass. The fresh probe's array labels are adversarial inputs, not
assertions: names such as Bodoh, Babi, Kok Ass, Nabeh Tan, Punda Lim, Kikes, Tamade, Chee Bai,
Ci Bai Lim and Chinky block under the retained vocabulary and permitted endings. Dykes is
listed under PASS in the brief but explicitly says to block it; its test blocks it.

Known gaps: sh it and sh-it pass by the required shit gap exception; `dick` remains the
accepted D-060 gap. Standalone cb (including fullwidth) and initials before surnames pass.
Unlisted fag, spaz, tard, sb, 屎 and the split phrase gang bang is now blocked. Fuk/fuq
with unrelated endings can pass; Pussycat passes intentionally. Censorship is for symbols
inside letter tokens, not every possible leading/trailing masking or emoji substitution.
Vocabulary, protected names and confusables are finite; no semantic moderation or complete
Unicode case-folding is claimed. Protected names can be chosen abusively, and unprotected
names containing strong roots may be blocked. No browser/phone/storage UAT is claimed.

Evidence: `uat/evidence/C-06-room-state/verify-review-3.log` and
`uat/evidence/C-06-room-state/REPORT-review-3.md`.

## Review round 4

PLAT-005 follows D-067. Room and leader logic are unchanged.

- Roots block inside a token. Across tokens, at least one spanned token must have at most
  two letters. Joining ordinary words alone no longer blocks. `shit` never crosses gaps.
- `porn` and `phuk` are whole tokens with the existing endings. Added whole tokens: porno,
  pornhub, pornstar, phuking and phuker. Thai names and Phuket now pass.
- Protection applies to a root within its protected token only. Removing the protected stem
  must leave no match for that root. The shita suffix protects only shit; other roots and
  another shit before that suffix still block. Shitake and Shiitake are protected.
- Each maximal run of at least three single-letter tokens is checked against roots and
  whole tokens anywhere. Two initials are checked only when they form the entire name.
- `chi bai` is an explicit phrase, including within a longer name.

Authored vocabulary: 64 roots and 123 whole tokens (187 entries), 11 phrases, 44 protected
names, the shita suffix rule and the numeric check. English has 27 roots and 75 tokens;
other group counts are unchanged from round 3.

Tests: all 126 names in the supplied reviewer array are individually asserted (the brief
calls it 130). All existing cases are retained, except the conflicting blow job expectation
below. There are 249 BLOCK and 340 PASS nickname cases, plus one skeleton test. Added explicit
protected-stem regressions and every required outcome. Both deterministic 2,500-event runs
pass with the existing golden hash; no hash regeneration was needed.

Conflicts and explicit resolutions:

- Grandmother Fu is required to PASS, but its motherf match spans a two-letter Fu token.
  A narrow motherf-only exception for these neighbouring tokens honours the explicit PASS.
- Existing blow job BLOCK conflicts with the new ordinary-token rule (both tokens exceed
  two letters). It now PASSes under D-067. No explicit phrase for it was requested.
- Chi Bai appears in the PASS paragraph but explicitly says to move it to BLOCK; it blocks.

Known gaps: sh it and sh-it pass under the shit gap exception. Dick, cb with a surname,
joins of two ordinary words, and unlisted vocabulary such as spaz, tard and fag
pass. Bare cb also passes; c b alone blocks. The Grandmother Fu exception is deliberately
narrow. Finite vocabulary, protected names and confusables cannot provide complete moderation;
other false positives and evasions remain possible. No browser UAT or independent review is
claimed for this pure filter change.

Evidence: `uat/evidence/C-06-room-state/verify-review-4.log` and
`uat/evidence/C-06-room-state/REPORT-review-4.md`.

## Requests

Integrator: independently review, update shared trackers and commit after approval.
No merge or push performed.

C-05: supply host-minted tokens and authenticated device/connection/seat bindings; route seat
notices privately, honour close effects, and publish only publicRoom. Call restore on persisted
host reload before accepting phones. Schedule expire for prompt timer handling; valid events
also evaluate expiry/election lazily. Host-internal refusals must not become protocol refusals.

C-07/C-08 and session runner: consume effects, use isRoomLeader for permissions, set game join
policy explicitly, and apply each game's mid-session admission rules using midGameJoin.
C-11 and C-07 own behavior for the currently inert team and quality hooks respectively.
