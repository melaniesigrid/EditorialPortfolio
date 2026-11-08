// GET  /api/respond?b=<id>&t=<token>&a=accept|decline|cancel  → a page with one button
// POST /api/respond  (same fields, form-encoded)              → does it
//
// The link in an email only ever SHOWS a page. Mail scanners (Gmail, Outlook,
// Proton) open links in emails on their own; if a GET accepted a booking,
// every request would accept itself. The change happens on the POST, which
// only a person pressing the button sends.
const H = require('./_hours');
const db = require('./_db');
const mail = require('./_mail');
const emails = require('./_emails');
const { verify, jitsiRoom } = require('./_tokens');
const { human } = require('./_time');

const e = emails.escape;
const ACTIONS = {
  accept: { role: 'owner', from: ['pending'], to: 'confirmed', title: 'Accept this call?', button: 'Accept and send the invite' },
  decline: { role: 'owner', from: ['pending'], to: 'declined', title: 'Decline this request?', button: 'Decline' },
  cancel: { role: 'guest', from: ['pending', 'confirmed'], to: 'cancelled', title: 'Cancel this call?', button: 'Cancel the call' },
};
const STATE = {
  pending: 'waiting for an answer', confirmed: 'confirmed', declined: 'declined',
  expired: 'expired', cancelled: 'cancelled',
};

function html(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${e(title)}</title>
<style>
  :root{--ink:#0E0E0E;--paper:#F4F1EC;--red:#E8380D;--dim:#6b665f}
  @media (prefers-color-scheme:dark){:root{--ink:#F1ECE4;--paper:#141312;--dim:#A79F95}}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);
    font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px max(16px,env(safe-area-inset-left))}
  main{max-width:520px;width:100%;border-top:4px solid var(--red);padding-top:20px}
  h1{font-size:1.5rem;line-height:1.2;margin:0 0 16px}
  dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0 0 24px}
  dt{color:var(--dim);font-size:.85rem}dd{margin:0}
  button{font:600 1rem system-ui,sans-serif;background:var(--red);color:#fff;border:0;padding:14px 22px;cursor:pointer}
  button:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
  p{margin:0 0 12px}a{color:var(--red)}
</style></head><body><main>${body}</main></body></html>`;
}

function facts(b, forOwner) {
  const tz = forOwner ? H.OWNER_TZ : b.guest_tz;
  const rows = [
    forOwner ? ['From', `${e(b.name)} (${e(b.email)})`] : ['With', 'Melanie Baratto'],
    ['When', e(human(b.start, tz))],
    ['Status', e(STATE[b.status] || b.status)],
  ];
  if (forOwner && b.notes) rows.push(['Notes', e(b.notes)]);
  if (b.status === 'confirmed' && b.video_url) rows.push(['Video', `<a href="${e(b.video_url)}">${e(b.video_url)}</a>`]);
  return `<dl>${rows.map(([k, v]) => `<dt>${e(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

function send(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');   // the token is in the URL
  res.setHeader('X-Robots-Tag', 'noindex');
  return res.status(status).send(html(title, body));
}

async function deliver(list) {
  for (const msg of list) {
    try { await mail.send(msg); } catch (err) { console.log('[respond] email failed', msg.subject, err && err.message); }
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).send('Method not allowed');
  const p = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const action = ACTIONS[p.a] ? p.a : null;
  const id = String(p.b || '');
  const token = String(p.t || '');

  const bad = () => send(res, 404, 'Link not valid', '<h1>This link isn’t valid</h1><p>It may have been copied incompletely. Use the button in the email again.</p>');
  if (!action) return bad();
  const A = ACTIONS[action];
  // A guest's cancel link must not work as the owner's accept link, and the
  // owner may cancel too, using her own token.
  let ok = false;
  try {
    ok = verify(id, A.role, token) || (action === 'cancel' && verify(id, 'owner', token));
  } catch (err) {
    console.log('[respond] not configured', err && err.message);
    return send(res, 503, 'Not available', '<h1>Booking is not set up yet</h1>');
  }
  if (!ok) return bad();
  const byOwner = A.role === 'owner' || verify(id, 'owner', token);

  let b;
  try { b = await db.get(id); } catch (err) {
    console.log('[respond] store failed', err && err.message);
    return send(res, 502, 'Try again', '<h1>Something went wrong</h1><p>Please try the link again in a minute.</p>');
  }
  if (!b) return bad();

  // GET: show what will happen, with one button.
  if (req.method === 'GET') {
    if (!A.from.includes(b.status)) {
      return send(res, 200, 'Nothing to do', `<h1>This call is already ${e(STATE[b.status] || b.status)}</h1>${facts(b, byOwner)}`);
    }
    return send(res, 200, A.title, `<h1>${e(A.title)}</h1>${facts(b, byOwner)}
<form method="post" action="/api/respond">
  <input type="hidden" name="b" value="${e(id)}"><input type="hidden" name="t" value="${e(token)}"><input type="hidden" name="a" value="${e(action)}">
  <button type="submit">${e(A.button)}</button>
</form>`);
  }

  // POST: do it, once.
  if (action === 'accept' && b.start <= Date.now()) {
    await db.transition(id, ['pending'], 'expired').catch(() => {});
    return send(res, 409, 'Too late', `<h1>This time has already passed</h1>${facts({ ...b, status: 'expired' }, true)}`);
  }
  let done;
  try {
    done = await db.transition(id, A.from, A.to, action === 'accept' ? jitsiRoom() : null);
  } catch (err) {
    console.log('[respond] store failed', err && err.message);
    return send(res, 502, 'Try again', '<h1>Something went wrong</h1><p>Nothing changed. Please press the button again in a minute.</p>');
  }
  if (!done) {
    const now = await db.get(id).catch(() => b);
    return send(res, 200, 'Nothing to do', `<h1>This call is already ${e(STATE[now.status] || now.status)}</h1>${facts(now, byOwner)}`);
  }

  if (action === 'accept') {
    await deliver([emails.guestConfirmed(done), emails.ownerConfirmed(done)]);
    return send(res, 200, 'Accepted', `<h1>Accepted. The invite is on its way.</h1>${facts(done, true)}<p>${e(done.name)} gets the calendar invite and the video link. A copy is in your inbox too.</p>`);
  }
  if (action === 'decline') {
    await deliver([emails.guestDeclined(done)]);
    return send(res, 200, 'Declined', `<h1>Declined</h1>${facts(done, true)}<p>${e(done.name)} has been told, and the time is open again.</p>`);
  }
  // cancel: tell whoever didn't press the button; both calendars drop a confirmed event.
  const wasConfirmed = !!done.video_url;
  const notes = byOwner ? [emails.guestCancelled(done)] : [emails.ownerCancelled(done, 'guest')];
  if (wasConfirmed) notes.push(byOwner ? emails.ownerCancelled(done, 'owner') : emails.guestCancelled(done));
  await deliver(notes);
  return send(res, 200, 'Cancelled', `<h1>Cancelled</h1>${facts(done, byOwner)}<p>${byOwner ? `${e(done.name)} has been told.` : 'Melanie has been told. You can book another time on <a href="/#contact">melaniesigrid.com</a>.'}</p>`);
};
