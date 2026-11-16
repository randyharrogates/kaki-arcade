import { describe, expect, it } from 'vitest';
import { hashState } from '@kaki/sim-core';
import { dots } from '../test-fixtures/dots.fixture';
import { picks, PICKS_DATA } from '../test-fixtures/picks.fixture';
import { phasedFixture } from './fixture';
import { createBots, createMatch, dumpView, formatTimeline, makeMatchPlayers, replayMatch } from './index';
import type { PlayerScript } from './index';

const script: PlayerScript = [
  { do: 'stick', x: 1, y: 0, steps: 2 },
  { do: 'until', predicate: { path: ['phase'], value: 'pick' }, maxSteps: 5 },
  { do: 'tap', control: 'pick', value: 'yes' },
  { do: 'press', button: 'faceBottom' }, { do: 'release', button: 'faceBottom' },
];

describe('F-05 headless harness (PLAT-030, NFR-TEST)', () => {
  it.each([1, 8])('phases, secrets and teams: whole scripted and bot matches at %i seats', (count) => {
    for (const bots of [false, true]) {
      const match = createMatch(phasedFixture, { seed: 42, players: count, teams: count > 1,
        context: { data: { questions: ['preloaded'] } } });
      if (bots) createBots(match, { seed: 9 }).step(12);
      else { for (const p of match.players) match.script(p.id, script); match.until((m) => m.isOver, 20); }
      expect(match.isOver).toBe(true);
      expect(match.results().players).toHaveLength(count);
      const file = JSON.parse(JSON.stringify(match.recording())) as ReturnType<typeof match.recording>;
      const replay = replayMatch(phasedFixture, file);
      expect(replay.matches).toBe(true);
      expect(replay.finalHash).toBe(hashState(match.state));
      expect(replay.divergence).toBeNull();
    }
  });
  it.each([1, 8])('existing Dots fixture: whole scripted and bot matches at %i seats', (count) => {
    for (const bots of [false, true]) {
      const match = createMatch(dots, { seed: 7, players: count, settings: { seconds: 10 } });
      if (bots) createBots(match, { seed: 8 }).step(600);
      else { for (const p of match.players) match.script(p.id, [{ do: 'stick', x: 1, y: 0, steps: 600 }]); match.step(600); }
      expect(match.isOver).toBe(true);
      expect(replayMatch(dots, match.recording()).finalHash).toBe(hashState(match.state));
    }
  });
  it.each([1, 8])('existing Picks fixture: whole scripted and bot matches at %i seats', (count) => {
    for (const bots of [false, true]) {
      const match = createMatch(picks, { seed: 9, players: count, context: { data: PICKS_DATA } });
      if (bots) {
        const controllers = createBots(match, { seed: 10 });
        for (let i = 0; i < 20000 && !match.isOver; i += 1) controllers.step();
      } else {
        for (const p of match.players) match.script(p.id, [{ do: 'wait', steps: 1 }]);
        match.until((m) => m.isOver, 20000);
      }
      expect(match.isOver).toBe(true);
      expect(replayMatch(picks, match.recording()).matches).toBe(true);
    }
  });
  it('team rosters and private panels retain secrets until reveal', () => {
    const match = createMatch(phasedFixture, { seed: 1, players: 2, teams: true });
    const own = match.privateViewFor('p1');
    expect(JSON.stringify(own)).toContain('private-p1-');
    expect(JSON.stringify(match.privateViewFor('p2'))).not.toContain('private-p1-');
    expect(JSON.stringify(match.publicView())).not.toContain('private-p1-');
    expect(match.results().mode).toBe('teams');
    expect(match.results().teams).toHaveLength(2);
    expect(phasedFixture.secrets(match.state)).toHaveLength(3);
    match.step(9);
    expect(phasedFixture.secrets(match.state)).toEqual([]);
    expect(JSON.stringify(match.publicView())).toContain('revealed');
  });
  it('bots honour audience, disabled controls and current held layout with zero or biased weights', () => {
    const guarded = { ...phasedFixture, step: (...args: Parameters<typeof phasedFixture.step>) => {
      const [state, inputs] = args;
      for (const [id, frame] of inputs.frames) {
        expect(frame.held & ~(1 << 4)).toBe(0); // Only faceBottom is offered.
        expect(frame.axes.slice(2)).toEqual([0, 0]);
        for (const action of inputs.actions.filter((a) => a.player === id)) {
          expect(action.value).not.toBe('no');
          if (id !== inputs.leader) expect(action.control).not.toBe('lead');
        }
      }
      return phasedFixture.step(state, inputs, args[2]);
    } };
    const match = createMatch(guarded, { seed: 1, players: 8 });
    createBots(match, { seed: 8, weights: { idle: 0, tap: 10, button: 2 } }).step(12);
    expect(match.isOver).toBe(true);
    const idle = createMatch(phasedFixture, { seed: 1, players: 1 });
    createBots(idle, { seed: 1, weights: { idle: 0, tap: 0, stick: 0, button: 0, tilt: 0, shake: 0 } }).step(12);
    expect(idle.results().players[0]?.score).toBe(0);
  });
  it('scripts are saveable and concurrent, exact stick duration and press/release edges', () => {
    const match = createMatch(dots, { seed: 1, players: 2 });
    const p1 = match.state.dots[0];
    match.script('p1', JSON.parse(JSON.stringify([{ do: 'stick', x: 1, y: 0, steps: 2 }, { do: 'wait', steps: 2 }])) as PlayerScript);
    match.script('p2', [{ do: 'press', button: 'faceBottom' }, { do: 'release', button: 'faceBottom' }]);
    match.step(2);
    expect((match.state.dots[0]?.x ?? 0) - (p1?.x ?? 0)).toBeCloseTo(0.2);
    const x = match.state.dots[0]?.x;
    match.step(2); expect(match.state.dots[0]?.x).toBe(x);
  });
  it('refused taps explain absence, disabled, audience, stale revision; explicit refusal still goes through driver', () => {
    const match = createMatch(phasedFixture, { seed: 1, players: 2 });
    expect(() => match.tap('p1', 'pick', 'yes')).toThrow(/step 1.*no control/);
    match.tap('p1', 'pick', 'yes', true).step(3);
    expect(match.state.players[0]?.score).toBe(0);
    expect(() => match.tap('p1', 'pick', 'no')).toThrow(/disabled/);
    expect(() => match.tap('p2', 'lead', 'go')).toThrow(/leader/);
    expect(() => match.tap('p1', 'pick', 'yes', false, 0)).toThrow(/revision/);
    match.tap('p1', 'pick', 'yes').tap('p1', 'pick', 'yes').step();
    expect(match.state.players[0]?.score).toBe(1);
  });
  it('pause freezes scripts and steps, calls hooks, strips the console button; events replay', () => {
    const match = createMatch(phasedFixture, { seed: 1, players: 1 });
    match.script('p1', script).step(); const before = hashState(match.state);
    match.pause().step(50); expect(match.steps).toBe(1); expect(match.state.paused).toBe(true);
    match.resume(); expect(hashState(match.state)).toBe(before);
    match.press('p1', 'pause').step();
    expect(replayMatch(phasedFixture, match.recording()).matches).toBe(true);
  });
  it('join/leave applies while short of players; empty teams block steps; disconnect has no inputs', () => {
    const match = createMatch(phasedFixture, { seed: 2, players: 2, teams: true });
    match.step(); match.leave('p2').step(10); expect(match.steps).toBe(1);
    const p2 = makeMatchPlayers(2, true)[1]; if (!p2) throw new Error('fixture');
    match.join(p2).disconnect('p1').press('p1', 'faceBottom').step();
    expect(match.state.players[0]?.score).toBe(0);
    expect(match.state.players[1]?.joinedMidGame).toBe(true);
    expect(match.layoutFor('p2').controls.some((c) => c.id === 'lead')).toBe(false); // prepare
    match.reconnect('p1').step();
    expect(match.privateViewFor('p2')?.blocks).toHaveLength(1);
    expect(replayMatch(phasedFixture, match.recording()).matches).toBe(true);
  });
  it('first divergent simulation step reports a public diff, including init-only divergence', () => {
    const match = createMatch(phasedFixture, { seed: 1, players: 1, hashEvery: 1 }); match.step(12);
    const changed = { ...phasedFixture, step: (...args: Parameters<typeof phasedFixture.step>) => {
      const state = phasedFixture.step(...args); return state.tick === 4 ? { ...state, phase: 'changed' } : state;
    } };
    const result = replayMatch(changed, match.recording(), { referenceGame: phasedFixture });
    expect(result.matches).toBe(false);
    expect(result.divergence).toMatchObject({ event: 4, step: 4, diff: ['$.phase: "pick" -> "changed"'] });
    const initChanged = { ...phasedFixture, init: (...args: Parameters<typeof phasedFixture.init>) => ({ ...phasedFixture.init(...args), phase: 'new' }) };
    expect(replayMatch(initChanged, match.recording()).divergence?.step).toBe(0);
  });
  it('seeded chaos records joins, leaves and connectivity deterministically, independent of batching', () => {
    const a = createMatch(phasedFixture, { seed: 1, players: 8 });
    const b = createMatch(phasedFixture, { seed: 1, players: 8 });
    const options = { seed: 77, chaos: { probability: 0.8 } };
    createBots(a, options).step(120);
    const bot = createBots(b, options); bot.step(40); bot.step(80);
    expect(a.recording()).toEqual(b.recording());
    expect(replayMatch(phasedFixture, a.recording()).matches).toBe(true);
    expect(a.recording().views).toEqual([]);
  });
  it('stable one-screen dumps sort keys, truncate arrays with counts and bound depth/width', () => {
    expect(dumpView({ z: 2, a: [0, 1, 2, 3, 4, 5, 6] })).toBe('{\n  "a": [\n    0,\n    1,\n    2,\n    3,\n    4,\n    "… 2 more (7 total)"\n  ],\n  "z": 2\n}');
    expect(dumpView({ b: 2, a: 1 })).toBe(dumpView({ a: 1, b: 2 }));
    const match = createMatch(phasedFixture, { seed: 42, players: 1 }).script('p1', script); match.step(12);
    expect(formatTimeline(match.timeline)).toBe('     0  phase="prepare"\n     3  phase="pick"\n     9  phase="reveal"\n    12  phase="over"');
  });
  it('invalid setup and unresolved waits fail promptly', () => {
    expect(() => createMatch(phasedFixture, { seed: -1, players: 1 })).toThrow(/seed/);
    expect(() => createMatch(phasedFixture, { seed: 1, players: 1, settings: { length: 13 } })).toThrow();
    const match = createMatch(phasedFixture, { seed: 1, players: 1 });
    expect(() => match.until(() => false, 2)).toThrow(/until/);
    match.script('p1', [{ do: 'until', predicate: { path: ['phase'], value: 'missing' }, maxSteps: 1 }]);
    expect(() => match.step(2)).toThrow(/timed out/);
  });
});
