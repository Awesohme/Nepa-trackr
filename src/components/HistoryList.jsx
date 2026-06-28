import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';
import EditEntryModal from './EditEntryModal';
import TimeRangeFilter from './TimeRangeFilter';
import { fmtTime, formatDuration } from '../lib/time';

const TIME_OPTS = {
  weekday: 'short', day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit',
};

export default function HistoryList() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [days, setDays] = useState(7);
  const [customRange, setCustomRange] = useState(null);

  const buildUrl = useCallback(() => {
    if (customRange) {
      return `/api/entries?start=${encodeURIComponent(customRange.start)}&end=${encodeURIComponent(customRange.end)}`;
    }
    return `/api/entries?days=${days}`;
  }, [days, customRange]);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch(buildUrl())
      .then(r => r.json())
      .then(rows => setEntries(Array.isArray(rows) ? rows : []))
      .finally(() => setLoading(false));
  }, [buildUrl]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function handlePreset(d) { setDays(d); setCustomRange(null); }
  function handleCustom(start, end) { setCustomRange({ start, end }); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/entry?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        loadEntries();
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  }

  function handleSaved() {
    setEditTarget(null);
    loadEntries();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">History</h2>
      </div>

      <div className="mb-5">
        <TimeRangeFilter
          value={customRange ? null : days}
          start={customRange?.start}
          end={customRange?.end}
          onPreset={handlePreset}
          onCustom={handleCustom}
        />
      </div>

      {loading ? (
        <div className="animate-pulse text-muted text-sm text-center py-10">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="glass-card text-muted text-sm text-center py-10">
          No entries in this range.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="glass-card flex items-center gap-3 px-3 py-2.5">
              <span className={`badge ${e.status === 'on' ? 'badge-on' : 'badge-off'} shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'on' ? 'dot-on' : 'dot-off'}`} />
                {e.status === 'on' ? 'ON' : 'OFF'}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-secondary text-xs font-mono truncate">
                  {fmtTime(e.started_at, TIME_OPTS)}
                </div>
                {e.notes && (
                  <div className="text-muted text-[11px] italic truncate">{e.notes}</div>
                )}
              </div>

              <div className="text-muted text-xs font-mono whitespace-nowrap shrink-0">
                {formatDuration(e.duration_minutes)}
              </div>

              <div className="flex items-center shrink-0">
                <button
                  onClick={() => setEditTarget(e)}
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:surface-sunken transition-colors"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteTarget(e)}
                  className="p-1.5 rounded-lg text-muted hover:text-rose-500 transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Entry"
        message={`Delete this ${deleteTarget?.status === 'on' ? 'Power On' : 'Power Off'} entry from ${deleteTarget ? fmtTime(deleteTarget.started_at, TIME_OPTS) : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <EditEntryModal
        open={!!editTarget}
        entry={editTarget}
        onSaved={handleSaved}
        onCancel={() => setEditTarget(null)}
      />
    </div>
  );
}
