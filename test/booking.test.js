// The whole flow against an in-memory store and a fake sender:
// request → Melanie's email → Accept / Decline / Cancel → invites.  `npm test`
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.BOOKING_SECRET = 'test-secret-test-secret-test-secret-0123';
process.env.CRON_SECRET = 'cron-test';
process.env.OWNER_EMAIL = 'owner@example.com';

const db = require('../api/_db');
const mail = require('../api/_mail');
const { openStarts } = require('../api/_slots-core');
const { sign } = require('../api/_tokens');
const book = require('../api/book');
const slots = require('../api/slots');
const respond = require('../api/respond');
const cron = require('../api/cron');

/* ── fakes ── */
function memoryStore() {
  const rows = new Map();
  const live = (s) => s === 'pending' || s === 'confirmed';
  return {
    rows,
    async liveStarts(from, to) { return [...rows.values()].filter((r) => live(r.status) && r.start >= from && r.start <= to).map((r) => r.start); },
    async insertPending(b) {
      if ([...rows.values()].some((r) => live(r.status) && r.start === b.start)) return null;
      const r = { ...b, id: crypto.randomUUID(), status: 'pending', video_url: null, created: Date.now() };
      rows.set(r.id, r); return { ...r };
    },
    async get(id) { const r = rows.get(id); return r ? { ...r } : null; },
    async remove(id) { rows.delete(id); },
    async transition(id, from, to, video) {
      const r = rows.get(id); if (!r || !from.includes(r.status)) return null;
      r.status = to; if (video) r.video_url = video; return { ...r };
    },
    async expireStale(hours) {
      const out = [];
      for (const r of rows.values()) if (r.status === 'pending' && (r.created < Date.now() - hours * 3600e3 || r.start < Date.now())) { r.status = 'expired'; out.push({ ...r }); }
      return out;
    },
    async pending() { return [...rows.values()].filter((r) => r.status === 'pending'); },
    async purgeOld() { return 0; },
  };
}
let store, sent, failOwnerMail;
test.beforeEach(() => {
  store = memoryStore(); sent = []; failOwnerMail = false;
  db._use(store);
  mail._use(async (m) => { if (failOwnerMail && m.to === 'owner@example.com') throw new Error('down'); sent.push(m); });
});
test.after(() => { db._use(null); mail._use(null); });

function call(handler, { method = 'GET', query = {}, body = {}, headers = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {}, body: null,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(c) { this.statusCode = c; return this; },
      json(o) { this.body = o; resolve(this); return this; },
      send(s) { this.body = s; resolve(this); return this; },
    };
    Promise.resolve(handler({ method, query, body, headers: { 'x-forwarded-for': crypto.randomUUID(), ...headers } }, res));
  });
}

const firstOpen = () => openStarts(Date.now())[0];
const request = (start, extra = {}) => call(book, { method: 'POST', body: {
  start: new Date(start).toISOString(), name: 'Ana López', email: 'ana@example.com', notes: 'About the role',
  tz: 'Europe/Madrid', lang: 'es', elapsed: 9000, company_website: '', ...extra } });

/* ── tests ── */
test('slots: open times come back in the page shape, minus held ones', async () => {
  let r = await call(slots, { query: { tz: 'America/Toronto' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.ok, true);
  const all = Object.values(r.body.days).flat();
  assert.ok(all.length > 50);
  await request(firstOpen());
  r = await call(slots, { query: { tz: 'America/Toronto' } });
  assert.equal(Object.values(r.body.days).flat().length, all.length - 1);
});

test('book: holds the time, emails Melanie with Accept/Decline and the guest with Cancel', async () => {
  const t = firstOpen();
  const r = await request(t);
  assert.equal(r.statusCode, 200);
  assert.deepEqual([r.body.ok, r.body.status], [true, 'pending']);
  const [b] = [...store.rows.values()];
  assert.equal(b.status, 'pending');
  const owner = sent.find((m) => m.to === 'owner@example.com');
  const guest = sent.find((m) => m.to === 'ana@example.com');
  assert.ok(owner && guest);
  assert.equal(owner.replyTo, 'ana@example.com', 'Melanie can reply straight to the guest');
  assert.match(owner.html, /a=accept/); assert.match(owner.html, /a=decline/);
  assert.match(guest.html, /a=cancel/);
  assert.ok(!guest.html.includes(sign(b.id, 'owner')), 'the guest never sees the owner token');
  assert.ok(!owner.ics && !guest.ics, 'no invite until accepted');
});

test('book: the same time twice is refused', async () => {
  const t = firstOpen();
  assert.equal((await request(t)).statusCode, 200);
  const r = await request(t, { email: 'other@example.com' });
  assert.deepEqual([r.statusCode, r.body.error], [409, 'taken']);
});

test('book: times outside the hours are refused', async () => {
  const saturdayNoonish = openStarts(Date.now()).find(() => true) - 30 * 60e3 * 1000;   // well in the past
  assert.deepEqual((await request(saturdayNoonish)).body.error, 'time');
  assert.deepEqual((await request(firstOpen() + 60e3)).body.error, 'time', 'not on the half hour');
});

test('book: if Melanie cannot be emailed, the hold is undone', async () => {
  failOwnerMail = true;
  const r = await request(firstOpen());
  assert.equal(r.statusCode, 502);
  assert.equal(store.rows.size, 0);
});

test('book: bots get a quiet 200 and nothing is stored', async () => {
  const r = await request(firstOpen(), { company_website: 'spam.example' });
  assert.equal(r.statusCode, 200);
  assert.equal(store.rows.size, 0);
  assert.equal(sent.length, 0);
});

test('respond: opening the link changes nothing; pressing the button accepts once', async () => {
  await request(firstOpen());
  const [b] = [...store.rows.values()];
  const q = { b: b.id, t: sign(b.id, 'owner'), a: 'accept' };
  sent = [];

  const page = await call(respond, { query: q });
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /<form method="post"/);
  assert.equal(store.rows.get(b.id).status, 'pending', 'a mail scanner opening the link does not accept');

  const done = await call(respond, { method: 'POST', body: q });
  assert.match(done.body, /Accepted/);
  const row = store.rows.get(b.id);
  assert.equal(row.status, 'confirmed');
  assert.match(row.video_url, /^https:\/\/meet\.jit\.si\//);
  const toGuest = sent.find((m) => m.to === 'ana@example.com');
  const toOwner = sent.find((m) => m.to === 'owner@example.com');
  assert.match(toGuest.ics, /METHOD:REQUEST/); assert.match(toOwner.ics, /METHOD:REQUEST/);
  assert.ok(toGuest.ics.includes(row.video_url.slice(0, 60)));
  assert.match(toGuest.html, /a=cancel/, 'confirmed email still lets the guest cancel');

  sent = [];
  const again = await call(respond, { method: 'POST', body: q });
  assert.match(again.body, /already confirmed/);
  assert.equal(sent.length, 0, 'pressing twice sends nothing more');
});

test('respond: a guest token cannot accept, a bad token gets a 404', async () => {
  await request(firstOpen());
  const [b] = [...store.rows.values()];
  let r = await call(respond, { method: 'POST', body: { b: b.id, t: sign(b.id, 'guest'), a: 'accept' } });
  assert.equal(r.statusCode, 404);
  r = await call(respond, { query: { b: b.id, t: 'nope', a: 'decline' } });
  assert.equal(r.statusCode, 404);
  assert.equal(store.rows.get(b.id).status, 'pending');
});

test('respond: decline frees the time and tells the guest', async () => {
  const t = firstOpen();
  await request(t);
  const [b] = [...store.rows.values()];
  sent = [];
  await call(respond, { method: 'POST', body: { b: b.id, t: sign(b.id, 'owner'), a: 'decline' } });
  assert.equal(store.rows.get(b.id).status, 'declined');
  assert.ok(sent.some((m) => m.to === 'ana@example.com' && /another time/i.test(m.html)));
  assert.equal((await request(t, { email: 'next@example.com' })).statusCode, 200, 'the time is open again');
});

test('respond: guest cancels a confirmed call, both calendars get a CANCEL', async () => {
  await request(firstOpen());
  const [b] = [...store.rows.values()];
  await call(respond, { method: 'POST', body: { b: b.id, t: sign(b.id, 'owner'), a: 'accept' } });
  sent = [];
  await call(respond, { method: 'POST', body: { b: b.id, t: sign(b.id, 'guest'), a: 'cancel' } });
  assert.equal(store.rows.get(b.id).status, 'cancelled');
  assert.equal(sent.length, 2);
  for (const m of sent) assert.match(m.ics, /METHOD:CANCEL/);
});

test('cron: needs the secret, expires stale requests, sends Melanie a digest', async () => {
  assert.equal((await call(cron)).statusCode, 401);
  await request(firstOpen());
  const [b] = [...store.rows.values()];
  store.rows.get(b.id).created = Date.now() - 49 * 3600e3;
  sent = [];
  const r = await call(cron, { headers: { authorization: 'Bearer cron-test' } });
  assert.deepEqual([r.statusCode, r.body.expired], [200, 1]);
  assert.equal(store.rows.get(b.id).status, 'expired');
  assert.ok(sent.some((m) => m.to === 'ana@example.com'));
  assert.ok(sent.some((m) => m.to === 'owner@example.com' && /Expired/.test(m.subject)));
});
