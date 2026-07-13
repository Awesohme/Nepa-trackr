import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { days = 7, start, end, baseline } = req.query;
  const includeBaseline = baseline === '1';

  if (start && end) {
    const result = await db.execute({
      sql: `SELECT * FROM power_events
            WHERE datetime(started_at) >= datetime(?) AND datetime(started_at) <= datetime(?)
            ORDER BY started_at DESC`,
      args: [start, end],
    });
    if (!includeBaseline) return res.status(200).json(result.rows);

    const prior = await db.execute({
      sql: `SELECT * FROM power_events
            WHERE datetime(started_at) < datetime(?)
            ORDER BY datetime(started_at) DESC LIMIT 1`,
      args: [start],
    });
    return res.status(200).json([...result.rows, ...prior.rows]);
  }

  const result = await db.execute({
    sql: `SELECT * FROM power_events
          WHERE datetime(started_at) >= datetime('now', ? || ' days')
          ORDER BY started_at DESC`,
    args: [`-${days}`],
  });

  if (!includeBaseline) return res.status(200).json(result.rows);

  const prior = await db.execute({
    sql: `SELECT * FROM power_events
          WHERE datetime(started_at) < datetime('now', ? || ' days')
          ORDER BY datetime(started_at) DESC LIMIT 1`,
    args: [`-${days}`],
  });

  return res.status(200).json([...result.rows, ...prior.rows]);
}
