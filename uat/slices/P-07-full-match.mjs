// PP-001..013, PP-020..022, PP-030..032, PLAT-033 (see slice note for limits).
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** @typedef {{phase:string,round:number,totalRounds:number,seconds:number,grid:string[]|null,shared:string[],swap:{kind:string,from:number,to:number}|null,players:{id:string,name:string,seat:number,score:number,locked:boolean,picks:number[]|null}[],hands:{id:string,name:string,points:number,cards:string[]}[],standings:{id:string,score:number,place:number}[]}} View */
/** @typedef {{round:number,hands:string,cards:number,selected:(string|null)[],text:string}} DOMFrame */
const HAND_NAMES = ['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
/** @param {string} phase */
const preReveal = phase => ['memorise','swap','pick'].includes(phase);
/** @template T @param {T|null|undefined} value @param {string} name @returns {T} */
function required(value, name) {
  assert.ok(value !== undefined && value !== null, `Missing ${name}`);
  return value;
}
/** Independent five-card oracle; no game evaluator or private simulation state. @param {string[]} cards */
function rank(cards) {
  const values = cards.map(c => '23456789TJQKA'.indexOf(c[0] ?? '') + 2).sort((a,b) => b-a);
  const groups = [...new Set(values)].map(v => ({v,n:values.filter(x => x === v).length})).sort((a,b) => b.n-a.n || b.v-a.v);
  const flush = cards.every(c => c[1] === cards[0]?.[1]);
  const unique = [...new Set(values)];
  const straight = unique.length === 5 ? (required(unique[0], 'highest rank') - required(unique[4], 'lowest rank') === 4 ? required(unique[0], 'straight rank') : unique.join() === '14,5,4,3,2' ? 5 : 0) : 0;
  const counts = groups.map(g => g.n).join();
  const category = flush && straight ? 8 : counts === '4,1' ? 7 : counts === '3,2' ? 6 : flush ? 5 : straight ? 4 : counts === '3,1,1' ? 3 : counts === '2,2,1' ? 2 : counts === '2,1,1,1' ? 1 : 0;
  const kickers = straight && (category === 8 || category === 4) ? [straight] : groups.map(g => g.v);
  return { category, strength: [category,...kickers,...Array.from({length:5-kickers.length},()=>0)].reduce((n,v) => n*15+v,0) };
}
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function fullMatch(h) {
  assert.ok([3,8].includes(h.maxPhones), 'Use --phones 3 or 8');
  assert.ok(h.maxBytes <= 24*1024*1024, 'Evidence cap must be at most --max-mb 24');
  /** @type {import('playwright').Page[]} */ const phones = [];
  /** @type {(View & {receivedAt:number,hostClockAt:number})[]} */ const views = [];
  /** @type {{seat:number,round:number,gapMs:number,phoneReceivedAt:number,hostRevealReceivedAt:number,hostRevealClockAt:number}[]} */ const boundaryRows = [];
  /** @type {{seat:number,phone:number,host:number,phase:string}[]} */ const roundSkew = [];
  /** @type {{seat:number,phase:string,round:number,hostPhase:string,hostRound:number,viewCount:number,taps:number,receivedAt:number,message:unknown}[]} */ const received = [];
  /** @type {number[][]} */ let pairs = [];
  /** @type {View|undefined} */ let current;
  const taps = Array.from({length:h.maxPhones},()=>0);
  await h.host.exposeFunction('p07Public', /** @param {View} view @param {number} hostClockAt */ (view,hostClockAt) => { current = view; views.push({...view,receivedAt:performance.now(),hostClockAt}); });
  // Existing P-03 public output seam. Observe only; do not replace results or rules.
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(), source = await response.text();
    const marker = /publicView\(view\)\s*\{/;
    assert.ok(marker.test(source), 'P-03 public observation seam matches');
    await route.fulfill({response,body:source.replace(marker, `publicView(view) {
      window.p07View = structuredClone(view); window.p07Public(view, Date.now());`)});
  });
  // Every rendered pick frame, including transient DOM changes, is retained compactly.
  const observeDOM = () => {
    Reflect.set(window, 'p07Frames', []);
    const sample = () => {
      /** @type {unknown} */ const raw = Reflect.get(window, 'p07View');
      const view = /** @type {View|undefined} */ (raw);
      /** @type {unknown} */ const rawFrames = Reflect.get(window, 'p07Frames');
      const frames = /** @type {DOMFrame[]} */ (rawFrames);
      if (view?.phase === 'pick' || Reflect.get(window, 'p07Phase') === 'pick') {
        frames.push({round:view?.round ?? Number(Reflect.get(window,'p07Round')),
          hands:document.querySelector('.pp-hands')?.textContent ?? '',
          cards:document.querySelectorAll('.ka-private-panel:not(.ka-private-ghost) .ka-layout-card-face').length,
          selected:[...document.querySelectorAll('.ka-layout-engine:not(.ka-layout-ghost) [data-state="selected"]')].map(n => n.getAttribute('data-target')),
          text:document.body.innerText});
      }
      requestAnimationFrame(sample);
    }; requestAnimationFrame(sample);
  };
  await h.host.addInitScript(observeDOM);
  /** @returns {Promise<View>} */ const view = async () => {
    return h.host.evaluate(() => {
      /** @type {unknown} */ const raw = Reflect.get(window, 'p07View');
      return /** @type {View} */ (raw);
    });
  };
  /** @param {string} name @param {()=>Promise<void>|void} action */
  const step = (name, action) => h.step(name, async () => {
    const endpoint = new RegExp('^'+h.signalOrigin.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/^http/,'(?:https?|wss?)')+'/rooms/[A-Z0-9]{8}/host$');
    h.expectError(/^Failed to load resource: the server responded with a status of 426 \(Upgrade Required\)$/, 'host', endpoint);
    h.expectError(/^net::ERR_ABORTED$/, 'host', endpoint);
    await action();
  }, 120000);
  /** @param {string} phase */ const advance = async phase => {
    for (let i=0;i<900;i++) {
      if ((await view()).phase === phase) return;
      await h.host.clock.runFor(100);
    } throw Error(`Did not reach ${phase}`);
  };
  /** @param {string} name @param {import('playwright').Page} page */
  const still = async (name,page) => {
    let expired = false;
    const settled = async () => {
      let quiet = 0;
      while (quiet < 2 && !expired) {
        const count = await page.evaluate(async () => {
          const running = document.getAnimations().filter(a =>
            (a.playState === 'running' || a.pending) && a.effect?.getComputedTiming().iterations !== Infinity);
          await Promise.all(running.map(a => a.finished.catch(() => undefined)));
          return running.length;
        });
        quiet = count === 0 ? quiet + 1 : 0;
        // Use the runner's clock: the host's page timers are deliberately paused.
        await new Promise(resolve => setTimeout(resolve,20));
      }
    };
    let timer;
    try {
      await Promise.race([settled(),new Promise((_,reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error(`Still ${name}: finite animations did not settle within 3000 ms`));
        },3000);
      })]);
    } finally { clearTimeout(timer); }
    if(page===h.host && (await view()).phase==='reveal') {
      // document.getAnimations() cannot see the canvas requestAnimationFrame flip.
      await h.host.clock.runFor(600); // More than duration.slow (377 ms).
      await h.host.waitForFunction(n=>document.querySelectorAll('.pp-hands li').length===n,phones.length);
    }
    await h.shot(name,page,undefined,false);
  };
  /** @param {string} label */ const shots = async label => {
    await h.host.clock.runFor(600);
    await still(`${label}-tv`,h.host);
    for (const [i,phone] of phones.entries()) await still(`${label}-phone${String(i+1)}`,phone);
  };
  try {
    await h.createRoom();
    await step('Lobby: all phones join through real pairing', async () => {
      for (let i=0;i<h.maxPhones;i++) {
        const phone = await h.newPhone(); phones.push(phone);
        await phone.setViewportSize({width:844,height:390});
        // CSS-resolution stills avoid ninefold pixel duplication from mobile DPR 3.
        const screenshot=phone.screenshot.bind(phone);
        phone.screenshot=options=>screenshot({...options,scale:'css'});
        await phone.addInitScript(observeDOM);
        await phone.exposeFunction('p07Received', /** @param {unknown} message @param {string} phase @param {number} round */ (message,phase,round) => {
          received.push({receivedAt:performance.now(),seat:i+1,phase,round,hostPhase:current?.phase ?? 'lobby',hostRound:current?.round ?? 0,viewCount:views.length,taps:required(taps[i], `tap count for seat ${String(i+1)}`),message});
        });
        await phone.route('**/src/phone-browser.ts', async route => {
          const response = await route.fetch(), source = await response.text();
          const marker = /onControl:\s*\(?message\)?\s*=>\s*\{\s*options\.onControl\(message\);?\s*\}/;
          assert.ok(marker.test(source),'P-03 decoded message observation seam matches');
          await route.fulfill({response,body:source.replace(marker, `onControl: message => {
            if(message.t === 'layout') {
              const controls = message.layout.controls;
              if(controls.some(c=>c.kind==='grid')) window.p07Phase='pick';
              else if(!controls.length) window.p07Phase='reveal';
              else if(controls.some(c=>c.text==='Watch the TV')) {
                if(window.p07Phase!=='memorise') window.p07Round=(window.p07Round ?? 0)+1;
                window.p07Phase='memorise';
              } else if(controls.some(c=>c.text==='Scores on the TV')) window.p07Phase='scoreboard';
            }
            window.p07Received(message,window.p07Phase ?? 'lobby',window.p07Round ?? 0);
            options.onControl(message);
          }`)});
        });
        await h.openJoin(phone,`Player ${String(i+1)}`);
        await phone.getByRole('button',{name:'Join',exact:true}).click();
        await h.waitSeated(phone,`Player ${String(i+1)}`);
      }
    });
    const leader = phones[0]; assert.ok(leader);
    await step('Picker → default five rounds → Start real Peek Poker',async () => {
      await leader.getByRole('button',{name:'Pick a game',exact:true}).click();
      await leader.getByRole('button',{name:'Next',exact:true}).click();
      await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
      await leader.getByRole('button',{name:'Select',exact:true}).click();
      await leader.getByRole('button',{name:'Start',exact:true}).click();
      await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
      await h.host.clock.install();
      await h.host.clock.pauseAt(await h.host.evaluate(() => new Date(Date.now()+50)));
      assert.equal((await view()).totalRounds,5);
    });
    const totals = Array.from({length:h.maxPhones},()=>0);
    for(let round=1;round<=5;round++) {
      const startIndex = views.length-1;
      taps.fill(0);
      let grid = /** @type {string[]} */ ([]), shared = /** @type {string[]} */ ([]);
      await step(`R${String(round)} PP-002/003/004/011: deal, memorise timer and swap difficulty`,async () => {
        const v=await view(); assert.equal(v.phase,'memorise'); assert.equal(v.round,round);
        const seconds=required([20,16,12,10,8][round-1], 'memorise duration');
        assert.ok(v.seconds <= seconds && v.seconds >= seconds-1);
        assert.ok(v.grid); grid=[...v.grid]; shared=[...v.shared];
        assert.equal(grid.length,16); assert.equal(shared.length,3);
        assert.equal(new Set([...grid,...shared]).size,19);
        assert.ok([...grid,...shared].every(c=>/^[2-9TJQKA][CDHS]$/.test(c)));
        if(round===1 || round===5) await shots(`r${String(round)}-memorise`);
        await advance(round>=3 ? 'swap' : 'pick');
        /** @type {{kind:string,from:number,to:number}[]} */ const swaps=[];
        while((await view()).phase==='swap') {
          const swap=(await view()).swap; assert.ok(swap);
          swaps.push(swap); assert.equal(swap.kind,round===4?'rows':'cards');
          if(round===5) await shots(`r5-swap${String(swaps.length)}`);
          const width=swap.kind==='rows'?4:1;
          for(let i=0;i<width;i++) {const a=swap.from*width+i,b=swap.to*width+i; [grid[a],grid[b]]=[required(grid[b], 'swap destination card'),required(grid[a], 'swap source card')];}
          // Seek to just past this 2 s swap; shots consumed 600 ms.
          await h.host.clock.runFor(round===5?1400:2000);
        }
        assert.equal(swaps.length,round<3?0:round===5?2:1);
        assert.equal((await view()).phase,'pick'); assert.equal((await view()).seconds,20);
      });
      // Two players deliberately tie for the strongest possible hand, with different lock times.
      /** @type {[number,number]} */ let best=[0,1], strength=-1;
      for(let a=0;a<16;a++) for(let b=a+1;b<16;b++) {
        const value=rank([required(grid[a], 'first candidate card'),required(grid[b], 'second candidate card'),...shared]).strength;
        if(value>strength) {strength=value;best=[a,b];}
      }
      pairs=phones.map((_,i)=> i<2?best:[best[0],(best[0]+i+1)%16]);
      await step(`R${String(round)} PP-005/006/021: early and late private picks; TV lock seats only`,async () => {
        if(round===1 || round===5) await shots(`r${String(round)}-pick`);
        for(const i of [1,0,...Array.from({length:phones.length-3},(_,n)=>n+2)]) {
          const phone=required(phones[i], `phone ${String(i+1)}`);
          for(const cell of (pairs[i] ?? [])) {
            taps[i]=required(taps[i], 'tap count')+1;
            await phone.getByRole('button',{name:`Card ${String(cell+1)}`,exact:true}).click();
            await h.host.clock.runFor(50);
            await phone.locator(`[data-target="grid:${String(cell)}"][data-state="selected"]`).waitFor();
          }
          if(i===0) {
            assert.equal(await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-state="selected"]').count(),2);
            assert.equal(await phone.getByRole('button',{name:'Lock in',exact:true}).getAttribute('aria-disabled'),'false');
            if(round===1) await still('r1-phone1-two-selected',phone);
            await h.host.clock.runFor(5000);
          }
          await phone.getByRole('button',{name:'Lock in',exact:true}).click();
          await h.host.clock.runFor(100);
          const v=await view(); assert.equal(v.phase,'pick');
          assert.equal(required(v.players[i], 'locking player').locked,true);
          assert.equal(await h.host.locator('.pp-player').nth(i).locator('span').last().innerText(),'Picked');
        }
        if(round===1 || round===5) await shots(`r${String(round)}-locked`);
        assert.equal((await view()).players.at(-1)?.locked,false);
        await advance('reveal');
      });
      await step(`R${String(round)} PP-020/021 PLAT-033: every pre-reveal public view is secret`,() => {
        const publicFrames=views.slice(startIndex).filter(v=>['memorise','swap','pick'].includes(v.phase));
        assert.ok(publicFrames.some(v=>v.phase==='pick'));
        for(const v of publicFrames) {
          assert.ok(v.players.every(p=>p.picks===null)); assert.deepEqual(v.hands,[]);
          assert.deepEqual(v.shared,shared);
          if(v.phase!=='memorise') assert.equal(v.grid,null);
        }
        });
      await step(`R${String(round)} PP-020: every decoded control-channel message is secret before reveal`,async () => {
        for(let seat=1;seat<=phones.length;seat++) assert.ok(received.some(r=>r.round===round && r.seat===seat && r.phase==='pick'),'Every phone received pick frames');
        const rows=received.filter(r=>(r.round===round || r.hostRound===round) && (preReveal(r.phase) || preReveal(r.hostPhase)));
        for(const row of rows) {
          // Round tags race like phase tags: a phone that has not yet decoded a round reports 0, and either
          // side can lead at a round boundary. The allow-list below applies to every such row regardless.
          if(row.round!==row.hostRound) {
            assert.ok(row.round===0 || Math.abs(row.round-row.hostRound)===1,
              `Seat ${String(row.seat)} round skew: phone round ${String(row.round)}, host round ${String(row.hostRound)}`);
            roundSkew.push({seat:row.seat,phone:row.round,host:row.hostRound,phase:row.phase});
          }
          const m=/** @type {{t:string,rev:number,revision:number,players:number,phase:string,leader:boolean,team:null,layout:{revision:number,controls:{kind:string,text:string,cells:{state:string,faceDown:boolean}[],options:{state:string}[]}[]},view:{revision:number,blocks:{kind:string,value:number}[]}|null}} */ (row.message);
          if(['reveal','scoreboard','over'].includes(row.phase) && preReveal(row.hostPhase)) {
            // These callbacks arrive on independent channels; only a bounded host lag is allowed.
            let reveal=views.find(v=>v.round===row.round && v.phase==='reveal' && v.receivedAt>=row.receivedAt);
            while(!reveal && performance.now()<row.receivedAt+500) {
              await new Promise(resolve=>setTimeout(resolve,10));
              reveal=views.find(v=>v.round===row.round && v.phase==='reveal' && v.receivedAt>=row.receivedAt);
            }
            assert.ok(reveal,'Host reveal must arrive after a phone-leading boundary row');
            const gapMs=reveal.receivedAt-row.receivedAt;
            assert.ok(gapMs<=500,'Host reveal must arrive within 500 ms');
            const player=reveal.players.find(p=>p.seat===row.seat);
            const hand=reveal.hands.find(hand=>hand.id===player?.id);
            assert.ok(hand,'Receiving seat has a revealed hand');
            boundaryRows.push({seat:row.seat,round:row.round,gapMs,phoneReceivedAt:row.receivedAt,
              hostRevealReceivedAt:reveal.receivedAt,hostRevealClockAt:reveal.hostClockAt});
            if(m.t==='layout') {
              assert.deepEqual(m,{v:1,t:'layout',rev:m.rev,layout:{revision:m.layout.revision,controls:[]}});
              continue;
            }
            if(m.t==='view') {
              const cards=hand.cards.map((card,i)=>({id:`card-${String(i)}`,label:card.startsWith('T')?'10':card[0],mark:['club','diamond','heart','spade']['CDHS'.indexOf(required(card[1], 'card suit'))]}));
              const blocks=[{kind:'cards',cards},{kind:'text',text:hand.name},{kind:'stat',label:'Points',value:hand.points},
                ...(row.seat===phones.length?[{kind:'text',text:'Missing picks were filled at random',tone:'note'}]:[])];
              assert.deepEqual(m,{v:1,t:'view',rev:m.rev,view:{revision:required(m.view, 'boundary private view').revision,blocks}},'Boundary reveal contains only the receiving seat’s own hand');
              continue;
            }
            // Non-reveal messages still have to pass the original pre-reveal allow-list.
          }
          const strings = /** @param {unknown} value */ value => {
            if(typeof value==='string') assert.ok(!/^[2-9TJQKA][CDHS]$/.test(value),'No card code anywhere');
            else if(value && typeof value==='object') for(const v of Object.values(value)) strings(v);
          };
          strings(m);
          if(m.t==='room') {
            assert.equal(typeof m.players,'number');
            assert.ok(Number.isInteger(m.players) && m.players>=0 && m.players<=8);
            assert.deepEqual(Object.keys(m).sort(),['v','t','phase','players','leader','team'].sort());
            assert.equal(m.phase,'playing'); assert.equal(typeof m.leader,'boolean'); assert.equal(m.team,null);
          } else if(m.t==='layout') {
            assert.deepEqual(Object.keys(m).sort(),['v','t','rev','layout'].sort());
            assert.deepEqual(Object.keys(m.layout).sort(),['revision','controls'].sort());
            const controls=m.layout.controls;
            if(controls[0]?.kind==='grid') {
              assert.equal(controls.length,2);
              assert.deepEqual(controls[0],{kind:'grid',id:'grid',rows:4,cols:4,cells:controls[0].cells});
              assert.equal(controls[0].cells.length,16);
              let selected=0;
              for(const [i,c] of controls[0].cells.entries()) {
                assert.ok(['plain','selected'].includes(c.state));
                assert.deepEqual(c,{faceDown:true,state:c.state});
                if(c.state==='selected') {selected++;assert.ok(row.seat<phones.length && required(pairs[row.seat-1], 'receiving seat picks').includes(i));}
              }
              assert.ok(selected<=row.taps,'Selected cells cannot exceed taps so far');
              const state=required(required(required(controls[1], 'lock control').options[0], 'lock option').state, 'lock option state');
              assert.ok(['plain','disabled'].includes(state));
              assert.deepEqual(controls[1],{kind:'options',id:'lock',size:'large',options:[{id:'go',label:'Lock in',state}]});
            } else {
              assert.ok(['Watch the TV','Locked in'].includes(required(controls[0], 'watch control').text));
              assert.deepEqual(controls,[{kind:'text',id:'watch',text:required(controls[0], 'watch control').text,tone:'title'}]);
            }
          } else if(m.t==='view') {
            assert.deepEqual(Object.keys(m).sort(),['v','t','rev','view'].sort());
            // A cleared private view (view: null) carries nothing and is allowed.
            if(m.view===null) continue;
            assert.deepEqual(Object.keys(m.view).sort(),['revision','blocks'].sort());
            const blocks=m.view.blocks;
            if(blocks[0]?.kind==='stat') {
              assert.ok(Number.isInteger(blocks[0].value) && blocks[0].value>=0 && blocks[0].value<=20);
              assert.deepEqual(blocks,[{kind:'stat',label:'Seconds',value:blocks[0].value}]);
            } else assert.deepEqual(blocks,[{kind:'text',text:'Watch the TV for the reveal'}]);
          } else if(m.t==='picker-state') {
            // The console's final starting acknowledgement can arrive after the first game layout.
            assert.deepEqual(m,{v:1,t:'picker-state',revision:m.revision,screen:'starting',leaderName:'Player 1',game:{id:'peek-poker',name:'Peek Poker',blurb:'Memorise the grid, then pick two cards to make the best hand.',min:1,max:8},reason:null,failed:false});
          } else assert.fail(`Unexpected pre-reveal message: ${m.t}`);
          assert.ok(!/"picks"|"hands"|"players":\[/.test(JSON.stringify(m)),'Deny patterns remain a second line');
        }
        process.stdout.write(`R${String(round)} secrecy: ${String(boundaryRows.filter(row=>row.round===round).length)} boundary rows, ${String(roundSkew.length)} round-skew rows so far\n`);
        const idle=rows.filter(r=>r.seat===phones.length).map(r=>/** @type {{t:string,layout?:{controls:{kind:string,cells:{state:string}[]}[]}}} */ (r.message)).filter(m=>m.t==='layout' && m.layout?.controls[0]?.kind==='grid');
        assert.equal(idle.length,1,'Idle seat receives exactly one grid per round');
        assert.ok(required(required(required(idle[0], 'idle grid message').layout, 'idle layout').controls[0], 'idle grid control').cells.every(c=>c.state==='plain'));
      });
      await step(`R${String(round)} PP-020/021: every sampled pick DOM frame has no early reveal`,async () => {
        for(const [i,page] of [h.host,...phones].entries()) {
          const frames=await page.evaluate(r=>{
            /** @type {unknown} */ const raw = Reflect.get(window,'p07Frames');
            return (/** @type {DOMFrame[]} */ (raw)).filter(f=>f.round===r);
          },round);
          assert.ok(frames.length>0,`Pick DOM frames captured for page ${String(i)}`);
          for(const f of frames) {
            assert.equal(f.hands,''); assert.equal(f.cards,0);
            assert.ok(!/Missing picks|Points|[♣♦♥♠]/.test(f.text),'No early reveal DOM');
            // The seat badge digit sits beside the player's name and is not a card rank.
            if(i>0) { const left=f.text.replace(/\b([1-8])\s+Player \1\b|Player \d+|Seconds\s+\d+/g,''); const hit=/\b(?:[2-9TJQKA]|10)\b/.exec(left); assert.ok(!hit,`No early phone card ranks: "${hit?.[0] ?? ''}" in ${JSON.stringify(left.slice(Math.max(0,(hit?.index ?? 0)-60),(hit?.index ?? 0)+60))}`); }
            for(const name of HAND_NAMES) assert.ok(!new RegExp(`\\b${name}\\b`,'i').test(f.text),'No early hand name');
            if(i>0) for(const target of f.selected) assert.ok(required(pairs[i-1], 'DOM seat picks').includes(Number(target?.split(':')[1])) && i<phones.length);
          }
        }
      });
      await step(`R${String(round)} PP-007/008/009/010: reveal, random fill, poker points and speed tie`,async () => {
        const v=await view(); assert.deepEqual(v.grid,grid);
        const evaluated=v.players.map(p=>{assert.ok(p.picks?.length===2 && p.picks[0]!==p.picks[1]);return rank([...required(p.picks, 'revealed picks').map(i=>required(grid[i], 'picked card')),...shared]);});
        const top=Math.max(...evaluated.map(r=>r.strength));
        const fastest=[1,0,...Array.from({length:phones.length-3},(_,n)=>n+2)].find(i=>required(evaluated[i], 'evaluated hand').strength===top) ?? -1;
        for(const [i,p] of v.players.entries()) {
          if(i<phones.length-1) assert.deepEqual(p.picks,(pairs[i] ?? []));
          const bonus=required(evaluated[i], 'evaluated hand').strength===top?(i===fastest?3:1):0;
          const base=[1,2,3,4,5,6,8,10,13][required(evaluated[i], 'evaluated hand').category]; assert.ok(base); const gained=base+bonus;
          totals[i]=(totals[i] ?? 0)+gained; assert.equal(p.score,totals[i]);
          const hand=v.hands.find(hand=>hand.id===p.id);assert.ok(hand);
          assert.equal(hand.points,gained); assert.deepEqual(hand.cards,[...required(p.picks, 'revealed picks').map(n=>required(grid[n], 'revealed card')),...shared]);
          await required(phones[i], 'reveal phone').getByText('Points',{exact:true}).waitFor();
          const faces=required(phones[i], 'reveal phone').locator('.ka-private-panel:not(.ka-private-ghost) .ka-layout-card-face');
          await faces.nth(4).waitFor();
          assert.deepEqual(await faces.locator('span:first-child').allTextContents(),hand.cards.map(c=>c.startsWith('T')?'10':c[0]));
          assert.deepEqual(await faces.locator('span:last-child').allTextContents(),hand.cards.map(c=>'♣♦♥♠'['CDHS'.indexOf(required(c[1], 'card suit'))]));
        }
        assert.equal(v.hands[0]?.id,v.players[0]?.id);
        for(let i=1;i<v.hands.length;i++) assert.ok(rank(required(v.hands[i-1], 'previous ranked hand').cards).strength>=rank(required(v.hands[i], 'ranked hand').cards).strength,'Hands ranked best to worst');
        await phones.at(-1)?.getByText('Missing picks were filled at random',{exact:true}).waitFor();
        if(round===1) await h.frameStrip('reveal',h.host,{frames:6,everyMs:0,checkFrame:async()=>{await h.host.clock.runFor(60);}});
        if(round===1 || round===5) await shots(`r${String(round)}-reveal`);
        const sharedSeats=v.players.filter(p=>p.picks?.includes(best[0])).map(p=>p.seat);
        if(sharedSeats.length>=5) {await still(`r${String(round)}-seat-markers-${String(sharedSeats.length)}`,h.host);}
        await writeFile(join(h.evidence,`round-${String(round)}.json`),JSON.stringify({public:v,pairs,sharedSeats,totals},null,2));
        await advance('scoreboard');
      });
      await step(`R${String(round)} PP-032: scoreboard and every phone’s own place and score`,async () => {
        await h.host.getByRole('list',{name:'Running scoreboard',exact:true}).waitFor();
        assert.equal(await h.host.locator('.pp-score-row').count(),phones.length);
        for(const row of await h.host.locator('.pp-score-row').all()) {
          const seat=Number(await row.locator('.pp-seat').innerText())-1;
          const expected=1+totals.filter(t=>t>required(totals[seat], 'seat total')).length;
          const tied=totals.filter(t=>t===totals[seat]).length>1;
          assert.deepEqual(await row.locator('strong').allTextContents(),[`${tied?'=':''}${String(expected)}`,String(totals[seat])]);
        }
        for(const [i,phone] of phones.entries()) {
          const place=1+totals.filter(t=>t>required(totals[i], 'phone total')).length;
          const tied=totals.filter(t=>t===totals[i]).length>1;
          await phone.getByText('Place',{exact:true}).waitFor();
          const panel=phone.locator('.ka-private-panel:not(.ka-private-ghost)');
          await panel.locator('.ka-private-stat-value').filter({hasText:new RegExp(`^${tied?'=':''}${String(place)}$`)}).first().waitFor();
          // The reveal's Points stat crossfades out (DESIGN §3 overlap); assert the settled panel.
          await panel.locator('.ka-private-stat-value').nth(2).waitFor({state:'detached'});
          assert.deepEqual(await panel.locator('.ka-private-stat-value').allTextContents(),[`${tied?'=':''}${String(place)}`,String(totals[i])]);
        }
        if(round===1 || round===5) await shots(`r${String(round)}-scoreboard`);
        await advance(round===5?'over':'memorise');
        // Complete countdown sequences prove durations despite intentionally varied input timing.
        for(const [phase,seconds] of [['memorise',[20,16,12,10,8][round-1]],['pick',20],['reveal',8],['scoreboard',5]]) {
          const seen=[...new Set(views.filter(v=>v.round===round && v.phase===phase).map(v=>v.seconds))].filter(n=>n>0).sort((a,b)=>a-b);
          assert.deepEqual(seen,Array.from({length:Number(seconds)},(_,i)=>i+1),`${String(phase)} countdown duration`);
        }
        for(const snapshot of views.filter(v=>v.round===round)) assert.deepEqual(snapshot.shared,shared,'Shared cards unchanged for entire round');
      });
    }
    await step('PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker',async () => {
      await h.host.getByRole('list',{name:'Final podium',exact:true}).waitFor();
      assert.equal(await h.host.locator('.pp-score-row').count(),phones.length);
      for(const row of await h.host.locator('.pp-score-row').all()) {
        const seat=Number(await row.locator('.pp-seat').innerText())-1;
        const place=1+totals.filter(t=>t>required(totals[seat], 'seat total')).length;
        const tied=totals.filter(t=>t===totals[seat]).length>1;
        assert.deepEqual(await row.locator('strong').allTextContents(),[`${tied?'=':''}${String(place)}`,String(totals[seat])]);
      }
      for(const width of [1920,1280]) {
        await h.host.setViewportSize({width,height:width===1920?1080:720});
        await h.host.clock.runFor(600);
        await still(`podium-${String(width)}`,h.host);
      }
      for(const [i,phone] of phones.entries()) {
        await phone.locator('.phone-results').waitFor();
        const place=1+totals.filter(t=>t>required(totals[i], 'phone total')).length;
        const tied=totals.filter(t=>t===totals[i]).length>1;
        assert.deepEqual(await phone.locator('.phone-results p strong').allTextContents(),[`${tied?'=':''}${String(place)}`,String(totals[i])]);
        await still(`podium-phone${String(i+1)}`,phone);
      }
      await leader.getByRole('button',{name:'Continue',exact:true}).click();
      await h.host.clock.runFor(600);
      await leader.getByRole('button',{name:'Back to game picker',exact:true}).click();
      await h.host.clock.runFor(600);
      await h.host.getByRole('main',{name:'Game picker',exact:true}).waitFor();
      await still('continue-picker',h.host);
    });
  } finally {
    const dom=[];
    for(const page of [h.host,...phones]) if(!page.isClosed()) dom.push(await page.evaluate(()=> /** @type {unknown} */ (Reflect.get(window,'p07Frames'))));
    await writeFile(join(h.evidence,'secrecy.json.gz'),gzipSync(JSON.stringify({views,received,boundaryRows,roundSkew,dom,current})));
    await h.host.clock.resume();
  }
}
