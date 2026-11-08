/**
 * When people can book a call. Edit this file to change your hours; it is
 * the only place they live. All times are in OWNER_TZ.
 *
 * Files under api/ whose name starts with `_` are not routed by Vercel.
 */
module.exports = {
  OWNER_TZ: 'America/Toronto',

  // 0 = Sunday ... 6 = Saturday. Sunday to Friday; Saturday is off.
  DAYS: [0, 1, 2, 3, 4, 5],

  // First and last moment of the day a call can happen, 24-hour "HH:MM".
  // With 30-minute calls, the last start is 22:30.
  OPEN: '10:00',
  CLOSE: '23:00',

  SLOT_MINUTES: 30,

  // A request needs at least this much notice.
  MIN_NOTICE_HOURS: 12,

  // People can book up to this many days ahead.
  HORIZON_DAYS: 10,

  // A request you haven't answered expires after this long.
  PENDING_HOURS: 48,

  // Days that are fully off, as "YYYY-MM-DD" in OWNER_TZ (holidays, travel).
  BLOCKED_DATES: [],
};
