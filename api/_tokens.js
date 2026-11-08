/**
 * Links in emails carry a token signed with BOOKING_SECRET:
 *   HMAC-SHA256(secret, "<booking id>:<role>")
 * Nothing secret is stored, any email can carry a fresh working link, and a
 * guest's token can never act as the owner's (the role is part of what is signed).
 */
const crypto = require('crypto');

function secret() {
  const s = process.env.BOOKING_SECRET;
  if (!s || s.length < 32) throw new Error('BOOKING_SECRET is not set (32+ characters)');
  return s;
}

/** @param {'owner'|'guest'} role */
function sign(id, role) {
  return crypto.createHmac('sha256', secret()).update(`${id}:${role}`).digest('base64url');
}

function verify(id, role, token) {
  if (typeof token !== 'string' || !token) return false;
  const want = Buffer.from(sign(id, role));
  const got = Buffer.from(token);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

/** A fresh Jitsi room nobody can guess. */
function jitsiRoom() { return `https://meet.jit.si/MelanieBaratto-${crypto.randomBytes(9).toString('base64url')}`; }

module.exports = { sign, verify, jitsiRoom };
