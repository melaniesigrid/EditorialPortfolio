// GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD&tz=Area/City
// Open times for the 30-minute meeting, read from Cal.com's public slots
// endpoint. No API key: the event type is public, and nothing here is metered.
// Cal.com applies the event's own minimum booking notice before answering, so
// there is no notice rule of ours on top.
const { clientIp, rateLimit } = require('./_guard');

const CAL = 'https://api.cal.com/v2/slots';
const EVENT = { eventTypeSlug: '30min', username: 'northboundsoftwarestudio' };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

function validZone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!rateLimit(`slots:${clientIp(req)}`, { limit: 120 })) {
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }

  const { start, end } = req.query || {};
  const tz = validZone(req.query && req.query.tz) ? req.query.tz : 'America/Toronto';
  if (!DAY.test(start || '') || !DAY.test(end || '')) {
    return res.status(400).json({ ok: false, error: 'start and end must be YYYY-MM-DD' });
  }
  const span = (Date.parse(end) - Date.parse(start)) / 864e5;
  if (!(span >= 0 && span <= MAX_DAYS)) {
    return res.status(400).json({ ok: false, error: `Ask for at most ${MAX_DAYS} days` });
  }

  const url = `${CAL}?${new URLSearchParams({ ...EVENT, start, end, timeZone: tz })}`;
  try {
    const r = await fetch(url, { headers: { 'cal-api-version': '2024-09-04' } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || !body.data) {
      console.log('[slots] cal error', r.status, JSON.stringify(body).slice(0, 300));
      return res.status(502).json({ ok: false, error: 'Calendar unavailable' });
    }
    // { "2026-10-05": ["2026-10-05T09:00:00.000-04:00", ...], ... }
    // A day with nothing open is dropped.
    const days = {};
    for (const [day, list] of Object.entries(body.data)) {
      const open = (Array.isArray(list) ? list : []).map(s => s && s.start).filter(Boolean);
      if (open.length) days[day] = open;
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ ok: true, tz, days });
  } catch (err) {
    console.log('[slots] fetch failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'Calendar unavailable' });
  }
};
