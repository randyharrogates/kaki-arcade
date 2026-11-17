// CTRL-003. Integrator runs this on web 5400 / signal 5401 / UAT 5402.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function privatePanel(h) {
  const phone = await h.newPhone();
  const settled = async () => {
    await phone.waitForFunction(() => !document.querySelector('.ka-private-ghost') && [...document.getAnimations()].every(a => a.playState !== 'running'));
    assert.equal(await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').getAttribute('data-fits'),'true');
    await phone.locator('.ka-private-panel').waitFor({ state:'visible' });
    assert.ok(await phone.locator('.ka-private-panel:not(.ka-private-ghost) > .ka-private-block').evaluateAll(nodes => nodes.every(node => node instanceof HTMLElement && !node.style.backgroundImage && !node.style.zIndex && !node.style.position)),'settled live blocks have no temporary fade styles');
  };
  for (const [width,height] of [[667,375],[667,443],[844,390],[932,430]]) {
    assert.ok(width && height);
    await phone.setViewportSize({ width,height });
    const pairs = ['text','cards','cards-3','cards-5','stats','stats-second','rabakz','long-text','text-cards','grid','grid-words','empty','picker'].map(name => ({ layout:name === 'picker' ? 'picker' : 'empty',name }));
    pairs.push({ layout:'picker',name:'stats' },{ layout:'picker',name:'stats-second' },{ layout:'long-answer',name:'picker' },{ layout:'eight-long-options',name:'text' });
    for (const { layout,name } of pairs) await h.step(`${layout}-${name}-${String(width)}x${String(height)}`,async () => {
      await phone.goto(`${h.origin}/play?demo=controller&layout=${layout === 'eight-long-options' ? 'options' : layout}&private=${name}`);
      await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').waitFor();
      if (layout === 'eight-long-options') {
        await phone.evaluate(async () => {
          const path = '/src/layout-fixtures.ts';
          /** @type {unknown} */
          const loaded = await import(path);
          const fixtures = /** @type {{ layoutFixtures:object }} */ (loaded);
          Object.assign(fixtures.layoutFixtures,{ 'uat-eight':{ revision:1,controls:[{ kind:'options',id:'eight',options:Array.from({ length:8 },(_,i) => ({ id:String(i),label:'Word '.repeat(8).trim() })) }] } });
          window.dispatchEvent(new CustomEvent('controller-demo-layout',{ detail:'uat-eight' }));
        });
        await phone.locator('[data-part="eight"]').waitFor();
      }
      await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').waitFor();
      await phone.evaluate(async () => { await document.fonts.ready; });
      const geometry = await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').evaluate(engine => {
        /** @param {Element} n */
        const rect = n => { const r = n.getBoundingClientRect(); return { left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height }; };
        const panel = engine.querySelector('.ka-private-panel');
        const labels = [...engine.querySelectorAll('.ka-private-panel:not(.ka-private-ghost) .ka-layout-text, .ka-private-panel:not(.ka-private-ghost) .ka-private-stat-value, .ka-private-panel:not(.ka-private-ghost) .ka-private-grid-label')].map(element => {
          assertElement(element);
          const size = parseFloat(getComputedStyle(element).fontSize);
          const steps = element.classList.contains('ka-private-stat-value') ? [89,55,34,21] : [34,21,13];
          const next = steps[steps.indexOf(size)-1];
          const fits = element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight;
          const original = element.style.fontSize;
          let nextFits = false;
          if (next) {
            element.style.fontSize = `var(--ka-phone-type-${String(next)})`;
            const peers = element.classList.contains('ka-private-grid-label') ? [...(element.closest('.ka-layout-grid')?.querySelectorAll('.ka-private-grid-label') ?? [])] : [element];
            const originals = peers.map(peer => peer instanceof HTMLElement ? peer.style.fontSize : '');
            peers.forEach(peer => { if (peer instanceof HTMLElement) peer.style.fontSize = `var(--ka-phone-type-${String(next)})`; });
            nextFits = peers.every(peer => peer.scrollWidth <= peer.clientWidth && peer.scrollHeight <= peer.clientHeight);
            peers.forEach((peer,index) => { if (peer instanceof HTMLElement) peer.style.fontSize = originals[index] ?? ''; });
            element.style.fontSize = original;
          }
          return { fits,size,nextFits,validStep:steps.includes(size) };
        });
        /** @param {Element} element @returns {asserts element is HTMLElement} */
        function assertElement(element) { if (!(element instanceof HTMLElement)) throw new Error('Expected HTML label'); }

        const statLines = [...engine.querySelectorAll('.ka-private-panel:not(.ka-private-ghost) .ka-private-stat-value')].map(element => {
          const range = document.createRange(); range.selectNodeContents(element);
          return range.getClientRects().length;
        });
        const controlText = [...engine.querySelectorAll(':scope > [data-part] .ka-layout-target > span, :scope > [data-part] .ka-layout-text > span')].map(element => {
          const container = element.closest('button') ?? element.closest('[data-part]');
          if (!container) throw new Error('Missing control box');
          const box = container.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(element);
          return [...range.getClientRects()].every(r => r.left >= box.left-1 && r.right <= box.right+1 && r.top >= box.top && r.bottom <= box.bottom);
        });
        return { statLines,controlText,fits:engine.getAttribute('data-fits'),panel:panel ? rect(panel) : null,parts:[...engine.querySelectorAll(':scope > [data-part]')].map(rect),targets:[...engine.querySelectorAll('button')].map(rect),text:[...engine.querySelectorAll('.ka-private-panel .ka-layout-text')].map(n => ({ fits:n.scrollWidth <= n.clientWidth && n.scrollHeight <= n.clientHeight })),labels,privateButtons:panel?.querySelectorAll('button').length ?? 0 };
      });
      for (const lines of geometry.statLines) assert.equal(lines,1,'stat figure occupies exactly one line');
      for (const fits of geometry.controlText) assert.ok(fits,'control text range stays inside its button or part');
      assert.equal(geometry.privateButtons,0);
      assert.equal(Boolean(geometry.panel),name !== 'empty','fixture private panel is mounted');
      for (const label of geometry.labels) { assert.ok(label.validStep,'private label uses a permitted type step'); assert.ok(label.fits,'private label fits its own box'); assert.ok(!label.nextFits,'private label uses the largest fitting step'); }
      for (const target of geometry.targets) assert.ok(target.width >= 89 && target.height >= 68);
      for (const part of geometry.parts) if (geometry.panel) assert.ok(part.right <= geometry.panel.left || part.left >= geometry.panel.right);
      for (const text of geometry.text) assert.ok(text.fits,'private text stays in its box');
      assert.equal(geometry.fits,'true','D-132 combined layout fits');
      await h.shot(`private-${layout}-${name}-${String(width)}x${String(height)}`,phone);
    });
  }
  await phone.goto(`${h.origin}/play?demo=controller&layout=empty&private=cards`);
  await phone.locator('.ka-private-panel').waitFor();
  await phone.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:'revealed' })); });
  await h.frameStrip('private-card-turn',phone,{ frames:8,everyMs:55,checkFrame:async () => {
    assert.equal(await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) .ka-private-panel').count(),1);
    assert.equal(await phone.locator('.ka-private-ghost:not([inert])').count(),0);
    assert.equal(await phone.locator('.ka-layout-ghost').count(),0);
  } });
  await settled();
  await phone.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:'text' })); });
  await h.frameStrip('private-panel-crossfade',phone,{ frames:8,everyMs:55,checkFrame:async () => {
    await phone.locator('.ka-private-panel > .ka-private-block:not(.ka-private-ghost) .ka-layout-text').first().waitFor({ state:'visible' });
    assert.equal(await phone.locator('.ka-layout-engine:not(.ka-layout-ghost)').getAttribute('data-fits'),'true');
    assert.equal(await phone.locator('.ka-layout-ghost').count(),0);
    assert.equal(await phone.locator('.ka-private-ghost:not([inert])').count(),0);
  } });
  await settled();
  await phone.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:'rabakz' })); });
  await settled();
  await phone.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:'stats' })); });
  await h.frameStrip('private-arrangement-crossfade',phone,{ frames:8,everyMs:55 });
  await settled();
  for (const [width,height] of [[667,375],[932,430]]) {
    assert.ok(width && height); await phone.setViewportSize({ width,height });
    for (const [from,to] of [['cards','text'],['cards','stats'],['revealed','text'],['grid','text'],['stats','rabakz'],['rabakz','stats']]) {
      for (const name of [from,to]) {
        await phone.evaluate(name => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:name ?? 'empty' })); },name);
        await settled();
      }
    }
    for (const sequence of [['picker','text','stats'],['cards','text','picker'],['long-text','picker','text'],['stats','stats-second','stats']]) {
      for (const [index,name] of sequence.entries()) {
        await phone.evaluate(name => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:name })); },name);
        if (index === 0) await settled();
        else if (index === 1) await phone.waitForTimeout(90);
      }
      await settled();
    }
  }
  await phone.emulateMedia({ reducedMotion:'reduce' });
  await phone.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-private',{ detail:'stats' })); });
  assert.equal(await phone.locator('.ka-layout-ghost, .ka-private-ghost').count(),0);
  await settled();
  // This route is a standalone fixture, not a phone in the host's room. Real-room
  // CTRL-003 DOM/privacy UAT belongs to the console controller-delivery follow-up.
}
