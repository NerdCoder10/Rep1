// Personal deadlines and study blocks (New York time).
//
// deadline: { type: "deadline", date, time, title }  – a hard due time
// block:    { type: "block", start, end, from, to, title } – repeats every day
//           from `start` to `end` (inclusive), `from`–`to` each day

const PLANNER = [
  { type: "deadline", date: "2026-10-18", time: "15:00", title: "First Essay Drafts Done for EAs and EDs" },
  { type: "deadline", date: "2026-10-28", time: "15:00", title: "Essays Done for EAs and EDs" },
  { type: "block", start: "2026-10-25", end: "2026-11-05", from: "16:30", to: "17:30", title: "AMC 12 Must Study" },
];
