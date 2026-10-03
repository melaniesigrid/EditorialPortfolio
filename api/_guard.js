/**
 * Shared abuse guards for the booking endpoints (api/slots.js, api/book.js).
 * Ported from the Northbound studio site, which uses the same module.
 *
 * Files under api/ whose name starts with `_` are not routed by Vercel, so this
 * is a module rather than a function.
 *
 * WHAT THIS IS AND IS NOT. A booking made through api/book.js lands straight on
 * Melanie's calendar and in her inbox, so it is the thing a bot would fill.
 * Three cheap layers, in order of how much they actually catch:
 *
 *   1. HONEYPOT. A field a human never sees and never fills. Catches almost
 *      every scripted submitter, costs nothing, and cannot produce a false
 *      positive for a real person using a real browser.
 *   2. DWELL TIME. A human takes seconds to type a name, an address and a
 *      paragraph. A script posts in milliseconds.
 *   3. RATE LIMIT. Per IP, in memory.
 *
 * Layer 3 is deliberately weak and it is worth being honest about why: this is
 * a serverless function, so the Map below lives in one warm instance and Vercel
 * may run several. A determined attacker is spread across instances and resets
 * every cold start. It stops the accidental double-submit and the naive loop,
 * which is most of what actually arrives; it is not a defence against someone
 * who has decided to flood us. The real fix is a shared store (Vercel KV or
 * Upstash), and it is not worth a dependency until the volume justifies it.
 */

const HOUR_MS = 60 * 60 * 1000;

/** IP → array of request timestamps, newest last. Per warm instance only. */
const hits = new Map();

/**
 * The submitter's address, trusting Vercel's proxy header.
 *
 * `x-forwarded-for` is client-controlled on a bare Node server; behind Vercel
 * the leftmost entry is the real peer because the platform rewrites it. Falling
 * back to a single shared bucket is deliberate: an unknown address should be
 * rate-limited together rather than exempted.
 */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Allow this key another request, or not.
 * Prunes as it goes so the Map cannot grow without bound on a long-lived
 * instance. There is no eviction thread in a serverless runtime.
 */
function rateLimit(key, { limit = 5, windowMs = HOUR_MS } = {}) {
  const now = Date.now();
  const cutoff = now - windowMs;

  for (const [k, times] of hits) {
    const live = times.filter((t) => t > cutoff);
    if (live.length) hits.set(k, live);
    else hits.delete(k);
  }

  const mine = hits.get(key) || [];
  if (mine.length >= limit) return false;
  mine.push(now);
  hits.set(key, mine);
  return true;
}

/** Trim, collapse runaway whitespace, and cap length. Never returns undefined. */
function str(value, max) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
}

/**
 * Good enough for a contact form. Deliberately not RFC 5322: the only thing
 * that proves an address is real is mail arriving at it, and a stricter regex
 * rejects valid addresses far more often than it catches fake ones.
 */
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

/**
 * True when the submission looks automated.
 *
 * Returns a reason rather than a boolean so the caller can log which layer
 * fired: if dwell time starts rejecting real people, that shows up here before
 * it shows up as a missing lead.
 */
function looksAutomated({ honeypot, elapsedMs, minDwellMs = 2000 }) {
  if (str(honeypot, 200)) return 'honeypot';
  const elapsed = Number(elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < minDwellMs) return 'dwell';
  return null;
}

/**
 * Accept a spam submission silently.
 *
 * 200, not 403. Telling a bot which layer caught it is free tuning information,
 * and a human who somehow trips a guard sees the normal success state rather
 * than an accusation.
 */
function accepted(res) {
  return res.status(200).json({ ok: true });
}

module.exports = { clientIp, rateLimit, str, isEmail, looksAutomated, accepted, HOUR_MS };
