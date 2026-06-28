import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetch('/api/entries?days=7')
      .then(r => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse text-zinc-500 text-sm text-center py-8">Loading...</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center py-8">
        No entries yet. Start logging with the toggle above.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">History</h2>
      <div className="space-y-1">
        {entries.map(e => (
          <div
            key={e.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50 text-sm"
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                e.status === 'on' ? 'bg-amber-500' : 'bg-red-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-zinc-200 font-medium">
                {e.status === 'on' ? 'Power On' : 'Power Off'}
              </div>
              <div className="text-zinc-500 text-xs font-mono">
                {formatTime(e.started_at)}
              </div>
            </div>
            <div className="text-zinc-400 text-xs font-mono whitespace-nowrap">
              {formatDuration(e.duration_minutes)}
            </div>
            {e.notes && (
              <div className="text-zinc-500 text-xs italic max-w-[120px] truncate">
                {e.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
