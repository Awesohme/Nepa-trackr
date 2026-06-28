import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { days = 7 } = req.query;

  const result = await db.execute({
    sql: `SELECT * FROM power_events
          WHERE started_at >= datetime('now', ? || ' days')
          ORDER BY started_at DESC`,
    args: [`-${days}`],
  });

  return res.status(200).json(result.rows);
}
