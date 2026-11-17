// Renders phone wallpaper images from ?wallpaper=phone.
//
// GitHub runs scheduled jobs late or skips them, so one run renders an image
// for every hour of the next few days. A phone always finds the image for the
// current hour, even if no job has run for a day.
//
//   <out>/YYYY-MM-DD-HH.jpg   the wallpaper as it should look at HH:00 New York time
//   <out>/wallpaper-phone.jpg the one for the current hour (also .png)
//
// Usage: node tools/render-wallpaper.js <site-url> <output-dir> [hours=72]
const { chromium } = require("playwright");

const TZ = "America/New_York";

// "YYYY-MM-DD-HH" for an instant, in New York time.
function slotName(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
  }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}-${p.hour}`;
}

(async () => {
  const [site, out, hoursArg] = process.argv.slice(2);
  const hours = Number(hoursArg) || 72;
  const browser = await chromium.launch();
  // iPhone 15/16 Pro size (1179 × 2556 pixels).
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    timezoneId: TZ,
  });
  // Use the device clock, not the time.is widget: the page clock is set by hand below.
  await ctx.route(/time\.is/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));

  const start = Math.floor(Date.now() / 3600000) * 3600000; // top of the current hour
  await page.clock.install({ time: start });
  await page.goto(`${site}/?wallpaper=phone`, { waitUntil: "load" });
  // Wait for the weather forecast so the cancellation chances are real.
  await page.waitForFunction(() => weather.fetchedAt || weather.error, null, { timeout: 20000 }).catch(() => {});

  for (let i = 0; i < hours; i++) {
    const t = start + i * 3600000;
    await page.clock.setFixedTime(t);
    await page.evaluate(() => render());
    const file = `${out}/${slotName(t)}.jpg`;
    await page.screenshot({ path: file, type: "jpeg", quality: 85 });
    if (i === 0) {
      await page.screenshot({ path: `${out}/wallpaper-phone.jpg`, type: "jpeg", quality: 85 });
      await page.screenshot({ path: `${out}/wallpaper-phone.png` }); // older Shortcuts use this link
    }
  }
  console.log(`rendered ${hours} hourly wallpapers from ${slotName(start)}`);
  await browser.close();
})();

