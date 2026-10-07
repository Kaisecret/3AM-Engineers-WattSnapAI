const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_PREVIEW_URL || 'http://127.0.0.1:3000';
const canonical = 'https://www.wattsnapai.dev/';
const screenshots = path.join(os.tmpdir(), 'wattsnap-mobile-performance');

async function seo(page) {
  assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, canonical);
  assert.match(await page.title(), /^WattSnap AI \| Your Home Electricity Assistant$/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
  assert.equal(new URL(await page.locator('meta[property="og:url"]').getAttribute('content')).href, canonical);
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
  assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'), '1200');
  assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'), '630');
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert.equal(schema['@type'], 'WebSite');
  assert.equal(schema.name, 'WattSnap AI');
  assert.equal(schema.url, canonical);
  await page.getByRole('heading', { name: 'Your Home Electricity Assistant', exact: true }).waitFor();
}

async function preview(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], requests = [], failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto(baseURL);
  await seo(page);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.hero-product-image').evaluate(image => image.decode());
  if (width <= 650) await page.locator('.hero-mobile-phone').evaluate(image => image.decode());
  const background = width <= 650 ? 'hero-bg-panorama-mobile.webp' : 'hero-bg-panorama.webp';
  await page.waitForFunction(background => performance.getEntriesByType('resource').some(entry => entry.name.endsWith(background)), background);
  assert(requests.some(url => url.endsWith(background)), 'Load the background for this viewport');
  assert(!requests.some(url => url.endsWith('hero-bg-panorama.png')), 'Never download the large original background');
  assert(!requests.some(url => url.endsWith(width <= 650 ? 'hero-bg-panorama.webp' : 'hero-bg-panorama-mobile.webp')), 'Do not download the other viewport background');
  assert(!requests.some(url => /fonts\.(googleapis|gstatic)\.com/.test(url)), 'Fonts must be self hosted');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
  await page.screenshot({ path: path.join(screenshots, `after-${width}.png`), fullPage: true, animations: 'disabled' });
  await page.screenshot({ path: path.join(screenshots, `after-hero-${width}.png`), animations: 'disabled' });
  if (width <= 850) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: 'Features', exact: true }).click();
    assert.equal(await page.locator('#landing-mobile-menu').count(), 0);
    await page.locator('#home').scrollIntoViewIfNeeded();
  }
  await page.getByRole('button', { name: 'Watch Video', exact: true }).click();
  await page.getByRole('dialog', { name: 'Scan your electricity bill', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Pause walkthrough', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('heading', { name: 'Understand your consumption', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close product walkthrough', exact: true }).click();
  await page.getByRole('button', { name: 'Chat with WattSnap AI', exact: true }).click();
  await page.getByRole('button', { name: 'What is WattSnap?', exact: true }).click();
  await page.locator('.chat-row.is-user').waitFor();
  await page.getByText('WattSnap AI is your home electricity assistant. It helps you:', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close chat', exact: true }).first().click();
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await context.close();
  console.log(`PASS ${width}px: SEO, correct compressed background, local fonts, layout, menu, walkthrough, chat`);
}

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 768, 412, 320]) await preview(browser, width);
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(baseURL);
    await seo(page);
    const robots = await context.request.get(`${baseURL}/robots.txt`);
    assert.equal(robots.status(), 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/www\.wattsnapai\.dev\/sitemap\.xml/);
    const sitemap = await context.request.get(`${baseURL}/sitemap.xml`);
    assert.equal(sitemap.status(), 200);
    assert.match(await sitemap.text(), /<loc>https:\/\/www\.wattsnapai\.dev\/<\/loc>/);
    assert.equal((await sitemap.text()).match(/<loc>/g).length, 1);
    for (const route of ['/login', '/signup', '/dashboard', '/advisories']) {
      await page.goto(`${baseURL}${route}`);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      assert.equal(await page.locator('link[rel="canonical"]').count(), 0, 'Private routes do not claim the landing canonical');
    }
    console.log('PASS server-rendered SEO without JavaScript, robots, sitemap, account/household noindex');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
