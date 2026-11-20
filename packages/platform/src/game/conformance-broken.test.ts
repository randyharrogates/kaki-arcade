import { conformanceTimeout } from './kit';
import { afterAll, describe, expect, it } from 'vitest';
import {
  caughtChecks,
  keep,
  DOTS_SOURCES,
  PICKS_SOURCES,
  DOTS_SCENARIOS,
  THIS_FILE,
  DOTS_ONE,
  DOTS_TEAMS,
  PICKS_ONE,
  brokenDots,
  brokenPicks,
  failed,
  said,
  cloneRng,
  cloneState,
  createRng,
  dots,
  dotsResults,
  dotsStep,
  PICKS_DATA,
  picks,
  picksSecrets,
  picksStep,
  CONFORMANCE_CHECKS,
  settingsSchema,
  formatReport,
  runConformance,
} from './conformance-support.test';
import type {
  Writable,
  DotsSettings,
  DotsState,
  PicksSettings,
  PicksState,
  GameModule,
} from './conformance-support.test';
describe('the kit catches each kind of broken game', () => {
  it('a returns-new step that changes the state it was given', { timeout: conformanceTimeout(32) }, () => {
    const report = brokenDots('step mutates its state', {
      step(state, inputs, dtMs) {
        (state as Writable<DotsState>).leftSteps -= dtMs;
        return dotsStep(state, inputs, 0);
      },
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['state-contract']));
    expect(said(report, 'state-contract')).toMatch(
      new RegExp(
        'the state or the inputs were changed in place, which returns-new ' +
          'forbids .*Cannot assign to read only property',
        '',
      ),
    );
  });
  it('a returns-new step that writes into a typed array, which freezing cannot stop', { timeout: conformanceTimeout(1005) }, () => {
    interface WithGrid extends DotsState {
      heat: Float32Array;
    }
    const base = dots as unknown as GameModule<WithGrid, DotsSettings>;
    const report = keep(
      'BROKEN Dots: step writes into a typed array of the old state',
      runConformance<WithGrid, DotsSettings>(
        {
          ...base,
          init: (seed, players, settings, context) => ({
            ...dots.init(seed, players, settings, context),
            heat: new Float32Array(4),
          }),
          step(state, inputs, dtMs) {
            state.heat[0] = (state.heat[0] ?? 0) + 1;
            return { ...dotsStep(state, inputs, dtMs), heat: state.heat };
          },
        },
        DOTS_ONE,
        { sources: DOTS_SOURCES, allowImports: ['vitest'] },
      ),
    );
    expect(failed(report)).toContain('previous-state');
    expect(said(report, 'previous-state')).toMatch(
      /the state given to the step was changed by it \(a typed array/,
    );
  });
  it('Math.random in a step: caught by the replay checks and by the source scan', { timeout: conformanceTimeout(945) }, () => {
    const report = brokenDots(
      'Math.random',
      {
        step(state, inputs, dtMs) {
          const next = dotsStep(state, inputs, dtMs);
          return next === state ? state : { ...next, gem: { x: next.gem.x, y: Math.random() * 9 } };
        },
      },
      DOTS_ONE,
      THIS_FILE,
    );
    expect(failed(report)).toEqual(
      expect.arrayContaining(['purity', 'determinism', 'replay', 'clone']),
    );
    expect(said(report, 'purity')).toMatch(/conformance-broken\.test\.ts:\d+: uses Math\.random/);
    // Only the real call is reported, not the words in strings and comments in this file.
    expect(report.checks.find((check) => check.id === 'purity')?.failureCount).toBe(1);
    expect(said(report, 'determinism')).toMatch(
      /a second run from the same seed and inputs first differs at step 0/,
    );
  });
  it('a module-level counter: state that lives outside the state', { timeout: conformanceTimeout(1183) }, () => {
    let calls = 0;
    const report = brokenDots('a counter outside the state', {
      step(state, inputs, dtMs) {
        calls += 1;
        const next = dotsStep(state, inputs, dtMs);
        return next === state ? state : { ...next, leftSteps: next.leftSteps - (calls % 2) };
      },
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['clone', 'determinism']));
  });
  it('a secret in the public view', { timeout: conformanceTimeout(143) }, () => {
    const report = brokenPicks('picks shown on the TV', {
      publicView: (state) => ({
        ...(picks.publicView(state) as object),
        players: state.players.map((player) => ({ id: player.id, pick: player.pick })),
      }),
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['secrets']));
    expect(said(report, 'secrets')).toMatch(
      /the secret "p\d's pick" \(owner p\d\) is visible at publicView\.players\[\d\]\.pick/,
    );
  });
  it('a secret in disguise (how many have picked): only scrambleSecrets can see it', { timeout: conformanceTimeout(222) }, () => {
    const report = brokenPicks('a count that depends on the picks', {
      publicView: (state) => ({
        ...(picks.publicView(state) as object),
        sum: state.players.reduce((sum, player) => sum + (player.pick ?? 0), 0),
      }),
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['secrets']));
    expect(said(report, 'secrets')).toMatch(
      new RegExp(
        'publicView changes when only things hidden from the TV change ' +
          '\\(scrambleSecrets\\); it depends on a secret at publicView\\.sum',
        '',
      ),
    );
    const count = brokenPicks('the count of unlocked players who have picked', {
      publicView: (state) => ({
        ...(picks.publicView(state) as object),
        readyCount: state.players.filter((player) => player.pick !== null).length,
      }),
    });
    expect(said(count, 'secrets')).toMatch(/publicView changes/);
  });
  it("a secret in another player's private view and in another player's layout", { timeout: conformanceTimeout(254) }, () => {
    const inView = brokenPicks('the seal in every private view', {
      privateView: (state) => ({
        revision: 0,
        blocks: [{ kind: 'text', text: `psst: ${state.seal}` }],
      }),
    });
    expect(failed(inView)).toEqual(expect.arrayContaining(['secrets']));
    expect(said(inView, 'secrets')).toMatch(
      new RegExp(
        'the secret "the seal" \\(owner nobody\\) is visible at ' +
          'privateView\\(p1\\)\\.blocks\\[0\\]\\.text',
        '',
      ),
    );
    const inLayout = brokenPicks("the first player's pick in every layout", {
      controllerLayout: (state, id) => {
        const layout = picks.controllerLayout(state, id);
        const pick = state.players[0]?.pick ?? null;
        if (state.phase !== 'pick' || pick === null) return layout;
        return {
          revision: layout.revision,
          controls: [
            ...layout.controls,
            { kind: 'text', id: 'pick-hint', text: `They chose ${String(pick)}` },
          ],
        };
      },
      secrets(state) {
        const first = state.players[0];
        const hidden = picksSecrets(state).filter((secret) => secret.owner === null);
        if (state.phase !== 'pick' || first === undefined || first.pick === null) return hidden;
        return [
          ...hidden,
          { owner: first.id, label: 'first pick', value: `They chose ${String(first.pick)}` },
        ];
      },
    });
    expect(failed(inLayout)).toEqual(expect.arrayContaining(['secrets']));
    expect(said(inLayout, 'secrets')).toMatch(
      new RegExp(
        'the secret "first pick" \\(owner p1\\) is visible at ' +
          'controllerLayout\\(p2\\)\\.controls\\[\\d\\]\\.text',
        '',
      ),
    );
  });
  it('a sampled input frame stored in the state', { timeout: conformanceTimeout(36) }, () => {
    interface WithFrame extends DotsState {
      last: unknown;
    }
    const base = dots as unknown as GameModule<WithFrame, DotsSettings>;
    const report = keep(
      'BROKEN Dots: keeps a sampled frame',
      runConformance<WithFrame, DotsSettings>(
        {
          ...base,
          init: (seed, players, settings, context) => ({
            ...dots.init(seed, players, settings, context),
            last: null,
          }),
          step: (state, inputs, dtMs) => ({
            ...dotsStep(state, inputs, dtMs),
            last: inputs.frames.get('p1') ?? null,
          }),
        },
        DOTS_ONE,
        { sources: DOTS_SOURCES, allowImports: ['vitest'] },
      ),
    );
    expect(failed(report)).toEqual(expect.arrayContaining(['previous-state']));
    expect(said(report, 'previous-state')).toMatch(
      new RegExp(
        "step 0: state\\.last is one of the host's own input objects, which " +
          'are reused next step',
        '',
      ),
    );
  });
  it('an action object kept by an in-place game', { timeout: conformanceTimeout(45) }, () => {
    interface WithTap extends PicksState {
      lastTap: unknown;
    }
    const base = picks as unknown as GameModule<WithTap, PicksSettings>;
    const report = keep(
      'BROKEN Picks: keeps an action object',
      runConformance<WithTap, PicksSettings>(
        {
          ...base,
          init: (seed, players, settings, context) => ({
            ...picks.init(seed, players, settings, context),
            lastTap: null,
          }),
          step(state, inputs, dtMs) {
            if (inputs.actions[0] !== undefined) state.lastTap = inputs.actions[0];
            picksStep(state, inputs, dtMs);
            return state;
          },
        },
        PICKS_ONE,
        { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA },
      ),
    );
    expect(failed(report)).toEqual(expect.arrayContaining(['previous-state']));
    expect(said(report, 'previous-state')).toMatch(
      /state\.lastTap is one of the host's own input objects/,
    );
  });
  it('a step that changes its inputs', { timeout: conformanceTimeout(132) }, () => {
    const report = brokenPicks('step reverses the list of taps', {
      step(state, inputs, dtMs) {
        (inputs.actions as unknown[]).reverse();
        return picksStep(state, inputs, dtMs);
      },
    });
    expect(failed(report)).toContain('state-contract');
    expect(said(report, 'state-contract')).toMatch(/the step changed its inputs/);
  });
  it('a view that is not JSON', { timeout: conformanceTimeout(51) }, () => {
    const map = brokenDots('a Map in the public view', {
      publicView: (state) => ({
        ...dots.publicView(state),
        byId: new Map(state.dots.map((dot) => [dot.id, dot.x])),
      }),
    });
    expect(failed(map)).toEqual(expect.arrayContaining(['views-json']));
    expect(said(map, 'views-json')).toMatch(
      /publicView\.byId is \[object Map\], not a plain object or array/,
    );
    const nan = brokenDots('NaN in the public view', {
      publicView: (state) => ({ ...dots.publicView(state), secondsLeft: 0 / 0 }),
    });
    expect(said(nan, 'views-json')).toMatch(
      /publicView\.secondsLeft is NaN, which JSON cannot carry/,
    );
    const missing = brokenDots('undefined in a private view', {
      privateView: () => ({
        revision: 0,
        blocks: [{ kind: 'stat', label: 'Gems', value: undefined as never }],
      }),
    });
    expect(said(missing, 'views-json')).toMatch(
      /privateView\(p1\)\.blocks\[0\]\.value is undefined/,
    );
  });
  it('state whose behaviour depends on two fields being the same object', { timeout: conformanceTimeout(1614) }, () => {
    interface Shared extends PicksState {
      first: PicksState['players'][number] | null;
    }
    const base = picks as unknown as GameModule<Shared, PicksSettings>;
    const report = keep(
      'BROKEN Picks: identity-dependent state',
      runConformance<Shared, PicksSettings>(
        {
          ...base,
          init(seed, players, settings, context) {
            const state = picks.init(seed, players, settings, context);
            return { ...state, first: state.players[0] ?? null };
          },
          step(state, inputs, dtMs) {
            // Meant to give the first seat a point a step; works only while `first` IS players[0].
            if (state.first !== null && state.phase === 'pick') state.first.score += 1;
            picksStep(state, inputs, dtMs);
            return state;
          },
        },
        PICKS_ONE,
        { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA },
      ),
    );
    expect(failed(report)).toEqual(expect.arrayContaining(['clone']));
    expect(said(report, 'clone')).toMatch(
      new RegExp(
        'step 0: stepping a copy of the state gave a different result: the ' +
          'rules depend on object identity',
        '',
      ),
    );
  });
  it('state that does not survive a host reload', { timeout: conformanceTimeout(1919) }, () => {
    // `undefined` in an array position survives encodeState, so use what does not: a hash that
    // depends on a reference shared between two fields, made after the first step.
    interface Linked extends PicksState {
      watch: PicksState['players'][number] | null;
    }
    const base = picks as unknown as GameModule<Linked, PicksSettings>;
    const report = keep(
      'BROKEN Picks: a shared reference that a reload breaks',
      runConformance<Linked, PicksSettings>(
        {
          ...base,
          init: (seed, players, settings, context) => ({
            ...picks.init(seed, players, settings, context),
            watch: null,
          }),
          step(state, inputs, dtMs) {
            picksStep(state, inputs, dtMs);
            // Linked late, and only ever read through `watch`: a copy made BEFORE a step still
            // behaves,
            // a state reloaded between steps does not.
            state.watch ??= state.players[0] ?? null;
            if (state.watch !== null && state.round > 1) state.watch.score += 1;
            return state;
          },
        },
        PICKS_ONE,
        { sources: PICKS_SOURCES, allowImports: ['vitest'], data: PICKS_DATA },
      ),
    );
    expect(failed(report)).toEqual(expect.arrayContaining(['reload']));
    expect(said(report, 'reload')).toMatch(
      /reloaded after step \d+: the run went a different way from step \d+/,
    );
  });
  it('a layout over the byte cap, over what a phone holds, or outside the schema', { timeout: conformanceTimeout(63) }, () => {
    const fat = brokenPicks('a layout of more than 4,096 bytes', {
      controllerLayout: (state, id) => ({
        revision: picks.controllerLayout(state, id).revision,
        controls: [
          {
            kind: 'grid',
            id: 'numbers',
            rows: 5,
            cols: 12,
            cells: Array.from({ length: 60 }, () => ({
              label: '9',
              colour:
                'a-very-long-colour-token-name-that-pads-the-layout-out-past-the-cap' as never,
              state: 'plain' as const,
            })),
          },
        ],
      }),
    });
    expect(failed(fat)).toContain('views-json');
    expect(said(fat, 'views-json')).toMatch(
      /p1: layout: is \d+ bytes; the most the protocol carries is 4096/,
    );
    const crowded = brokenDots('more controls than a phone holds', {
      controllerLayout: () => ({
        revision: 1,
        controls: [
          { kind: 'stick', id: 'move' },
          { kind: 'dpad', id: 'pad' },
          {
            kind: 'grid',
            id: 'cells',
            rows: 5,
            cols: 8,
            cells: Array.from({ length: 40 }, () => ({})),
          },
          { kind: 'text', id: 'words', text: 'Too much for one phone' },
        ],
      }),
    });
    expect(failed(crowded)).toEqual(expect.arrayContaining(['layout']));
    expect(said(crowded, 'layout')).toMatch(/rows must be a whole number from 1 to 4/);
    const invented = brokenDots('a control that is not in the schema, and a raw colour', {
      controllerLayout: () => ({
        revision: 1,
        controls: [
          { kind: 'slider', id: 'volume' } as never,
          {
            kind: 'button',
            id: 'go',
            button: 'face-top',
            label: 'Go',
            colour: ['#', 'ff0000'].join('') as never,
          },
        ],
      }),
    });
    expect(failed(invented)).toEqual(expect.arrayContaining(['layout']));
    expect(said(invented, 'layout')).toMatch(/kind "slider" is not in the schema/);
    expect(said(invented, 'layout')).toMatch(/colour: must be the name of a colour token/);
  });
  it('a layout whose taps change meaning without a new revision', { timeout: conformanceTimeout(132) }, () => {
    const report = brokenPicks('revision stuck at 1', {
      controllerLayout: (state, id) => ({ ...picks.controllerLayout(state, id), revision: 1 }),
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['layout']));
    expect(said(report, 'layout')).toMatch(
      new RegExp(
        'what can be tapped changed but revision stayed at 1: a late tap ' +
          'could now mean something else',
        '',
      ),
    );
  });
  it('a score that changes when someone else leaves', { timeout: conformanceTimeout(1080) }, () => {
    const report = brokenDots('leaving shares out a point', {
      leave: (state, id) => ({
        ...state,
        dots: state.dots
          .filter((dot) => dot.id !== id)
          .map((dot) => ({ ...dot, score: dot.score + 1 })),
      }),
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['join-leave']));
    expect(said(report, 'join-leave')).toMatch(
      /p\d's score went from \d+ to \d+ when p\d(-s\d+)? joined or left/,
    );
  });
  it('a join that throws', { timeout: conformanceTimeout(771) }, () => {
    const report = brokenDots('join throws', {
      join() {
        throw new Error('no room at the table');
      },
    });
    expect(failed(report)).toContain('runs');
    expect(said(report, 'runs')).toMatch(
      new RegExp(
        'with players joining and leaving, step 1: step (on a copy of the ' +
          'state )?threw Error: no room at the table',
        '',
      ),
    );
  });
  it('a game that ignores its seed', { timeout: conformanceTimeout(1057) }, () => {
    const report = brokenDots('seed ignored', {
      init: (_seed, players, settings, context) => dots.init(4, players, settings, context),
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['seed']));
    expect(said(report, 'seed')).toMatch(/the game ignores its seed/);
  });
  it('a pause that leaves a mark', { timeout: conformanceTimeout(1092) }, () => {
    const report = brokenDots('resume does not undo pause', {
      pause: (state) => ({ ...state, leftSteps: state.leftSteps + 1 }),
      resume: (state) => state,
    });
    expect(failed(report)).toContain('pause');
    expect(said(report, 'pause')).toMatch(
      new RegExp(
        'after pause, 30 idle steps and resume, the state is not what it ' + 'was before the pause',
        '',
      ),
    );
  });
  it('results that are not total or not in order', { timeout: conformanceTimeout(2568) }, () => {
    const order = brokenDots('results in seat order', {
      results: (state) => ({
        mode: 'players',
        players: state.dots.map((dot, index) => ({
          id: dot.id,
          score: dot.score,
          joinedMidGame: dot.joinedMidGame,
          place: index + 1,
        })),
      }),
    });
    expect(failed(order)).toEqual(expect.arrayContaining(['results']));
    expect(said(order, 'results')).toMatch(/equal scores share a place/);
    const short = brokenDots('results leave the last player out', {
      results: (state) => ({
        ...dotsResults(state),
        players: dotsResults(state).players.slice(0, -1),
      }),
    });
    expect(said(short, 'results')).toMatch(/is in the match but missing from the results/);
    const teams = brokenDots(
      'team match without team results',
      { results: (state) => ({ mode: 'teams', players: dotsResults(state).players }) },
      DOTS_TEAMS,
    );
    expect(said(teams, 'results')).toMatch(/results\.teams must list team 0 and team 1/);
    const never = brokenDots('a match that never ends', { isOver: () => false });
    expect(said(never, 'results')).toMatch(/no scenario reached the end of a match/);
    let asked = 0;
    const flicker = brokenDots('isOver goes back to false', {
      isOver: (state) => state.leftSteps <= 0 && (asked += 1) < 40,
    });
    expect(said(flicker, 'results')).toMatch(/isOver was true at step \d+ and is false again/);
  });
  it('an asset first named during play', { timeout: conformanceTimeout(1366) }, () => {
    const report = brokenDots('a late asset', {
      assets: (state) => [
        { key: 'dots/atlas.json', kind: 'atlas' },
        ...(state.leftSteps < 300 ? [{ key: 'dots/finale.png', kind: 'image' as const }] : []),
      ],
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['assets']));
    expect(said(report, 'assets')).toMatch(
      new RegExp(
        'asset "dots\\/finale\\.png" was not in the list given before the ' +
          'match started, so it would load during play',
        '',
      ),
    );
  });
  it('a view that is not pure', { timeout: conformanceTimeout(1374) }, () => {
    let calls = 0;
    const counting = brokenDots('a view that counts its calls', {
      publicView(state) {
        calls += 1;
        return { ...dots.publicView(state), secondsLeft: calls };
      },
    });
    expect(failed(counting)).toEqual(expect.arrayContaining(['views-pure']));
    expect(said(counting, 'views-pure')).toMatch(
      new RegExp(
        'publicView gave two different answers for the same state; first ' +
          'difference at publicView\\.secondsLeft',
        '',
      ),
    );
    const writing = brokenPicks('a view that writes to the state', {
      privateView(state, id) {
        state.leftSteps -= 1;
        return picks.privateView(state, id);
      },
    });
    expect(failed(writing)).toContain('views-pure');
    expect(said(writing, 'views-pure')).toMatch(/the state hash changed while only views/);
    const frozen = brokenDots('a view that writes to a frozen state', {
      publicView(state) {
        (state as Writable<DotsState>).leftSteps -= 1;
        return dots.publicView(state);
      },
    });
    expect(said(frozen, 'views-pure')).toMatch(/publicView tried to change the state/);
  });
  it('a step that throws on something the host can deliver', { timeout: conformanceTimeout(73) }, () => {
    const report = brokenPicks('step throws once someone has locked in', {
      step(state, inputs, dtMs) {
        if (state.players.some((player) => player.locked)) throw new RangeError('unexpected lock');
        return picksStep(state, inputs, dtMs);
      },
    });
    expect(failed(report)).toContain('runs');
    expect(said(report, 'runs')).toMatch(
      /step \d+: step (on a copy of the state )?threw RangeError: unexpected lock/,
    );
  });
  it('PLAT-008 rejects missing and non-boolean mid-game join declarations', { timeout: conformanceTimeout(20) }, () => {
    for (const midGameJoin of [undefined, 'true', 1, null]) {
      const report = brokenDots('invalid join declaration', {
        meta: { ...dots.meta, midGameJoin: midGameJoin as unknown as boolean },
      });
      expect(failed(report)).toContain('meta');
      expect(said(report, 'meta')).toContain('midGameJoin must be true or false');
    }
  });
  it('picker details and settings that do not hold together', { timeout: conformanceTimeout(16) }, () => {
    const meta = brokenDots('solo claimed for a two-player game', {
      meta: { ...dots.meta, players: { min: 2, max: 9 }, id: 'Dots!' },
    });
    expect(failed(meta)).toContain('meta');
    expect(said(meta, 'meta')).toMatch(/players 2 to 9 must lie within 1 to 8/);
    expect(said(meta, 'meta')).toMatch(/solo must be true exactly when one player can play/);
    const settings = brokenDots('a default off the steps', {
      settings: {
        fields: [
          {
            kind: 'number',
            id: 'seconds',
            label: 'Match length',
            min: 10,
            max: 60,
            step: 10,
            default: 25,
          },
          ...settingsSchema(dots, { firstInRoom: false, data: {}, saved: null, teams: false }).fields.slice(1),
        ],
      },
    });
    expect(failed(settings)).toContain('settings');
    expect(said(settings, 'settings')).toMatch(
      /settings field "seconds": the default must be 10 plus a whole number of steps of 10/,
    );
  });
  it('a game that cannot start with every player count it claims', { timeout: conformanceTimeout(1095) }, () => {
    const report = brokenDots('init fails for eight', {
      init(seed, players, settings, context) {
        if (players.length === 8) throw new Error('only seven aprons');
        return dots.init(seed, players, settings, context);
      },
    });
    expect(failed(report)).toEqual(expect.arrayContaining(['init', 'runs']));
    expect(said(report, 'runs')).toMatch(
      /init with 8 players: init threw Error: only seven aprons/,
    );
  });
  it('a game that keeps the generator it was handed in a frozen state and draws from it', { timeout: conformanceTimeout(32) }, () => {
    const report = brokenDots('draws from the frozen generator', {
      step(state, inputs, dtMs) {
        const next = dotsStep(state, inputs, dtMs);
        return next === state
          ? state
          : {
              ...next,
              gem: { x: (createRng(1).a % 16) + 0, y: cloneRng(state.rng).b % 9 },
              rng: (((state.rng as Writable<DotsState['rng']>).a += 1), state.rng),
            };
      },
    });
    expect(failed(report)).toContain('state-contract');
  });
  it('an honest in-place copy of Dots also passes', { timeout: conformanceTimeout(2556) }, () => {
    const report = keep(
      'Dots, run as in-place',
      runConformance<DotsState, DotsSettings>(
        {
          ...dots,
          stepMode: 'in-place',
          step: (state, inputs, dtMs) => dotsStep(cloneState(state), inputs, dtMs),
        },
        DOTS_SCENARIOS,
        { sources: DOTS_SOURCES, allowImports: ['vitest'] },
      ),
    );
    expect(report.ok, formatReport(report)).toBe(true);
  });
});
// Review attack suite adapted from the independent review's guessing game faults:
// identity scramble, one-player failure, uneven co-op, early save and post-over throws.

it('coverage probes for sustained copies and private revision changes', { timeout: conformanceTimeout(390) }, () => {
  expect(failed(brokenDots('whole-state copy every step', { step: (s, i, dt) => cloneState(dotsStep(s, i, dt)) }))).toContain('sharing');
  expect(failed(brokenPicks('private revision stuck', { privateView(s, id) { const v = picks.privateView(s, id); return v === null ? null : { ...v, revision: 0 }; } }))).toContain('private-revision');
});
// Vitest requires a destructured fixture context even when only the suite is needed.
// eslint-disable-next-line no-empty-pattern
afterAll(({}, suite) => {
  interface RegisteredTask { mode: string; tasks?: readonly RegisteredTask[] }
  const skipped = (task: RegisteredTask): boolean =>
    task.mode === 'skip' || (task.tasks?.some(skipped) ?? false);
  if (suite.tasks.some(skipped)) return;
  expect([...caughtChecks].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(
    CONFORMANCE_CHECKS.map(([id]) => id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  );
});
