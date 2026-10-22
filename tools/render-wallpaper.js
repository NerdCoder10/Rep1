// Renders the phone wallpaper image from ?wallpaper=phone.
// Usage: node tools/render-wallpaper.js <site-url> <output-dir>
const { chromium } = require("playwright");

(async () => {
  const [site, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  // iPhone 15/16 Pro size (1179 × 2556 pixels).
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    timezoneId: "America/New_York",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(`${site}/?wallpaper=phone`, { waitUntil: "load" });
  // Give the weather forecast a moment to load.
  await page.waitForFunction(() => weather.fetchedAt || weather.error, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/wallpaper-phone.png` });
  await browser.close();
})();
