import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';
import EditEntryModal from './EditEntryModal';
import TimeRangeFilter from './TimeRangeFilter';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return 'ongoing';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [buildUrl]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function handlePreset(d) {
    setDays(d);
    setCustomRange(null);
  }

  function handleCustom(start, end) {
    setCustomRange({ start, end });
  }

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

  if (loading) {
    return (
      <div className="animate-pulse text-zinc-500 text-sm text-center py-8">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">History</h2>
      </div>

      <div className="mb-4">
        <TimeRangeFilter
          value={customRange ? null : days}
          start={customRange?.start}
          end={customRange?.end}
          onPreset={handlePreset}
          onCustom={handleCustom}
        />
      </div>

      {entries.length === 0 ? (
        <div className="text-zinc-500 text-sm text-center py-8">
          No entries in this range.
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-sm"
            >
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                e.status === 'on'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'bg-rose-700/20 text-rose-400'
              }`}>
                {e.status === 'on' ? 'ON' : 'OFF'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-zinc-300 text-xs font-mono truncate">
                  {formatTime(e.started_at)}
                </div>
              </div>
              <div className="text-zinc-400 text-xs font-mono whitespace-nowrap">
                {formatDuration(e.duration_minutes)}
              </div>
              {e.notes && (
                <div className="text-zinc-500 text-xs italic max-w-[80px] truncate hidden sm:block">
                  {e.notes}
                </div>
              )}
              <button
                onClick={() => setEditTarget(e)}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                title="Edit"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setDeleteTarget(e)}
                className="p-1.5 rounded-lg hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Entry"
        message={`Delete this ${deleteTarget?.status === 'on' ? 'Power On' : 'Power Off'} entry from ${deleteTarget ? formatTime(deleteTarget.started_at) : ''}? This cannot be undone.`}
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
