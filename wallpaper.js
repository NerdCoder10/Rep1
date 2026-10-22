"use strict";

/* ---------------------------------------------------------------------------
 * Wallpaper mode
 *
 *   ?wallpaper=mac    live desktop background (use with the Plash app)
 *   ?wallpaper=phone  portrait layout for a phone lock screen; the top is
 *                     left clear for the phone's own clock. A GitHub Action
 *                     screenshots this every 30 minutes into an image.
 *
 * Uses the same data and helpers as the main calendar (app.js).
 * ------------------------------------------------------------------------- */

const WALLPAPER = new URLSearchParams(location.search).get("wallpaper");
if (WALLPAPER) document.documentElement.classList.add("wallpaper", `wallpaper-${WALLPAPER}`);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function countdownText(ms) {
  const days = Math.floor(ms / DAY_MS);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  return days > 0 ? `${days}d ${h}h ${pad(m)}m` : `${h}h ${pad(m)}m`;
}

// The day to show: today, or tomorrow once the evening starts (after 6 PM).
function wallpaperDay() {
  const p = nyParts(clock.now());
  const today = todayNY();
  return p.hour >= 18 ? { d: addDays(today, 1), label: "Tomorrow" } : { d: today, label: "Today" };
}

function renderWallpaper() {
  const root = document.getElementById("wallpaper");
  const now = clock.now();
  const p = nyParts(now);
  const nowMin = p.hour * 60 + p.minute;
  const { d, label } = wallpaperDay();
  const isToday = d === todayNY();
  const letter = rotationDay(d);
  const off = schoolEvents(d).find((e) => e.type === "off");
  const notes = schoolEvents(d).filter((e) => e.type !== "off" && !(e.type === "early" && e.grades));

  // Header line for the day.
  let dayLine = letter
    ? `Day ${letter} · ${isEarlyRelease(d) ? "Early release (12:25)" : "Regular schedule"}`
    : off ? `No school – ${off.title}` : dowOf(d) === 0 || dowOf(d) === 6 ? "Weekend" : "No school";

  // Agenda.
  // A class split by lunch appears twice; list it once.
  const seen = new Set();
  const items = dayItems(d).filter((it) => {
    const key = it.kind + it.title;
    if (it.kind === "class" && seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const rows = items.map((it) => {
    const start = minutes(it.start), end = minutes(it.end);
    const state = !isToday ? "" : it.kind === "deadline" ? (nowMin >= start ? "past" : "")
      : nowMin >= end ? "past" : nowMin >= start ? "now" : "";
    const time = it.kind === "deadline" ? `Due ${clockLabel(it.start)}` : `${clockLabel(it.start)}`;
    const title = (it.period ? `P${it.period} · ` : "") + it.title;
    const detail = it.detail ? it.detail.replace(/^Lunch block · /, "") : "";
    return `<li class="wp-item ${it.kind} ${state}${it.block ? ` blk${it.block}` : ""}">
      <span class="wp-time">${esc(time)}</span>
      <span class="wp-what"><b>${esc(title)}</b>${detail ? `<small>${esc(detail)}</small>` : ""}</span>
    </li>`;
  }).join("");

  // Cancellation chance for that day (school days only).
  const chance = closureChance(d);

  // Countdowns.
  const nextDeadline = PLANNER.filter((it) => it.type === "deadline" && deadlineMs(it) > now)
    .sort((a, b) => deadlineMs(a) - deadlineMs(b));
  const nextOff = daysOff.find((ev) => ev.start > todayNY());

  const deadlineCards = nextDeadline.slice(0, WALLPAPER === "phone" ? 1 : 2).map((it) => `
    <div class="wp-card deadline">
      <div class="wp-label">Deadline</div>
      <div class="wp-big">${esc(countdownText(deadlineMs(it) - now))}</div>
      <div class="wp-sub">${esc(it.title)}</div>
      <div class="wp-sub dim">${esc(shortDate(it.date).replace(/, \d{4}$/, ""))}, ${esc(clockLabel(it.time))}</div>
    </div>`).join("");

  const offCard = nextOff ? (() => {
    const days = Math.round((toUTC(nextOff.start) - toUTC(todayNY())) / DAY_MS);
    return `<div class="wp-card off">
      <div class="wp-label">Next day off</div>
      <div class="wp-big">${days} day${days === 1 ? "" : "s"}</div>
      <div class="wp-sub">${esc(nextOff.title)}</div>
      <div class="wp-sub dim">${esc(shortDate(nextOff.start).replace(/, \d{4}$/, ""))}</div>
    </div>`;
  })() : "";

  const chanceCard = chance ? `
    <div class="wp-card chance ${chanceLevel(chance.p)}">
      <div class="wp-label">❄ School cancelled</div>
      <div class="wp-big">${esc(formatChance(chance.p))}</div>
      <div class="wp-sub dim">${esc(chance.reasons[0])}</div>
    </div>` : "";

  root.innerHTML = `
    ${WALLPAPER === "phone" ? `<div class="wp-clock-space"></div>` : `
    <div class="wp-clock">
      <div class="wp-time-big">${formatTime(p.hour, p.minute)}</div>
      <div class="wp-date">${esc(longDate(todayNY()))}</div>
    </div>`}
    <section class="wp-day">
      <div class="wp-day-head">
        <div class="wp-day-label">${label} · ${esc(shortDate(d).replace(/, \d{4}$/, ""))}</div>
        <div class="wp-day-line">${esc(dayLine)}</div>
        ${notes.map((n) => `<div class="wp-note ${n.type}">${esc(n.title)}</div>`).join("")}
      </div>
      ${rows ? `<ol class="wp-agenda">${rows}</ol>` : `<p class="wp-empty">Nothing scheduled</p>`}
    </section>
    <section class="wp-cards">${chanceCard}${deadlineCards}${offCard}</section>
    <div class="wp-updated">Updated ${esc(formatTime(p.hour, p.minute))}</div>`;
}
