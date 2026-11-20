// RZ-016 RZ-031 RZ-032 PLAT-022: three real phones, FFA ties and team places.
import assert from 'node:assert/strict';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function phonePolish(h) {
  assert.equal(h.maxPhones,3,'Use --phones 3');
  // R-08's read-only public-view seam. Inputs always travel from the phones.
  await h.host.route('**/src/session-adapter.ts',async route => {
    const response = await route.fetch(), source = await response.text();
    assert.ok(source.includes('runner = next;'));
    await route.fulfill({response,body:source.replace('runner = next;',`runner = next;
      Reflect.set(window,'r19Public',()=>runner === next && next.state ? loaded.game.publicView(next.state) : null);`)});
  });
  /** @typedef {ReturnType<typeof import('../../games/rabakz/src/rules/views').publicView>} Public */
  const view = () => h.host.evaluate(() => {
    /** @type {unknown} */
    const candidate = Reflect.get(window,'r19Public');
    return /** @type {() => Public} */ (candidate)();
  });
  await h.createRoom();
  /** @type {import('playwright').Page[]} */
  const phones = [];
  for (const name of ['R19Mango','R19Noodle','R19Fern']) {
    const phone = await h.newPhone(); phones.push(phone);
    await h.openJoin(phone,name); await phone.getByRole('button',{name:'Join',exact:true}).click();
    await h.waitSeated(phone,name);
    await phone.emulateMedia({reducedMotion:'no-preference'});
  }
  /** @template T @param {T | undefined} value @param {string} what @returns {T} */
  const required = (value, what) => { if (value === undefined) throw new Error(`Missing ${what}`); return value; };
  const leader = required(phones[0], 'leader phone'), winner = required(phones[1], 'winner phone');
  /** @param {string} name */
  const click = name => leader.getByRole('button',{name,exact:true}).click();
  /** @param {() => Promise<boolean>} predicate @param {string} label */
  async function until(predicate,label) {
    for (let i=0;i<100;i++) {
      if (await predicate()) return;
      await h.host.clock.runFor(100); await leader.waitForTimeout(30);
    }
    assert.fail(`Timed out: ${label}`);
  }
  /** @param {import('playwright').Page} phone */
  const panel = phone => phone.locator('.ka-private-panel:not(.ka-private-ghost)');
  /** Wait on the real animation timeline: the host fake clock cannot finish Web Animations.
   * @param {import('playwright').Page} phone */
  const settle = phone => phone.evaluate(async () => {
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)));
  });
  /** @param {Public} totals @param {Public['players'][number]} player @param {boolean} teams */
  function placing(totals,player,teams) {
    const scores = teams ? totals.teamScores : totals.players.map(p=>p.score);
    const score = teams ? required(totals.teamScores[required(player.team,'player team')], 'team score') : player.score;
    const place = 1+scores.filter(s=>s>score).length;
    return `${scores.filter(s=>s===score).length>1 ? '=' : ''}${String(place)}${place === 1 ? 'st' : 'nd'}`;
  }
  await click('Pick a game');
  for (const id of ['peek-poker','rabakz']) {
    await click('Next'); await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
  }
  await click('Select'); await leader.getByRole('region',{name:'Game settings'}).waitFor();
  // R-08 oracle: read the shipped bank on the host, never on a phone.
  const answers = await h.host.evaluate(async () => {
    const path = '/@id/__x00__virtual:rabakz-bank';
    /** @type {unknown} */
    const module = await import(path);
    const loaded = /** @type {{default:{files:{text:string}[]}}} */ (module);
    return Object.fromEntries(loaded.default.files.flatMap(file => {
      /** @type {unknown} */
      const parsed = JSON.parse(file.text);
      const data = /** @type {{questions?:{prompt:string;options:string[];correct:number}[]}} */ (parsed);
      return (data.questions ?? []).map(q => [q.prompt,q.options[q.correct]]);
    }));
  });
  await h.host.clock.install();
  try {
    for (const teams of [false,true]) {
      const mode = teams ? 'teams' : 'ffa';
      if (teams) {
        // The first match left the TV clock paused: run it normally through the set-up screens.
        await h.host.clock.resume();
        await click('Back to game picker'); await click('Select');
        await leader.getByRole('region',{name:'Game settings'}).waitFor();
        await click('Teams');
      }
      await click('Start');
      if (teams) {
        await leader.getByRole('region',{name:'Pick a side'}).waitFor(); await click('Start');
      }
      await h.host.locator('.rz-question').waitFor();
      await h.host.clock.pauseAt(await h.host.evaluate(() => Date.now())+50);
      for (let round=1;round<=10;round++) await h.step(`${mode} question ${String(round)}`,async () => {
        await until(async () => { const v=await view(); return v.round === round && v.phase === 'question'; },'question');
        const current = await view(), q = current.question; assert.ok(q);
        const right = answers[q.prompt], wrong = q.options.find(option => option !== right);
        assert.ok(right && wrong);
        if (round === 1) {
          await leader.getByRole('button',{name:wrong,exact:true}).click();
          // The TV clock is paused: advance it until the host applies the wrong answer (as R-15 does).
          await until(async () => await panel(leader).getByText('Locked out',{exact:true}).count() > 0,'lock-out');
          assert.ok((await panel(leader).innerText()).includes(`Your answer: ${wrong}`));
          assert.equal(await panel(leader).locator('.ka-layout-title > span').filter({hasText:'Locked out'}).evaluate(node => node.getAnimations().length),0,'Locked out has no animations');
          await settle(leader);
          await h.shot(`${mode}-locked-out`,leader);
          // Stop the pulse at its first frame as soon as it is created.
          await winner.evaluate(() => {
            /** @type {unknown} */
            const candidate = Reflect.get(Element.prototype,'animate');
            const original = /** @type {Element['animate']} */ (candidate);
            /** @type {Element['animate']} */
            Element.prototype.animate = function (...args) {
              const animation = original.apply(this,args);
              if (this.matches('.ka-layout-title > span') && args[0] && JSON.stringify(args[0]).includes('1.05')) {
                animation.pause(); animation.currentTime = 0;
              }
              return animation;
            };
          });
          await winner.getByRole('button',{name:right,exact:true}).click();
        } else if (teams && round === 2) {
          // One fresh correct answer per side gives equal totals despite the 2:1 split.
          const winningTeam = current.players[1]?.team;
          assert.ok(winningTeam === 0 || winningTeam === 1);
          const opponent = current.players.findIndex(player => player.team !== winningTeam);
          assert.ok(opponent >= 0);
          await required(phones[opponent],'opposite-team phone').getByRole('button',{name:right,exact:true}).click();
        } else await click('Skip');
        await until(async () => (await view()).phase === 'reveal','reveal');
        if (round === 1) {
          await panel(leader).getByText('Wrong',{exact:true}).waitFor();
          await panel(winner).getByText('Right',{exact:true}).waitFor();
          assert.equal(await panel(winner).locator('.ka-layout-title > span').filter({hasText:'Right'}).evaluate(node => node.getAnimations().filter(animation =>
            animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some(frame => String(frame.transform).includes('1.05'))).length),1,'Right has one success pulse');
          assert.equal(await panel(leader).locator('.ka-layout-title > span').filter({hasText:'Wrong'}).evaluate(node => node.getAnimations().length),0,'Wrong has no pulse');
          await settle(leader);
          await h.shot(`${mode}-wrong`,leader); await h.shot(`${mode}-right`,winner,undefined,false);
          await h.frameStrip(`${mode}-right-pulse`,winner,{frames:6,everyMs:0,checkFrame:async index => {
            await winner.evaluate(index => {
              for (const animation of document.getAnimations()) if (animation.effect instanceof KeyframeEffect &&
                animation.effect.target instanceof Element && animation.effect.target.matches('.ka-layout-title > span')) {
                animation.pause(); animation.currentTime = Number(animation.effect.getTiming().duration)*index/5;
              }
            },index);
          }});
          await winner.evaluate(() => { for (const animation of document.getAnimations()) animation.finish(); });
          await settle(winner);
        }
        await until(async () => (await view()).phase !== 'reveal','after reveal');
        if (round === 5) {
          assert.equal((await view()).phase,'scoreboard');
          const next = leader.getByRole('button',{name:'Continue',exact:true}); await next.waitFor();
          assert.equal(await next.locator('svg').count(),0);
          await settle(leader);
          await h.shot(`${mode}-continue`,leader);
          const totals = await view();
          for (const [i,phone] of phones.entries()) {
            const player = totals.players[i]; assert.ok(player);
            const expected = placing(totals,player,teams);
            await panel(phone).getByText(expected,{exact:true}).waitFor();
            if (teams) await panel(phone).getByText(`${player.team === 0 ? 'Red' : 'Blue'} team`,{exact:true}).waitFor();
            await settle(phone);
            await h.shot(`${mode}-place-phone${String(i+1)}`,phone);
          }
          if (teams) assert.equal(totals.teamScores[0],totals.teamScores[1],'Teams tie for =1st');
          if (!teams) assert.equal(totals.players.filter(p=>p.score === 0).length,2,'FFA has a tie for second');
          await click('Continue');
        }
      });
      await until(async () => (await view()).phase === 'over','results');
      // The final standings show each phone's place; the leader's Continue then ends the match (as in R-06).
      const finalContinue = leader.getByRole('button',{name:'Continue',exact:true});
      await until(async () => await finalContinue.isVisible(),'final Continue');
      const totals = await view();
      if (teams) assert.equal(totals.teamScores[0],totals.teamScores[1],'Final teams tie for =1st');
      await finalContinue.click();
      // The TV clock is paused: advance it until the results controls reach the leader's phone.
      await until(async () => await leader.getByRole('button',{name:'Back to game picker',exact:true}).isVisible(),'final controls');
      for (const [i,phone] of phones.entries()) {
        const player = required(totals.players[i],'final player');
        const results = phone.locator('.phone-results');
        await results.getByRole('heading',{name:'Results',exact:true}).waitFor();
        await results.getByText(`Place ${placing(totals,player,teams)}`,{exact:true}).waitFor();
        await results.getByText(`Score ${String(player.score)}`,{exact:true}).waitFor();
        await settle(phone);
        await h.shot(`${mode}-final-place-phone${String(i+1)}`,phone);
      }
    }
  } finally { await h.host.clock.resume(); }
}
