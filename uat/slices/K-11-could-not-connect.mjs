// REL-006, D-250. The room remains on the signalling server after the host closes.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function couldNotConnect(h) {
  await h.createRoom();
  await h.closeHost();
  const phone = await h.newPhone('portrait');
  await h.step('Join a room whose host has closed', async () => {
    await h.openJoin(phone, 'Fern');
    await phone.getByRole('button', { name: 'Join', exact: true }).click();
    await phone.getByRole('heading', { name: 'Joining the room…', exact: true }).waitFor();
    await phone.getByRole('heading', { name: 'This phone could not connect to the big screen.', exact: true }).waitFor({ timeout: 25000 });
  });
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
    await h.step(`Settled timeout at ${String(viewport.width)}`, async () => {
      await phone.setViewportSize(viewport);
      await phone.getByText('Connect it to the same Wi-Fi as the big screen and scan again.', { exact: true }).waitFor();
      const retry = phone.getByRole('button', { name: 'Try again', exact: true });
      const box = await retry.boundingBox();
      assert.ok(box && box.height >= 55 && box.y >= 0 && box.y + box.height <= viewport.height);
      assert.equal(await phone.locator('.phone-page').evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth), true);
      await h.shot(`could-not-connect-${String(viewport.width)}`, phone);
    });
  }
  await h.step('Try again returns to connecting for the same room', async () => {
    await phone.getByRole('button', { name: 'Try again', exact: true }).click();
    await phone.getByRole('heading', { name: 'Joining the room…', exact: true }).waitFor();
    assert.equal(new URL(phone.url()).searchParams.get('code'), h.code);
    await h.shot('retry-connecting', phone);
  });
}
