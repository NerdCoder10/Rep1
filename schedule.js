// Bell schedule, 8-day (A–H) block rotation, and class schedule.

// Which block meets in each of the six periods, by rotation day.
const ROTATION = {
  A: [1, 2, 3, 4, 5, 6],
  B: [4, 3, 6, 5, 7, 8],
  C: [2, 1, 5, 6, 8, 7],
  D: [1, 2, 3, 4, 7, 8],
  E: [2, 1, 4, 3, 5, 6],
  F: [3, 4, 5, 6, 8, 7],
  G: [1, 2, 6, 5, 7, 8],
  H: [2, 1, 4, 3, 8, 7],
};

// A known rotation day. Every school day (open weekday between the first and
// last day of school) advances the letter by one; no-school days are skipped.
const ROTATION_ANCHOR = { date: "2026-10-13", letter: "G" };

// Classes by block. A block with no class is a free period.
const CLASSES = {
  1: null,
  2: { course: "Hon Short Fiction", code: "038705-003", teacher: "Cadigan, Mark", room: "320" },
  3: { course: "AP Physics C", code: "019250-001", teacher: "Felten, Richard", room: "928" },
  4: null,
  5: { course: "AP Micro and Macro Econ", code: "049600-002", teacher: "Lee, Erik", room: "527" },
  6: { course: "Honors Sci Research Seminar", code: "018220-003", teacher: "Bramante, Andrew", room: "932" },
  7: { course: "Honors Linear Algebra", code: "028160-001", teacher: "Papp, Robert", room: "423" },
  8: { course: "AP US Govt & Comp Govt", code: "049500A-001", teacher: "Hull, Aaron", room: "528" },
};

// On these days AP Physics C runs a double period: it also takes the free
// block next to it (block 4 on days B and H).
const DOUBLE_PERIODS = {
  B: { 4: 3 },
  H: { 4: 3 },
};

// Regular day. The 5th period is the lunch block.
const REGULAR_BELLS = [
  { start: "07:55", end: "08:55" },
  { start: "09:00", end: "09:55" },
  { start: "10:00", end: "10:55" },
  { start: "11:00", end: "11:55" },
  { start: "12:00", end: "13:25", lunch: true },
  { start: "13:30", end: "14:25" },
];

// Early release day (12:25 dismissal). These are the six periods of the
// day in order (whatever blocks the rotation day has); the 6th is the lunch block.
const EARLY_RELEASE_KICKOFF = { start: "07:30", end: "07:50", title: "Cardinal Kick-Off" };
const EARLY_RELEASE_BELLS = [
  { start: "07:55", end: "08:31" },
  { start: "08:36", end: "09:07" },
  { start: "09:12", end: "09:43" },
  { start: "09:48", end: "10:19" },
  { start: "10:24", end: "10:55" },
  { start: "11:00", end: "12:25", lunch: true },
];

// Lunch waves (1st semester 2026-27). Your wave is set by the room of the
// class you have in the lunch block. Times are for the regular lunch block
// (12:00–1:25); bells ring at 12:15, 12:35 and 12:55.
const LUNCH_WAVES = {
  1: [
    { start: "11:55", end: "12:25", lunch: true },
    { start: "12:30", end: "13:25" },
  ],
  2: [
    { start: "12:00", end: "12:15" },
    { start: "12:15", end: "12:45", lunch: true },
    { start: "12:45", end: "13:25" },
  ],
  3: [
    { start: "12:00", end: "12:35" },
    { start: "12:35", end: "13:05", lunch: true },
    { start: "13:05", end: "13:25" },
  ],
  4: [
    { start: "12:00", end: "12:55" },
    { start: "12:55", end: "13:25", lunch: true },
  ],
};

// Wave by room hundreds: Art (700s) and Science (900s) = 1, Bella (100s) and
// Clark (200s) = 2, Folsom (300s) and Sheldon (400s) = 3, Cantor (500s),
// 600s and Music (800s) = 4. PE/Health (Gym, Media Center) is also wave 4:
// add `lunchWave: 4` to a class to override the room rule.
const LUNCH_WAVE_BY_HUNDREDS = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 1, 8: 4, 9: 1 };

// The early release lunch block (11:00–12:25) is the same length as the
// regular one, so the wave times are shifted one hour earlier on those days.
const EARLY_RELEASE_LUNCH_SHIFT_MIN = -60;
