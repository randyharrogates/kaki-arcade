import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';

it('CTRL-009 PLAT-021 marks the TV seat Watching and draws the exact refusal in the existing band', async () => {
  const fixture = fileURLToPath(new URL('./c27-dom-fixture.tsx', import.meta.url));
  const picker = fileURLToPath(new URL('./picker-route.tsx', import.meta.url));
  const registry = fileURLToPath(new URL('./game-registry.ts', import.meta.url));
  const bundle = await build({ configFile: false, plugins: [preact(), rabakzBank(), {
    name: 'local-seat-fixture', resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id !== fixture) return;
      return `import { render } from 'preact'; import { GamePicker } from '${picker}';
        import { gameMetas } from '${registry}';
        import { createRoom, applyPhoneEvent, LOCAL_CONNECTION, pickerInput } from '@kaki/platform';
        let room=applyPhoneEvent(createRoom(),{connectionId:LOCAL_CONNECTION,deviceId:'local'},{type:'join',name:null,seatToken:'a'.repeat(32)},0).state;
        let state={screen:'start',focus:'peek-poker',revision:0};
        state=pickerInput(state,room,gameMetas,LOCAL_CONNECTION,'start',0);
        document.body.className='host-shell'; document.documentElement.style.setProperty('--screen-scale','1');
        render(<GamePicker state={state} room={room}/>,document.body);`;
    },
  }], build: { target: 'esnext', write: false, lib: { entry: fixture, formats: ['es'], name: 'fixture' }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './game-setup.css']) await page.addStyleTag({ content: await readFile(fileURLToPath(new URL(path, import.meta.url)), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    const seat = page.locator('.picker-player-text').filter({ hasText: 'Player 1' });
    await seat.getByText('Watching', { exact: true }).waitFor();
    const refusal = page.locator('.setup-mirror-problem [role="status"]');
    await refusal.waitFor();
    expect(await refusal.textContent()).toBe('Peek Poker needs a phone. Go back and scan the code in the lobby to join.');
    expect(await refusal.isVisible()).toBe(true);
    const tile = page.locator('[data-game="peek-poker"]');
    expect(await tile.textContent()).not.toContain('Needs at least');
    expect(await tile.getAttribute('aria-disabled')).toBeNull();
    expect(await page.getByRole('heading', { name: 'Waiting for a phone', exact: true }).count()).toBe(1);
    expect(await page.locator('.host-hints').textContent()).not.toContain('Enter: start');
    expect(await refusal.evaluate(node => { const box = node.getBoundingClientRect(); return box.left >= 55 && box.right <= 1865 && box.top >= 55 && box.bottom <= 1025; })).toBe(true);
    expect(await page.getByRole('heading', { name: 'Starting…', exact: true }).count()).toBe(0);
  } finally { await browser.close(); }
});
