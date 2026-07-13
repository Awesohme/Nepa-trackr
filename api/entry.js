import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'POST') {
    const { started_at, ended_at, status, notes } = req.body;
    const start = new Date(started_at);
    const end = ended_at ? new Date(ended_at) : null;
    if (!started_at || !['on', 'off', 'unknown'].includes(status) || Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Missing started_at or status' });
    }
    if (end && (Number.isNaN(end.getTime()) || end < start)) {
      return res.status(400).json({ error: 'End time must be after the start time' });
    }
    if (status === 'unknown' && !ended_at) {
      return res.status(400).json({ error: 'Unknown entries require an end time' });
    }

    const duration_minutes = started_at && ended_at
      ? Math.round((new Date(ended_at) - new Date(started_at)) / 60000)
      : null;

    // A manual record without an end time is the new active state. Close the
    // preceding active interval at its start time before inserting it, matching
    // the quick-toggle's close-then-open behavior.
    if (!ended_at) {
      const open = await db.execute({
        sql: `SELECT id, started_at FROM power_events
              WHERE ended_at IS NULL
              ORDER BY started_at DESC LIMIT 1`,
      });
      const current = open.rows[0] || null;

      // Do not create overlapping active states when backfilling an entry. A
      // historical correction needs an explicit end time instead.
      if (current && new Date(current.started_at) > start) {
        return res.status(409).json({
          error: 'Add an end time when logging before the current active entry',
        });
      }

      const statements = [];
      if (current) {
        statements.push({
          sql: `UPDATE power_events
                SET ended_at = ?,
                    duration_minutes = ROUND((julianday(?) - julianday(started_at)) * 1440)
                WHERE id = ?`,
          args: [started_at, started_at, current.id],
        });
      }
      statements.push({
        sql: `INSERT INTO power_events (status, started_at, ended_at, duration_minutes, notes)
              VALUES (?, ?, NULL, NULL, ?)`,
        args: [status, started_at, notes || null],
      });
      await db.batch(statements, 'write');
    } else {
      // A bounded manual record is historical-only and must not change the
      // current active state.
      await db.execute({
        sql: `INSERT INTO power_events (status, started_at, ended_at, duration_minutes, notes)
              VALUES (?, ?, ?, ?, ?)`,
        args: [status, started_at, ended_at, duration_minutes, notes || null],
      });
    }

    return res.status(200).json({ ok: true });
  }

  if (method === 'PUT') {
    const { id, started_at, ended_at, status, notes } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    if (!started_at || !['on', 'off', 'unknown'].includes(status)) {
      return res.status(400).json({ error: 'Missing started_at or status' });
    }
    if (status === 'unknown' && !ended_at) {
      return res.status(400).json({ error: 'Unknown entries require an end time' });
    }

    const duration_minutes = started_at && ended_at
      ? Math.round((new Date(ended_at) - new Date(started_at)) / 60000)
      : null;

    await db.execute({
      sql: `UPDATE power_events
            SET status = ?,
                started_at = ?,
                ended_at = ?,
                duration_minutes = ?,
                notes = ?
            WHERE id = ?`,
      args: [
        status,
        started_at,
        ended_at || null,
        duration_minutes,
        notes || null,
        id,
      ],
    });

    return res.status(200).json({ ok: true });
  }

  if (method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    await db.execute({
      sql: 'DELETE FROM power_events WHERE id = ?',
      args: [id],
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
