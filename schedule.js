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

// Early release day (12:25 dismissal). Block 6 is the lunch block.
const EARLY_RELEASE_KICKOFF = { start: "07:30", end: "07:50", title: "Cardinal Kick-Off" };
const EARLY_RELEASE_BELLS = [
  { start: "07:55", end: "08:31" },
  { start: "08:36", end: "09:07" },
  { start: "09:12", end: "09:43" },
  { start: "09:48", end: "10:19" },
  { start: "10:24", end: "10:55" },
  { start: "11:00", end: "12:25", lunch: true },
];

// Lunch inside the lunch block. Set start/end (e.g. { start: "12:00", end: "12:30" })
// to split the block into lunch + class; leave null to show the whole block.
const LUNCH = null;
