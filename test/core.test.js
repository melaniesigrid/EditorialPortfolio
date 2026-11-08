// Pure pieces: hours and time zones, invites, signed links.  `npm test`
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BOOKING_SECRET = 'test-secret-test-secret-test-secret-0123';

const H = require('../api/_hours');
const { openStarts, byDay } = require('../api/_slots-core');
const { zonedToUtc, localParts, isoInZone, dayKey } = require('../api/_time');
const { invite, fold } = require('../api/_ics');
const { sign, verify, jitsiRoom } = require('../api/_tokens');

const TZ = 'America/Toronto';
const at = (y, m, d, h, mi) => zonedToUtc(y, m, d, h, mi, TZ);

test('hours: Sunday to Friday, 10:00 to 22:30 starts, Saturday off', () => {
  const now = at(2026, 11, 13, 8, 0);   // Friday 13 Nov, 08:00 Toronto
  const starts = openStarts(now);
  const parts = starts.map((t) => localParts(t, TZ));
  assert.ok(parts.every((p) => p.weekday !== 6), 'no Saturday');
  assert.ok(parts.every((p) => p.h * 60 + p.mi >= 600 && p.h * 60 + p.mi <= 22 * 60 + 30), 'inside 10:00..22:30');
  const sunday = parts.filter((p) => p.m === 11 && p.d === 15);
  assert.equal(sunday.length, 26, '26 half-hour starts on a full day');
  assert.deepEqual([sunday[0].h, sunday[0].mi], [10, 0]);
  assert.deepEqual([sunday.at(-1).h, sunday.at(-1).mi], [22, 30]);
});

test('hours: 12 hours of notice and at most 10 days ahead', () => {
  const now = at(2026, 11, 13, 8, 0);
  const starts = openStarts(now);
  assert.ok(starts[0] >= now + 12 * 3600e3, 'first start respects notice');
  assert.equal(localParts(starts[0], TZ).h, 20, 'Friday 08:00 + 12h: first open start is 20:00 the same day');
  assert.ok(starts.at(-1) <= now + 10 * 864e5, 'last start inside the horizon');
});

test('hours: taken times and blocked dates are not offered', () => {
  const now = at(2026, 11, 13, 8, 0);
  const t = at(2026, 11, 15, 10, 0);
  assert.ok(openStarts(now).includes(t));
  assert.ok(!openStarts(now, new Set([t])).includes(t));
  const blocked = { ...H, BLOCKED_DATES: ['2026-11-15'] };
  assert.ok(!openStarts(now, new Set(), blocked).some((x) => dayKey(x, TZ) === '2026-11-15'));
});

test('hours: still 10:00 local across the daylight-saving change', () => {
  const now = at(2026, 10, 28, 8, 0);   // DST ends Sunday 1 Nov 2026
  const tens = openStarts(now).filter((x) => { const p = localParts(x, TZ); return p.h === 10 && p.mi === 0; });
  assert.ok(tens.length >= 8);
  const before = tens.find((x) => dayKey(x, TZ) === '2026-10-30');
  const after = tens.find((x) => dayKey(x, TZ) === '2026-11-02');
  assert.equal(new Date(before).toISOString(), '2026-10-30T14:00:00.000Z');   // EDT, UTC-4
  assert.equal(new Date(after).toISOString(), '2026-11-02T15:00:00.000Z');    // EST, UTC-5
});

test('slots are keyed and written in the visitor zone', () => {
  const t = at(2026, 11, 15, 22, 0);   // Sunday 22:00 Toronto = Monday 04:00 in Paris
  const days = byDay([t], 'Europe/Paris');
  assert.deepEqual(Object.keys(days), ['2026-11-16']);
  assert.equal(days['2026-11-16'][0], '2026-11-16T04:00:00.000+01:00');
  assert.equal(Date.parse(isoInZone(t, 'Asia/Kolkata')), t, 'ISO round-trips, half-hour offsets too');
});

test('invite: a REQUEST with both people, folded and escaped', () => {
  const ics = invite({
    method: 'REQUEST', uid: 'abc@melaniesigrid.com', start: Date.UTC(2026, 10, 16, 15), end: Date.UTC(2026, 10, 16, 15, 30),
    summary: 'Melanie Baratto and Ana, López', description: 'Line one\nLine two; done', location: 'https://meet.jit.si/x',
    organizer: { name: 'Melanie Baratto', email: 'm@example.com' }, attendee: { name: 'Ana', email: 'a@example.com' },
  });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /METHOD:REQUEST\r\n/);
  assert.match(ics, /DTSTART:20261116T150000Z\r\n/);
  assert.match(ics, /DTEND:20261116T153000Z\r\n/);
  assert.match(ics, /SUMMARY:Melanie Baratto and Ana\\, López/);
  assert.match(ics, /DESCRIPTION:Line one\\nLine two\\; done/);
  const unfolded = ics.replace(/\r\n /g, '');   // calendars join folded lines back up
  assert.match(unfolded, /ATTENDEE;CN=Ana;.*RSVP=TRUE:mailto:a@example.com\r\n/);
  assert.match(unfolded, /ORGANIZER;CN=Melanie Baratto:mailto:m@example.com\r\n/);
  assert.match(ics, /STATUS:CONFIRMED/);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line}`);
  const cancel = invite({ method: 'CANCEL', uid: 'abc@melaniesigrid.com', sequence: 1, start: 0, end: 1, summary: 's', description: '', organizer: { name: 'M', email: 'm@x.co' }, attendee: { name: 'A', email: 'a@x.co' } });
  assert.match(cancel, /METHOD:CANCEL/);
  assert.match(cancel, /STATUS:CANCELLED/);
  assert.match(cancel, /SEQUENCE:1/);
});

test('fold keeps multi-byte characters whole', () => {
  const folded = fold('DESCRIPTION:' + 'é'.repeat(80));
  assert.equal(folded.replace(/\r\n /g, ''), 'DESCRIPTION:' + 'é'.repeat(80));
});

test('signed links: right booking, right role only', () => {
  const id = '0b5f8a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
  const owner = sign(id, 'owner'), guest = sign(id, 'guest');
  assert.ok(verify(id, 'owner', owner));
  assert.ok(verify(id, 'guest', guest));
  assert.ok(!verify(id, 'owner', guest), 'a guest token cannot accept');
  assert.ok(!verify('11111111-1c2d-4e5f-8a9b-0c1d2e3f4a5b', 'owner', owner), 'tied to one booking');
  assert.ok(!verify(id, 'owner', ''), 'empty token');
  assert.match(jitsiRoom(), /^https:\/\/meet\.jit\.si\/MelanieBaratto-[A-Za-z0-9_-]{12}$/);
});
