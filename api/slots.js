// GET /api/slots?tz=Area/City
// Open 30-minute starts from Melanie's hours (api/_hours.js), minus every
// time already held by a pending or confirmed request. Days are keyed in the
// visitor's zone; `start` and `end` from older pages are accepted and ignored,
// because the hours file decides how far ahead people can book.
const H = require('./_hours');
const db = require('./_db');
const { openStarts, byDay } = require('./_slots-core');
const { validZone } = require('./_time');
const { clientIp, rateLimit } = require('./_guard');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!rateLimit(`slots:${clientIp(req)}`, { limit: 120 })) {
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }
  const q = req.query || {};
  const tz = validZone(q.tz) ? q.tz : H.OWNER_TZ;
  const now = Date.now();

  let taken;
  try {
    taken = new Set(await db.liveStarts(now, now + (H.HORIZON_DAYS + 1) * 864e5));
  } catch (err) {
    console.log('[slots] store failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'Calendar unavailable' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, tz, days: byDay(openStarts(now, taken), tz) });
};
