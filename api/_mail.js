/**
 * Email through Resend's HTTP API (RESEND_API_KEY). No SDK: one fetch.
 * Tests swap the sender with `_use(fake)`.
 */

const OWNER = () => process.env.OWNER_EMAIL || 'melaniesigrid@protonmail.com';
const FROM = () => process.env.MAIL_FROM || 'Melanie Baratto <bookings@melaniesigrid.com>';
const SITE = () => (process.env.SITE_URL || 'https://melaniesigrid.com').replace(/\/$/, '');

async function resend(msg) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const body = {
    from: FROM(),
    to: [msg.to],
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    reply_to: msg.replyTo || OWNER(),
  };
  if (msg.ics) {
    body.attachments = [{
      filename: msg.method === 'CANCEL' ? 'cancel.ics' : 'invite.ics',
      content: Buffer.from(msg.ics, 'utf8').toString('base64'),
      content_type: `text/calendar; charset=utf-8; method=${msg.method || 'REQUEST'}`,
    }];
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`resend ${r.status}: ${detail.slice(0, 200)}`);
  }
  return r.json().catch(() => ({}));
}

let sender = resend;
module.exports = {
  send: (msg) => sender(msg),
  _use: (fake) => { sender = fake || resend; },
  OWNER, SITE,
};
