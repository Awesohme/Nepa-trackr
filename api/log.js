import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, notes } = req.body;

  if (action === 'open') {
    const { status } = req.body;
    await db.execute({
      sql: `INSERT INTO power_events (status, started_at, notes)
            VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?)`,
      args: [status, notes || null],
    });
    return res.status(200).json({ ok: true });
  }

  if (action === 'close') {
    const open = await db.execute(
      `SELECT id, started_at FROM power_events
       WHERE ended_at IS NULL
       ORDER BY started_at DESC LIMIT 1`
    );
    if (open.rows.length === 0) return res.status(400).json({ error: 'No open event' });

    const { id, started_at } = open.rows[0];
    await db.execute({
      sql: `UPDATE power_events
            SET ended_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                duration_minutes = ROUND((julianday('now') - julianday(?)) * 1440)
            WHERE id = ?`,
      args: [started_at, id],
    });
    return res.status(200).json({ ok: true });
  }

  // Atomic close-then-open: closes the current open event (if any) and opens a new one
  // with the opposite (or given) status in a SINGLE transaction, so a partial failure
  // can never leave a closed event with no successor (the orphaned-close bug that froze
  // a finished duration on what should be the live, ongoing entry).
  if (action === 'toggle') {
    const open = await db.execute(
      `SELECT id, status, started_at FROM power_events
       WHERE ended_at IS NULL
       ORDER BY started_at DESC LIMIT 1`
    );

    const current = open.rows[0] || null;
    // Next status: explicit override if provided, else flip the open one, else default 'on'.
    const next = req.body.status || (current ? (current.status === 'on' ? 'off' : 'on') : 'on');

    const stmts = [];
    if (current) {
      stmts.push({
        sql: `UPDATE power_events
              SET ended_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                  duration_minutes = ROUND((julianday('now') - julianday(?)) * 1440)
              WHERE id = ?`,
        args: [current.started_at, current.id],
      });
    }
    stmts.push({
      sql: `INSERT INTO power_events (status, started_at, notes)
            VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?)`,
      args: [next, notes || null],
    });

    await db.batch(stmts, 'write');
    return res.status(200).json({ ok: true, status: next });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
