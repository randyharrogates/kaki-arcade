import assert from 'node:assert/strict';
import { join } from 'node:path';
const colourModule=/** @type {unknown} */ (await import(new URL('../../packages/ui/src/colour.ts',import.meta.url).href));
const {PLAYER_COLOURS}=/** @type {typeof import('../../packages/ui/src/colour')} */ (colourModule);
const demo=`/@fs${new URL('../../games/tabao-rush/dev/index.html',import.meta.url).pathname}`;
/** @param {import('playwright').Page} page @param {string} name @param {number} at */
async function fixture(page,name,at=0){
  await page.evaluate(({name,at})=>{(/** @type {{__trState(name:string,at?:number):void}} */(/** @type {unknown} */(window))).__trState(name,at);},{name,at});
  await page.waitForTimeout(34);
}
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function tabaoScreen(h){
  h.coverage='North-facing north-counter stills and approach strip: the held item is hidden behind the body by design (depth −0.1). At the north counter a held item shows only when the cook faces s, se or sw; otherwise it is behind the body by design. South/east/west stills at y=1.2 cover this ordering. The disc lower edge is at worst feet −90.5, hands −31.4 (e/w) and −18.5 (s): at least 59 px clearance. Seat-5 recolours seat 1, so its disc reads 1. Lossless edge/cap checks: north-seat-1-1280-lossless.png and north-seat-5-1280-lossless.png. Visual acceptance is pending.';
  for(const players of [1,8])for(const [width,height] of /** @type {const} */ ([[1920,1080],[1280,720]]))await h.step(`${String(players)} cooks at ${String(width)}`,async()=>{
    await h.host.setViewportSize({width,height});await h.host.goto(`${h.origin}${demo}?players=${String(players)}`);
    await h.host.waitForFunction(()=>document.documentElement.dataset.trReady==='1');
    assert.equal(await h.host.locator('canvas').count(),1);
    assert.equal(await h.host.locator('[data-tr-cards]').getAttribute('data-tr-cards'),'6');
    const hud=await h.host.locator('[data-tr-hud]').getAttribute('data-tr-hud');assert.ok(hud);
    assert.deepEqual(JSON.parse(hud),[208,120,20,2]);
    await h.shot(`${String(players)}-cooks-${String(width)}-showcase`);
  });
  await h.step('HUD drawn width and Rack column',async()=>{
    await h.host.setViewportSize({width:1920,height:1080});await fixture(h.host,'showcase');
    // Decode the actual lossless screenshot; texture bounds cannot detect a stale quad.
    const pixels=(await h.host.screenshot({type:'png'})).toString('base64');
    const columns=await h.host.evaluate(async encoded=>{
      const bitmap=await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Pixel canvas unavailable');ctx.drawImage(bitmap,0,0);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,columns=[];
      for(let x=1200;x<1900;x++){
        let count=0;for(let y=945;y<1005;y++){const i=(y*canvas.width+x)*4;if(Math.abs((data[i]??0)-181)<25&&Math.abs((data[i+1]??0)-55)<25&&Math.abs((data[i+2]??0)-31)<25)count++;}
        if(count>=8)columns.push(x);
      }
      bitmap.close();return columns;
    },pixels);
    const edges=/** @type {number[][]} */([]);
    for(const x of columns){const last=edges.at(-1);if(last&&x-(last.at(-1)??x)<=3)last.push(x);else edges.push([x]);}
    assert.equal(edges.length,6,'six drawn vertical HUD borders');
    const centres=edges.map(xs=>Math.round(((xs[0]??0)+(xs.at(-1)??0))/2));
    assert.equal((centres[2]??0)-(centres[1]??0)-1,13);assert.equal((centres[4]??0)-(centres[3]??0)-1,13);
    await h.shot('hud-score-width',h.host,{x:1200,y:850,width:720,height:230});
    await h.shot('rack-column',h.host,{x:0,y:200,width:233,height:650});
  });
  await h.step('Burning station label' ,async()=>{await fixture(h.host,'burning');await h.shot('burning-label');});
  await h.step('Mid-clip actions at their stations',async()=>{
    await h.host.setViewportSize({width:1920,height:1080});
    for(const name of ['idle','walk','carry-walk','chop','stir','wash','serve','throw','extinguish','rejection']){
      await fixture(h.host,name);await fixture(h.host,name,8);await h.shot(`action-${name}`);
    }
  });
  for(const reduced of [false,true])for(const name of ['entrance','serve','done','exit'])await h.step(`${reduced?'Reduced':'Normal'} ${name} at pinned render times`,async()=>{
    await h.host.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
    await h.host.evaluate(()=>{(/** @type {{__trClock(ms:number):void}} */(/** @type {unknown} */(window))).__trClock(0);});
    if(name==='exit'||name==='serve')await fixture(h.host,'showcase');
    if(name==='done')await fixture(h.host,'chop');
    await fixture(h.host,name);
    const goldSpans=/** @type {number[]} */([]);
    await h.frameStrip(`${reduced?'reduced-':''}${name}`,h.host,{frames:name==='serve'?6:5,everyMs:0,clip:{x:0,y:0,width:1920,height:1080},checkFrame:async index=>{
      await h.host.evaluate(ms=>{(/** @type {{__trClock(ms:number):void}} */(/** @type {unknown} */(window))).__trClock(ms);},(name==='serve'?[0,60,117,175,233,1470]:[0,58,116,175,233])[index] ?? 233);
      await h.host.waitForTimeout(34);
      if(name==='done'){
        const png=(await h.host.screenshot({type:'png'})).toString('base64');
        goldSpans.push(await h.host.evaluate(async encoded=>{
          const bitmap=await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
          const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
          const ctx=c.getContext('2d');if(!ctx)throw new Error('Pixel canvas');ctx.drawImage(bitmap,0,0);
          const data=ctx.getImageData(0,0,c.width,250).data;let span=0;
          for(let y=0;y<250;y++){let first=-1,last=-1;for(let x=1450;x<1650;x++){const i=(y*c.width+x)*4;if(Math.abs((data[i]??0)-224)<15&&Math.abs((data[i+1]??0)-166)<15&&Math.abs((data[i+2]??0)-58)<15){if(first<0)first=x;last=x;}}if(first>=0)span=Math.max(span,last-first+1);}
          bitmap.close();return span;
        },png));
      }
    }});
    if(name==='done'){
      const rest=goldSpans[0]??0,peak=Math.max(...goldSpans);
      assert.ok(rest>=78&&rest<=82,`rest gold span ${String(rest)}`);
      assert.ok(Math.abs((goldSpans.at(-1)??0)-rest)<=1,'pulse returns to rest');
      if(reduced)assert.ok(peak-Math.min(...goldSpans)<=1,'61 has no done pulse');
      else assert.ok(peak-rest>=3&&peak-rest<=5,'36 shows 80 → 84 → 80 done pulse');
    }
  });
  await h.step('Throw landing and cook walk',async()=>{
    await h.host.emulateMedia({reducedMotion:'no-preference'});
    await h.host.evaluate(()=>{(/** @type {{__trClock(ms:undefined):void}} */(/** @type {unknown} */(window))).__trClock(undefined);});
    for(const name of ['throw','walk'])await h.frameStrip(name,h.host,{frames:8,everyMs:0,checkFrame:async index=>{await fixture(h.host,name,index*4);if(name==='throw'&&index===7)await h.host.evaluate(()=>{(/** @type {{__trAdvance():void}} */(/** @type {unknown} */(window))).__trAdvance();});}});
  });
  await h.step('North counter holding an item at y 1.2',async()=>{
    for(const [width,height] of /** @type {const} */ ([[1920,1080],[1280,720]])){
      await h.host.setViewportSize({width,height});await fixture(h.host,'north',48);await h.shot(`north-held-${String(width)}`);
    }
    await h.host.setViewportSize({width:1920,height:1080});
    await h.frameStrip('north-approach-2-to-1-2',h.host,{frames:9,everyMs:0,checkFrame:async index=>{await fixture(h.host,'north',index*6);}});
  });
  await h.step('North held item depth ordering south, east and west',async()=>{
    for(const facing of ['east','west','south'])for(const [width,height] of /** @type {const} */ ([[1920,1080],[1280,720]])){
      await h.host.setViewportSize({width,height});await fixture(h.host,`north-${facing}`,48);
      await h.shot(`north-held-${facing}-${String(width)}`);
    }
  });
  await h.step('Lossless 1280 marker edge contrast against seat 1 and seat 5 caps',async()=>{
    await h.host.setViewportSize({width:1280,height:720});
    for(const seat of [1,5]){
      await fixture(h.host,seat===1?'north':'north-seat5',48);
      const png=(await h.host.screenshot({type:'png',path:join(h.evidence,`north-seat-${String(seat)}-1280-lossless.png`)})).toString('base64');
      const measured=await h.host.evaluate(async encoded=>{
        const bitmap=await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Pixel canvas');ctx.drawImage(bitmap,0,0);
        const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        const luminance=(/** @type {number[]} */ rgb)=>{
          const c=rgb.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
          return (c[0]??0)*0.2126+(c[1]??0)*0.7152+(c[2]??0)*0.0722;
        };
        // Bottom centre of the edged disc and the rendered cap immediately below.
        // The fixed 1920 stage scales by 2/3; cook x=1560, marker centre y≈214.
        let edge=Infinity,cap=Infinity;
        let capRgb=[0,0,0];
        for(let y=155;y<=164;y++)for(let x=1038;x<=1042;x++){
          const i=(y*canvas.width+x)*4,l=luminance([data[i]??0,data[i+1]??0,data[i+2]??0]);
          if(y<=157)edge=Math.min(edge,l);else if(y>=160&&l<cap){cap=l;capRgb=[data[i]??0,data[i+1]??0,data[i+2]??0];}
        }
        bitmap.close();return {ratio:(cap+0.05)/(edge+0.05),capRgb};
      },png);
      const expected=PLAYER_COLOURS.find(c=>c.seat===seat)?.colour;assert.ok(expected);
      assert.deepEqual(measured.capRgb,[1,3,5].map(i=>Number.parseInt(expected.slice(i,i+2),16)),`seat ${String(seat)} cap sample matches seat colour`);
      const {ratio}=measured;
      assert.ok(ratio>=3,`seat ${String(seat)} lossless edge/cap contrast ${String(ratio)} >= 3`);
      h.coverage+=` Seat ${String(seat)} measured PNG edge/cap contrast: ${ratio.toFixed(3)}:1.`;
    }
  });
  await h.step('Registry to production MountedScreen readiness without a phone',async()=>{
    await h.host.goto(`${h.origin}/host/tabao-renderer?players=8&fixture=${encodeURIComponent(demo.replace('index.html','renderer.fixture.ts'))}`);
    await h.host.waitForFunction(()=>document.documentElement.dataset.trProductionReady==='1'&&document.documentElement.dataset.trReady==='1');
    assert.equal(await h.host.locator('canvas').count(),1);
    assert.equal(await h.host.locator('[data-tr-cards]').getAttribute('data-tr-cards'),'6');
    assert.equal(await h.host.locator('[data-tr-pool-overflow]').getAttribute('data-tr-pool-overflow'),'0');
  });
  await h.step('Letterbox portrait window',async()=>{
    await h.host.setViewportSize({width:1080,height:1080});
    const size=await h.host.locator('canvas').boundingBox();assert.ok(size);assert.equal(size.width/size.height,16/9);await h.shot('letterboxed');
  });
}
