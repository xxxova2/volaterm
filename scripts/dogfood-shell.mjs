/**
 * Playwright dogfood — shell IA + Rates + Crypto tools.
 * Usage: node scripts/dogfood-shell.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:3000';
const hard = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(15_000);
page.on('pageerror', (e) => hard.push(`pageerror: ${e.message}`));

try {
  await page.goto(base, { waitUntil: 'commit', timeout: 45_000 });
  await page.waitForTimeout(1500);

  // Boot: sticky loading banner
  const boot = page.getByRole('dialog');
  if (await boot.count()) {
    const banner = await page.getByText(/do not close this tab/i).isVisible().catch(() => false);
    if (!banner) hard.push('Boot missing sticky "do not close" banner');
    const bar = await page.getByRole('progressbar').count();
    if (!bar) hard.push('Boot missing bottom progressbar');
    await page.getByRole('button', { name: /enter terminal/i }).click();
    await page.waitForTimeout(600);
  }

  // Red bar: main desks on left (accessible names include hotkey digits, e.g. "Vol1")
  await page.waitForSelector('[role="menubar"][aria-label*="Main desks"]', { timeout: 10_000 }).catch(() => {
    hard.push('Red function menubar missing');
  });
  const items0 = await page.getByRole('menuitem').allTextContents();
  for (const d of ['Vol', 'Flow', 'Trade', 'Crypto', 'Rates']) {
    if (!items0.some((x) => new RegExp(d, 'i').test(x))) {
      hard.push(`Main desk missing on red bar: ${d}`);
    }
  }

  // Rates — no AuctionCard crash; babies Fund|UST|STIR|World
  await page.getByRole('menuitem', { name: /Rates/i }).first().click();
  await page.waitForTimeout(1200);
  const bodyRates = await page.innerText('body');
  if (/AuctionCard is not defined|Rates failed/i.test(bodyRates)) {
    hard.push('Rates desk crash (AuctionCard / failed boundary)');
  }
  for (const label of ['Fund', 'UST', 'STIR', 'World']) {
    const chip = page.getByRole('menuitem', { name: label }).first();
    if (!(await chip.isVisible().catch(() => false))) {
      hard.push(`Rates baby missing: ${label}`);
    } else {
      await chip.click();
      await page.waitForTimeout(350);
      const t = await page.innerText('body');
      if (/AuctionCard is not defined/i.test(t)) hard.push(`AuctionCard crash on ${label}`);
    }
  }

  // Crypto — Thalex lab grid + tools
  await page.getByRole('menuitem', { name: /Crypto/i }).first().click();
  await page.waitForTimeout(700);
  const cryptoBabies = await page.getByRole('menuitem').allTextContents();
  if (!cryptoBabies.some((x) => /lab/i.test(x))) hard.push('Crypto Lab baby missing');
  if (!cryptoBabies.some((x) => /sim/i.test(x))) hard.push('Crypto Simulator baby missing');
  const bodyLab = await page.innerText('body');
  if (!/THALEX LAB|thalextech|Simulator/i.test(bodyLab)) {
    hard.push('Crypto Lab home grid missing');
  }
  // Open Simulator from card if present, else red bar
  const simCard = page.getByRole('button', { name: /Simulator/i }).first();
  if (await simCard.isVisible().catch(() => false)) {
    await simCard.click();
    await page.waitForTimeout(500);
  } else {
    await page.getByRole('menuitem', { name: /sim/i }).first().click();
    await page.waitForTimeout(500);
  }
  const tSim = await page.innerText('body');
  // Crypto tools embed live thalextech.github.io apps (iframe), not thin replicas
  if (!/Thalex lab|thalextech\.github\.io|Open full screen|Simulator/i.test(tSim)) {
    hard.push('Crypto SIM tool did not render Thalex embed workspace');
  }
  const iframe = page.locator('iframe[title*="Thalex"]');
  if ((await iframe.count()) === 0) {
    hard.push('Crypto SIM missing Thalex iframe embed');
  }

  // Vol babies
  await page.getByRole('menuitem', { name: /Vol/i }).first().click();
  await page.waitForTimeout(400);
  const volBabies = await page.getByRole('menuitem').allTextContents();
  if (!volBabies.some((x) => /surf/i.test(x))) hard.push('Vol Surf baby missing');

  console.log(JSON.stringify({ ok: hard.length === 0, errors: hard, url: base }, null, 2));
  await browser.close();
  process.exit(hard.length ? 1 : 0);
} catch (e) {
  console.error(e);
  await browser.close();
  process.exit(2);
}
