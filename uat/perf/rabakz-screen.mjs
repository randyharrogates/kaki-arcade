/** RZ-030, RZ-031, NFR-PERF: rendered host transitions, eight fixture seats, no phones. */
/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario = {
  name: 'rabakz-screen',
  hostPage: `/@fs${new URL('../../games/rabakz/dev/index.html', import.meta.url).pathname}?perf=1&players=8`,
  frameReason: 'Repeated dev-page transitions are diagnostic, not a real busiest 180-second round',
  inputReason: 'Fixture public snapshots have no controller-to-simulation apply point',
  feedbackReason: 'No phones or controller feedback in this host-only scenario',
  async run(h) {
    await h.host.locator('.rz-option').first().waitFor();
    await h.host.evaluate(() => document.fonts.ready);
    // Count actual presentation frames, rather than assuming a 60 Hz display.
    for (let repeat = 0; repeat < 5; repeat++) {
      for (const state of ['open', 'final', 'open', 'reveal-one-winner', 'perf-next-question', 'picture-question', 'open', 'scoreboard-teams', 'reveal-teams', 'podium-teams', 'perf-solo-best', 'perf-solo-final']) {
        await h.step(`Cycle ${String(repeat + 1)}: ${state}`, async () => {
          await h.host.evaluate(name => { /** @type {{ __rzPerfState(name: string): void }} */ (/** @type {unknown} */ (window)).__rzPerfState(name); }, state);
          await h.host.evaluate(async () => {
            for (let frame = 0; frame < 55; frame++) await new Promise(resolve => requestAnimationFrame(resolve));
          });
        });
      }
    }
    // 3300 presentation callbacks, comfortably above the 600-interval minimum.
    // Do not call roundStart/roundEnd: these fixtures are not a gameplay round.
  },
};
export default scenario;
