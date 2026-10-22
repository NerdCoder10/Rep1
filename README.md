# School Year Calendar

A static calendar website for the 2026-27 Greenwich Public Schools school year.

- **Day view** – the selected day hour by hour, with a live "now" line, school notices, your class schedule for that rotation day (A–H), and your own events (saved in your browser).
- **Month view** – a month grid with every no-school day, early release, and observance from the district calendar. Click a day to open it.
- **Days Off view** – every holiday and break with no school, with a count of school days off and a countdown to the next one.

The clock is always on New York time. It uses the official [time.is](https://time.is/New_York) widget and corrects for any drift in your device clock. If time.is can't be reached, it falls back to your device clock converted to New York time.

School dates are in `school-calendar.js`, taken from the district calendar PDF (Rev. 9/25/2025).

Classes, the A–H rotation and the bell times are in `schedule.js`:

- Every open school weekday advances the rotation by one letter. No-school days are skipped. The rotation is anchored to Day G on Oct 13, 2026, which puts the first day of school, Aug 28, on Day A.
- High school early release days (12:25 dismissal) use the early release bells, starting with Cardinal Kick-Off. Early releases marked K-8 or K-5 only keep the regular schedule.
- On early release days, "Block 1–6" on the bell schedule means the 1st–6th period of that rotation day, not block numbers. The Day view labels each slot with its period (P1–P6) and block.
- Period 5 (12:00–1:25) is the lunch block (period 6, 11:00–12:25, on early release days). The lunch wave comes from the room of the class you have then, using the 1st semester lunch schedule. Early release days use their own lunch wave times.

The header shows a counter for the next day off: calendar days, school days left, and a live countdown to midnight when it starts.

Personal deadlines and study blocks are in `planner.js`. They show in the Day and Month views, and the header counts down to the next hard deadline.

Every upcoming school day shows a ❄ chance that school is cancelled. It comes from the Open-Meteo hourly forecast (snow, ice, wind chill, wind gusts, rain) and active National Weather Service alerts for Greenwich, blended with seasonal averages. The chances update every 15 minutes. Days beyond the 16-day forecast show the seasonal average only. The full formula is documented at the top of `closure.js`.

## Open it

Online with GitHub Pages: in the repo, go to **Settings → Pages**, set **Source** to "Deploy from a branch", pick the `claude/calendar-pdf-holiday-scanner-nk78gr` branch and the `/ (root)` folder, and click **Save**. After a minute or two the site is live at https://nerdcoder10.github.io/Rep1/.

The site updates itself: it checks `version.json` every 5 minutes and whenever you switch back to the tab, and reloads with fresh files when the version changes. When you change the site, bump the version in `version.json` and everywhere it appears in `index.html` (the `app-version` meta tag and each `?v=` on the script and stylesheet links).

Install it as an app on your phone: open the site, tap **📲 Install app** (next to the Day/Month tabs), and follow the steps. On iPhone that's Safari → Share → Add to Home Screen; on Android it's Chrome's Install prompt. The installed app opens full-screen from its own icon, works offline with the last saved data, and still updates itself.

On your computer: download the repo (**Code → Download ZIP**), unzip it, and double-click `index.html`.

## Calendar as your screen

**Mac desktop (live):** install the free [Plash](https://apps.apple.com/app/plash/id1494023538) app from the Mac App Store, choose **Add Website**, and paste
`https://nerdcoder10.github.io/Rep1/?wallpaper=mac`. It shows the clock, today's schedule, the cancellation chance and your countdowns, and updates live.

**iPhone lock screen (refreshed image):** a GitHub Action (`.github/workflows/wallpaper.yml`) renders `?wallpaper=phone` every 30 minutes to
`https://raw.githubusercontent.com/NerdCoder10/Rep1/wallpaper/wallpaper-phone.png`. Set it with a Shortcuts automation:

1. Shortcuts app → **Automation** → **+** → **Time of Day** → pick a time (e.g. 6:30 AM), **Daily**, **Run Immediately** → Next.
2. Add **Get Contents of URL** with the image link above.
3. Add **Set Wallpaper Photo** → choose **Lock Screen**, and turn off **Show Preview**.
4. Repeat for more times of day (e.g. 7:50 AM, 11:55 AM, 2:30 PM, 6:00 PM, 9:00 PM).

You can also preview the phone layout in a browser at `https://nerdcoder10.github.io/Rep1/?wallpaper=phone`.
