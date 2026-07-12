import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_BAND_C_HOURS = 12;

async function runOpenRouterAnalysis(prompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured');
  }

  let lastError;
  // The free router picks from several providers. A provider can occasionally
  // return an empty completion, so try another eligible free model before
  // falling back to the deterministic report.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost',
          'X-Title': 'NEPA Trackr',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error(`OpenRouter request failed (${response.status})`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return { content: content.trim(), model: data.model || 'openrouter/free' };
      }
      throw new Error('OpenRouter returned no analysis content');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function parseAnalysisResponse(raw) {
  const withoutFences = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  const json = start >= 0 && end > start
    ? withoutFences.slice(start, end + 1)
    : withoutFences;

  try {
    return JSON.parse(json);
  } catch {
    // Some free models occasionally omit quotes around one or more JSON keys.
    // Repair only those predictable formatting errors before giving up to the
    // deterministic local analysis fallback.
    const repaired = json
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(repaired);
  }
}

function eventMinutes(event) {
  const stored = Number(event.duration_minutes);
  if (Number.isFinite(stored) && stored >= 0) return stored;

  const start = new Date(event.started_at).getTime();
  const end = event.ended_at ? new Date(event.ended_at).getTime() : Date.now();
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.round((end - start) / 60000))
    : 0;
}

function localAnalysis(events) {
  const datedEvents = events.filter(event => Number.isFinite(new Date(event.started_at).getTime()));
  const onEvents = datedEvents.filter(event => event.status === 'on');
  const offEvents = datedEvents.filter(event => event.status === 'off');
  const totalOnMinutes = onEvents.reduce((sum, event) => sum + eventMinutes(event), 0);
  const totalOffMinutes = offEvents.reduce((sum, event) => sum + eventMinutes(event), 0);
  const timestamps = datedEvents.map(event => new Date(event.started_at).getTime());
  const observedDays = Math.max(1, Math.ceil((Math.max(...timestamps) - Math.min(...timestamps)) / DAY_MS) || 1);
  const averageDailyHours = Number((totalOnMinutes / 60 / observedDays).toFixed(1));
  const entitlementGapHours = Number(Math.max(0, MIN_BAND_C_HOURS - averageDailyHours).toFixed(1));

  const supplyByWeekday = new Map();
  onEvents.forEach(event => {
    const day = new Date(event.started_at).toLocaleDateString('en-US', {
      weekday: 'long', timeZone: 'Africa/Lagos',
    });
    supplyByWeekday.set(day, (supplyByWeekday.get(day) || 0) + eventMinutes(event));
  });
  const rankedDays = [...supplyByWeekday.entries()].sort((a, b) => a[1] - b[1]);

  const outageHours = new Map();
  offEvents.forEach(event => {
    const hour = new Date(event.started_at).toLocaleTimeString('en-GB', {
      hour: '2-digit', hour12: false, timeZone: 'Africa/Lagos',
    });
    outageHours.set(hour, (outageHours.get(hour) || 0) + 1);
  });
  const peakHour = [...outageHours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const briefRestorations = onEvents.filter(event => eventMinutes(event) > 0 && eventMinutes(event) < 60);
  const longOutages = offEvents.filter(event => eventMinutes(event) >= MIN_BAND_C_HOURS * 60);
  const anomalies = [];
  if (briefRestorations.length) anomalies.push(`${briefRestorations.length} supply period${briefRestorations.length === 1 ? '' : 's'} lasted under one hour.`);
  if (longOutages.length) anomalies.push(`${longOutages.length} outage${longOutages.length === 1 ? '' : 's'} lasted 12 hours or more.`);
  if (!anomalies.length) anomalies.push('No unusually short supply periods or 12-hour outages were found in the recorded data.');

  const averageOffHours = Number((totalOffMinutes / 60 / observedDays).toFixed(1));
  return {
    summary: 'The AI service is temporarily unavailable, so these results were calculated directly from your recorded power data.',
    headline: `Recorded supply averages ${averageDailyHours} hours per day across the observed period.`,
    average_daily_hours: averageDailyHours,
    entitlement_gap_hours: entitlementGapHours,
    worst_day_of_week: rankedDays[0]?.[0] || 'Not enough data',
    best_day_of_week: rankedDays.at(-1)?.[0] || 'Not enough data',
    likely_pattern: `The log shows an average of ${averageDailyHours}h of supply and ${averageOffHours}h of outage time per observed day.`,
    peak_outage_hours: peakHour ? `${peakHour}:00–${peakHour}:59` : 'Not enough data',
    anomalies,
    letter_talking_points: [
      `Recorded electricity supply averaged ${averageDailyHours} hours per day over ${observedDays} observed day${observedDays === 1 ? '' : 's'}.`,
      entitlementGapHours > 0
        ? `This is ${entitlementGapHours} hours below the 12-hour daily minimum expected for Band C customers.`
        : 'The recorded average meets the 12-hour Band C minimum, but individual outages should still be reviewed.',
      peakHour ? `Outages most often began during the ${peakHour}:00 hour.` : 'The log does not yet show a consistent outage start time.',
    ],
    recommendation: 'Continue logging every status change and include this exported summary with any complaint to IKEDC or NERC.',
  };
}

async function recordAnalysis({ model, provider, eventCount, resultType, summary, content }) {
  await db.execute(`CREATE TABLE IF NOT EXISTS analysis_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    data_window_days INTEGER NOT NULL,
    event_count INTEGER NOT NULL,
    result_type TEXT NOT NULL,
    analysis_summary TEXT,
    analysis_content TEXT
  )`);

  // Existing installations created the original metadata-only table. Preserve
  // those rows while adding the full result column for subsequent analyses.
  try {
    await db.execute('ALTER TABLE analysis_runs ADD COLUMN analysis_content TEXT');
  } catch (error) {
    if (!/duplicate column name/i.test(error.message)) throw error;
  }

  await db.execute({
    sql: `INSERT INTO analysis_runs
          (model, provider, data_window_days, event_count, result_type, analysis_summary, analysis_content)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [model, provider, 30, eventCount, resultType, summary || null, JSON.stringify(content)],
  });
}

async function finishAnalysis(res, payload, logDetails) {
  try {
    await recordAnalysis({
      ...logDetails,
      summary: payload.summary || payload.headline,
      content: payload,
    });
  } catch (error) {
    // The analysis itself remains available if its audit record cannot be saved.
    console.error('Analysis log could not be saved.', error.message);
  }
  return res.status(200).json(payload);
}

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
    return finishAnalysis(res, {
      summary: 'Not enough data yet. Log at least a week of events before running analysis.'
    }, {
      model: 'No model used',
      provider: 'NEPA Trackr',
      eventCount: events.length,
      resultType: 'insufficient-data',
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

  try {
    const { content, model } = await runOpenRouterAnalysis(prompt);
    const parsed = parseAnalysisResponse(content);
    return finishAnalysis(res, parsed, {
      model,
      provider: 'OpenRouter',
      eventCount: events.length,
      resultType: 'ai',
    });
  } catch (error) {
    console.error('AI analysis unavailable; using local analysis.', error.message);
    const fallback = localAnalysis(events);
    return finishAnalysis(res, fallback, {
      model: 'Deterministic local analysis',
      provider: 'NEPA Trackr',
      eventCount: events.length,
      resultType: 'fallback',
    });
  }
}
