import { useState } from 'react';

export default function AnalysisPanel() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyse', { method: 'POST' });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      setError('Failed to run analysis. Check console.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Analysis</h2>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm font-semibold px-5 py-2 rounded-xl hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50"
        >
          {loading ? 'Analysing...' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {analysis && analysis.summary && (
        <div className="bg-zinc-800/50 rounded-xl px-4 py-6 text-center">
          <p className="text-zinc-400 text-sm">{analysis.summary}</p>
        </div>
      )}

      {analysis && analysis.headline && (
        <div className="space-y-4">
          <div className="bg-zinc-800/50 rounded-xl px-4 py-4">
            <p className="text-zinc-100 font-semibold text-lg">{analysis.headline}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
              <div className="text-zinc-500 text-xs uppercase tracking-wider">Avg Daily</div>
              <div className="text-zinc-100 text-xl font-bold">{analysis.average_daily_hours}h</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3 border border-red-900/50">
              <div className="text-zinc-500 text-xs uppercase tracking-wider">Entitlement Gap</div>
              <div className="text-red-400 text-xl font-bold">{analysis.entitlement_gap_hours}h</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
              <div className="text-zinc-500 text-xs uppercase tracking-wider">Worst Day</div>
              <div className="text-zinc-100 font-semibold">{analysis.worst_day_of_week}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
              <div className="text-zinc-500 text-xs uppercase tracking-wider">Best Day</div>
              <div className="text-zinc-100 font-semibold">{analysis.best_day_of_week}</div>
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Pattern</div>
            <p className="text-zinc-200 text-sm">{analysis.likely_pattern}</p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Peak Outage Hours</div>
            <p className="text-zinc-200 text-sm">{analysis.peak_outage_hours}</p>
          </div>

          {analysis.anomalies?.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
              <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Anomalies</div>
              <ul className="list-disc list-inside text-zinc-200 text-sm space-y-1">
                {analysis.anomalies.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.letter_talking_points?.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl px-4 py-3 border border-amber-900/30">
              <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">
                Letter Talking Points
              </div>
              <ul className="space-y-2">
                {analysis.letter_talking_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-200">
                    <span className="text-amber-500 shrink-0">→</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  const text = analysis.letter_talking_points.join('\n\n');
                  navigator.clipboard.writeText(text);
                }}
                className="mt-3 text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                Copy talking points
              </button>
            </div>
          )}

          <div className="bg-zinc-800/50 rounded-xl px-4 py-3">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Recommendation</div>
            <p className="text-zinc-200 text-sm">{analysis.recommendation}</p>
          </div>
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="text-zinc-500 text-sm text-center py-8">
          Tap "Run Analysis" to get Gemini's take on your power data.
        </div>
      )}
    </div>
  );
}
