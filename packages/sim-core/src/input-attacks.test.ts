import { describe, expect, it } from 'vitest';
import { copyFrame, createInputBuffer } from './input';
import type { InputBuffer } from './input';
import { createRng, nextInt } from './rng';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('missing test data');
  return value;
}

const M = 65536;
const A = 1, B = 2;
function setup(stale = 0, ids = ['p']): InputBuffer<string> {
  const b = createInputBuffer<string>({ seqModulus: M, staleAfterSteps: stale });
  for (const id of ids) b.add(id);
  return b;
}
function s(b: InputBuffer<string>, id = 'p') { const f = required(b.sample().get(id)); return copyFrame(f); }
function sAll(b: InputBuffer<string>) { const m = b.sample(); const o: Record<string, ReturnType<typeof copyFrame>> = {}; for (const [k, v] of m) o[k] = copyFrame(v); return o; }

describe('NET-005 reviewer attacks', () => {
  it('X1 rule c: a LATE up tick after silence rearms, so the re-press counts', () => {
    const b = setup(15);
    b.receive('p', 0, A);
    for (let i = 0; i < 15; i++) s(b);
    expect(s(b)).toMatchObject({ held: 0, released: A });
    b.receive('p', 1, A);
    b.receive('p', 3, A); // tick 2 delayed
    expect(s(b)).toMatchObject({ held: A, pressed: 0 });
    expect(b.receive('p', 2, 0)).toBe('late'); // shows A up: rearm; press at 3 is real
    expect(s(b)).toMatchObject({ held: A, released: A, pressed: A });
  });

  it('X1b in-order equivalent of X1 for comparison', () => {
    const b = setup(15);
    b.receive('p', 0, A);
    for (let i = 0; i < 15; i++) s(b);
    s(b);
    b.receive('p', 1, A);
    s(b);
    b.receive('p', 2, 0);
    b.receive('p', 3, A);
    expect(s(b)).toMatchObject({ held: A, released: A, pressed: A });
  });

  it('X2 exact duplicate of an applied tick while queue non-empty is stale', () => {
    const b = setup();
    b.receive('p', 0, A); b.receive('p', 1, 0); b.receive('p', 2, A);
    expect(b.receive('p', 1, 0)).toBe('stale');
    expect(b.receive('p', 0, A)).toBe('stale');
  });

  it('X3 axes during deferral never go backwards and catch up', () => {
    const b = setup();
    b.receive('p', 0, A, [0.1, 0]); b.receive('p', 1, 0, [0.2, 0]);
    b.receive('p', 2, A, [0.3, 0]); b.receive('p', 3, 0, [0.4, 0]);
    b.receive('p', 1, 0, [0.2, 0]); // duplicate of applied, axes older
    const f1 = s(b); const f2 = s(b); const f3 = s(b);
    expect(f1.axes[0]).toBeCloseTo(0.2);
    expect(f2.axes[0]).toBeCloseTo(0.4);
    expect(f3.axes[0]).toBeCloseTo(0.4);
  });

  it('X4 one player deferring does not delay another', () => {
    const b = setup(0, ['p', 'q']);
    b.receive('p', 0, A); b.receive('p', 1, 0); b.receive('p', 2, A);
    b.receive('q', 0, B);
    let o = sAll(b);
    expect(o.q).toMatchObject({ held: B, pressed: B });
    expect(o.p).toMatchObject({ pressed: A, released: A, held: 0 });
    b.receive('q', 1, 0);
    o = sAll(b);
    expect(o.q).toMatchObject({ held: 0, released: B });
    expect(o.p).toMatchObject({ pressed: A, held: A });
  });

  it('X5 a new button after silence is pressed while the held one stays suppressed', () => {
    const b = setup(15);
    b.receive('p', 0, A);
    for (let i = 0; i < 16; i++) s(b);
    b.receive('p', 1, A | B);
    expect(s(b)).toMatchObject({ held: A | B, pressed: B });
  });

  it('X6 ordinary one-edge-per-step: edge appears in the first sample after arrival (protocol feed, 9 ticks oldest-first)', () => {
    const b = setup(15);
    const masks: number[] = [];
    let worst = 0;
    const rng = createRng(5);
    let phys = 0; let seq = 0; let pendingSince = -1; let pendingKind = 0;
    for (let step = 0; step < 3000; step++) {
      // one tick per step, a change at most every 6 ticks
      if (step % 6 === 0 && nextInt(rng, 0, 1) === 1) { phys ^= A; pendingSince = step; pendingKind = phys ? 1 : 2; }
      masks[seq] = phys;
      for (let k = Math.max(0, seq - 8); k <= seq; k++) b.receive('p', k, required(masks[k]));
      seq++;
      const f = s(b);
      if (pendingSince >= 0) {
        const got = pendingKind === 1 ? f.pressed & A : f.released & A;
        if (got) { worst = Math.max(worst, step - pendingSince); pendingSince = -1; }
      }
    }
    expect(worst).toBe(0);
  });

  it('X7 overflow fuzz: final held equals physical, no release without held', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed);
      const b = setup();
      let phys = 0; let seq = 0; let simHeld = 0;
      const pr = [0, 0]; const rl = [0, 0];
      for (let round = 0; round < 200; round++) {
        const burst = nextInt(rng, 1, 150);
        for (let i = 0; i < burst; i++) {
          if (nextInt(rng, 0, 2) === 0) phys ^= 1 << nextInt(rng, 0, 1);
          b.receive('p', seq % M, phys); seq++;
        }
        const n = nextInt(rng, 0, 3);
        for (let i = 0; i < n; i++) {
          const f = s(b);
          for (let k = 0; k < 2; k++) {
            const bit = 1 << k;
            if (f.released & bit) { expect((simHeld & bit) || (f.pressed & bit)).toBeTruthy(); rl[k] = (rl[k] ?? 0) + 1; }
            if (f.pressed & bit) pr[k] = (pr[k] ?? 0) + 1;
          }
          simHeld = f.held;
        }
      }
      for (let i = 0; i < 70; i++) { const f = s(b); for (let k = 0; k < 2; k++) { if (f.released & (1 << k)) rl[k] = (rl[k] ?? 0) + 1; if (f.pressed & (1 << k)) pr[k] = (pr[k] ?? 0) + 1; } simHeld = f.held; }
      expect(simHeld).toBe(phys);
      for (let k = 0; k < 2; k++) { expect(required(pr[k])).toBeGreaterThan(0); expect(required(rl[k])).toBeGreaterThan(0); }
    }
  });

  it('X8 wrap: deferral across 65535 -> 0 with duplicates', () => {
    const b = setup();
    const seqs = [65534, 65535, 0, 1, 2];
    const m = [A, 0, A, 0, A];
    for (let i = 0; i < 5; i++) b.receive('p', required(seqs[i]), required(m[i]));
    for (let i = 4; i >= 0; i--) b.receive('p', required(seqs[i]), required(m[i]));
    expect(s(b)).toMatchObject({ pressed: A, released: A, held: 0, seq: 65535 });
    expect(s(b)).toMatchObject({ pressed: A, released: A, held: 0, seq: 1 });
    expect(s(b)).toMatchObject({ pressed: A, released: 0, held: A, seq: 2 });
    expect(s(b)).toMatchObject({ pressed: 0, released: 0, held: A });
  });

  it('X9 D-068: 0.6 s at 120 Hz with ten taps collapses within four samples', () => {
    const b = setup();
    b.receive('p', 0, 0); s(b);
    let seq = 1; let taps = 0;
    for (let t = 0; t < 72; t++) { const m = t < 70 && (t % 7) < 3 ? A : 0; if (t % 7 === 0 && t < 70) taps++; b.receive('p', seq++, m); }
    let got = 0; let last = -1; let balance = 0;
    for (let i = 0; i < 80; i++) { const f = s(b); if (f.pressed & A) { got++; last = i; balance++; } if (f.released & A) balance--; expect(balance).toBe(f.held & A); if (i >= 4) expect(f.held).toBe(0); }
    expect(taps).toBe(10);
    expect(got).toBeLessThan(taps);
    expect(last).toBeLessThanOrEqual(4);
    expect(balance).toBe(0);
  });

  it('X12 a single B tap inside a collapsed span (A backlog) is kept as press+release', () => {
    const b = setup();
    let seq = 0;
    // A mashed fast: press,release,press,release,... B tapped once in the middle
    for (let t = 0; t < 40; t++) { let m = t % 2 === 0 ? A : 0; if (t === 30) m |= B; b.receive('p', seq++, m); }
    let bp = 0, br = 0;
    for (let i = 0; i < 30; i++) { const f = s(b); if (f.pressed & B) bp++; if (f.released & B) br++; }
    expect([bp, br]).toEqual([1, 1]);
  });

  it('X13 collapse of one player leaves another untouched', () => {
    const b = setup(0, ['p', 'q']);
    let seq = 0;
    for (let t = 0; t < 40; t++) b.receive('p', seq++, t % 2 === 0 ? A : 0);
    let qp = 0;
    for (let i = 0; i < 8; i++) { b.receive('q', i, i % 2 === 0 ? B : 0); const o = sAll(b); if (required(o.q).pressed & B) qp++; }
    expect(qp).toBe(4);
  });

  it('X14 collapse respects silence suppression, and an UP inside the span re-arms', () => {
    const b = setup(15);
    b.receive('p', 0, A);
    for (let i = 0; i < 16; i++) s(b);
    let seq = 1;
    // B backlog, A held throughout -> no A press after collapse
    for (let t = 0; t < 40; t++) b.receive('p', seq++, A | (t % 2 === 0 ? B : 0));
    let ap = 0; for (let i = 0; i < 10; i++) { const f = s(b); if (f.pressed & A) ap++; expect(f.held & A).toBe(A); }
    expect(ap).toBe(0);
  });

  it('X15 two taps recovered from one 9-tick history both count', () => {
    const b = setup();
    b.receive('p', 0, 0); s(b);
    const m = [0, A, 0, A, 0, 0, 0, 0, 0];
    for (let i = 0; i < 9; i++) b.receive('p', 1 + i, required(m[i]));
    let p = 0; for (let i = 0; i < 4; i++) if (s(b).pressed & A) p++;
    expect(p).toBe(2);
  });

  it('X10 discardEdges with a deep queue after silence gives net state without suppressed press', () => {
    const b = setup(15);
    b.receive('p', 0, A);
    for (let i = 0; i < 16; i++) s(b);
    b.receive('p', 1, A); b.receive('p', 2, A | B); b.receive('p', 3, A); b.receive('p', 4, A | B);
    b.discardEdges();
    expect(s(b)).toMatchObject({ held: A | B, pressed: B, released: 0 });
  });

  it('X11 queued duplicate is stale; newest state survives the wait cap', () => {
    const b = setup();
    for (let q = 0; q < 70; q++) b.receive('p', q, q % 2 ? 0 : A);
    expect(b.receive('p', 50, A)).toBe('stale');
    expect(b.receive('p', 71, A)).toBe('applied');
    let held = -1; for (let i = 0; i < 70; i++) held = s(b).held;
    expect(held).toBe(A);
  });
});
