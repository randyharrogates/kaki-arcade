import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function cookPicker(h) {
  assert.equal(h.maxPhones,4,'Use --phones 4 for the join-during-pick evidence');
  await h.host.emulateMedia({reducedMotion:'no-preference'});
  await h.createRoom();
  const phones = [];
  for(let index=0;index<3;index++) {
    const phone = await h.newPhone(); phones.push(phone);
    await phone.setViewportSize({width:844,height:390});
    const name = `Cook ${String(index+1)}`;
    await h.openJoin(phone,name);
    await phone.getByRole('button',{name:'Join',exact:true}).click();
    await h.waitSeated(phone,name);
  }
  const leader = phones[0], second = phones[1]; assert.ok(leader && second);
  await leader.getByRole('button',{name:'Pick a game',exact:true}).click();
  await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
  await leader.getByRole('button',{name:'Select',exact:true}).click();
  await leader.getByRole('button',{name:'Start',exact:true}).click();
  await h.host.getByRole('region',{name:'Cook picker'}).waitFor();
  await leader.locator('.ka-controller-shell[data-theme="tabao-rush"]').waitFor();
  for(const size of [{width:844,height:390},{width:667,height:375},{width:932,height:430}]) {
    await leader.setViewportSize(size);
    await leader.locator('.ka-layout-engine[data-fits="true"]').waitFor();
    await leader.waitForFunction(()=>[...document.querySelectorAll('.ka-layout-picture img')].length===8 && [...document.querySelectorAll('.ka-layout-picture img')].every(n=>n instanceof HTMLImageElement && n.complete && n.naturalWidth>0));
    assert.equal(await leader.locator('[data-target="cooks:0"]').getAttribute('aria-pressed'),'true');
    await h.shot(`phone-default-${String(size.width)}`,leader);
  }
  for(const size of [{width:1920,height:1080},{width:1280,height:720}]) {
    await h.host.setViewportSize(size); await h.shot(`tv-picker-${String(size.width)}`);
  }
  assert.equal(await second.locator('[data-target="cooks:0"]').getAttribute('aria-disabled'),'true');
  await second.locator('[data-target="cooks:0"]').click({force:true});
  assert.equal(await second.locator('[data-target="cooks:1"]').getAttribute('aria-pressed'),'true');
  await h.host.setViewportSize({width:1920,height:1080});
  await h.frameStrip('tv-cook-selection',h.host,{frames:8,everyMs:21,checkFrame:async index=>{if(index===1)await second.getByRole('button',{name:'Songkok',exact:true}).click();}});
  await second.locator('[data-target="cooks:7"][aria-pressed="true"]').waitFor();
  await h.host.locator('.tr-cook-card').nth(7).getByLabel('Seat 2',{exact:true}).waitFor();
  await h.shot('phone-free-cook-selected',second);
  // Hold the TV badge entrance halfway through its token-defined animation.
  await h.host.evaluate(() => {
    const cell = document.querySelectorAll('.tr-cook-card')[6];
    if (!cell) throw Error('Missing re-pick cell');
    const observer = new MutationObserver(() => {
      const badge = cell.querySelector('.tr-cook-seat');
      if (!badge) return;
      for (const animation of badge.getAnimations()) {
        const duration = animation.effect?.getComputedTiming().duration;
        if (typeof duration === 'number') { animation.pause(); animation.currentTime = duration / 2; }
      }
      observer.disconnect();
    });
    observer.observe(cell,{childList:true,subtree:true});
  });
  await second.getByRole('button',{name:'Turban',exact:true}).click();
  const cell = h.host.locator('.tr-cook-card').nth(6);
  const badge = cell.locator('.tr-cook-seat');
  await badge.waitFor();
  const opacity = await badge.evaluate(node => Number(getComputedStyle(node).opacity));
  assert.ok(opacity > 0 && opacity < 1, `Badge opacity must be mid-fade: ${String(opacity)}`);
  const cellBox = await cell.boundingBox(); assert.ok(cellBox);
  await h.shot('badge-fade',h.host,cellBox,false);
  await badge.evaluate(node => { node.getAnimations().forEach(animation => { animation.play(); }); });
  await second.getByRole('button',{name:'Songkok',exact:true}).click();
  const fourth = await h.newPhone(); phones.push(fourth);
  await fourth.setViewportSize({width:844,height:390});
  await h.openJoin(fourth,'Cook 4');
  await fourth.getByRole('button',{name:'Join',exact:true}).click();
  // A phone joining during the picker goes straight to the game controller: no lobby "You're in" or lobby seat.
  try { await fourth.locator('.ka-controller-shell[data-theme="tabao-rush"]').waitFor(); }
  catch (error) { await h.shot('failure-fourth', fourth); await h.shot('failure-fourth-tv'); throw error; }
  await fourth.locator('[data-target="cooks:1"][aria-pressed="true"]').waitFor();
  await h.host.locator('.tr-cook-card').nth(1).getByLabel('Seat 4',{exact:true}).waitFor();
  await h.shot('phone-join-lowest-free',fourth);
  await h.shot('tv-join-during-pick');
  await h.host.emulateMedia({reducedMotion:'reduce'});
  await second.getByRole('button',{name:'Turban',exact:true}).click();
  await h.host.locator('.tr-cook-card').nth(6).getByLabel('Seat 2',{exact:true}).waitFor();
  const reducedBadges = await h.host.locator('.tr-cook-seat').evaluateAll(nodes => nodes.map(node => Number(getComputedStyle(node).opacity)));
  assert.equal(reducedBadges.length,4);
  assert.ok(reducedBadges.every(opacity => opacity === 1));
  await h.shot('tv-picker-reduced-motion');
  await second.getByRole('button',{name:'Songkok',exact:true}).click();
  await h.host.locator('.tr-cook-card').nth(7).getByLabel('Seat 2',{exact:true}).waitFor();
  await h.host.emulateMedia({reducedMotion:'no-preference'});
  for(const phone of phones.slice(0,2)) await phone.getByRole('button',{name:'Ready',exact:true}).click();
  await second.locator('[data-target="ready:ready"][aria-pressed="true"]').waitFor();
  await second.locator('[data-target="cooks:7"] .ka-layout-ready').waitFor();
  await second.getByRole('button',{name:'Turban',exact:true}).click();
  await second.waitForTimeout(200);
  assert.equal(await second.locator('[data-target="cooks:7"]').getAttribute('aria-pressed'),'true');
  await h.shot('phone-after-ready',second);
  const third = phones[2]; assert.ok(third);
  await third.getByRole('button',{name:'Ready',exact:true}).click();
  // Hold only the exit at its start to capture all Ready ticks before the picker leaves.
  await h.host.evaluate(() => {
    const picker = document.querySelector('.tr-cook-picker');
    if (!(picker instanceof HTMLElement)) throw Error('Missing picker');
    const animate = picker.animate.bind(picker);
    picker.animate = (...args) => { const animation = animate(...args); animation.pause(); return animation; };
  });
  await fourth.getByRole('button',{name:'Ready',exact:true}).click();
  await h.host.waitForFunction(()=>[...document.querySelectorAll('.tr-cook-seat')].length===4 && [...document.querySelectorAll('.tr-cook-seat')].every(n=>n.textContent.includes('✓')));
  await h.host.evaluate(()=>{ document.querySelectorAll('.tr-cook-seat').forEach(n=>{ n.getAnimations().forEach(a=>{ a.finish(); }); }); });
  await h.shot('tv-all-ready',h.host,undefined,false);
  await h.frameStrip('tv-picker-exit',h.host,{frames:6,everyMs:55,checkFrame:async index=>{
    if(index===1)await h.host.evaluate(()=>{ document.querySelector('.tr-cook-picker')?.getAnimations().forEach(a=>{ a.play(); }); });
  }});
  await h.host.locator('.tr-cook-picker[hidden]').waitFor({state:'attached'});
  await h.host.setViewportSize({width:1920,height:1080});
  assert.equal(await h.host.locator('canvas[aria-label="Tabao Rush kitchen"]').count(),1);
  await h.shot('tv-round-picked-heads');

  // A fresh room gives the keyboard seat and one phone a complete first round.
  for (const phone of phones) await phone.goto('about:blank');
  await h.host.goto(h.origin);
  await h.host.evaluate(() => { sessionStorage.removeItem('kaki.host-reconnect.v1'); });
  await h.createRoom();
  await h.host.getByRole('main',{name:'Host lobby'}).waitFor();
  await h.host.keyboard.press('KeyJ');
  await h.host.getByText('L: leave',{exact:true}).waitFor();
  const phone = await h.newPhone();
  await h.openJoin(phone,'TV partner');
  await phone.getByRole('button',{name:'Join',exact:true}).click();
  await h.waitSeated(phone,'TV partner');
  await phone.getByRole('button',{name:'Pick a game',exact:true}).click();
  await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
  await phone.getByRole('button',{name:'Select',exact:true}).click();
  await phone.getByRole('button',{name:'Start',exact:true}).click();
  await h.host.getByRole('region',{name:'Cook picker'}).waitFor();
  // The picker is drawn behind Starting while the round prepares; keys count once play has begun.
  await h.host.locator('.mounted-game-preparation').waitFor({ state: 'detached' });
  await h.host.keyboard.press('Space');
  try {
    await h.host.getByLabel('Seat 1, Ready',{exact:true}).waitFor();
  } catch (error) {
    const badges = await h.host.locator('.tr-cook-seat').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    await h.shot('fail-tv-seat-host',h.host,undefined,false);
    await h.shot('fail-tv-seat-phone',phone,undefined,false);
    throw new Error(`TV seat did not ready; badges ${JSON.stringify(badges)}`, { cause: error });
  }
  await h.shot('tv-seat-ready');
  await phone.getByRole('button',{name:'Ready',exact:true}).click();
  await h.host.locator('.tr-cook-picker[hidden]').waitFor({state:'attached'});
  await h.shot('tv-seat-round');
}
