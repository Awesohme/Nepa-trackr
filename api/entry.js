import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'PUT') {
    const { id, started_at, ended_at, status, notes } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });

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
