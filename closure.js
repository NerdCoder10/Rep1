"use strict";

/* ---------------------------------------------------------------------------
 * Chance of school being cancelled
 *
 * Data sources (both free, no key, work straight from the browser):
 *   - Open-Meteo hourly forecast for Greenwich, CT (16 days): snowfall,
 *     freezing rain/drizzle, rain, temperature, wind chill, wind gusts.
 *   - National Weather Service active alerts for Greenwich (winter storm,
 *     blizzard, ice storm, hurricane, tropical storm, high wind, extreme cold).
 *
 * Formula (per school day):
 *   1. Effective snow S (inches) =
 *        snow from 6 PM the night before to 7 AM      (what buses face)
 *      + 0.5 × snow from 7 AM to 3 PM                 (mid-day storms → early dismissal more often)
 *      + 20 × freezing rain/drizzle from 6 PM to 7 AM (ice is far worse than snow:
 *        0.1" of ice counts like 2" of snow, 0.25" like 5")
 *      If it is above 34°F at 6 AM, S is halved (wet roads, snow melting).
 *   2. Snow chance = 1 / (1 + e^(−0.7 × (S − 4.5)))   → 2" ≈ 15%, 4.5" = 50%, 8" ≈ 92%
 *      (set to 0 when S < 0.3")
 *   3. Other weather:
 *        wind chill at 7 AM ≤ −20°F → 30%, ≤ −10°F → 6%
 *        wind gusts ≥ 60 mph → 45%, ≥ 45 mph → 8%   (downed trees, power outages)
 *        rain ≥ 3" in 24 h → 12%, ≥ 2" → 3%         (flooding)
 *   4. Non-weather (power outage, water main, heating failure, etc.): 0.3%
 *   5. Combined = 1 − Π(1 − each chance)
 *   6. NWS alerts in effect at 6 AM set a minimum:
 *        Blizzard 85%, Hurricane 90%, Ice Storm 70%, Winter Storm 50%,
 *        Tropical Storm 40%, Extreme Cold 30%, High Wind 20%, Winter Weather Advisory 12%
 *   7. Forecasts get less reliable further out, so the result is blended with
 *      the seasonal average for that month: weight on forecast =
 *      1 for the next 3 days, falling to 0.35 at 16 days.
 *      Beyond the 16-day forecast, only the seasonal average is shown.
 *
 * Seasonal averages are per school day, tuned so a typical Greenwich year has
 * about 2–3 weather closures, mostly in January and February.
 * ------------------------------------------------------------------------- */

const LOCATION = { lat: 41.0262, lon: -73.6282, name: "Greenwich, CT" };

// Average chance of a closure on a school day, by month (1 = January).
const CLIMATOLOGY = {
  1: 0.05, 2: 0.05, 3: 0.02, 4: 0.004, 5: 0.003, 6: 0.003,
  7: 0.003, 8: 0.004, 9: 0.006, 10: 0.006, 11: 0.006, 12: 0.02,
};
const BASE_NON_WEATHER = 0.003;

const ALERT_FLOORS = {
  "Blizzard Warning": 0.85,
  "Hurricane Warning": 0.9,
  "Ice Storm Warning": 0.7,
  "Winter Storm Warning": 0.5,
  "Tropical Storm Warning": 0.4,
  "Extreme Cold Warning": 0.3,
  "Wind Chill Warning": 0.3,
  "High Wind Warning": 0.2,
  "Flood Warning": 0.1,
  "Winter Weather Advisory": 0.12,
  "Winter Storm Watch": 0.25,
  "Hurricane Watch": 0.3,
};

const FREEZING_CODES = new Set([56, 57, 66, 67]);
const CACHE_KEY = "calendar.weather";
const REFRESH_MS = 2 * 60 * 60 * 1000;   // update the chances every 2 hours
const RETRY_MS = 15 * 60 * 1000;         // after a failed update, try again sooner

const weather = { hourly: null, alerts: [], fetchedAt: 0, error: null };

function loadWeatherCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && c.hourly) Object.assign(weather, c, { error: null });
  } catch { /* ignore */ }
}

async function fetchWeather() {
  const url = "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}` +
    "&hourly=temperature_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_gusts_10m" +
    "&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph" +
    "&timezone=America%2FNew_York&forecast_days=16&past_days=1";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();
    const h = data.hourly;
    // Index hourly values by "YYYY-MM-DDTHH" (local New York time).
    const hourly = {};
    h.time.forEach((t, i) => {
      hourly[t.slice(0, 13)] = {
        temp: h.temperature_2m[i], feels: h.apparent_temperature[i],
        precip: h.precipitation[i] || 0, rain: h.rain[i] || 0, snow: h.snowfall[i] || 0,
        code: h.weather_code[i], gust: h.wind_gusts_10m[i] || 0,
      };
    });
    weather.hourly = hourly;
    weather.fetchedAt = Date.now();
    weather.error = null;
  } catch (e) {
    weather.error = String(e.message || e);
  }

  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${LOCATION.lat},${LOCATION.lon}`,
      { headers: { Accept: "application/geo+json" } });
    if (!res.ok) throw new Error(`NWS ${res.status}`);
    const data = await res.json();
    weather.alerts = data.features.map((f) => ({
      event: f.properties.event,
      onset: Date.parse(f.properties.onset || f.properties.effective),
      ends: Date.parse(f.properties.ends || f.properties.expires),
    }));
  } catch { /* keep the last alerts we had */ }

  try { localStorage.setItem(CACHE_KEY, JSON.stringify(weather)); } catch { /* ignore */ }
}

// Sum a field over the hours [fromHour, toHour) starting at date d (hours may exceed 24 or be negative).
function sumHours(d, fromHour, toHour, pick) {
  let total = 0, found = 0;
  for (let h = fromHour; h < toHour; h++) {
    const day = addDays(d, Math.floor(h / 24));
    const hh = ((h % 24) + 24) % 24;
    const row = weather.hourly[`${day}T${pad(hh)}`];
    if (row) { total += pick(row); found++; }
  }
  return found ? total : null;
}
const hourAt = (d, h) => weather.hourly && weather.hourly[`${d}T${pad(h)}`];

/**
 * Chance (0–1) that school is cancelled on date d, plus the reasons.
 * Returns null for days without school and for past days.
 */
function closureChance(d) {
  if (!isSchoolDay(d) || d < todayNY()) return null; // no school, or already happened
  const month = Number(d.slice(5, 7));
  const climo = CLIMATOLOGY[month];
  const daysAhead = Math.round((toUTC(d) - toUTC(todayNY())) / DAY_MS);
  const reasons = [];

  const at6 = hourAt(d, 6);
  if (!weather.hourly || !at6) {
    return { p: climo, source: "seasonal", reasons: [`Seasonal average for ${MONTHS[month - 1]} (no forecast yet)`] };
  }

  // 1–2. Snow and ice.
  const overnightSnow = sumHours(d, -6, 7, (r) => r.snow);
  const daySnow = sumHours(d, 7, 15, (r) => r.snow);
  const ice = sumHours(d, -6, 7, (r) => (FREEZING_CODES.has(r.code) ? r.precip : 0));
  let S = overnightSnow + 0.5 * daySnow + 20 * ice;
  if (at6.temp > 34) S /= 2;
  const pSnow = S < 0.3 ? 0 : 1 / (1 + Math.exp(-0.7 * (S - 4.5)));
  if (overnightSnow >= 0.1) reasons.push(`${overnightSnow.toFixed(1)}" snow overnight`);
  if (daySnow >= 0.1) reasons.push(`${daySnow.toFixed(1)}" snow during the day`);
  if (ice >= 0.01) reasons.push(`${ice.toFixed(2)}" freezing rain`);

  // 3. Cold, wind, flooding.
  const chill = hourAt(d, 7) ? hourAt(d, 7).feels : at6.feels;
  const pCold = chill <= -20 ? 0.3 : chill <= -10 ? 0.06 : 0;
  if (pCold) reasons.push(`Wind chill ${Math.round(chill)}°F`);

  let gust = 0;
  for (let h = -6; h < 15; h++) {
    const day = addDays(d, Math.floor(h / 24));
    const row = weather.hourly[`${day}T${pad(((h % 24) + 24) % 24)}`];
    if (row) gust = Math.max(gust, row.gust);
  }
  const pWind = gust >= 60 ? 0.45 : gust >= 45 ? 0.08 : 0;
  if (pWind) reasons.push(`Wind gusts to ${Math.round(gust)} mph`);

  const rain = sumHours(d, -17, 7, (r) => r.rain);
  const pFlood = rain >= 3 ? 0.12 : rain >= 2 ? 0.03 : 0;
  if (pFlood) reasons.push(`${rain.toFixed(1)}" of rain`);

  // 4–5. Combine.
  let p = 1 - (1 - BASE_NON_WEATHER) * (1 - pSnow) * (1 - pCold) * (1 - pWind) * (1 - pFlood);

  // 6. NWS alerts in effect at 6 AM that morning.
  const morning = nyMidnight(d) + 6 * 3600000;
  for (const a of weather.alerts) {
    const floor = ALERT_FLOORS[a.event];
    if (floor && a.onset <= morning && morning < a.ends) {
      reasons.unshift(`NWS ${a.event}`);
      p = Math.max(p, floor);
    }
  }

  // 7. Blend with the seasonal average as forecasts get less certain.
  const w = daysAhead <= 3 ? 1 : Math.max(0.35, 1 - (daysAhead - 3) * 0.05);
  p = w * p + (1 - w) * climo;

  if (!reasons.length) reasons.push("No disruptive weather in the forecast");
  return { p, source: "forecast", reasons, daysAhead };
}

function formatChance(p) {
  const pct = p * 100;
  if (pct < 1) return "<1%";
  if (pct > 99) return ">99%";
  return `${Math.round(pct)}%`;
}
const chanceLevel = (p) => (p >= 0.5 ? "high" : p >= 0.15 ? "mid" : "low");
