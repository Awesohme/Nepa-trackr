import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const result = await db.execute(`SELECT id, analysed_at, model, provider,
      data_window_days, event_count, result_type, analysis_summary, analysis_content
      FROM analysis_runs
      ORDER BY analysed_at DESC
      LIMIT 20`);
    return res.status(200).json(result.rows);
  } catch (error) {
    // The table is created the first time an analysis is run.
    if (/no such table/i.test(error.message)) return res.status(200).json([]);
    console.error('Analysis log could not be read.', error.message);
    return res.status(500).json({ error: 'Unable to load analysis history' });
  }
}
