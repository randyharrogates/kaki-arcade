import { describe, expect, it } from 'vitest';
import { cloneState, decodeState, encodeState, hashState } from '@kaki/sim-core';
import { dots } from '../test-fixtures/dots.fixture';
import { phasedFixture } from './fixture';
import { createMatch, createBots, parseRecording, replayMatch, makeMatchPlayers } from './index';
import type { MatchEvent } from './index';
const setup = { hashEvery: 1, seed: 42, players: 2 };
describe('F-05 review regressions (PLAT-030, NFR-TEST)', () => {
  it('eight players over 210 seconds retain inputs and 12,600 hashes under 1.5 MB', () => {
    const players = makeMatchPlayers(8);
    const state = dots.init(42, players, { seconds: 60, gemPoints: 1, wrap: false }, { data: {}, saved: null, teams: false });
    const m = createMatch(dots, { hashEvery: 1, seed: 42, players, state: { ...state, leftSteps: 12600 } });
    for (const p of players) m.stick(p.id, 1, 0.3);
    expect(m.step(12600)).toBe(12600);
    const file = parseRecording(JSON.stringify(m.recording()));
    expect(file.recording.hashes).toHaveLength(12600);
    expect(file.views).toEqual([]);
    expect(file.recording.runs).toHaveLength(1);
    expect(JSON.stringify(file).length).toBeLessThan(1_500_000);
    expect(replayMatch(dots, file).matches).toBe(true);
  });
  it('hidden-state and private-view diffs are explicitly opt-in', () => {
    const m = createMatch(phasedFixture, setup); m.step(2);
    const changed = { ...phasedFixture, step: (...args: Parameters<typeof phasedFixture.step>) => {
      const next = phasedFixture.step(...args); return { ...next, secret: 'changed', cards: { ...next.cards, p1: 'changed card' } };
    } };
    expect(replayMatch(changed, m.recording(), { referenceGame: phasedFixture }).divergence?.diff).toEqual([]);
    expect(replayMatch(changed, m.recording(), { referenceGame: phasedFixture, diff: 'state' }).divergence?.diff.some((d) => d.includes('secret'))).toBe(true);
    expect(replayMatch(changed, m.recording(), { referenceGame: phasedFixture, diff: 'private', player: 'p1' }).divergence?.diff.some((d) => d.includes('changed card'))).toBe(true);
  });
  it('bots optionally press disabled held buttons and observe manual reconnect/leave', () => {
    const game = { ...phasedFixture, controllerLayout: () => ({ revision: 0, controls: [{ kind: 'button' as const, id: 'dim', button: 'face-bottom' as const, disabled: true, label: 'Dim' }] }) };
    const m = createMatch(game, setup);
    const bots = createBots(m, { seed: 1, pressDisabled: true, weights: { idle: 0, button: 1 }, chaos: { probability: 0 } });
    m.disconnect('p1'); bots.step(); expect(m.state.players[0]?.score).toBe(0);
    m.reconnect('p1'); bots.step(); expect(m.state.players[0]?.score).toBe(1);
    m.leave('p1'); bots.step(); expect(m.players.map((p) => p.id)).toEqual(['p2']);
    const idle = createMatch(game, setup); createBots(idle, { seed: 1 }).step(12); expect(idle.state.players[0]?.score).toBe(0);
  });
  it('RLE retains exact sampled sequence counters, per-event hashes and optional snapshots', () => {
    const game = { ...phasedFixture, step: (...args: Parameters<typeof phasedFixture.step>) => {
      const next = phasedFixture.step(...args);
      return { ...next, players: next.players.map((p) => ({ ...p, score: p.score + (args[1].frames.get(p.info.id)?.seq ?? 0) })) };
    } };
    const m = createMatch(game, { ...setup, viewEvery: 4 }); m.step(12);
    const file = parseRecording(JSON.stringify(m.recording()));
    expect(file.recording.hashes).toHaveLength(12);
    expect(file.recording.runs).toHaveLength(1);
    expect(file.views.map((snapshot) => snapshot.event)).toEqual([4, 8, 12]);
    expect(m.state.players[0]?.score).toBe(66);
    expect(replayMatch(game, file).matches).toBe(true);
  });
  it('rejects undrawn held calls; forced calls are sanitised at sampling and disabled drawn presses arrive', () => {
    const game = { ...phasedFixture, controllerLayout: () => ({ revision: 0, controls: [{ kind: 'button' as const, id: 'dim', button: 'face-bottom' as const, disabled: true, label: 'Dim' }] }) };
    const m = createMatch(game, setup);
    expect(() => m.stick('p1', 1, 1)).toThrow(/stick.*not drawn/);
    expect(() => m.tilt('p1', 1, 1)).toThrow(/tilt.*not drawn/);
    expect(() => m.press('p1', 'shoulderLeft')).toThrow(/shoulderLeft.*not drawn/);
    m.stick('p1', 1, 1, true).tilt('p1', 1, 1, true).press('p1', 'shoulderLeft', true).press('p1', 'faceBottom').step();
    const event = decodeState(m.recording().recording.runs[0]?.event) as MatchEvent;
    if (event.kind !== 'tick') throw new Error('tick expected');
    expect(event.tick.frames.get('p1')?.axes).toEqual([0, 0, 0, 0]);
    expect(event.tick.frames.get('p1')?.held).toBe(1 << 4);
    expect(m.state.players[0]?.score).toBe(1);
    expect(replayMatch(game, m.recording()).matches).toBe(true);
  });
  it('layout transitions clear held axes and buttons, including audience changes', () => {
    const game = { ...phasedFixture, controllerLayout: (state: Parameters<typeof phasedFixture.controllerLayout>[0]) => ({ revision: state.tick,
      controls: state.tick === 0 ? [{ kind: 'stick' as const, id: 'stick' }, { kind: 'button' as const, id: 'button', button: 'face-bottom' as const, label: 'Go' }] : [] }) };
    const m = createMatch(game, setup); m.stick('p1', 1, 0).press('p1', 'faceBottom').step(2);
    const event = decodeState(m.recording().recording.runs[1]?.event) as MatchEvent;
    if (event.kind !== 'tick') throw new Error('tick expected');
    expect(event.tick.frames.get('p1')?.axes).toEqual([0, 0, 0, 0]);
    expect(event.tick.frames.get('p1')?.held).toBe(0);
    expect(event.tick.frames.get('p1')?.released).toBe(1 << 4);
  });
  it('leadership is sticky across disconnects and lower-seat joins, explicit hand-over, and leave', () => {
    const reversed = createMatch(phasedFixture, { seed: 42, players: makeMatchPlayers(2).reverse() }); reversed.step(3);
    expect(reversed.layoutFor('p2').controls.some((c) => c.id === 'lead')).toBe(true);
    const m = createMatch(phasedFixture, setup); m.step(3); m.disconnect('p1');
    expect(m.layoutFor('p2').controls.some((c) => c.id === 'lead')).toBe(false);
    m.setLeader('p2').reconnect('p1');
    expect(m.layoutFor('p2').controls.some((c) => c.id === 'lead')).toBe(true);
    m.leave('p2'); expect(m.layoutFor('p1').controls.some((c) => c.id === 'lead')).toBe(true);
    const p2 = makeMatchPlayers(2)[1]; if (!p2) throw new Error('player'); m.join(p2);
    expect(m.layoutFor('p2').controls.some((c) => c.id === 'lead')).toBe(false);
    m.tap('p1', 'lead', 'go').step(); expect(replayMatch(phasedFixture, m.recording()).matches).toBe(true);
  });
  it('a completed stick script resets once and permits immediate manual replacement', () => {
    const m = createMatch(phasedFixture, setup); m.script('p1', [{ do: 'stick', x: 1, y: 0, steps: 1 }]).step();
    m.stick('p1', 0.5, 0).step(2);
    const events = m.recording().recording.runs.map((run) => decodeState(run.event) as MatchEvent);
    const last = events.at(-1); expect(last?.kind === 'tick' && last.tick.frames.get('p1')?.axes[0]).toBe(0.5);
    const n = createMatch(phasedFixture, setup); n.script('p1', [{ do: 'stick', x: 1, y: 0, steps: 1 }]).step(2);
    n.stick('p1', 0.75, 0).step(2);
    const end = decodeState(n.recording().recording.runs.at(-1)?.event) as MatchEvent;
    expect(end.kind === 'tick' && end.tick.frames.get('p1')?.axes[0]).toBe(0.75);
  });
  it('reports steps taken and roster/team/pause/over reasons, with custom and terminal timeline entries', () => {
    const m = createMatch(phasedFixture, { ...setup, headline: () => 'Serving' });
    expect(m.step(99)).toBe(12); expect(m.blocked).toBe('over'); expect(m.step()).toBe(0);
    expect(m.timeline).toEqual([{ step: 0, text: 'Serving' }, { step: 12, text: 'Serving' }]);
    const n = createMatch(phasedFixture, { ...setup, teams: true }); n.leave('p2');
    expect(n.blocked).toBe('empty team'); expect(n.step(5)).toBe(0); n.leave('p1'); expect(n.blocked).toBe('roster short');
    const p = createMatch(phasedFixture, setup); p.pause(); expect(p.blocked).toBe('paused');
  });
  it('starts from a cloned crafted state and replays it', () => {
    const state = cloneState(createMatch(phasedFixture, setup).state); state.tick = 8; state.phase = 'pick';
    const m = createMatch(phasedFixture, { ...setup, state }); m.step();
    expect(state.tick).toBe(8); expect(m.state.tick).toBe(9); expect(replayMatch(phasedFixture, m.recording()).finalHash).toBe(hashState(m.state));
  });
  it('validates JSON envelope, runs, frame values, snapshots and hash cadence', () => {
    const m = createMatch(phasedFixture, setup); m.step(); const f = m.recording();
    for (const bad of [{}, { ...f, format: 'old' }, { ...f, recording: { ...f.recording, hashes: [] } }, { ...f, views: [{ event: 99, view: {} }] },
      { ...f, recording: { ...f.recording, runs: [{ count: 1, event: encodeState({ kind: 'tick', tick: {} }) }] } }]) expect(() => parseRecording(JSON.stringify(bad))).toThrow();
  });
  it('tapIfOffered skips refused actions and until requires all conditions', () => {
    const m = createMatch(phasedFixture, setup);
    m.script('p1', [{ do: 'tapIfOffered', control: 'pick', value: 'yes' },
      { do: 'until', predicates: [{ path: ['phase'], value: 'pick' }, { path: ['tick'], op: 'gte', value: 4 }], maxSteps: 10 },
      { do: 'tapIfOffered', control: 'pick', value: 'yes' }]);
    m.step(5); expect(m.state.players[0]?.score).toBe(1);
  });
});
