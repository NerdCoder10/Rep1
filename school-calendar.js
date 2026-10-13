// 2026-27 Greenwich Public Schools District Calendar
// Scanned from "FINAL 2026-2027 School Year Calendar Rev 09-25" (approved by Board 9/25/2025).
//
// type:
//   "off"     - no school for students (holiday, recess, school closed)
//   "early"   - early release day (school is open, students leave early)
//   "open"    - observance listed on the calendar, but schools are OPEN
//   "info"    - other key dates (first/last day, teacher-only days, etc.)
// grades: set when an early release only applies to those grades (not high school)

const SCHOOL_YEAR = {
  firstDay: "2026-08-28",
  lastDay: "2027-06-22",
  note:
    "Last day includes 5 snow days. If more snow/storm days are needed, they will be taken " +
    "from the remaining days in June or from the Spring Recess in April.",
};

const SCHOOL_EVENTS = [
  // August 2026
  { start: "2026-08-24", title: "First Day for All Teachers (no students)", type: "info" },
  { start: "2026-08-25", end: "2026-08-26", title: "Professional Learning Days (no students)", type: "info" },
  { start: "2026-08-27", title: "Grade 6 & 9 Orientation (Early Release)", type: "info" },
  { start: "2026-08-28", title: "First Day for All Students", type: "info" },

  // September 2026
  { start: "2026-09-07", title: "Labor Day", type: "off" },
  { start: "2026-09-11", title: "Rosh Hashanah at sundown", type: "open" },
  { start: "2026-09-21", title: "Yom Kippur", type: "off" },

  // October 2026
  { start: "2026-10-12", title: "Columbus Day", type: "open" },
  { start: "2026-10-20", title: "Teacher Collab - Early Release", type: "early" },

  // November 2026
  { start: "2026-11-03", title: "Election Day", type: "off" },
  { start: "2026-11-08", title: "Diwali", type: "open" },
  { start: "2026-11-11", title: "Veterans Day", type: "open" },
  { start: "2026-11-25", title: "Early Release", type: "early" },
  { start: "2026-11-26", end: "2026-11-27", title: "Thanksgiving Recess", type: "off" },

  // December 2026
  { start: "2026-12-07", title: "Teacher PLD - Schools Closed (K-8 Conferences)", type: "off" },
  { start: "2026-12-08", title: "K-8 Conferences - K-8 Early Release", type: "early", grades: "K-8" },
  { start: "2026-12-10", title: "Elementary Conferences (evening)", type: "info" },
  { start: "2026-12-22", title: "Early Release", type: "early" },
  { start: "2026-12-23", end: "2026-12-31", title: "Holiday Recess", type: "off" },

  // January 2027
  { start: "2027-01-01", title: "New Year's Day", type: "off" },
  { start: "2027-01-04", title: "School Resumes", type: "info" },
  { start: "2027-01-18", title: "Dr. Martin Luther King Jr. Day", type: "off" },
  { start: "2027-01-26", title: "Teacher Collab - Early Release", type: "early" },

  // February 2027
  { start: "2027-02-06", title: "Lunar New Year", type: "open" },
  { start: "2027-02-08", end: "2027-02-12", title: "Winter Recess", type: "off" },
  { start: "2027-02-15", title: "Presidents' Day", type: "off" },

  // March 2027
  { start: "2027-03-08", title: "K-5 Conferences - K-5 Early Release", type: "early", grades: "K-5" },
  { start: "2027-03-10", title: "Eid al-Fitr", type: "open" },
  { start: "2027-03-17", title: "K-5 Early Release, K-5 Conferences", type: "early", grades: "K-5" },
  { start: "2027-03-23", title: "Teacher Collab - Early Release", type: "early" },
  { start: "2027-03-26", title: "Good Friday", type: "off" },

  // April 2027
  { start: "2027-04-12", end: "2027-04-16", title: "Spring Recess", type: "off" },

  // May 2027
  { start: "2027-05-17", title: "Eid al-Adha", type: "open" },
  { start: "2027-05-28", title: "Early Release", type: "early" },
  { start: "2027-05-31", title: "Memorial Day", type: "off" },

  // June 2027
  { start: "2027-06-21", title: "Last Day for Grade 6 & 9", type: "info" },
  { start: "2027-06-22", title: "Last Day for Students - Early Release", type: "early" },
  { start: "2027-06-24", title: "Last Day for Staff", type: "info" },
];
