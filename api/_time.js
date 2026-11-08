/**
 * Time-zone arithmetic with Intl only (no date library).
 * Every function takes and returns epoch milliseconds or plain parts.
 */

const partsFmt = new Map();
function fmt(tz) {
  if (!partsFmt.has(tz)) {
    partsFmt.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', weekday: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return partsFmt.get(tz);
}

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of instant `t` in `tz`. */
function localParts(t, tz) {
  const p = {};
  for (const { type, value } of fmt(tz).formatToParts(new Date(t))) p[type] = value;
  return {
    y: +p.year, m: +p.month, d: +p.day,
    h: +p.hour, mi: +p.minute, s: +p.second,
    weekday: WEEKDAY[p.weekday],
  };
}

/** Minutes `tz` is ahead of UTC at instant `t` (Toronto in winter: -300). */
function offsetMinutes(t, tz) {
  const p = localParts(t, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(t / 1000) * 1000) / 60000);
}

/** The instant when the wall clock in `tz` reads y-m-d h:mi. */
function zonedToUtc(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetMinutes(guess, tz) * 60000;
  const again = guess - offsetMinutes(t, tz) * 60000;   // settles across a DST change
  if (again !== t) t = again;
  return t;
}

function pad(n) { return String(n).padStart(2, '0'); }

/** "YYYY-MM-DD" for instant `t` in `tz`. */
function dayKey(t, tz) {
  const p = localParts(t, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** ISO 8601 with the zone's offset, e.g. 2026-11-09T10:00:00.000-05:00. */
function isoInZone(t, tz) {
  const p = localParts(t, tz);
  const off = offsetMinutes(t, tz);
  const sign = off < 0 ? '-' : '+';
  const a = Math.abs(off);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:00.000${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

function validZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** "Monday, November 9, 10:00 a.m. EST" style, for emails. */
function human(t, tz, locale = 'en-CA') {
  return new Date(t).toLocaleString(locale, {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short',
  });
}

module.exports = { localParts, offsetMinutes, zonedToUtc, dayKey, isoInZone, validZone, human, pad };
