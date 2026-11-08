/**
 * Calendar invites (RFC 5545). A REQUEST puts the meeting on both
 * calendars with Yes/No buttons; a CANCEL with the same UID removes it.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function stamp(t) {
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Fold to 75 octets per line, as the spec asks; continuation lines start with a space. */
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  for (const ch of line) {
    const limit = out.length ? 74 : 75;   // continuation lines lose one octet to the space
    if (Buffer.byteLength(cur + ch, 'utf8') > limit) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * @param {object} o
 * @param {'REQUEST'|'CANCEL'} o.method
 * @param {string} o.uid, o.summary, o.description, o.location
 * @param {number} o.start, o.end   epoch ms
 * @param {{name:string,email:string}} o.organizer, o.attendee
 * @param {number} [o.sequence]
 */
function invite(o) {
  const cancel = o.method === 'CANCEL';
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//melaniesigrid.com//Booking//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${o.method}`,
    'BEGIN:VEVENT',
    `UID:${o.uid}`,
    `SEQUENCE:${o.sequence || 0}`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(o.start)}`,
    `DTEND:${stamp(o.end)}`,
    `SUMMARY:${esc(o.summary)}`,
    `DESCRIPTION:${esc(o.description)}`,
    o.location ? `LOCATION:${esc(o.location)}` : null,
    o.location ? `URL:${o.location}` : null,
    `ORGANIZER;CN=${esc(o.organizer.name)}:mailto:${o.organizer.email}`,
    `ATTENDEE;CN=${esc(o.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${o.attendee.email}`,
    `ATTENDEE;CN=${esc(o.organizer.name)};ROLE=CHAIR;PARTSTAT=ACCEPTED:mailto:${o.organizer.email}`,
    `STATUS:${cancel ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join('\r\n') + '\r\n';
}

module.exports = { invite, esc, fold, stamp };
