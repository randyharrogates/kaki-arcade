import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** PP-012, PP-032. Run once with --phones 1 and with --phones 3 and --phones 8. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function scores(h) {
  assert.ok([1,3,8].includes(h.maxPhones),'Use one, three or eight phones');
  // Fixed seed only: every match still runs the real rules and phone inputs.
  await h.host.route('**/src/session-adapter.ts',async route=>{
    const response=await route.fetch();const source=await response.text();
    assert.ok(source.includes('const seed = o.seed();'));
    await route.fulfill({response,body:source.replace('const seed = o.seed();','const seed = 404;')});
  });
  await h.host.addInitScript(()=>{localStorage.removeItem('kaki.host-device.game.peek-poker.progress-v1');});
  await h.createRoom();
  /** @type {import('playwright').Page[]} */
  const phones=[];
  try {
    for(let i=0;i<h.maxPhones;i++) {
      const phone=await h.newPhone();phones.push(phone);
      await h.openJoin(phone,`Player ${String(i+1)}`);
      await phone.getByRole('button',{name:'Join',exact:true}).click();
      await h.waitSeated(phone,`Player ${String(i+1)}`);
    }
    const leader=phones[0];assert.ok(leader);
    await leader.getByRole('button',{name:'Pick a game',exact:true}).click();
    await leader.getByRole('button',{name:'Next',exact:true}).click();
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await leader.getByRole('button',{name:'Select',exact:true}).click();
    await h.host.locator('[data-game="peek-poker"][data-expanded="true"]').waitFor();
    await leader.getByRole('button',{name:'Start',exact:true}).click();
    await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
    await h.host.clock.install();
    /** @param {string} phase */
    const advance=async phase=>{
      for(let second=0;second<100;second++) {
        if(await h.host.locator(`.pp-table[data-phase="${phase}"]`).count()) return;
        await h.host.clock.runFor(1000);
      }
      await h.shot(`stuck-before-${phase}`, h.host, undefined, false); for (const phone of phones) await h.shot(`stuck-before-${phase}-phone`, phone, undefined, false);
      throw Error(`Did not reach ${phase}`);
    };
    // Seek the real mounted WAAPI effects so screenshot settling cannot skip
    // the short motion; no rules or animation keyframes are replaced.
    const motionStrip=async (/** @type {string} */ name,/** @type {string} */ selector)=>{
      await h.host.locator(selector).evaluateAll(nodes=>{nodes.forEach(n=>{n.getAnimations().forEach(a=>{a.pause();});});});
      const strip=await h.frameStrip(name,h.host,{frames:6,everyMs:0,checkFrame:async index=>{
        await h.host.locator(selector).evaluateAll((nodes,time)=>{nodes.forEach(n=>{n.getAnimations().forEach(a=>{a.currentTime=(n.matches('.pp-result-best') ? (a.effect?.getTiming().delay ?? 0) : 0)+time;});});},index*90);
      }});
      // The shared harness labels wall-clock capture time. Replace only its label bands
      // with the deterministic seek times; keep the captured app pixels intact.
      const path=join(h.evidence,strip);
      const source=`data:image/jpeg;base64,${(await readFile(path)).toString('base64')}`;
      const labels=await h.browser.newPage();
      try {
        const data=await labels.evaluate(async source=>{
          const image=new Image();image.src=source;await image.decode();
          const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
          const context=canvas.getContext('2d');if(!context) throw Error('No canvas context');
          context.drawImage(image,0,0);
          // These full-TV strips have one column (both TV widths exceed 960 px).
          const height=image.height/6;
          for(let index=0;index<6;index++) {
            const y=(index+1)*height-28;
            context.fillStyle='white';context.fillRect(0,y,image.width,28);
            context.fillStyle='black';context.font='18px sans-serif';context.fillText(`${String(index*90)} ms`,8,y+21);
          }
          return canvas.toDataURL('image/jpeg',0.9).split(',')[1] ?? '';
        },source);
        await writeFile(path,Buffer.from(data,'base64'));
      } finally {await labels.close();}
      await h.host.locator(selector).evaluateAll(nodes=>{nodes.forEach(n=>{n.getAnimations().forEach(a=>{a.finish();});});});
    };
    const bestTables=async (/** @type {string} */ phase)=>{
      for(const size of [{width:1920,height:1080},{width:1280,height:720}]) {
        await h.host.setViewportSize(size);
        await h.host.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        assert.equal(await h.host.locator('.pp-best').evaluate(best=>{
          const b=best.getBoundingClientRect();return [...document.querySelectorAll('.pp-player,.pp-hands')].every(n=>{const r=n.getBoundingClientRect();return r.right<=b.left || r.left>=b.right || r.bottom<=b.top || r.top>=b.bottom;});
        }),true);
        await h.shot(`match-2-${phase}-${String(size.width)}`);
      }
      await h.host.setViewportSize({width:1920,height:1080});
    };
    /** @param {number} number @param {boolean} lock */
    const match=async (number,lock)=>{
      // No stored best shows no Best line (round 5); a stored best shows "Best N".
      if(h.maxPhones === 1) { const best=(await h.host.locator('.pp-best').allInnerTexts()).join('').trim(); assert.ok(number === 1 ? best === '' : /^Best [1-9]\d*$/.test(best), `Best line before match ${String(number)}: ${best}`); }
      // Default five-round match. Identical pairs, no random-fill RNG consumption:
      // second solo match locks for +3 instead of +1, guaranteeing an improvement.
      for(let round=1;round<=5;round++) {
        await advance('pick');
        if(number === 2 && round === 1) await bestTables('pick');
        for(const phone of phones) {
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button').nth(0).click();await h.host.clock.runFor(100);
          await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button').nth(8).click();await h.host.clock.runFor(100);
          await phone.locator('[data-target="grid:8"][data-state="selected"]').waitFor();
        }
        if(lock) {await leader.getByRole('button',{name:'Lock in',exact:true}).click();await h.host.clock.runFor(100);}
        await advance('reveal');
        await advance('scoreboard');
        assert.equal(await h.host.locator('.pp-score-row').count(),h.maxPhones);
        if(round === 1) {
          await h.shot(`match-${String(number)}-scoreboard`);
          if(h.maxPhones >= 3) await motionStrip('scoreboard-row-entrance','.pp-score-row');
        }
        for(const [index,phone] of phones.entries()) {
          await phone.getByText('Place',{exact:true}).waitFor();await phone.getByText('Score',{exact:true}).waitFor();
          if(round === 1) await h.shot(`match-${String(number)}-phone-${String(index+1)}-scores`,phone);
        }
        await h.host.clock.runFor(5100);
      }
      await advance('over');
      if(h.maxPhones === 1) {
        await h.host.getByText(/^New best · \d+$/).waitFor();
        await h.host.locator('.pp-score-row').evaluateAll(rows=>{rows.forEach(row=>{row.getAnimations().forEach(animation=>{animation.finish();});});});
        await motionStrip(`match-${String(number)}-new-best-pulse`,'.pp-result-best');
      }
      await h.host.locator('.game-final-hint').waitFor();
      for(const [index,phone] of phones.entries()) {await phone.locator('.phone-results').getByText(/^Place /).waitFor();await phone.locator('.phone-results').getByText(/^Score /).waitFor();await h.shot(`match-${String(number)}-phone-${String(index+1)}-final`,phone);}
      if(h.maxPhones === 1) await h.host.getByText(/^New best · \d+$/).waitFor();
      else {
        assert.equal(await h.host.locator('.pp-score-row > strong:first-child').filter({hasText:'=2'}).count(),h.maxPhones-1);
        assert.equal(await h.host.getByText(/New best|Best \d/).count(),0);
      }
      for(const size of [{width:1920,height:1080},{width:1280,height:720}]) {
        await h.host.setViewportSize(size);
        await h.host.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const outside=await h.host.locator('.pp-score-row').evaluateAll(rows=>rows.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight};}).filter(r=>r.left<0 || r.top<0 || r.right>r.w+0.5 || r.bottom>r.h+0.5));
        assert.deepEqual(outside,[],`Score rows outside ${String(size.width)}x${String(size.height)}`);
        assert.equal(await h.host.locator('.game-final-hint').evaluate(hint=>{
          const h=hint.getBoundingClientRect();return [...document.querySelectorAll('.pp-score-row,.pp-summary')].every(node=>{const r=node.getBoundingClientRect();return r.right<=h.left || r.left>=h.right || r.bottom<h.top || r.top>h.bottom;});
        }),true,'Final hint overlaps the podium');
        await h.shot(`match-${String(number)}-podium-${String(size.width)}`);
      }
      await h.host.setViewportSize({width:1920,height:1080});
      return Number(await h.host.locator('.pp-winning-score').innerText());
    };
    const first=await match(1,h.maxPhones >= 3);
    if(h.maxPhones === 1) {
      const saved=await h.host.evaluate(()=>localStorage.getItem('kaki.host-device.game.peek-poker.progress-v1'));
      assert.ok(saved);
      const record = /** @type {unknown} */ (JSON.parse(saved));
      assert.deepEqual(record,{schemaVersion:1,data:{best:first}});
      // The game's final screen uses the existing Continue hand-off to shell results.
      await leader.getByRole('button',{name:'Continue',exact:true}).click();
      // Preparing the next match decodes art and waits on real frames; let the
      // page clock run naturally again, as it does in match 1 (runFor still jumps).
      await h.host.clock.resume();
      await leader.getByRole('button',{name:'Play again',exact:true}).click();
      await h.host.locator('.pp-table[data-phase="memorise"]').waitFor({timeout:30000}).catch(async (/** @type {unknown} */ error)=>{
        await h.shot('stuck-real-time-before-memorise', h.host, undefined, false); throw error;
      });
      assert.equal(await h.host.locator('.pp-best').innerText(),`Best ${String(first)}`);
      await bestTables('memorise');
      await h.shot('match-2-phone-memorise',leader);
      const second=await match(2,true);assert.ok(second>first);
    }
  } finally {for(const phone of phones) await phone.close();}
}
