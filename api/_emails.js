/**
 * The words in every booking email. Plain, short, and the same layout each
 * time: a heading, the facts, one or two buttons.
 */
const H = require('./_hours');
const { human } = require('./_time');
const { invite } = require('./_ics');
const { OWNER, SITE } = require('./_mail');
const { sign } = require('./_tokens');

const NAME = 'Melanie Baratto';

function e(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** A signed link. Accept and decline are the owner's; cancel is the guest's. */
function link(id, action) {
  const role = action === 'cancel' ? 'guest' : 'owner';
  return `${SITE()}/api/respond?${new URLSearchParams({ b: id, t: sign(id, role), a: action })}`;
}

function button(href, label, primary) {
  const bg = primary ? '#E8380D' : '#0E0E0E';
  return `<a href="${e(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font:600 15px/1 Arial,sans-serif;padding:14px 22px;margin:0 8px 8px 0">${e(label)}</a>`;
}

function page(heading, rows, buttons = '', footer = '') {
  const facts = rows.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#6b665f;font:13px Arial,sans-serif;vertical-align:top;white-space:nowrap">${e(k)}</td><td style="padding:6px 0;font:15px/1.45 Arial,sans-serif;color:#0E0E0E">${v}</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F4F1EC;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:28px 28px 20px;border-top:4px solid #E8380D">
<h1 style="font:700 22px/1.25 Arial,sans-serif;color:#0E0E0E;margin:0 0 18px">${e(heading)}</h1>
<table style="border-collapse:collapse;margin:0 0 20px">${facts}</table>
${buttons ? `<div style="margin:0 0 12px">${buttons}</div>` : ''}
${footer ? `<p style="font:13px/1.5 Arial,sans-serif;color:#6b665f;margin:12px 0 0">${footer}</p>` : ''}
</div></body></html>`;
}

function textOf(heading, rows, extra = []) {
  return [heading, '', ...rows.map(([k, v]) => `${k}: ${String(v).replace(/<[^>]+>/g, '')}`), '', ...extra].join('\n');
}

function whenRows(b) {
  const rows = [['When (you)', e(human(b.start, b.guest_tz))]];
  if (b.guest_tz !== H.OWNER_TZ) rows.push(['When (Toronto)', e(human(b.start, H.OWNER_TZ))]);
  return rows;
}

function ownerWhenRows(b) {
  const rows = [['When', e(human(b.start, H.OWNER_TZ))]];
  if (b.guest_tz !== H.OWNER_TZ) rows.push(['Their time', `${e(human(b.start, b.guest_tz))}`]);
  return rows;
}

function calendarFile(b, method) {
  return invite({
    method,
    uid: `${b.id}@melaniesigrid.com`,
    sequence: method === 'CANCEL' ? 1 : 0,
    start: b.start, end: b.end,
    summary: `${NAME} and ${b.name}`,
    description: [
      `30-minute video call.`,
      b.video_url ? `Join: ${b.video_url}` : '',
      b.notes ? `Notes: ${b.notes}` : '',
    ].filter(Boolean).join('\n'),
    location: b.video_url || '',
    organizer: { name: NAME, email: OWNER() },
    attendee: { name: b.name, email: b.email },
  });
}

/* ── To Melanie ─────────────────────────────────────────── */

function ownerRequest(b) {
  const rows = [['From', `${e(b.name)} &lt;${e(b.email)}&gt;`], ...ownerWhenRows(b), ['Notes', e(b.notes || '(none)')]];
  const buttons = button(link(b.id, 'accept'), 'Accept', true) + button(link(b.id, 'decline'), 'Decline');
  const foot = `If you do nothing, this request expires in ${H.PENDING_HOURS} hours and the time opens up again. Reply to this email to write to ${e(b.name)}.`;
  return {
    to: OWNER(),
    replyTo: b.email,
    subject: `Call request: ${b.name}, ${human(b.start, H.OWNER_TZ)}`,
    html: page('New call request', rows, buttons, foot),
    text: textOf('New call request', rows, [`Accept: ${link(b.id, 'accept')}`, `Decline: ${link(b.id, 'decline')}`]),
  };
}

function ownerConfirmed(b) {
  const rows = [['With', `${e(b.name)} &lt;${e(b.email)}&gt;`], ...ownerWhenRows(b), ['Video', `<a href="${e(b.video_url)}">${e(b.video_url)}</a>`]];
  return {
    to: OWNER(), replyTo: b.email,
    subject: `Confirmed: ${b.name}, ${human(b.start, H.OWNER_TZ)}`,
    html: page('Call confirmed', rows, '', 'The calendar invite is attached and has gone to them too.'),
    text: textOf('Call confirmed', rows),
    ics: calendarFile(b, 'REQUEST'), method: 'REQUEST',
  };
}

function ownerCancelled(b, by) {
  const rows = [['With', `${e(b.name)} &lt;${e(b.email)}&gt;`], ...ownerWhenRows(b)];
  const heading = by === 'guest' ? `${b.name} cancelled` : 'Call cancelled';
  return {
    to: OWNER(), replyTo: b.email,
    subject: `Cancelled: ${b.name}, ${human(b.start, H.OWNER_TZ)}`,
    html: page(heading, rows, '', 'The time is open again.'),
    text: textOf(heading, rows),
    ...(b.video_url ? { ics: calendarFile(b, 'CANCEL'), method: 'CANCEL' } : {}),
  };
}

function ownerDigest(pending, expired) {
  const rows = [];
  for (const b of pending) rows.push([human(b.start, H.OWNER_TZ), `${e(b.name)} &lt;${e(b.email)}&gt; (waiting)`]);
  for (const b of expired) rows.push([human(b.start, H.OWNER_TZ), `${e(b.name)} &lt;${e(b.email)}&gt; (expired, time reopened)`]);
  const heading = pending.length ? `${pending.length} call request${pending.length === 1 ? '' : 's'} waiting` : 'Expired call requests';
  return {
    to: OWNER(),
    subject: heading,
    html: page(heading, rows, '', pending.length ? 'Use the Accept or Decline buttons in each request email.' : ''),
    text: textOf(heading, rows),
  };
}

/* ── To the guest ───────────────────────────────────────── */

function cancelFooter(b, what = 'request') {
  return `Can’t make it? <a href="${e(link(b.id, 'cancel'))}" style="color:#E8380D">Cancel this ${what}</a>.`;
}

function guestReceived(b) {
  const rows = [...whenRows(b), ['Length', '30 minutes, video call']];
  return {
    to: b.email,
    subject: `Your call request with ${NAME}`,
    html: page(`Thanks, ${b.name}. Your request is in.`, rows, '',
      `I’ll confirm by email, usually within a day. Once I do, you’ll get a calendar invite with the video link. ${cancelFooter(b)}`),
    text: textOf(`Thanks, ${b.name}. Your request is in.`, rows, ['I’ll confirm by email, usually within a day.', `Cancel: ${link(b.id, 'cancel')}`]),
  };
}

function guestConfirmed(b) {
  const rows = [...whenRows(b), ['Video', `<a href="${e(b.video_url)}">${e(b.video_url)}</a>`]];
  return {
    to: b.email,
    subject: `Confirmed: your call with ${NAME}`,
    html: page('See you then.', rows, button(b.video_url, 'Join the video call', true),
      `The calendar invite is attached. Open it to add the call to your calendar. ${cancelFooter(b, 'call')}`),
    text: textOf('See you then.', rows, [`Join: ${b.video_url}`, `Cancel: ${link(b.id, 'cancel')}`]),
    ics: calendarFile(b, 'REQUEST'), method: 'REQUEST',
  };
}

function guestDeclined(b) {
  const rows = whenRows(b);
  return {
    to: b.email,
    subject: `About your call request with ${NAME}`,
    html: page('That time doesn’t work for me', rows, button(`${SITE()}/#contact`, 'Pick another time', true),
      'Sorry about that. Choose another time, or reply to this email and we’ll find one.'),
    text: textOf('That time doesn’t work for me', rows, [`Pick another time: ${SITE()}/#contact`]),
  };
}

function guestExpired(b) {
  const rows = whenRows(b);
  return {
    to: b.email,
    subject: `About your call request with ${NAME}`,
    html: page('I couldn’t confirm in time', rows, button(`${SITE()}/#contact`, 'Pick another time', true),
      'Sorry I missed this one. Choose a new time, or reply to this email and we’ll sort it out.'),
    text: textOf('I couldn’t confirm in time', rows, [`Pick another time: ${SITE()}/#contact`]),
  };
}

function guestCancelled(b) {
  const rows = whenRows(b);
  return {
    to: b.email,
    subject: `Cancelled: your call with ${NAME}`,
    html: page('Your call is cancelled', rows, button(`${SITE()}/#contact`, 'Book another time'), ''),
    text: textOf('Your call is cancelled', rows),
    ...(b.video_url ? { ics: calendarFile(b, 'CANCEL'), method: 'CANCEL' } : {}),
  };
}

module.exports = {
  ownerRequest, ownerConfirmed, ownerCancelled, ownerDigest,
  guestReceived, guestConfirmed, guestDeclined, guestExpired, guestCancelled,
  link, escape: e,
};
