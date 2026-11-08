/**
 * Bookings storage on Neon Postgres (DATABASE_URL).
 *
 * Handlers only call the functions exported here, so tests swap the whole
 * store for an in-memory one with `_use(fake)`.
 *
 * The rule that two people can never hold the same time lives in the
 * database: a unique index on start_at over the live statuses. Two clicks on
 * the same slot at the same moment cannot both insert.
 */

const LIVE = ['pending', 'confirmed'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let sqlFn = null;
function sql() {
  if (!sqlFn) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    const { neon } = require('@neondatabase/serverless');
    sqlFn = neon(process.env.DATABASE_URL);
  }
  return sqlFn;
}

let ready = null;
function ensure() {
  if (!ready) {
    ready = (async () => {
      const q = sql();
      await q`CREATE TABLE IF NOT EXISTS bookings (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        start_at         timestamptz NOT NULL,
        end_at           timestamptz NOT NULL,
        status           text NOT NULL CHECK (status IN ('pending','confirmed','declined','expired','cancelled')),
        name             text NOT NULL,
        email            text NOT NULL,
        notes            text NOT NULL DEFAULT '',
        guest_tz         text NOT NULL,
        lang             text NOT NULL DEFAULT 'en',
        video_url        text,
        created_at       timestamptz NOT NULL DEFAULT now(),
        decided_at       timestamptz
      )`;
      await q`CREATE UNIQUE INDEX IF NOT EXISTS bookings_live_start
              ON bookings (start_at) WHERE status IN ('pending','confirmed')`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

function row(r) {
  if (!r) return null;
  return { ...r, start: new Date(r.start_at).getTime(), end: new Date(r.end_at).getTime(), created: new Date(r.created_at).getTime() };
}

const neonStore = {
  /** Starts (epoch ms) currently held, between two instants. */
  async liveStarts(from, to) {
    await ensure();
    const rows = await sql()`SELECT start_at FROM bookings
      WHERE status IN ('pending','confirmed')
        AND start_at >= ${new Date(from).toISOString()} AND start_at <= ${new Date(to).toISOString()}`;
    return rows.map((r) => new Date(r.start_at).getTime());
  },

  /** Insert a pending request. Returns its row, or null if the time is already held. */
  async insertPending(b) {
    await ensure();
    try {
      const rows = await sql()`INSERT INTO bookings
        (start_at, end_at, status, name, email, notes, guest_tz, lang)
        VALUES (${new Date(b.start).toISOString()}, ${new Date(b.end).toISOString()}, 'pending',
                ${b.name}, ${b.email}, ${b.notes}, ${b.guest_tz}, ${b.lang})
        RETURNING *`;
      return row(rows[0]);
    } catch (e) {
      if (e && e.code === '23505') return null;   // unique_violation: someone holds this time
      throw e;
    }
  },

  async get(id) {
    if (!UUID.test(String(id || ''))) return null;
    await ensure();
    const rows = await sql()`SELECT * FROM bookings WHERE id = ${id}`;
    return row(rows[0]);
  },

  async remove(id) {
    await ensure();
    await sql()`DELETE FROM bookings WHERE id = ${id}`;
  },

  /**
   * Move a booking from one of `from` to `to`, atomically. Returns the
   * updated row, or null if it was no longer in one of `from` (someone or
   * something got there first).
   */
  async transition(id, from, to, videoUrl = null) {
    if (!UUID.test(String(id || ''))) return null;
    await ensure();
    const rows = await sql()`UPDATE bookings
      SET status = ${to}, decided_at = now(), video_url = COALESCE(${videoUrl}, video_url)
      WHERE id = ${id} AND status = ANY(${from})
      RETURNING *`;
    return row(rows[0]);
  },

  /** Expire requests left unanswered too long, or whose time has come. */
  async expireStale(pendingHours) {
    await ensure();
    const cutoff = new Date(Date.now() - pendingHours * 3600e3).toISOString();
    const rows = await sql()`UPDATE bookings SET status = 'expired', decided_at = now()
      WHERE status = 'pending' AND (created_at < ${cutoff} OR start_at < now())
      RETURNING *`;
    return rows.map(row);
  },

  async pending() {
    await ensure();
    const rows = await sql()`SELECT * FROM bookings WHERE status = 'pending' ORDER BY start_at`;
    return rows.map(row);
  },

  /** Forget meetings 90 days after they happened. */
  async purgeOld() {
    await ensure();
    const rows = await sql()`DELETE FROM bookings WHERE start_at < now() - interval '90 days' RETURNING id`;
    return rows.length;
  },
};

let store = neonStore;
const api = {};
for (const k of Object.keys(neonStore)) api[k] = (...args) => store[k](...args);
api._use = (fake) => { store = fake || neonStore; };
api.LIVE = LIVE;
module.exports = api;
