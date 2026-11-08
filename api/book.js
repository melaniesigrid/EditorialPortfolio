// POST /api/book  { start, name, email, notes, tz, lang, company_website, elapsed }
// Holds the time as a pending request and emails both sides: Melanie gets
// Accept / Decline buttons, the visitor gets a "request received" note with
// a cancel link. Nothing reaches a calendar until Melanie accepts.
//
// Same bot guards as before (api/_guard.js). Test against a mocked store and
// sender (test/booking.test.js), never against the live one.
const H = require('./_hours');
const db = require('./_db');
const mail = require('./_mail');
const emails = require('./_emails');
const { openStarts } = require('./_slots-core');
const { validZone } = require('./_time');
const { clientIp, rateLimit, str, isEmail, looksAutomated, accepted } = require('./_guard');

const MAX = { name: 120, email: 254, notes: 2000 };
const LANGS = ['en', 'es', 'de', 'fr', 'he', 'ru', 'pt', 'uk', 'zh', 'ar'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const body = req.body || {};

  const automated = looksAutomated({ honeypot: body.company_website, elapsedMs: body.elapsed });
  if (automated) {
    console.log('[book] dropped', { reason: automated });
    return accepted(res);
  }
  if (!rateLimit(`book:${clientIp(req)}`, { limit: 3 })) {
    return res.status(429).json({ ok: false, error: 'rate' });
  }

  const name = str(body.name, MAX.name);
  const email = str(body.email, MAX.email);
  const notes = str(body.notes, MAX.notes) || '';
  const start = Date.parse(str(body.start, 40));
  const tz = validZone(body.tz) ? body.tz : H.OWNER_TZ;
  const lang = LANGS.includes(body.lang) ? body.lang : 'en';

  if (!name || !email || !Number.isFinite(start)) return res.status(400).json({ ok: false, error: 'missing' });
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'email' });

  // The time must be one of the open starts right now (inside the hours,
  // enough notice, inside the horizon). Who holds it is checked by the insert.
  if (!openStarts(Date.now()).includes(start)) return res.status(409).json({ ok: false, error: 'time' });

  let b;
  try {
    b = await db.insertPending({ start, end: start + H.SLOT_MINUTES * 60e3, name, email, notes, guest_tz: tz, lang });
  } catch (err) {
    console.log('[book] store failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'unavailable' });
  }
  if (!b) return res.status(409).json({ ok: false, error: 'taken' });

  // Melanie has to hear about it, or the request is a dead end: undo it.
  try {
    await mail.send(emails.ownerRequest(b));
  } catch (err) {
    console.log('[book] owner email failed', err && err.message);
    await db.remove(b.id).catch(() => {});
    return res.status(502).json({ ok: false, error: 'unavailable' });
  }
  try {
    await mail.send(emails.guestReceived(b));
  } catch (err) {
    console.log('[book] guest email failed', err && err.message);   // Melanie still has it; not fatal
  }

  return res.status(200).json({ ok: true, status: 'pending', start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString() });
};
