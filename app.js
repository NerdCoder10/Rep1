"use strict";

const TZ = "America/New_York";
const DAY_MS = 86400000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------------------------------------------------------------------------
 * Clock: New York time, corrected against time.is
 *
 * The time.is widget writes the official New York time into #New_York_z161.
 * Every second we compare that reading with the device clock and keep the
 * difference as an offset, so the whole calendar runs on time.is time even if
 * the device clock is wrong. If time.is can't be reached, we fall back to the
 * device clock converted to New York time.
 * ------------------------------------------------------------------------- */
const clock = {
  offsetMs: 0,
  synced: false,
  lastSync: 0,
  now() { return Date.now() + this.offsetMs; },
};

const nyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
});

function nyParts(ms) {
  const p = {};
  for (const { type, value } of nyFormatter.formatToParts(new Date(ms))) p[type] = value;
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
  };
}

function syncFromTimeIs() {
  const el = document.getElementById("New_York_z161");
  const m = el && el.textContent.match(/(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)?/i);
  if (!m) return;
  let h = +m[1];
  if (m[4]) {
    const pm = m[4].toUpperCase() === "PM";
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  const timeIsSec = h * 3600 + +m[2] * 60 + +m[3];
  const local = nyParts(Date.now());
  const localSec = local.hour * 3600 + local.minute * 60 + local.second;
  let diff = timeIsSec - localSec;
  if (diff > 43200) diff -= 86400;
  if (diff < -43200) diff += 86400;
  // Ignore sub-second jitter between the widget tick and ours.
  if (Math.abs(diff * 1000 - clock.offsetMs) >= 1000 || !clock.synced) clock.offsetMs = diff * 1000;
  clock.synced = true;
  clock.lastSync = Date.now();
}

function renderClock() {
  syncFromTimeIs();
  const p = nyParts(clock.now());
  document.getElementById("clockTime").textContent = formatTime(p.hour, p.minute, p.second);
  document.getElementById("clockDate").textContent = longDate(ymd(p.year, p.month, p.day)) + " · New York";

  const sync = document.getElementById("clockSync");
  if (clock.synced && Date.now() - clock.lastSync < 10000) {
    const off = Math.round(clock.offsetMs / 1000);
    sync.className = "clock-sync ok";
    sync.textContent = "Synced with time.is" +
      (off ? ` (your device clock is ${Math.abs(off)}s ${off > 0 ? "behind" : "ahead"})` : "");
  } else if (performance.now() > 8000) {
    sync.className = "clock-sync warn";
    sync.textContent = "time.is unreachable – using device clock in New York time";
  }
}

/* ---------------------------------------------------------------------------
 * Date helpers (calendar dates as "YYYY-MM-DD" strings, arithmetic in UTC)
 * ------------------------------------------------------------------------- */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const toUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fromUTC = (ms) => { const d = new Date(ms); return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
const addDays = (s, n) => fromUTC(toUTC(s) + n * DAY_MS);
const dowOf = (s) => new Date(toUTC(s)).getUTCDay();
const todayNY = () => { const p = nyParts(clock.now()); return ymd(p.year, p.month, p.day); };

function addMonths(s, n) {
  const [y, m] = s.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

function longDate(s) {
  return new Date(toUTC(s)).toLocaleDateString("en-US",
    { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function shortDate(s) {
  return new Date(toUTC(s)).toLocaleDateString("en-US",
    { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function formatTime(h, m, s) {
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return s === undefined ? `${h12}:${pad(m)} ${ampm}` : `${h12}:${pad(m)}:${pad(s)} ${ampm}`;
}

/* ---------------------------------------------------------------------------
 * School calendar lookups
 * ------------------------------------------------------------------------- */
const eventsByDate = new Map();
for (const ev of SCHOOL_EVENTS) {
  for (let d = ev.start; d <= (ev.end || ev.start); d = addDays(d, 1)) {
    if (!eventsByDate.has(d)) eventsByDate.set(d, []);
    eventsByDate.get(d).push(ev);
  }
}
const schoolEvents = (d) => eventsByDate.get(d) || [];
const isNoSchool = (d) => schoolEvents(d).some((e) => e.type === "off");
const daysOff = SCHOOL_EVENTS.filter((e) => e.type === "off");

function weekdaysIn(ev) {
  let n = 0;
  for (let d = ev.start; d <= (ev.end || ev.start); d = addDays(d, 1)) {
    const w = dowOf(d);
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/* ---------------------------------------------------------------------------
 * Class schedule: A–H rotation, regular and early release bells
 * ------------------------------------------------------------------------- */
const LETTERS = "ABCDEFGH";
const isSchoolDay = (d) => d >= SCHOOL_YEAR.firstDay && d <= SCHOOL_YEAR.lastDay &&
  dowOf(d) !== 0 && dowOf(d) !== 6 && !isNoSchool(d);
// Early release days for high school (ones limited to K-8 / K-5 don't count).
const isEarlyRelease = (d) => schoolEvents(d).some((e) => e.type === "early" && !e.grades);

const rotationByDate = new Map();
{
  const days = [];
  for (let d = SCHOOL_YEAR.firstDay; d <= SCHOOL_YEAR.lastDay; d = addDays(d, 1)) {
    if (isSchoolDay(d)) days.push(d);
  }
  const anchor = days.indexOf(ROTATION_ANCHOR.date);
  const anchorLetter = LETTERS.indexOf(ROTATION_ANCHOR.letter);
  days.forEach((d, i) => {
    rotationByDate.set(d, LETTERS[(((anchorLetter + i - anchor) % 8) + 8) % 8]);
  });
}
const rotationDay = (d) => rotationByDate.get(d) || null;

const minutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const clockLabel = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return formatTime(h, m); };

function lunchWave(cls) {
  return cls.lunchWave || LUNCH_WAVE_BY_HUNDREDS[Math.floor(Number(cls.room) / 100)] || null;
}

// The day's timeline: [{ start, end, title, detail, block, kind }]
function daySchedule(d) {
  const letter = rotationDay(d);
  if (!letter) return [];
  const early = isEarlyRelease(d);
  const bells = early ? EARLY_RELEASE_BELLS : REGULAR_BELLS;
  const items = [];
  if (early) items.push({ ...EARLY_RELEASE_KICKOFF, kind: "kickoff" });

  ROTATION[letter].forEach((block, i) => {
    const bell = bells[i];
    const period = i + 1;
    const doubled = (DOUBLE_PERIODS[letter] || {})[block];
    const cls = CLASSES[doubled || block];
    let title = `Block ${block} · ${cls ? cls.course : "Free"}`;
    if (doubled) title = `Block ${block} · ${cls.course} (double period with block ${doubled})`;
    const detail = cls ? `Room ${cls.room} · ${cls.teacher}` : "";
    const kind = cls ? "class" : "free";

    const wave = bell.lunch && cls ? lunchWave(cls) : null;
    if (wave) {
      // Split the lunch block into class time and lunch for this wave.
      for (const { start, end, lunch } of (early ? EARLY_RELEASE_LUNCH_WAVES : LUNCH_WAVES)[wave]) {
        items.push(lunch
          ? { start, end, title: `Lunch · Wave ${wave}`, kind: "lunch" }
          : { start, end, title, detail, block, kind, period });
      }
    } else {
      items.push({
        start: bell.start, end: bell.end, block, kind, period,
        title: bell.lunch ? `${title} + Lunch` : title,
        detail: bell.lunch ? ["Lunch block", detail].filter(Boolean).join(" · ") : detail,
      });
    }
  });
  return items;
}

// Personal planner items for a date: daily study blocks and deadlines.
function plannerItems(d) {
  const items = [];
  for (const it of PLANNER) {
    if (it.type === "block" && d >= it.start && d <= it.end) {
      items.push({ start: it.from, end: it.to, title: it.title, kind: "study" });
    } else if (it.type === "deadline" && it.date === d) {
      items.push({ start: it.time, end: it.time, title: it.title, kind: "deadline" });
    }
  }
  return items;
}

// School schedule plus planner items, in time order.
const dayItems = (d) => daySchedule(d).concat(plannerItems(d))
  .sort((a, b) => minutes(a.start) - minutes(b.start));

const deadlineMs = (it) => nyMidnight(it.date) + minutes(it.time) * 60000;

function renderDeadline() {
  const box = document.getElementById("nextDeadline");
  const now = clock.now();
  const next = PLANNER.filter((it) => it.type === "deadline" && deadlineMs(it) > now)
    .sort((a, b) => deadlineMs(a) - deadlineMs(b))[0];
  if (!next) { box.innerHTML = ""; return; }
  const left = deadlineMs(next) - now;
  const days = Math.floor(left / DAY_MS);
  const h = Math.floor(left / 3600000) % 24;
  const m = Math.floor(left / 60000) % 60;
  const sec = Math.floor(left / 1000) % 60;
  box.classList.toggle("urgent", left < 2 * DAY_MS);
  box.innerHTML = `
    <div class="count-label">Hard deadline</div>
    <div class="count-title"></div>
    <div class="count-main"><span class="count-num">${days}</span> day${days === 1 ? "" : "s"}
      <span class="count-rest">${h}h ${pad(m)}m</span></div>
    <div class="count-sub"></div>
    <div class="count-live">${days}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s</div>`;
  box.querySelector(".count-title").textContent = next.title;
  box.querySelector(".count-sub").textContent = `Due ${shortDate(next.date)}, ${clockLabel(next.time)}`;
}

function currentClass() {
  const p = nyParts(clock.now());
  const now = p.hour * 60 + p.minute;
  const today = todayNY();
  const items = dayItems(today).filter((it) => it.kind !== "deadline");
  const cur = items.find((it) => now >= minutes(it.start) && now < minutes(it.end));
  if (cur) return `Now: ${cur.title} – until ${clockLabel(cur.end)}`;
  const next = items.find((it) => minutes(it.start) > now);
  if (next) return `Next: ${next.title} at ${clockLabel(next.start)}`;
  return "";
}

/* ---------------------------------------------------------------------------
 * Personal events (saved in this browser)
 * ------------------------------------------------------------------------- */
const STORE_KEY = "calendar.userEvents";
let userEvents = {};
try { userEvents = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { userEvents = {}; }
function saveUserEvents() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(userEvents)); } catch { /* storage unavailable */ }
}

/* ---------------------------------------------------------------------------
 * Views
 * ------------------------------------------------------------------------- */
const state = { view: "day", date: null };

function setView(view) {
  state.view = view;
  try { localStorage.setItem("calendar.view", view); } catch { /* ignore */ }
  render();
}

function render() {
  if (!state.date) state.date = todayNY();
  for (const tab of document.querySelectorAll(".tab")) {
    tab.setAttribute("aria-selected", String(tab.dataset.view === state.view));
  }
  document.getElementById("dayView").hidden = state.view !== "day";
  document.getElementById("monthView").hidden = state.view !== "month";
  document.getElementById("offView").hidden = state.view !== "off";
  document.querySelector(".nav").style.visibility = state.view === "off" ? "hidden" : "visible";

  if (state.view === "day") renderDay();
  else if (state.view === "month") renderMonth();
  else renderDaysOff();
  renderNextOff();
}

function renderDay() {
  const d = state.date;
  const letter = rotationDay(d);
  document.getElementById("viewTitle").textContent = longDate(d) + (letter ? ` · Day ${letter}` : "");

  const banner = document.getElementById("dayBanner");
  banner.innerHTML = "";
  for (const ev of schoolEvents(d)) {
    const div = document.createElement("div");
    div.className = `banner ${ev.type}`;
    div.textContent = ev.type === "off" ? `No school – ${ev.title}`
      : ev.type === "open" ? `${ev.title} (school open)`
      : ev.grades ? `${ev.title} (${ev.grades} only – regular high school day)` : ev.title;
    banner.appendChild(div);
  }
  if (letter) {
    const div = document.createElement("div");
    div.className = "banner info";
    div.textContent = isEarlyRelease(d)
      ? `Day ${letter} · Early release schedule – dismissal 12:25 PM`
      : `Day ${letter} · Regular schedule`;
    banner.appendChild(div);
  }
  const chance = closureChance(d);
  if (chance) {
    const div = document.createElement("div");
    div.className = `banner chance ${chanceLevel(chance.p)}`;
    div.innerHTML = `<div class="chance-head"><span class="chance-pct"></span> chance school is cancelled</div>
      <div class="chance-why"></div>`;
    div.querySelector(".chance-pct").textContent = formatChance(chance.p);
    div.querySelector(".chance-why").textContent = chance.reasons.join(" · ") +
      (chance.source === "forecast" && chance.daysAhead > 3 ? ` · ${chance.daysAhead}-day forecast, blended with the seasonal average` : "");
    banner.appendChild(div);
  }

  const list = document.getElementById("hours");
  list.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const li = document.createElement("li");
    li.className = "hour";
    li.dataset.hour = h;
    li.innerHTML = `<div class="hour-label">${formatTime(h, 0).replace(":00", "")}</div>`;
    list.appendChild(li);
  }

  const layer = document.getElementById("layer");
  layer.innerHTML = "";
  const mine = (userEvents[d] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  layer.classList.toggle("split", mine.length > 0);

  for (const item of dayItems(d)) {
    if (item.kind === "deadline") {
      const el = document.createElement("div");
      el.className = "deadline-line";
      el.style.top = `${minutes(item.start)}px`;
      el.innerHTML = `<span></span>`;
      el.firstChild.textContent = `⚑ Due ${clockLabel(item.start)} · ${item.title}`;
      el.title = el.textContent;
      layer.appendChild(el);
      continue;
    }
    const el = document.createElement("div");
    el.className = `slot ${item.kind}` + (item.block ? ` blk${item.block}` : "") +
      (minutes(item.end) - minutes(item.start) < 45 ? " short" : "");
    el.style.top = `${minutes(item.start)}px`;
    el.style.height = `${minutes(item.end) - minutes(item.start)}px`;
    el.innerHTML = `<div class="slot-title"></div><div class="slot-meta"></div>`;
    el.children[0].textContent = (item.period ? `P${item.period} · ` : "") + item.title;
    el.children[1].textContent = `${clockLabel(item.start)} – ${clockLabel(item.end)}` +
      (item.detail ? ` · ${item.detail}` : "");
    el.title = el.textContent;
    layer.appendChild(el);
  }

  for (const ev of mine) {
    const el = document.createElement("div");
    el.className = "user-event";
    el.style.top = `${minutes(ev.time)}px`;
    el.innerHTML = `<span></span><button aria-label="Delete event">×</button>`;
    el.firstChild.textContent = `${clockLabel(ev.time)} · ${ev.title}`;
    el.lastChild.onclick = () => {
      userEvents[d] = userEvents[d].filter((x) => x !== ev);
      if (!userEvents[d].length) delete userEvents[d];
      saveUserEvents();
      renderDay();
    };
    layer.appendChild(el);
  }
  updateNowLine(true);
}

function updateNowLine(scroll) {
  const layer = document.getElementById("layer");
  const list = document.getElementById("hours");
  layer.querySelectorAll(".now-line").forEach((n) => n.remove());
  list.querySelectorAll(".hour.current").forEach((n) => n.classList.remove("current"));
  if (state.view !== "day") return;
  const isToday = state.date === todayNY();
  const p = nyParts(clock.now());
  if (isToday) {
    list.querySelector(`[data-hour="${p.hour}"]`).classList.add("current");
    const line = document.createElement("div");
    line.className = "now-line";
    line.style.top = `${p.hour * 60 + p.minute + p.second / 60}px`;
    layer.appendChild(line);
  }
  if (scroll) {
    // Today: centre on the current time. Other days: start of the school day.
    const target = isToday ? p.hour : 7;
    list.querySelector(`[data-hour="${target}"]`).scrollIntoView({ block: isToday ? "center" : "start" });
  }
}

function renderMonth() {
  const first = state.date.slice(0, 8) + "01";
  const [y, m] = first.split("-").map(Number);
  document.getElementById("viewTitle").textContent = `${MONTHS[m - 1]} ${y}`;

  const grid = document.getElementById("monthGrid");
  grid.innerHTML = "";
  for (const name of DOW) {
    const h = document.createElement("div");
    h.className = "dow";
    h.textContent = name;
    grid.appendChild(h);
  }

  const today = todayNY();
  let d = addDays(first, -dowOf(first));
  const lastCell = addDays(addMonths(first, 1), -1);
  const end = addDays(lastCell, 6 - dowOf(lastCell));
  for (; d <= end; d = addDays(d, 1)) {
    const cell = document.createElement("div");
    const w = dowOf(d);
    cell.className = "cell";
    if (w === 0 || w === 6) cell.classList.add("weekend");
    if (d.slice(0, 7) !== first.slice(0, 7)) cell.classList.add("outside");
    if (isNoSchool(d)) cell.classList.add("no-school");
    if (d === today) cell.classList.add("today");

    const num = document.createElement("span");
    num.className = "cell-num";
    num.textContent = Number(d.slice(8));
    cell.appendChild(num);
    const letter = rotationDay(d);
    if (letter) {
      const tag = document.createElement("span");
      tag.className = "day-letter";
      tag.textContent = `Day ${letter}`;
      cell.appendChild(tag);
    }

    for (const ev of schoolEvents(d)) {
      const chip = document.createElement("span");
      chip.className = `chip ${ev.type}`;
      chip.textContent = ev.title;
      chip.title = ev.title;
      cell.appendChild(chip);
    }
    for (const it of plannerItems(d)) {
      const chip = document.createElement("span");
      chip.className = `chip ${it.kind}`;
      chip.textContent = it.kind === "deadline" ? `⚑ ${clockLabel(it.start)} ${it.title}` : `${clockLabel(it.start)} ${it.title}`;
      chip.title = chip.textContent;
      cell.appendChild(chip);
    }
    for (const ev of userEvents[d] || []) {
      const chip = document.createElement("span");
      chip.className = "chip user";
      chip.textContent = ev.title;
      cell.appendChild(chip);
    }

    const chance = closureChance(d);
    if (chance) {
      const badge = document.createElement("span");
      badge.className = `chance-badge ${chanceLevel(chance.p)}` + (chance.source === "seasonal" ? " seasonal" : "");
      badge.textContent = formatChance(chance.p);
      badge.title = `Chance school is cancelled: ${formatChance(chance.p)} – ${chance.reasons.join(", ")}`;
      cell.appendChild(badge);
    }

    const date = d;
    cell.onclick = () => { state.date = date; setView("day"); };
    grid.appendChild(cell);
  }
}

function renderDaysOff() {
  document.getElementById("viewTitle").textContent = "Days with no school · 2026-27";
  const today = todayNY();
  const total = daysOff.reduce((n, ev) => n + weekdaysIn(ev), 0);
  const left = daysOff.reduce((n, ev) => {
    let c = 0;
    for (let d = ev.start; d <= (ev.end || ev.start); d = addDays(d, 1)) {
      if (d >= today && dowOf(d) !== 0 && dowOf(d) !== 6) c++;
    }
    return n + c;
  }, 0);
  document.getElementById("offSummary").textContent =
    `${daysOff.length} holidays & breaks · ${total} weekdays off in total · ${left} still to come. ` +
    `School runs ${shortDate(SCHOOL_YEAR.firstDay)} – ${shortDate(SCHOOL_YEAR.lastDay)}.`;

  const list = document.getElementById("offList");
  list.innerHTML = "";
  const next = daysOff.find((ev) => (ev.end || ev.start) >= today);
  for (const ev of daysOff) {
    const li = document.createElement("li");
    li.className = "off-item";
    if ((ev.end || ev.start) < today) li.classList.add("past");
    if (ev === next) li.classList.add("next");
    const when = ev.end ? `${shortDate(ev.start)} – ${shortDate(ev.end)}` : shortDate(ev.start);
    const n = weekdaysIn(ev);
    li.innerHTML = `<strong></strong><span class="when"></span><span class="count"></span>`;
    li.children[0].textContent = ev.title;
    li.children[1].textContent = when;
    li.children[2].textContent = `${n} school day${n === 1 ? "" : "s"} off`;
    li.onclick = () => { state.date = ev.start; setView("month"); };
    list.appendChild(li);
  }
  document.getElementById("offNote").textContent = "Note: " + SCHOOL_YEAR.note;
}

// Epoch ms of midnight at the start of a date in New York.
function nyMidnight(d) {
  let ms = toUTC(d) + 5 * 3600000; // midnight EST/EDT is 04:00–05:00 UTC
  const p = nyParts(ms);
  return ms - (p.hour * 3600 + p.minute * 60 + p.second) * 1000;
}

// Day counter until the next day off, with a live countdown to its midnight.
function renderNextOff() {
  const today = todayNY();
  const box = document.getElementById("nextOff");
  const offToday = isNoSchool(today) ? schoolEvents(today).find((e) => e.type === "off") : null;
  const next = daysOff.find((ev) => ev.start > today && !(offToday && ev === offToday));

  if (!next) {
    box.innerHTML = `<div class="count-label">No more days off this school year – summer starts after ${shortDate(SCHOOL_YEAR.lastDay)}!</div>`;
    return;
  }

  const days = Math.round((toUTC(next.start) - toUTC(today)) / DAY_MS);
  // Count today only while school is still in session.
  const items = daySchedule(today);
  const p = nyParts(clock.now());
  const todayCounts = items.length > 0 && p.hour * 60 + p.minute < minutes(items[items.length - 1].end);
  let schoolDays = todayCounts ? 1 : 0;
  for (let d = addDays(today, 1); d < next.start; d = addDays(d, 1)) if (isSchoolDay(d)) schoolDays++;
  const left = Math.max(0, nyMidnight(next.start) - clock.now());
  const h = Math.floor(left / 3600000) % 24;
  const m = Math.floor(left / 60000) % 60;
  const sec = Math.floor(left / 1000) % 60;

  box.innerHTML = `
    ${offToday ? `<div class="count-today"></div>` : ""}
    <div class="count-label">Next day off</div>
    <div class="count-title"></div>
    <div class="count-main"><span class="count-num">${days}</span> day${days === 1 ? "" : "s"}</div>
    <div class="count-sub">${schoolDays} school day${schoolDays === 1 ? "" : "s"} to go${todayCounts ? " (counting today)" : ""}</div>
    <div class="count-live">${Math.floor(left / DAY_MS)}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s</div>`;
  if (offToday) box.querySelector(".count-today").textContent = `No school today – ${offToday.title} 🎉`;
  box.querySelector(".count-title").textContent = `${next.title} · ${shortDate(next.start)}`;
}

function step(dir) {
  state.date = state.view === "month" ? addMonths(state.date, dir) : addDays(state.date, dir);
  render();
}

/* ---------------------------------------------------------------------------
 * Wire up
 * ------------------------------------------------------------------------- */
document.querySelectorAll(".tab").forEach((tab) => { tab.onclick = () => setView(tab.dataset.view); });
document.getElementById("prevBtn").onclick = () => step(-1);
document.getElementById("nextBtn").onclick = () => step(1);
document.getElementById("todayBtn").onclick = () => { state.date = todayNY(); render(); };
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input")) return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
  if (e.key === "t") { state.date = todayNY(); render(); }
});

document.getElementById("eventForm").onsubmit = (e) => {
  e.preventDefault();
  const time = document.getElementById("eventTime").value;
  const title = document.getElementById("eventTitle").value.trim();
  if (!time || !title) return;
  (userEvents[state.date] ||= []).push({ time, title });
  saveUserEvents();
  document.getElementById("eventTitle").value = "";
  renderDay();
};

try {
  const saved = localStorage.getItem("calendar.view");
  if (saved === "day" || saved === "month" || saved === "off") state.view = saved;
} catch { /* ignore */ }

let lastDay = null;
function tick() {
  renderClock();
  const today = todayNY();
  if (lastDay && today !== lastDay) render(); // midnight in New York
  lastDay = today;
  updateNowLine(false);
  renderNextOff();
  renderDeadline();
  renderNextChance();
  document.getElementById("nowClass").textContent = currentClass();
}

// Next school day after today (or today, before school ends) and its closure chance.
function renderNextChance() {
  const el = document.getElementById("nextChance");
  const p = nyParts(clock.now());
  let d = todayNY();
  const items = daySchedule(d);
  if (!items.length || p.hour * 60 + p.minute >= minutes(items[0].start)) d = addDays(d, 1);
  for (let i = 0; i < 30 && !isSchoolDay(d); i++) d = addDays(d, 1);
  const chance = closureChance(d);
  if (!chance) { el.textContent = ""; return; }
  el.className = `next-chance ${chanceLevel(chance.p)}`;
  el.textContent = `${formatChance(chance.p)} chance school is cancelled ${shortDate(d).replace(/, \d{4}$/, "")}`;
}

function renderWeatherStatus() {
  const el = document.getElementById("weatherStatus");
  if (weather.fetchedAt) {
    el.textContent = `Cancellation chances use the Open-Meteo forecast and National Weather Service alerts for ${LOCATION.name}, ` +
      `updated ${new Date(weather.fetchedAt).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" })}.` +
      (weather.error ? " (Latest update failed – showing the last forecast.)" : "");
  } else {
    el.textContent = weather.error
      ? "Weather forecast unavailable – cancellation chances show seasonal averages."
      : "Loading weather forecast…";
  }
}

async function refreshWeather() {
  await fetchWeather();
  render();
  renderWeatherStatus();
}

/* ---------------------------------------------------------------------------
 * Auto-update: browsers keep old copies of the site's files. Check
 * version.json (never cached) and reload with fresh files when it changes.
 * ------------------------------------------------------------------------- */
const APP_VERSION = document.querySelector('meta[name="app-version"]').content;
document.getElementById("appVersion").textContent = `Version ${APP_VERSION}`;

async function checkForUpdate() {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json();
    // Only try once per version, so a stale copy can never cause a reload loop.
    const tried = new URLSearchParams(location.search).get("v");
    if (version && version !== APP_VERSION && version !== tried) {
      // A new URL makes the browser fetch a fresh index.html, which points
      // at the new versions of every script and stylesheet.
      location.replace(`${location.pathname}?v=${encodeURIComponent(version)}`);
    }
  } catch { /* offline – try again later */ }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });
setInterval(checkForUpdate, 5 * 60 * 1000);
checkForUpdate();

loadWeatherCache();
render();
tick();
renderWeatherStatus();
setInterval(tick, 1000);
refreshWeather();
setInterval(refreshWeather, REFRESH_MS);
