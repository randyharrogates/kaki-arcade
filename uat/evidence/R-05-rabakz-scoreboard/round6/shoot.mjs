import { chromium } from '/Users/randy/projects/personal/web-apps/kaki-arcade-wt/R-05/node_modules/playwright/index.mjs';
const WT = '/Users/randy/projects/personal/web-apps/kaki-arcade-wt/R-05';
const OUT = process.argv[2];
const states = [['scoreboard',8],['scoreboard-next',8],['scoreboard-teams',8],['scoreboard-teams-late',5],['scoreboard-ties',4],
  ['podium',8],['podium',4],['podium',2],['one-player',1],['podium-tie-first',8],['podium-tie-second',8],['podium-partial-ties',8],['podium-partial-ties',4],
  ['podium-ties',4],['podium-teams',4],['podium-teams-late',5],['podium-teams',8],['non-picture-question',4]];
const sizes = [[1920,1080],[1280,720]];
const browser = await chromium.launch();
const results = [];
try {
  for (const [w,h] of sizes) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const [s,n] of states) {
      const url = `http://localhost:5670/@fs${WT}/games/rabakz/dev/index.html?state=${s}&players=${n}&at=3000`;
      await page.goto(url); await page.waitForSelector('html[data-rz-ready="1"]', { timeout: 20000 });
      await page.waitForTimeout(150);
      const of = await page.evaluate(() => window.__rzOverflow());
      const file = `${w}-${s}-${n}.jpg`;
      await page.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 80 });
      results.push({ file, overflow: Array.isArray(of) ? of.length : of, detail: Array.isArray(of) ? of.slice(0,3) : undefined });
    }
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results.filter(r => r.overflow), null, 0).slice(0, 3000));
console.log('states', results.length, 'with findings', results.filter(r => r.overflow).length);
