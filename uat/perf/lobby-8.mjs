/** NFR-PERF, PERF-001: seat transition diagnostics; no gameplay budget claim. */
/** @type {import('../../tools/perf/browser.ts').Scenario} */
const scenario = {
  name: 'lobby-8',
  frameReason: 'Lobby seat transitions are not the busiest game level in a three-minute round',
  inputReason: 'No game/controller simulation apply point exists on the lobby',
  feedbackReason: 'No game controller press feedback exists on the lobby',
  async afterCapture(h) {
    await h.shot('perf-host');
    if (h.phones[0]) await h.shot('perf-phone', h.phones[0]);
  },
  async run(h) {
    for (let i = 0; i < h.maxPhones; i++) await h.joinPhone(`Perf ${String(i + 1)}`);
    for (const [index, phone] of h.phones.entries()) {
      const name = `Renamed ${String(index + 1)}`;
      await h.step(`Rename phone ${String(index + 1)}`, async () => {
        await phone.getByRole('button', { name: /^Change name$/ }).click();
        await phone.getByLabel('Your name').fill(name);
        await phone.getByRole('button', { name: /^Save name$/ }).click();
        await h.hostSeat(name).waitFor();
      });
      await h.step(`Leave and return phone ${String(index + 1)}`, async () => {
        await phone.getByRole('button', { name: /^Leave$/ }).click();
        await h.hostSeat(name).waitFor({ state: 'detached' });
        await h.openJoin(phone, name);
        await phone.getByRole('button', { name: /^Join$/ }).click();
        await h.waitSeated(phone, name);
      });
    }
    await h.host.waitForTimeout(2000);
  },
};
export default scenario;
