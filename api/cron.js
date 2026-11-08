// GET /api/cron  (Vercel Cron, daily; see vercel.json)
// 1. Expires requests left unanswered past PENDING_HOURS (or whose time came)
//    and tells each guest. 2. Sends Melanie one digest of what is still
//    waiting and what just expired. 3. Forgets meetings older than 90 days.
// The digest arriving is also the health check: no email, look at the logs.
const H = require('./_hours');
const db = require('./_db');
const mail = require('./_mail');
const emails = require('./_emails');

module.exports = async function handler(req, res) {
  const want = process.env.CRON_SECRET;
  if (!want || req.headers.authorization !== `Bearer ${want}`) return res.status(401).json({ ok: false });

  try {
    const expired = await db.expireStale(H.PENDING_HOURS);
    for (const b of expired) {
      await mail.send(emails.guestExpired(b)).catch((err) => console.log('[cron] guest email failed', err && err.message));
    }
    const pending = await db.pending();
    if (pending.length || expired.length) await mail.send(emails.ownerDigest(pending, expired));
    const purged = await db.purgeOld();
    return res.status(200).json({ ok: true, expired: expired.length, pending: pending.length, purged });
  } catch (err) {
    console.log('[cron] failed', err && err.message);
    return res.status(500).json({ ok: false });
  }
};
