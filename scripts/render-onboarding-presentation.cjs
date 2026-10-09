const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.ONBOARDING_PREVIEW_URL || 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const screens = [];
  try {
    for (let step = 0; step < 4; step++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 960 }, reducedMotion: 'reduce' });
      await context.addInitScript(step => localStorage.setItem('wattsnap-intro-v1', JSON.stringify({ version: 1, step, status: 'in-progress' })), step);
      const page = await context.newPage();
      await page.goto(`${baseURL}/intro`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(step => document.querySelector('.intro-step-label')?.textContent === `${step + 1} of 4`, step);
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
      await page.evaluate(() => document.fonts.ready);
      screens.push((await page.screenshot({ fullPage: true })).toString('base64'));
      await context.close();
    }
    const board = await browser.newPage({ viewport: { width: 1820, height: 1160 }, deviceScaleFactor: 1 });
    await board.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;padding:48px 54px 40px;background:#eef7f8;color:#18374c;font-family:system-ui,sans-serif}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}h1{margin:0;font-size:35px;letter-spacing:-1px}h1 span{color:#087f9a}header p{margin:0;font-size:16px;color:#496272}main{display:flex;align-items:start;gap:32px}.phone{width:404px;background:white;padding:6px;border:1px solid #dcebef;border-radius:35px;box-shadow:0 14px 32px #244c6810;overflow:hidden}.phone img{width:390px;display:block;border-radius:28px}footer{margin-top:26px;font-size:15px;color:#496272}</style></head><body><header><h1>Watt<span>Snap</span></h1><p>Onboarding • Light mode • Interactive implementation</p></header><main>${screens.map(screen => `<div class="phone"><img src="data:image/png;base64,${screen}" alt="Onboarding screen"></div>`).join('')}</main><footer>Smarter energy. Easier days.</footer></body></html>`);
    const destination = path.resolve('output/design/wattsnap-onboarding-implementation.png');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await board.screenshot({ path: destination, fullPage: true });
    console.log(`Saved ${destination}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
