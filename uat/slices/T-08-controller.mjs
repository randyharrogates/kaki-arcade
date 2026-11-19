import assert from 'node:assert/strict';
/** @typedef {{cooks: readonly import('../../games/tabao-rush/src/index.ts').Cook[], items: readonly import('../../games/tabao-rush/src/index.ts').Item[], actSeen?: boolean, tick: number}} View */
/** @param {import('playwright').Page} page */
async function view(page) {
  return page.evaluate(() => /** @type {{__trControllerView: View}} */ (/** @type {unknown} */ (window)).__trControllerView);
}
/** @param {import('playwright').Page} phone @param {number} x @param {number} y @param {number} ms */
async function stick(phone,x,y,ms) {
  const box = await phone.locator('.ka-stick').boundingBox();assert.ok(box);
  const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await phone.mouse.move(cx,cy);await phone.mouse.down();
  try { await phone.mouse.move(cx+x*55,cy+y*55);await phone.waitForTimeout(ms); }
  finally { await phone.mouse.up(); }
}
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function controller(h) {
  assert.equal(h.maxPhones,2,'Use --phones 2');
  await h.createRoom();
  const phones=[];
  for(let i=0;i<2;i++) {
    const phone=await h.newPhone();phones.push(phone);
    await phone.setViewportSize({width:844,height:390});
    const name=`Cook ${String(i+1)}`;await h.openJoin(phone,name);
    await phone.getByRole('button',{name:'Join',exact:true}).click();await h.waitSeated(phone,name);
  }
  const phone=phones[0],second=phones[1];assert.ok(phone&&second);
  // Observe the public TV view and whether real Circle input reached step. No state edits or synthetic inputs.
  const moduleUrl=`/@fs${new URL('../../games/tabao-rush/src/index.ts',import.meta.url).pathname}`;
  await h.host.evaluate(async url=>{
    /** @type {unknown} */
    const imported=await import(/* @vite-ignore */ url);
    const tabaoRush=/** @type {{tabaoRush: {publicView: (state: unknown) => View}}} */ (imported).tabaoRush;
    const original=tabaoRush.publicView.bind(tabaoRush);
    const game=/** @type {typeof import('../../games/tabao-rush/src/index.ts').tabaoRush} */ (/** @type {{tabaoRush:unknown}} */ (imported).tabaoRush);
    const step=game.step.bind(game);
    let actSeen=false;
    game.step=(state,inputs,dt)=>{
      actSeen ||= Boolean(inputs.frames.get('seat-1')?.held && ((inputs.frames.get('seat-1')?.held ?? 0)&(1<<5)));
      return step(state,inputs,dt);
    };
    tabaoRush.publicView=state=>{
      const result=/** @type {View} */ (original(state));
      /** @type {{__trControllerView:View}} */ (/** @type {unknown} */ (window)).__trControllerView={...result,actSeen};
      return result;
    };
  },moduleUrl);
  try {
  await phone.getByRole('button',{name:'Pick a game',exact:true}).click();
  await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
  await phone.getByRole('button',{name:'Select',exact:true}).click();
  await phone.getByRole('button',{name:'Start',exact:true}).click();
  // A tap that lands before the picker's view settles is dropped; press until the phone shows Ready selected.
  for(const p of phones) {
    const ready=p.getByRole('button',{name:'Ready',exact:true}),playing=p.locator('[data-target="cross"]');
    await ready.or(playing).first().waitFor({timeout:30000});
    for(let attempt=0;attempt<5&&!await playing.isVisible()&&await ready.getAttribute('aria-pressed',{timeout:2000}).catch(()=>'true')!=='true';attempt++) {
      await ready.click();
      await p.locator('button[aria-pressed="true"]',{hasText:'Ready'}).waitFor({timeout:2000}).catch(()=>undefined);
    }
  }
  await phone.locator('[data-target="cross"]').waitFor();
  } catch (error) { await h.shot('failure-phone', phone); await h.shot('failure-second', second); await h.shot('failure-tv'); throw error; }
  for(const size of [{width:844,height:390},{width:667,height:375},{width:932,height:430}]) {
    await phone.setViewportSize(size);await phone.locator('.ka-layout-engine[data-fits="true"]').waitFor();
    await phone.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{resolve(null);}))));
    const play=await phone.locator('.ka-controller-play').boundingBox();assert.ok(play);
    const stickBox=await phone.locator('.ka-stick').boundingBox();assert.ok(stickBox);
    assert.ok(stickBox.y>=play.y+13&&stickBox.x>=play.x+13
      &&stickBox.y+stickBox.height<=play.y+play.height-13);
    for(const id of ['cross','circle','square','triangle']) {
      const box=await phone.locator(`[data-target="${id}"]`).boundingBox();assert.ok(box);
      assert.ok(box.x>=play.x+13&&box.y>=play.y+13
        &&box.x+box.width<=play.x+play.width-13&&box.y+box.height<=play.y+play.height-13,
        `${id} ring overflows play area at ${String(size.width)}`);
      const minimum=size.width>=844?110:89;
      assert.ok(box.width>=minimum&&box.height>=minimum);
      const labels=await phone.locator(`[data-target="${id}"] > span`).evaluateAll(nodes=>nodes.map(label=>{
        const rect=label.getBoundingClientRect(),button=label.parentElement?.getBoundingClientRect();
        return {fits:label.scrollWidth<=label.clientWidth,inside:button!==undefined&&rect.left>=button.left&&rect.right<=button.right&&rect.top>=button.top&&rect.bottom<=button.bottom};
      }));
      assert.ok(labels.length>0&&labels.every(label=>label.fits&&label.inside),`${id} label overflows at ${String(size.width)}`);
    }
    await h.shot(`phone-${String(size.width)}`,phone);
  }
  await phone.setViewportSize({width:844,height:390});
  await stick(second,0,1,700);
  const before=(await view(h.host)).cooks[0];assert.ok(before);
  const box=await phone.locator('.ka-stick').boundingBox();assert.ok(box);
  const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await phone.mouse.move(cx,cy);await phone.mouse.down();
  try {
    await h.frameStrip('stick-drag',phone,{frames:8,everyMs:34,checkFrame:async i=>{
      await phone.mouse.move(cx+(i+1)*5,cy);
    }});
    // The host steps on its own clock; hold the stick until the TV shows the cook further right.
    await h.host.waitForFunction(startX=>{
      const cook=/** @type {{__trControllerView?:View}} */ (/** @type {unknown} */ (window)).__trControllerView?.cooks[0];
      return cook !== undefined && cook.x>startX;
    },before.x,{timeout:5000}).catch(async (/** @type {unknown} */ error)=>{ await h.shot('failure-tv-stick'); throw error; });
  } finally { await phone.mouse.up(); }
  const moved=(await view(h.host)).cooks[0];assert.ok(moved);assert.ok(moved.x>before.x);
  await h.shot('tv-stick-moved');
  // Walk to the cucumber crate using feedback from the public view and real stick input.
  for(let attempt=0;attempt<12;attempt++) {
    const cook=(await view(h.host)).cooks[0];assert.ok(cook);
    const dx=3.5-cook.x;
    if(Math.abs(dx)<0.06)break;
    await stick(phone,Math.sign(dx),0,Math.min(200,Math.abs(dx)/3*1000));
  }
  for(let attempt=0;attempt<10;attempt++) {
    const cook=(await view(h.host)).cooks[0];assert.ok(cook);
    if(cook.targetTile===13)break;
    await stick(phone,0,-1,55);
  }
  assert.equal((await view(h.host)).cooks[0]?.targetTile,13);
  await phone.getByRole('button',{name:'Pick up',exact:true}).click();
  await h.host.waitForFunction(()=>/** @type {{__trControllerView:View}} */ (/** @type {unknown} */ (window)).__trControllerView.items.some(i=>i.place.kind==='held'&&i.place.cook==='seat-1'));
  await stick(phone,0,1,89);
  await h.shot('tv-picked-up');
  // Face east and throw across open floor so the still captures travel.
  await stick(phone,1,0,89);
  await phone.getByRole('button',{name:'Throw',exact:true}).click();
  await h.host.waitForFunction(()=>/** @type {{__trControllerView:View}} */ (/** @type {unknown} */ (window)).__trControllerView.items.some(i=>i.place.kind==='flight'));
  await h.shot('tv-thrown');
  await stick(phone,-1,0,89);
  const preDash=(await view(h.host)).cooks[0];assert.ok(preDash);
  const dash=phone.getByRole('button',{name:'Dash',exact:true});
  const dashBox=await dash.boundingBox();assert.ok(dashBox);
  await phone.mouse.move(dashBox.x+dashBox.width/2,dashBox.y+dashBox.height/2);await phone.mouse.down();
  await h.host.waitForFunction(before=>{
    const cook=/** @type {{__trControllerView:View}} */ (/** @type {unknown} */ (window)).__trControllerView.cooks[0];
    return cook && Math.hypot(cook.x-before.x,cook.y-before.y)>0.5;
  },preDash);
  const afterDash=(await view(h.host)).cooks[0];assert.ok(afterDash);
  assert.ok(Math.hypot(afterDash.x-preDash.x,afterDash.y-preDash.y)>0.5);
  await h.host.waitForFunction(()=>{
    const current=/** @type {{__trControllerView:View}} */ (/** @type {unknown} */ (window)).__trControllerView;
    return current.tick>(current.cooks[0]?.dashReadyAt??Infinity)+5;
  });
  const heldDash=(await view(h.host)).cooks[0];assert.ok(heldDash);
  assert.equal(heldDash.dashReadyAt,afterDash.dashReadyAt,'held Square must not repeat');
  assert.equal(heldDash.x,afterDash.x);assert.equal(heldDash.y,afterDash.y);
  await phone.mouse.up();
  await dash.click();
  // The second edge starts a fresh cooldown; another immediate press must be ignored.
  await h.host.waitForFunction(previous=>{
    const current=/** @type {{__trControllerView:View}} */ (/** @type {unknown} */ (window)).__trControllerView;
    return (current.cooks[0]?.dashReadyAt??0)>previous;
  },heldDash.dashReadyAt??0);
  const freshDash=(await view(h.host)).cooks[0];assert.ok(freshDash);
  assert.ok((freshDash.dashReadyAt??0)>(heldDash.dashReadyAt??0),'a fresh press after cooldown must dash');
  await dash.click();await phone.waitForTimeout(89);
  const ignoredDash=(await view(h.host)).cooks[0];assert.ok(ignoredDash);
  assert.equal(ignoredDash.dashReadyAt,freshDash.dashReadyAt);
  assert.equal(ignoredDash.x,freshDash.x);assert.equal(ignoredDash.y,freshDash.y);
  await h.shot('tv-dashed');
  const act=await phone.getByRole('button',{name:'Act',exact:true}).boundingBox();assert.ok(act);
  await phone.mouse.move(act.x+act.width/2,act.y+act.height/2);await phone.mouse.down();
  try {
    await h.host.waitForFunction(()=>/** @type {{__trControllerView:View & {actSeen?:boolean}}} */ (/** @type {unknown} */ (window)).__trControllerView.actSeen===true);
    await h.shot('phone-act',phone);
  } finally {await phone.mouse.up();}
  // Start is blocked by the kit schema; exercise the existing shell pause route.
  await phone.getByRole('button',{name:'Menu',exact:true}).click();
  await phone.getByRole('button',{name:'Resume',exact:true}).waitFor();
  await h.shot('phone-paused',phone);
}
