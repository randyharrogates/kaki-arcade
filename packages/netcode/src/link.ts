import { isNewerSeq } from '@kaki/protocol';
import type { LinkQuality } from '@kaki/protocol';
import type { PeerConnection } from './interfaces';

export interface LinkSnapshot {
  medianMs: number | null;
  p95Ms: number | null;
  loss: number;
  quality: LinkQuality;
  path: 'unknown' | 'direct' | 'relayed';
}
/** Last 128 wire sequence positions (not expanded history); reorder repairs estimated loss. */
export class LinkMeter {
  private readonly seen = new Set<number>();
  private newest: number | null = null;
  private span = 0;
  private readonly rtts: number[] = [];
  private weak = false;
  private recovering = 0;
  private path: LinkSnapshot['path'] = 'unknown';
  get pathKnown(): boolean { return this.path !== 'unknown'; }
  sequence(seq: number): void {
    if (this.newest === null) { this.newest = seq; this.span = 1; }
    else if (isNewerSeq(seq, this.newest)) {
      this.span = Math.min(128, this.span + ((seq - this.newest) & 65535));
      this.newest = seq;
    }
    if (((this.newest - seq) & 65535) < this.span) this.seen.add(seq);
    for (const old of this.seen) if (((this.newest - old) & 65535) >= this.span) this.seen.delete(old);
  }
  rtt(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.rtts.push(ms);
    if (this.rtts.length > 60) this.rtts.shift();
  }
  async inspect(connection: PeerConnection): Promise<void> {
    if (!connection.getStats) return;
    try {
      const stats = await connection.getStats();
      let selected: string | undefined;
      for (const stat of stats.values()) if (stat.type === 'transport') selected = stat.selectedCandidatePairId;
      let pair = selected === undefined ? undefined : stats.get(selected);
      pair ??= [...stats.values()].find((stat) => stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded');
      if (!pair) return;
      const local = stats.get(pair.localCandidateId ?? '')?.candidateType;
      const remote = stats.get(pair.remoteCandidateId ?? '')?.candidateType;
      if (local === 'relay' || remote === 'relay') this.path = 'relayed';
      else if (local !== undefined && remote !== undefined) this.path = 'direct';
    } catch { /* Optional stats can fail during teardown. */ }
  }
  /** Sample once per measurement interval; three healthy intervals recover from weak. */
  snapshot(): LinkSnapshot {
    const sorted = this.rtts.slice().sort((a, b) => a - b);
    const medianMs = sorted.length === 0 ? null : sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
    const p95Ms = sorted.length === 0 ? null : sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null;
    const loss = this.span === 0 ? 0 : (this.span - this.seen.size) / this.span;
    if ((p95Ms ?? 0) > 100 || loss > 0.1) { this.weak = true; this.recovering = 0; }
    else if (this.weak && p95Ms !== null && p95Ms < 70 && loss < 0.03) {
      if (++this.recovering >= 3) this.weak = false;
    } else this.recovering = 0;
    return { medianMs, p95Ms, loss, path: this.path,
      quality: this.path === 'relayed' ? 'relayed' : this.weak ? 'weak' : 'good' };
  }
}
