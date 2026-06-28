import { createClient } from '@libsql/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const result = await db.execute(
    `SELECT status, started_at, ended_at, duration_minutes, notes
     FROM power_events
     WHERE started_at >= datetime('now', '-30 days')
     ORDER BY started_at ASC`
  );

  const events = result.rows;
  if (events.length < 5) {
    return res.status(200).json({
      summary: 'Not enough data yet. Log at least a week of events before running analysis.'
    });
  }

  const onEvents  = events.filter(e => e.status === 'on'  && e.duration_minutes);
  const offEvents = events.filter(e => e.status === 'off' && e.duration_minutes);
  const totalOnMins  = onEvents.reduce((s, e)  => s + e.duration_minutes, 0);
  const totalOffMins = offEvents.reduce((s, e) => s + e.duration_minutes, 0);

  const prompt = `
You are analysing electricity supply data for a home on Igbe Road, Ikorodu, Lagos, Nigeria.
The home is served by IKEDC (Ikeja Electric) and is classified as Band C (entitled to 12-16 hours/day).

Here is the raw power event log for the last 30 days (status = 'on' means power was present, 'off' means outage):

${JSON.stringify(events, null, 2)}

Quick stats:
- Total ON time: ${Math.round(totalOnMins / 60)} hours over the period
- Total OFF time: ${Math.round(totalOffMins / 60)} hours over the period
- Number of supply events: ${onEvents.length}
- Number of outage events: ${offEvents.length}
- Average ON duration: ${onEvents.length ? Math.round(totalOnMins / onEvents.length) : 0} minutes
- Average OFF duration: ${offEvents.length ? Math.round(totalOffMins / offEvents.length) : 0} minutes

Respond ONLY with a valid JSON object, no markdown, no backticks, no preamble. Use these exact keys:

{
  "headline": "One sentence summary of the situation",
  "average_daily_hours": number,
  "entitlement_gap_hours": number,
  "worst_day_of_week": "e.g. Monday",
  "best_day_of_week": "e.g. Friday",
  "likely_pattern": "Describe any rotation cycle detected, e.g. 1-day on / 1-day off",
  "peak_outage_hours": "Time range when outages most commonly start, e.g. 06:00-09:00",
  "anomalies": ["List any unusual events or gaps"],
  "letter_talking_points": [
    "3-5 specific, data-backed points suitable for a formal complaint to Ikorodu LGA or NERC"
  ],
  "recommendation": "One actionable next step for the resident"
}
`;

  const geminiResult = await model.generateContent(prompt);
  const raw = geminiResult.response.text().trim();

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return res.status(200).json(parsed);
  } catch {
    return res.status(200).json({ raw: cleaned });
  }
}
