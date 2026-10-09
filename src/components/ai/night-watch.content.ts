// Copy for Fig. 09, the night watch (NightWatch.tsx). Kept beside the
// component because content.ts is owned by the lead this round; the lead may
// fold it into content.ts verbatim. Voice: precise systems engineer, numbers
// over adjectives. All figures fictional and drawn from nightData.ts.

export const NIGHT = {
  /** chapter mark, read by the .ai-label and data-ch */
  num: "09",
  name: "Night",
  title: "Twelve hours, unattended.",
  aside: "The system keeps the hours you don't. One example night, drawn hour by hour.",
  /** the mono line under the clock, {n} = hours elapsed */
  hourOf: "{n} / 12 h",
  /** the right-margin table */
  tableHead: ["Hour", "Tasks", "Approvals", "Exceptions"] as const,
  /** the line that remains at 06:00 */
  summary: "12 h · 2,318 tasks · 41 escalations · 0 unhandled",
  foot: "An example night, counts illustrative.",
  figcap: ["Fig. 09", "Each point is one finished task."] as const,
  /** the four quarter hours printed on the ring */
  quarters: ["18:00", "00:00", "06:00", "12:00"] as const,
  /** phones: the row headers shrink to this */
  tableHeadShort: ["Hour", "Tasks", "Appr.", "Exc."] as const,
  /** hint for the hour rows: pointer devices and touch */
  hintFine: "Hover an hour to light the tasks it finished",
  hintTouch: "Tap an hour to light the tasks it finished",
  /** assistive text */
  ringLabel: "A 24-hour ring. Its lower half, 18:00 to 06:00, fills with cyan as the hours of the night pass.",
  starsText:
    "Each finished task is drawn as one point of light. From 22:00 the points drift in from the edge of the frame and by 03:00 they form the compressed system from chapter four: one orchestrator and four agents, joined by their buses. At dawn they sink out of the frame and the sheet is paper again.",
  /** the session log line the ticket reads (keep the FOUNDATIONS shape, ASCII dots) */
  sessionLine: "night . 2,318 tasks . 41 escalations",
} as const;
