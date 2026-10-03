// POST /api/book  { start, name, email, notes, tz, lang, company_website, elapsed }
// Books the 30-minute meeting through Cal.com's public bookings endpoint.
// Cal.com sends the confirmation and the calendar invite to both sides.
// Same bot guards as the slots endpoint (api/_guard.js).
//
// A successful call here puts a real meeting on Melanie's calendar. Test the
// page against a mocked /api/book, never against this one.
const { clientIp, rateLimit, str, isEmail, looksAutomated, accepted } = require('./_guard');

const CAL = 'https://api.cal.com/v2/bookings';
const EVENT = { eventTypeSlug: '30min', username: 'northboundsoftwarestudio' };
const MAX = { name: 120, email: 254, notes: 2000 };

// The page's languages, mapped to the attendee languages Cal.com accepts
// (its CreateBookingAttendee enum). Anything else falls back to English.
const LANGS = { en: 'en', es: 'es', de: 'de', fr: 'fr', he: 'he', ru: 'ru', pt: 'pt', uk: 'uk', zh: 'zh-CN', ar: 'ar' };

function validZone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = req.body || {};

  const automated = looksAutomated({ honeypot: body.company_website, elapsedMs: body.elapsed });
  if (automated) {
    console.log('[book] dropped', { reason: automated, ip: clientIp(req) });
    return accepted(res);
  }
  if (!rateLimit(`book:${clientIp(req)}`, { limit: 3 })) {
    return res.status(429).json({ ok: false, error: 'rate' });
  }

  const name = str(body.name, MAX.name);
  const email = str(body.email, MAX.email);
  const notes = str(body.notes, MAX.notes) || '';
  const start = str(body.start, 40);
  const tz = validZone(body.tz) ? body.tz : 'America/Toronto';
  const lang = Object.prototype.hasOwnProperty.call(LANGS, body.lang) ? LANGS[body.lang] : 'en';

  if (!name || !email || !start) return res.status(400).json({ ok: false, error: 'missing' });
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'email' });
  const when = Date.parse(start);
  if (!Number.isFinite(when) || when < Date.now()) return res.status(400).json({ ok: false, error: 'time' });

  const payload = {
    ...EVENT,
    start: new Date(when).toISOString(),
    attendee: { name, email, timeZone: tz, language: lang },
    bookingFieldsResponses: notes ? { notes } : {},
    metadata: { source: 'melaniesigrid.com' },
  };

  try {
    const r = await fetch(CAL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cal-api-version': '2026-02-25' },
      body: JSON.stringify(payload),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || out.status !== 'success') {
      console.log('[book] cal error', r.status, JSON.stringify(out).slice(0, 400));
      // A slot taken between viewing and booking is the likely 4xx.
      return res.status(r.status >= 500 ? 502 : 409).json({ ok: false, error: r.status >= 500 ? 'unavailable' : 'taken' });
    }
    const d = out.data || {};
    return res.status(200).json({ ok: true, start: d.start || payload.start, end: d.end || null, uid: d.uid || null });
  } catch (err) {
    console.log('[book] fetch failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'unavailable' });
  }
};
