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
            VALUES (?, datetime('now'), ?)`,
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
            SET ended_at = datetime('now'),
                duration_minutes = ROUND((julianday(datetime('now')) - julianday(?)) * 1440)
            WHERE id = ?`,
      args: [started_at, id],
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
