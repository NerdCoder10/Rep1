# School Year Calendar

A static calendar website for the 2026-27 Greenwich Public Schools school year.

- **Day view** – the selected day hour by hour, with a live "now" line, school notices, and your own events (saved in your browser).
- **Month view** – a month grid with every no-school day, early release, and observance from the district calendar. Click a day to open it.
- **Days Off view** – every holiday and break with no school, with a count of school days off and a countdown to the next one.

The clock is always on New York time. It uses the official [time.is](https://time.is/New_York) widget and corrects for any drift in your device clock. If time.is can't be reached, it falls back to your device clock converted to New York time.

School dates are in `school-calendar.js`, taken from the district calendar PDF (Rev. 9/25/2025).

## Run it

Open `index.html` in a browser, or serve the folder with `python3 -m http.server`. Any static host works too, for example GitHub Pages.
