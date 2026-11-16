# F-02b acceptance report

- PASS — fixed button bits and positional names: `audit.md`, protocol input/wire tests,
  platform `button-protocol.test.ts` in the full verify run.
- PASS — retired and unknown openings use the same invalid-message response and close:
  core room parameterised test; `focused.log`.
- PASS — shared host subprotocol builder/parser and unchanged upgrade authentication:
  protocol helper tests and all signal adapter tests; `focused.log`.
- PASS — created retains hostToken and reopened as the first host message:
  existing adapter lifecycle tests; `focused.log`.
- PASS — opening-timeout is decoded by both client roles and emitted on deadlines:
  protocol signal tests and adapter alarm/lazy deadline tests; `focused.log`.
- PASS — every server message still decodes: existing seeded lifecycle property test;
  `focused.log` and full `verify.log`.
- PASS — full pnpm verify: 52 files passed, 1,901 tests passed, one existing skip;
  build and trace passed. `verify.log`.
- PASS — smoke script syntax: `node --check apps/signal/scripts/smoke.mjs` (exit 0).
  No smoke execution, Wrangler or Cloudflare contact.

No visible change, so no screenshot UAT. The integrator owns independent review.
Default parallel retries encountered unrelated existing test timeouts; `verify-timeouts.log`
retains one failure. No checks or thresholds were loosened. The passing invocation was:

```sh
npm_config_script_shell="$PWD/uat/evidence/F-02b-protocol-cleanup/verify-shell.sh" pnpm verify
```

The shell override requests reduced Vitest concurrency; its effective worker count was not
verified. All 52 files and every verify stage ran. The exact wrapper is retained as evidence.

Git staging was denied writing the parent repository's worktree index lock outside this
sandbox. Changes remain in this worktree for the integrator to stage and commit.
Requests and version rationale are in `docs/slices/F-02b-protocol-cleanup.md`.
