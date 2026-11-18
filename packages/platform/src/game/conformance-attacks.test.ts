import { conformanceTimeout } from './kit';
import { describe, expect, it } from 'vitest';
import {
  keep,
  DOTS_SOURCES,
  PICKS_SOURCES,
  DOTS_SCENARIOS,
  PICKS_SCENARIOS,
  DOTS_ONE,
  DOTS_TEAMS,
  PICKS_ONE,
  brokenDots,
  brokenPicks,
  failed,
  said,
  cloneState,
  dots,
  dotsResults,
  dotsStep,
  PICKS_DATA,
  picks,
  picksStep,
  checkResults,
  formatReport,
  fuzzScript,
  makePlayers,
  runConformance,
} from './conformance-support.test';
import type {
  DotsSettings,
  DotsState,
  PicksSettings,
  PicksState,
  GameModule,
  Scenario,
} from './conformance-support.test';
describe('review round 1 attacks', () => {
  it('requires both endpoint scenarios and whole matches at the minimum', { timeout: conformanceTimeout(1923) }, () => {
    const missing = keep(
      'BROKEN Dots: missing endpoint scenarios',
      runConformance(dots, DOTS_ONE, { sources: DOTS_SOURCES, allowImports: ['vitest'] }),
    );
    expect(said(missing, 'min-players')).toMatch(/no scenario starts with 1 player/);
    const alone = brokenDots('breaks after twenty steps with one player', {
      step(state, inputs, dtMs) {
        if (state.dots.length === 1 && state.leftSteps < 1140)
          throw new Error('needs another player');
        return dotsStep(state, inputs, dtMs);
      },
    });
    expect(said(alone, 'runs')).toMatch(/needs another player/);
  });
  it('requires leave to tolerate zero players and empty teams without scoring', { timeout: conformanceTimeout(2065) }, () => {
    const zero = brokenDots('cannot leave to zero', {
      leave(state, id) {
        const next = dots.leave(state, id);
        if (next.dots.length === 0) throw new Error('empty room');
        return next;
      },
    });
    expect(said(zero, 'min-players')).toMatch(/leave threw.*leaving 0/);
    const team = brokenDots(
      'cannot empty a team',
      {
        leave(state, id) {
          const next = dots.leave(state, id);
          if (next.dots.length > 0 && next.dots.every((d) => d.team === next.dots[0]?.team))
            throw new Error('empty team');
          return next;
        },
      },
      DOTS_TEAMS,
    );
    expect(said(team, 'min-players')).toMatch(/empty team/);
  });
  it('rejects a missing, identity, or partially effective scramble', { timeout: conformanceTimeout(1219) }, () => {
    const missing = { ...picks };
    delete missing.scrambleSecrets;
    const report = keep(
      'BROKEN Picks: missing scramble',
      runConformance(missing, PICKS_ONE, {
        sources: PICKS_SOURCES,
        allowImports: ['vitest'],
        data: PICKS_DATA,
      }),
    );
    expect(said(report, 'secrets')).toMatch(/has no scrambleSecrets/);
    expect(
      said(brokenPicks('identity scramble', { scrambleSecrets: (state) => state }), 'secrets'),
    ).toMatch(/returned the state unchanged/);
    expect(
      said(
        brokenPicks('changes hash but not every secret', {
          scrambleSecrets: (state) => ({ ...state, seal: `${state.seal}!` }),
        }),
        'secrets',
      ),
    ).toMatch(/left the secret "the bonus number"/);
  });
  it('catches a disguised leak on just one other phone and only on some steps', { timeout: conformanceTimeout(241) }, () => {
    const leak = brokenPicks('intermittent flag on just the second phone', {
      privateView(state, id) {
        const view = picks.privateView(state, id);
        if (id !== 'p2' || state.phase !== 'pick' || Math.floor(state.leftSteps) % 7 !== 3)
          return view;
        return {
          revision: 0,
          blocks: [
            ...(view?.blocks ?? []),
            { kind: 'stat', label: 'Ready', value: state.bonusCell % 2 },
          ],
        };
      },
    });
    expect(said(leak, 'secrets')).toMatch(/privateView\(p2\) changes/);
    const disabled = brokenPicks('secret disguised as a disabled flag', {
      controllerLayout(state, id) {
        const layout = picks.controllerLayout(state, id);
        return {
          ...layout,
          controls: [
            ...layout.controls,
            {
              kind: 'button',
              id: 'hint',
              button: 'face-top',
              label: 'Hint',
              disabled: state.bonusCell % 2 === 0,
            },
          ],
        };
      },
    });
    expect(said(disabled, 'secrets')).toMatch(/controllerLayout\(p\d\) changes/);
  });
  it('catches uneven co-op scores, premature results.save and invalid save data', { timeout: conformanceTimeout(106) }, () => {
    const uneven = brokenDots('co-op scores disagree', {
      results: (state) => ({
        mode: 'coop',
        score: 999,
        players: state.dots.map((d) => ({
          id: d.id,
          joinedMidGame: d.joinedMidGame,
          place: 1,
          score: d.score,
        })),
      }),
    });
    expect(said(uneven, 'results')).toMatch(/shared score/);
    const early = brokenDots('obsolete results.save at every step', {
      results: (state) => ({ ...dotsResults(state), save: { best: 1 } }),
    });
    expect(said(early, 'results')).toMatch(/results.save is not read/);
    const save = brokenDots('save returns a Map', { save: () => new Map() as never });
    expect(said(save, 'views-json')).toMatch(/save is \[object Map\]/);
    expect(
      checkResults(
        {
          mode: 'players',
          players: [
            { id: 'p1', score: 0, place: 1 },
            { id: 'p2', score: 0, place: 2 },
          ],
        },
        makePlayers(2, false),
      ).join(),
    ).toMatch(/equal scores share a place/);
  });
  it('catches a global revision counter, including dropped in-flight taps', { timeout: conformanceTimeout(98) }, () => {
    const report = brokenPicks('global revision changes when another player locks', {
      controllerLayout(state, id) {
        const layout = picks.controllerLayout(state, id);
        return {
          ...layout,
          revision:
            state.round * 100 + state.players.reduce((sum, player) => sum + player.revision, 0),
        };
      },
    });
    expect(said(report, 'layout')).toMatch(/although what .* can tap did not change/);
    expect(failed(report)).not.toContain('repeat-taps');
    expect(failed(report)).not.toContain('late-taps');
  });
  it('catches scoring twice or answering while locked in a single step', { timeout: conformanceTimeout(1020) }, () => {
    // A buzzer: first accepted answer locks this player. Wrong answers also lock out.
    // Use the fixture's seeded, secret-bearing state and score reporting.
    const buzzer: GameModule<PicksState, PicksSettings> = {
      ...picks,
      controllerLayout(state, id) {
        const player = state.players.find((p) => p.id === id);
        return {
          revision: 0,
          controls: [
            {
              kind: 'options',
              id: 'answer',
              options: [
                {
                  id: 'cross',
                  label: 'Cross',
                  state: player?.locked === true ? 'disabled' : 'plain',
                },
                {
                  id: 'circle',
                  label: 'Circle',
                  state: player?.locked === true ? 'disabled' : 'plain',
                },
              ],
            },
          ],
        };
      },
      step(state, inputs) {
        for (const action of inputs.actions) {
          const player = state.players.find((p) => p.id === action.player);
          if (player !== undefined && action.control === 'answer') {
            // BROKEN: fails to check player.locked between actions.
            player.score += action.value === 'cross' ? 1 : 2;
            player.locked = true;
          }
        }
        state.leftSteps -= 1;
        return state;
      },
      isOver: (state) => state.leftSteps <= 0,
    };
    const report = keep(
      'BROKEN Picks: buzzer scores twice while locked',
      runConformance(
        buzzer,
        [
          {
            name: 'burst answers',
            players: 4,
            script: fuzzScript({ tapChance: 1, burstChance: 1 }),
          },
        ],
        { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA },
      ),
    );
    expect(said(report, 'repeat-taps')).toMatch(/a second tap.*changed the result/);
  });
});
it('review attack: stepping after the match is over must still be safe', { timeout: conformanceTimeout(283) }, () => {
  const report = brokenDots('throws after over', {
    step(state, inputs, dtMs) {
      if (state.leftSteps <= 0) throw new Error('already finished');
      return dotsStep(state, inputs, dtMs);
    },
  });
  expect(said(report, 'runs')).toMatch(/already finished/);
});
it(
  'review attacks: Map mutation, input frames retained in a closure, ' +
    'and sorting a view in place',
  { timeout: conformanceTimeout(1228) }, () => {
    interface WithMap extends DotsState {
      tally: Map<string, number>;
    }
    const base = dots as unknown as GameModule<WithMap, DotsSettings>;
    const map = keep(
      'BROKEN Dots: step mutates a Map',
      runConformance<WithMap, DotsSettings>(
        {
          ...base,
          init: (seed, players, settings, context) => ({
            ...dots.init(seed, players, settings, context),
            tally: new Map(),
          }),
          step(state, inputs, dtMs) {
            state.tally.set('tick', (state.tally.get('tick') ?? 0) + 1);
            return { ...dotsStep(state, inputs, dtMs), tally: state.tally };
          },
        },
        DOTS_ONE,
        { sources: DOTS_SOURCES, allowImports: ['vitest'] },
      ),
    );
    expect(failed(map)).toContain('state-contract');
    let previous: Parameters<typeof dotsStep>[1]['frames'] | null = null;
    const closure = brokenDots('frames kept outside state', {
      step(state, inputs, dtMs) {
        const frames = previous ?? inputs.frames;
        previous = inputs.frames;
        return dotsStep(state, { ...inputs, frames }, dtMs);
      },
    });
    expect(failed(closure)).toContain('clone');
    const sorts = brokenPicks('view sorts players in place', {
      publicView(state) {
        state.players.sort((a, b) => b.score - a.score);
        return picks.publicView(state);
      },
    });
    expect(failed(sorts)).toContain('views-pure');
  },
);
// Round 2: generic versions of the independent review's shipped-game probes.
it('round 2 catches late joins, last leaves, copies, results leaks and lock then pick', { timeout: conformanceTimeout(3529) }, () => {
  const join = brokenPicks('join throws after round one', {
    join(state, player) {
      if (state.round > 1) throw new Error('late join');
      return picks.join(state, player);
    },
  });
  expect(failed(join)).toContain('min-players');
  const leave = brokenPicks('last leave throws after round one', {
    leave(state, player) {
      if (state.round > 1 && state.players.length === 1) throw new Error('last leave');
      return picks.leave(state, player);
    },
  });
  expect(failed(leave)).toContain('min-players');
  const copy = brokenDots('whole-state copy every step', {
    step: (state, inputs, dt) => cloneState(dotsStep(state, inputs, dt)),
  });
  expect(failed(copy)).toContain('sharing');
  const answer = brokenPicks('hidden answer in results extras', {
    results: (state) => ({ ...picks.results(state), extras: { bonus: state.bonusCell } }),
  });
  expect(failed(answer)).toContain('secrets');
  const counts = brokenPicks('private pick counts in results extras', {
    results: (state) => ({
      ...picks.results(state),
      extras: {
        counts: state.players.map((player) => (player.pick === null ? 0 : 1)),
      },
    }),
  });
  expect(failed(counts)).toContain('secrets');
  const lock = brokenPicks('lock then pick on another control', {
    step(state, inputs, dt) {
      const next = picksStep(state, inputs, dt);
      for (const action of inputs.actions) {
        const player = next.players.find((player) => player.id === action.player);
        if (player?.locked && action.control === 'numbers' && typeof action.value === 'number') {
          player.pick = action.value + 1;
        }
      }
      return next;
    },
  });
  expect(failed(lock)).toContain('repeat-taps');
});
it('round 2 checks private revisions and delayed outcomes independently', { timeout: conformanceTimeout(1496) }, () => {
  const stuck = brokenPicks('private revision stuck', {
    privateView(state, id) {
      const view = picks.privateView(state, id);
      return view === null ? null : { ...view, revision: 0 };
    },
  });
  expect(failed(stuck)).toContain('private-revision');
  const late = brokenPicks('rules depend on accepted tap revision', {
    step(state, inputs, dt) {
      picksStep(state, inputs, dt);
      state.best += inputs.actions[0]?.revision ?? 0;
      return state;
    },
  });
  expect(failed(late)).toContain('late-taps');
  expect(failed(late)).not.toContain('layout');
  expect(failed(late)).not.toContain('repeat-taps');
});
it('round 2 allows co-op late joiners sharing the existing score', { timeout: conformanceTimeout(4772) }, () => {
  const coop: GameModule<DotsState, DotsSettings> = {
    ...dots,
    meta: { ...dots.meta, coop: true, teams: 'none' },
    results(state) {
      const score = state.settings.seconds * 60 - state.leftSteps;
      return {
        mode: 'coop',
        score,
        players: state.dots.map((dot) => ({
          id: dot.id,
          place: 1,
          score,
          joinedMidGame: dot.joinedMidGame,
        })),
      };
    },
  };
  const scenarios: Scenario<DotsSettings>[] = [
    { name: 'solo co-op', players: 1 },
    { name: 'full co-op', players: 8 },
    {
      name: 'late co-op join',
      players: 4,
      script: (context) => (context.step === 900 ? { join: 1 } : {}),
    },
  ];
  const options = { sources: DOTS_SOURCES, allowImports: ['vitest'] };
  const honest = keep('Co-op Dots, late join', runConformance(coop, scenarios, options));
  expect(honest.ok, formatReport(honest)).toBe(true);
  const zero = keep(
    'BROKEN Co-op Dots: joiner score zero',
    runConformance(
      {
        ...coop,
        results(state) {
          const results = coop.results(state);
          return {
            ...results,
            players: results.players.map((row) => ({
              ...row,
              score: row.joinedMidGame ? 0 : row.score,
            })),
          };
        },
      },
      scenarios.filter((scenario) => scenario.name === 'late co-op join'),
      { ...options, stopOnFailure: ['results'] },
    ),
  );
  expect(failed(zero)).toContain('results');
});

it('round 2 allows text-only layout revisions when no tap could be in flight', { timeout: conformanceTimeout(3086) }, () => {
  const report = keep(
    'Dots text-only screens',
    runConformance(
      {
        ...dots,
        controllerLayout: (state) => ({
          revision: state.settings.seconds * 60 - state.leftSteps,
          controls: [{ kind: 'text', id: 'clock', text: String(state.leftSteps) }],
        }),
      },
      DOTS_SCENARIOS.filter((_, index) => index !== 1),
      { sources: DOTS_SOURCES, allowImports: ['vitest'] },
    ),
  );
  expect(report.ok, formatReport(report)).toBe(true);
});

it('round 3 permits needless private revisions', { timeout: conformanceTimeout(5694) }, () => {
  const report = keep('Picks needless private revisions', runConformance({ ...picks,
    privateView(state, id) {
      const view = picks.privateView(state, id);
      return view === null ? null : { ...view, revision: state.ticks };
    },
  }, [PICKS_SCENARIOS[1], PICKS_SCENARIOS[2]].filter((v): v is Scenario<PicksSettings> => v !== undefined), { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA }));
  expect(report.ok, formatReport(report)).toBe(true);
});

it('round 2 repeat probes respect the original control audience', { timeout: conformanceTimeout(2039) }, () => {
  const guarded: GameModule<PicksState, PicksSettings> = {
    ...picks,
    // This audience probe exercises the legacy control-only phone contract.
    privateView: () => null,
    controllerLayout(state, id) {
      const layout = picks.controllerLayout(state, id);
      return {
        ...layout,
        controls: [
          ...layout.controls,
          {
            kind: 'options',
            id: 'leader-only',
            audience: 'leader',
            options: [{ id: 'go', label: 'Host check' }],
          },
        ],
      };
    },
    step(state, inputs, dt) {
      if (
        inputs.actions.some(
          (action) => action.control === 'leader-only' && action.player !== inputs.leader,
        )
      ) {
        throw new Error('host must filter the audience before delivery');
      }
      return picksStep(state, inputs, dt);
    },
  };
  const report = keep(
    'Picks with a leader-only control',
    runConformance(
      guarded,
      [PICKS_SCENARIOS[1], PICKS_SCENARIOS[2]].filter(
        (value): value is Scenario<PicksSettings> => value !== undefined,
      ),
      { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA },
    ),
  );
  expect(report.ok, formatReport(report)).toBe(true);
});

describe('review round 4 attacks', () => {
  it('fails when cosmetic labels and revisions change every step and drop all delayed taps', { timeout: conformanceTimeout(1172) }, () => {
    const report = keep('BROKEN Picks: cosmetic labels change every step with revision bumps', runConformance({ ...picks,
      controllerLayout(state, id) {
        const layout = picks.controllerLayout(state, id);
        const step = state.round * 10000 + 1000 - state.leftSteps +
          (state.phase === 'reveal' ? 2000 : state.phase === 'over' ? 4000 : 0);
        return {
          ...layout,
          revision: step,
          controls: layout.controls.map((control) => {
            if (control.kind === 'grid') return {
              ...control, cells: control.cells.map((cell) => ({ ...cell, label: String(step % 100) })),
            };
            if (control.kind === 'options') return {
              ...control, options: control.options.map((option) => ({ ...option, label: String(step % 100) })),
            };
            return control;
          }),
        };
      },
    }, PICKS_ONE, { sources: PICKS_SOURCES, data: PICKS_DATA, allowImports: ['vitest'] }));
    expect(report.checks.find((check) => check.id === 'layout')?.status).toBe('pass');
    expect(said(report, 'late-taps')).toContain('every tap one step late was dropped');
    expect(said(report, 'late-taps')).toMatch(/keep changing text out of tappable controls or do not bump the revision/);
  });
});
