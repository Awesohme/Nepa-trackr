import { useEffect, useState } from 'react';

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

function AnalysisContent({ analysis, compact = false }) {
  if (!analysis || typeof analysis !== 'object') return null;

  return (
    <div className={compact ? 'space-y-3 pt-3' : 'space-y-3'}>
      {analysis.summary && (
        <div className="glass-card px-4 py-6 text-center">
          <p className="text-secondary text-sm">{analysis.summary}</p>
        </div>
      )}

      {analysis.headline && (
        <>
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
                {analysis.anomalies.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </InfoCard>
          )}
          {analysis.letter_talking_points?.length > 0 && (
            <InfoCard label="Letter Talking Points">
              <ul className="space-y-2">
                {analysis.letter_talking_points.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
            </InfoCard>
          )}
          <InfoCard label="Recommendation">{analysis.recommendation}</InfoCard>
        </>
      )}
    </div>
  );
}

export default function AnalysisPanel() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [openHistoryId, setOpenHistoryId] = useState(null);

  async function loadHistory() {
    try {
      const res = await fetch('/api/analysis-log');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setHistory(data);
    } catch {
      // History is supplementary; never prevent a new analysis from running.
    }
  }

  useEffect(() => { loadHistory(); }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyse', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Analysis request failed (${res.status})`);
      if (!data || typeof data !== 'object') throw new Error('Analysis returned an invalid response');
      setAnalysis(data);
      loadHistory();
    } catch (caughtError) {
      setError('Failed to run analysis. Please try again shortly.');
      console.error(caughtError);
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

      {error && <div className="badge badge-off w-full justify-start px-4 py-3 rounded-xl text-sm">{error}</div>}
      {analysis && <AnalysisContent analysis={analysis} />}
      {analysis?.headline && analysis.letter_talking_points?.length > 0 && (
        <button onClick={copyPoints} className="mt-3 text-xs font-medium transition-colors" style={{ color: 'var(--accent)' }}>
          {copied ? 'Copied ✓' : 'Copy talking points'}
        </button>
      )}
      {!analysis && !loading && !error && (
        <div className="glass-card text-muted text-sm text-center py-10">
          Tap “Run Analysis” to get an AI-powered view of your power data.
        </div>
      )}

      <section className="pt-6 mt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Analysis history</h3>
        {history.length ? (
          <div className="space-y-2">
            {history.map(run => {
              let savedAnalysis = null;
              try { savedAnalysis = run.analysis_content ? JSON.parse(run.analysis_content) : null; } catch { /* Legacy or malformed record. */ }
              const isOpen = openHistoryId === run.id;
              return (
                <div key={run.id} className="glass-card px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-primary">{run.model}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(run.analysed_at).toLocaleString('en-GB', {
                          dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
                        })} WAT
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted">{run.result_type}</span>
                  </div>
                  <p className="text-xs text-secondary mt-2">
                    {run.provider} · Last {run.data_window_days} days · {run.event_count} event{run.event_count === 1 ? '' : 's'} analysed
                  </p>
                  {savedAnalysis ? (
                    <>
                      <button onClick={() => setOpenHistoryId(isOpen ? null : run.id)} className="mt-3 text-xs font-medium transition-colors" style={{ color: 'var(--accent)' }}>
                        {isOpen ? 'Hide analysis' : 'View analysis'}
                      </button>
                      {isOpen && <AnalysisContent analysis={savedAnalysis} compact />}
                    </>
                  ) : run.analysis_summary ? (
                    <p className="text-sm text-secondary mt-3">{run.analysis_summary}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="glass-card px-4 py-5 text-sm text-muted text-center">No analyses have been recorded yet.</p>
        )}
      </section>
    </div>
  );
}
