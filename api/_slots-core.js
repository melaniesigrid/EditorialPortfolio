/**
 * Which 30-minute starts are bookable. Pure: no clock, no database.
 * `now` and `taken` come from the caller, so this is easy to test.
 */
const H = require('./_hours');
const { localParts, zonedToUtc, dayKey, isoInZone, pad } = require('./_time');

function hm(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }

/**
 * Every bookable start, as epoch ms, ascending.
 * @param {number} now           epoch ms
 * @param {Set<number>} taken    starts already held (pending or confirmed)
 * @param {object} [hours]       override of api/_hours.js, for tests
 */
function openStarts(now, taken = new Set(), hours = H) {
  const tz = hours.OWNER_TZ;
  const step = hours.SLOT_MINUTES;
  const earliest = now + hours.MIN_NOTICE_HOURS * 3600e3;
  const latest = now + hours.HORIZON_DAYS * 864e5;
  const open = hm(hours.OPEN), close = hm(hours.CLOSE);
  const blocked = new Set(hours.BLOCKED_DATES || []);
  const days = new Set(hours.DAYS);

  const out = [];
  const today = localParts(now, tz);
  // Walk calendar days in the owner's zone, one past the horizon to be safe.
  for (let i = 0; i <= hours.HORIZON_DAYS + 1; i++) {
    // Noon avoids any DST edge when stepping days.
    const noon = zonedToUtc(today.y, today.m, today.d, 12, 0, tz) + i * 864e5;
    const p = localParts(noon, tz);
    const key = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
    if (!days.has(p.weekday) || blocked.has(key)) continue;
    for (let min = open; min + step <= close; min += step) {
      const t = zonedToUtc(p.y, p.m, p.d, Math.floor(min / 60), min % 60, tz);
      if (t < earliest || t > latest || taken.has(t)) continue;
      out.push(t);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** The page's shape: { "YYYY-MM-DD": ["...ISO with offset", ...] } in the visitor's zone. */
function byDay(starts, tz) {
  const days = {};
  for (const t of starts) (days[dayKey(t, tz)] ||= []).push(isoInZone(t, tz));
  return days;
}

module.exports = { openStarts, byDay };
