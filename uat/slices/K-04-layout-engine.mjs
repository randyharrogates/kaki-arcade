// CTRL-002. Run by the integrator; this script alone does not constitute visual acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function layoutEngine(h) {
  const page = await h.newPhone();
  const names = ['stick-faces','options','peek-pick','picker','dpad-only','text-only','cards','hidden-cards','readonly-hidden-cards','long-answer','shoulders','disabled-options','disabled-faces','every'];
  /** @param {string} name */
  const open = async name => {
    await page.goto(`${h.origin}/play?demo=controller&layout=${name}`);
    await page.locator('.ka-layout-engine').waitFor();
    if (name === 'peek-pick') await page.locator('[data-theme]').evaluateAll(nodes => { nodes.forEach(node => { node.setAttribute('data-theme','peek-poker'); }); });
  };
  for (const [width,height] of [[667,375],[844,390],[932,430]]) {
    assert.ok(width && height);
    const faceFloor = width >= 844 ? 110 : Math.max(89,110*width/844); // D-122, checked at every size.
    await page.setViewportSize({ width,height });
    for (const name of names) await h.step(`${name}-${String(width)}x${String(height)}`,async () => {
      await open(name);
      const geometry = await page.locator('.ka-layout-engine').evaluate(engine => {
        const play = engine.closest('.ka-controller-play');
        if (!play) throw new Error('Missing play area');
        const box = play.getBoundingClientRect();
        const note = play.parentElement?.querySelector('.ka-controller-wake')?.getBoundingClientRect();
        const targets = [...engine.querySelectorAll('button, .ka-stick')].map(node => {
          const rect = node.getBoundingClientRect();
          return { id:node.getAttribute('data-control') ?? 'stick',
            face:node.classList.contains('ka-layout-face'),
            shape:['triangle','circle','cross','square'].find(shape => node.classList.contains(`ka-kit-${shape}`)),
            grid:node.closest('.ka-layout-grid') !== null,
            left:rect.left-box.left,top:rect.top-box.top,
            right:rect.right-box.left,bottom:rect.bottom-box.top,
            width:rect.width,height:rect.height,
            labelFontSize:parseFloat(getComputedStyle(node).fontSize),
            labelLineHeight:parseFloat(getComputedStyle(node.querySelector('span') ?? node).lineHeight),
            labelSingleLine:[...node.querySelectorAll('span')].every(span => { const r = document.createRange(); r.selectNodeContents(span); return new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size <= 1; }),
            labelFits:node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight,
            label:(() => { const r = node.querySelector('span')?.getBoundingClientRect(); return r ? { left:r.left-box.left,right:r.right-box.left,height:r.height } : null; })() };
        });
        return { width:box.width,height:box.height,targets,
          note:note ? { left:note.left-box.left,top:note.top-box.top,right:note.right-box.left,bottom:note.bottom-box.top } : null };
      });
      for (const target of geometry.targets) {
        assert.ok(target.width >= (target.face ? faceFloor : 89)-0.01 && target.height >= (target.face ? faceFloor : 68)-0.01,`${name}: ${target.id} retains its floor even on an insufficient canvas`);
      }
      // 'every' is a stress fixture that lists every kind at once; no phone can hold it at the floors,
      // so the engine must say so rather than shrink anything below them.
      const fits = await page.locator('.ka-layout-engine').getAttribute('data-fits');
      if (name === 'every') { assert.equal(fits,'false','every: reported as not fitting'); await h.shot(`every-${String(width)}`,page); return; }
      const diamond = ['stick-faces','shoulders','disabled-faces'].includes(name);
      const cannotFit = diamond && geometry.height < faceFloor*(1+2*95/110)+16;
      if (cannotFit) { assert.equal(fits,'false','square diamond retains its floor on an insufficient canvas'); await h.shot(`${name}-${String(width)}`,page); return; }
      const margin = Number(await page.locator('.ka-layout-engine').getAttribute('data-margin'));
      const gap = Number(await page.locator('.ka-layout-engine').getAttribute('data-gap'));
      assert.ok(gap === 13 || gap === 8 || gap === 5, `${name}: valid gap`);
      if (gap === 5) assert.equal(margin,8,`${name}: compact gaps follow compact margin`);
      // Independent floor sums: D-122 scaled diamond, 296 px grid, and edge margins.
      const expectedMargin = (diamond && geometry.height < faceFloor*(1+2*95/110)+26) || (['picker','peek-pick'].includes(name) && geometry.height < 322) ? 8 : 13;
      const expectedGap = ['picker','peek-pick'].includes(name) && geometry.height < 312 ? 5 : expectedMargin;
      assert.equal(margin,expectedMargin,`${name}: D-117 margin from floor sums`);
      assert.equal(gap,expectedGap,`${name}: D-118 spacing from floor sums`);
      if (diamond) {
        /** @param {string} shape */
        const face = shape => geometry.targets.find(t => t.face && t.shape === shape);
        const top = face('triangle'), right = face('circle'), bottom = face('cross'), left = face('square');
        assert.ok(top && right && bottom && left);
        // Board 4 diamond axes agree within 0.5 CSS px.
        assert.ok(Math.abs(top.left-bottom.left) <= 0.5 && Math.abs(left.top-right.top) <= 0.5,'opposite diamond faces align within 0.5 px');
        assert.ok(top.top < right.top && right.top < bottom.top && left.left < top.left && top.left < right.left);
        assert.ok(Math.abs((right.left-top.left)-(right.top-top.top)) <= 0.5,'equal diamond axes within 0.5 px');
      }
      if (name === 'options' || name === 'disabled-options') {
        assert.deepEqual(geometry.targets.map(t => t.id),['answers:a','answers:b','answers:c','answers:d']);
        const [a,b,c,d] = geometry.targets; assert.ok(a && b && c && d);
        assert.ok(a.left < b.left && c.left < d.left && a.top === b.top && c.top === d.top && a.top < c.top,'TV row order');
      }
      assert.equal(fits,'true',`${name}: fits`);
      for (const [index,a] of geometry.targets.entries()) {
        assert.ok(a.left >= margin-0.01 && a.top >= margin-0.01 && a.right <= geometry.width-margin+0.01 && a.bottom <= geometry.height-margin+0.01,`${name}: ${a.id} inside play margins`);
        assert.ok(a.labelFits,`${name}: ${a.id} label overflows its button`);
        if (geometry.note) {
          const b = geometry.note;
          assert.ok(Number.isFinite(b.top) && b.bottom > b.top,'wake note measured separately from play area');
          if (a.left < b.right && b.left < a.right) assert.ok(b.top-a.bottom >= expectedMargin-0.01,'margin to measured wake note');
          assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,`${name}: ${a.id} overlaps wake note`);
        }
        if (a.id === 'lock:lock') {
          assert.ok(a.label);
          assert.ok(a.label.left >= a.left+13 && a.label.right <= a.right-13, 'Lock in: label has 13 px inside each side');
          assert.ok(a.labelSingleLine, 'Lock in: one line');
        }
        assert.ok(a.width >= (a.face ? faceFloor : 89)-0.01 && a.height >= (a.face ? faceFloor : 68)-0.01,`${name}: ${a.id} target floor`);
        if (a.face) assert.ok(a.width >= faceFloor-0.01 && a.height >= faceFloor-0.01,`${name}: ${a.id} D-122 face floor at ${String(width)}`);
        for (const b of geometry.targets.slice(index+1)) {
          const minimumGap = a.grid && b.grid && gap === 13 ? 8 : gap;
          const distance = a.face && b.face ? Math.hypot((a.left+a.right-b.left-b.right)/2,(a.top+a.bottom-b.top-b.bottom)/2)-(a.width+b.width)/2 : Math.hypot(Math.max(a.left-b.right,b.left-a.right,0),Math.max(a.top-b.bottom,b.top-a.bottom,0));
          assert.ok(distance >= minimumGap-0.01,`${name}: ${a.id} gap to ${b.id} at least ${String(minimumGap)}`);
          assert.ok((a.face && b.face) || a.right <= b.left+0.01 || b.right <= a.left+0.01 || a.bottom <= b.top+0.01 || b.bottom <= a.top+0.01,`${name}: ${a.id} overlaps ${b.id}`);
        }
      }
      if (name === 'long-answer' && width === 667) {
        await h.shot('long-answer-667-label',page);
        const answer = geometry.targets.find(t => t.id === 'answers:a');
        assert.ok(answer?.label,'long answer has a label');
        // D-127: this real bank answer may use the next type step when measured overflow occurs.
        assert.ok([34,21].includes(answer.labelFontSize),'long answer uses the phone type scale');
        assert.ok(answer.labelFits,'long answer fits its button');
      }
      if (name === 'peek-pick') {
        const cells = page.locator('.ka-layout-grid > button');
        assert.equal(await cells.count(),16);
        for (let i = 0; i < 16; i++) {
          assert.equal(await cells.nth(i).getAttribute('aria-label'),`Card ${String(i+1)}`);
          assert.equal(await cells.nth(i).getAttribute('aria-pressed'),i === 0 || i === 5 ? 'true' : null);
        }
        const lock = geometry.targets.find(t => t.id === 'lock:lock');
        assert.ok(lock && lock.width >= 144 && lock.height >= 144);
        assert.equal(lock.shape,undefined);
      }
      if (name === 'readonly-hidden-cards') {
        const backs = page.getByRole('img',{ name:'Hidden card',exact:true });
        assert.equal(await backs.count(),2);
        assert.deepEqual(await backs.allTextContents(),['','']);
        assert.equal(await backs.locator('svg').count(),0);
      }
      if (name === 'hidden-cards') {
        const backs = page.getByRole('button',{ name:'Hidden card',exact:true });
        assert.equal(await backs.count(),2,'card backs expose only their accessible name');
        assert.deepEqual(await backs.allTextContents(),['',''],'hidden card labels are not drawn');
      }
      await h.shot(`${name}-${String(width)}`,page);
    });
  }
  /** @returns {Promise<{control:string; revision:number; phase:string; value:unknown}[]>} */
  const outputs = async () => {
    const raw = /** @type {unknown} */ (JSON.parse(await page.getByLabel('Layout outputs').getAttribute('data-outputs') ?? '[]'));
    return /** @type {{control:string; revision:number; phase:string; value:unknown}[]} */ (raw);
  };
  const finger = await h.thumbs(page);
  /** @param {import('playwright').Locator} target */
  const down = async target => {
    const box = await target.boundingBox(); assert.ok(box);
    await finger.down({ x:box.x+box.width/2,y:box.y+box.height/2 });
  };
  await h.step('held face emits press and release with revision',async () => {
    await open('stick-faces'); await down(page.locator('[data-target="pick"]')); await finger.up();
    assert.deepEqual((await outputs()).map(o => [o.control,o.phase,o.value,o.revision]),[['pick','press',true,1],['pick','release',false,1]]);
  });
  await h.step('stick vector and neutral carry revision',async () => {
    await down(page.locator('.ka-stick')); await finger.up();
    const stick = (await outputs()).filter(o => o.control === 'move');
    assert.ok(stick.length); assert.ok(stick.every(o => o.revision === 1));
    assert.deepEqual(stick.at(-1)?.value,{ x:0,y:0 });
  });
  await h.step('removed held control releases at its original revision',async () => {
    await down(page.locator('[data-target="pick"]'));
    await page.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-layout',{ detail:'watch' })); });
    await page.getByText('Watch the TV',{ exact:true }).first().waitFor();
    assert.deepEqual((await outputs()).at(-1),{ control:'pick',phase:'release',value:false,revision:1 });
    await finger.up();
    await h.shot('removed-mid-hold',page);
  });
  await h.step('surviving disabled face retains press revision across layout change',async () => {
    await open('stick-faces'); await down(page.locator('[data-target="pick"]'));
    await page.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-layout',{ detail:'disabled-faces' })); });
    await page.locator('[data-target="pick"][aria-disabled="true"]').waitFor();
    await finger.up();
    assert.deepEqual((await outputs()).slice(-2).map(o => [o.phase,o.revision]),[['press',1],['release',1]]);
    await down(page.locator('[data-target="pick"]'));
    assert.equal(await page.locator('[data-target="pick"]').getAttribute('data-held'),'true');
    await finger.up();
    assert.deepEqual((await outputs()).slice(-2).map(o => [o.phase,o.revision]),[['press',2],['release',2]]);
    await h.shot('disabled-face-feedback',page);
  });
  await h.step('state-only grid update advances the wire revision',async () => {
    await open('picker');
    await page.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-layout',{ detail:'selected-picker' })); });
    await page.locator('.ka-layout-engine[data-revision="2"]').waitFor();
    assert.equal(await page.locator('.ka-layout-ghost').count(),0);
    await down(page.locator('[data-target="grid:1"]')); await finger.up();
    assert.equal((await outputs()).at(-1)?.revision,2);
  });
  await h.step('grid index and Lock in id',async () => {
    await open('picker'); await down(page.locator('[data-target="grid:0"]')); await finger.up();
    await down(page.locator('[data-target="lock:lock"]')); await finger.up();
    assert.deepEqual((await outputs()).map(o => [o.control,o.value,o.revision]),[['grid',0,1],['lock','lock',1]]);
  });
  await h.step('D-pad direction press and release',async () => {
    await open('dpad-only'); await down(page.getByRole('button',{ name:'Up',exact:true })); await finger.up();
    assert.deepEqual((await outputs()).map(o => [o.control,o.phase,o.value,o.revision]),[['directions','press','up',1],['directions','release','up',1]]);
  });
  await h.step('card id and disabled card',async () => {
    await open('cards'); await down(page.locator('[data-target="hand:queen"]')); await finger.up();
    await down(page.locator('[data-target="hand:ten"]')); await finger.up();
    assert.deepEqual((await outputs()).map(o => [o.control,o.value,o.revision]),[['hand','queen',1]]);
  });
  const checkTransition = async () => {
    const state = await page.locator('.ka-controller-play').evaluate(play => {
      const incoming = play.querySelector('.ka-layout-engine:not(.ka-layout-ghost)');
      const outgoing = play.querySelector('.ka-layout-ghost');
      if (!incoming) throw new Error('Missing incoming layer');
      return { parts:incoming.querySelectorAll('[data-part]').length,
        above:!outgoing || Number(getComputedStyle(incoming).zIndex) > Number(getComputedStyle(outgoing).zIndex),
        inert:!outgoing || outgoing.hasAttribute('inert'),
        opaque:!outgoing || getComputedStyle(outgoing).opacity === '1',
        noTaps:!outgoing || [outgoing,...outgoing.querySelectorAll('*')].every(node => getComputedStyle(node).pointerEvents === 'none') };
    });
    assert.ok(state.parts && state.above && state.inert && state.opaque && state.noTaps);
  };
  await h.step('answer choice transitions to Watch the TV without a blank frame',async () => {
    await open('options');
    const transitionMs = await page.locator('.ka-layout-engine').evaluate(node => parseFloat(getComputedStyle(node).getPropertyValue('--ka-duration-slow')));
    assert.ok(transitionMs > 0);
    const answer = await page.locator('[data-target="answers:a"]').boundingBox(); assert.ok(answer);
    // Sample a blank interior patch, away from the icon, label, rounded edge and press scale.
    const sample = { x:Math.round(answer.x+answer.width/4), y:Math.round(answer.y+answer.height/4) };
    await down(page.locator('[data-target="answers:a"]')); await finger.up();
    assert.deepEqual((await outputs()).map(o => [o.control,o.value,o.revision]),[['answers','a',1]]);
    const strip = await h.frameStrip('answer-transition',page,{ frames:12,everyMs:Math.ceil(transitionMs/10),checkFrame:checkTransition });
    assert.equal(await page.locator('.ka-layout-ghost').count(),0);
    assert.equal(await page.locator('.ka-layout-engine').count(),1);
    // Inspect the actual strip frames, so a transparent incoming layer cannot pass on timing alone.
    const source = `data:image/jpeg;base64,${(await readFile(join(h.evidence,strip))).toString('base64')}`;
    const decoder = await page.context().newPage();
    try {
      const viewport = page.viewportSize(); assert.ok(viewport);
      const scale = await page.evaluate(() => devicePixelRatio);
      const pixels = await decoder.evaluate(async ({ source,sample,viewport,scale }) => {
        const image = new Image(); image.src = source; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Missing pixel decoder');
        ctx.drawImage(image,0,0);
        const columns = Math.max(1,Math.min(3,12,Math.floor(1920/(viewport.width*scale))));
        return Array.from({ length:12 },(_,i) => [...ctx.getImageData(
          i%columns*viewport.width*scale+sample.x*scale,Math.floor(i/columns)*(viewport.height*scale+28)+sample.y*scale,1,1).data].slice(0,3));
      },{ source,sample,viewport,scale });
      const background = pixels.at(-1); assert.ok(background);
      const contrast = pixels.map(pixel => Math.hypot(...pixel.map((channel,i) => channel-(background[i] ?? 0))));
      const first = contrast[0]; assert.ok(first !== undefined && first > 30,'strip starts with visible outgoing answer');
      let decreases = 0;
      for (let i = 1; i < contrast.length; i++) {
        const before = contrast[i-1] ?? 0, after = contrast[i] ?? 0;
        assert.ok(after <= before+4,`frame ${String(i+1)}: outgoing contrast must not increase (JPEG tolerance)`);
        if (before-after > 4) decreases++;
        assert.ok(before-after < first*0.8,'outgoing controls must not disappear in one step');
      }
      assert.ok(decreases >= 3,'outgoing contrast falls progressively across at least three intervals');
    } finally { await decoder.close(); }
    await page.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-layout',{ detail:'options' })); });
    await h.frameStrip('answer-return',page,{ frames:12,everyMs:Math.ceil(transitionMs/10),checkFrame:checkTransition });
    assert.equal(await page.locator('.ka-layout-ghost').count(),0);
    await down(page.locator('[data-target="answers:a"]')); await finger.up();
    assert.equal((await outputs()).at(-1)?.revision,3);
  });
  await h.step('reduced motion keeps state changes and omits transition animations',async () => {
    await page.emulateMedia({ reducedMotion:'reduce' }); await open('options');
    await down(page.locator('[data-target="answers:a"]')); await finger.up();
    assert.equal(await page.locator('.ka-layout-ghost').count(),0);
    assert.equal(await page.locator('.ka-layout-engine').evaluate(node => node.getAnimations({ subtree:true }).length),0);
    await h.shot('reduced-motion-watch',page);
    await page.evaluate(() => { window.dispatchEvent(new CustomEvent('controller-demo-layout',{ detail:'options' })); });
    assert.equal(await page.locator('.ka-layout-ghost').count(),0);
    assert.equal(await page.locator('.ka-layout-engine').evaluate(node => node.getAnimations({ subtree:true }).length),0);
    await h.shot('reduced-motion',page);
  });
}
