import { useState } from 'react';

function StatCard({ label, value, danger }) {
  return (
    <div className="glass-card px-4 py-3">
      <div className="text-faint text-[10px] uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold ${danger ? 'text-rose-500' : 'text-primary'}`}>{value}</div>
    </div>
  );
}

function InfoCard({ label, children }) {
  return (
    <div className="glass-card px-4 py-3">
      <div className="text-faint text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-secondary text-sm">{children}</div>
    </div>
  );
}

export default function AnalysisPanel() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  function copyPoints() {
    const text = analysis.letter_talking_points.join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Analysis</h2>
        <button onClick={runAnalysis} disabled={loading} className="btn-accent px-5 py-2 text-sm">
          {loading ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="badge badge-off w-full justify-start px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {analysis?.summary && (
        <div className="glass-card px-4 py-6 text-center">
          <p className="text-secondary text-sm">{analysis.summary}</p>
        </div>
      )}

      {analysis?.headline && (
        <div className="space-y-3">
          <div className="glass-card px-4 py-4">
            <p className="text-primary font-semibold text-lg">{analysis.headline}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Avg Daily" value={`${analysis.average_daily_hours}h`} />
            <StatCard label="Entitlement Gap" value={`${analysis.entitlement_gap_hours}h`} danger />
            <StatCard label="Worst Day" value={analysis.worst_day_of_week} />
            <StatCard label="Best Day" value={analysis.best_day_of_week} />
          </div>

          <InfoCard label="Pattern">{analysis.likely_pattern}</InfoCard>
          <InfoCard label="Peak Outage Hours">{analysis.peak_outage_hours}</InfoCard>

          {analysis.anomalies?.length > 0 && (
            <InfoCard label="Anomalies">
              <ul className="list-disc list-inside space-y-1">
                {analysis.anomalies.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </InfoCard>
          )}

          {analysis.letter_talking_points?.length > 0 && (
            <div className="glass-card px-4 py-3">
              <div className="text-faint text-[10px] uppercase tracking-wider mb-2">Letter Talking Points</div>
              <ul className="space-y-2">
                {analysis.letter_talking_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-secondary">
                    <span style={{ color: 'var(--accent)' }} className="shrink-0">→</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <button onClick={copyPoints} className="mt-3 text-xs font-medium transition-colors" style={{ color: 'var(--accent)' }}>
                {copied ? 'Copied ✓' : 'Copy talking points'}
              </button>
            </div>
          )}

          <InfoCard label="Recommendation">{analysis.recommendation}</InfoCard>
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="glass-card text-muted text-sm text-center py-10">
          Tap “Run Analysis” to get Gemini's take on your power data.
        </div>
      )}
    </div>
  );
}
