# Track S — Risk spikes

Throwaway proofs that answer the M2 exit questions in `ROADMAP.md` with measured numbers. Code lives in `spikes/` and is never imported by the product. Results go to `STATUS.md` and `DECISIONS.md`; a result that contradicts the plan stops for Randy.

**Owns:** `spikes/`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story S1 — We know the risky parts work before building on them



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| S-01 | Network spike: 8 emulated phones plus Randy's real iPhone and Android driving dots on a host page over WebRTC, input delay measured and shown; Cloudflare quick tunnel for HTTPS; one run forced through the relay | NN-3, PERF-010, PERF-011, NET-002, NET-003 | F-01 | 0 | todo |
| S-02 | Art pipeline spike: one rigged toy cook walking in 8 directions, rendered to an atlas with a head overlay; time per character and atlas sizes recorded | NN-4, TR-060, PERF-023, PERF-024 | G-01 | 1 | todo |
| S-03 | TV spike: a sprite stress page on the TCL Q65's own browser, with frame times and memory headroom; decides TV or MacBook-on-HDMI | REL-005, PERF-002 | F-01 | 0 | todo |
| S-04 | Renderer and shell decision: PixiJS and Preact confirmed or replaced, from S-01 to S-03 numbers and bundle sizes | PERF-001, PERF-020, PERF-022 | S-01, S-03 | 1 | todo |
| S-05 | iPhone Safari and Android Chrome capability check on real phones: wake lock, motion permission, fullscreen, vibration, pull-to-refresh | CTRL-004, CTRL-006, CTRL-007 | S-01 | 0 | todo |
