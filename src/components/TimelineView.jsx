import { useState, useEffect } from 'react';

function getHourBlock(status, hour) {
  if (status === 'on') return 'bg-amber-500';
  if (status === 'off') return 'bg-zinc-700';
  return 'bg-zinc-800';
}

export default function TimelineView() {
  const [days, setDays] = useState(7);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/entries?days=${days}`)
      .then(r => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [days]);

  const today = new Date();
  const dayLabels = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayLabels.push(d);
  }

  function getStatusForHour(date, hour) {
    const startOfHour = new Date(date);
    startOfHour.setHours(hour, 0, 0, 0);
    const endOfHour = new Date(date);
    endOfHour.setHours(hour, 59, 59, 999);

    const event = entries.find(e => {
      const eventStart = new Date(e.started_at);
      const eventEnd = e.ended_at ? new Date(e.ended_at) : new Date();
      return eventStart <= endOfHour && eventEnd >= startOfHour;
    });

    return event ? event.status : null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Timeline</h2>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 border border-zinc-700"
        >
          <option value={1}>1 day</option>
          <option value={3}>3 days</option>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse text-zinc-500 text-sm text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-0.5 mb-1">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 text-[8px] text-zinc-600 text-center font-mono">
                {String(i).padStart(2, '0')}
              </div>
            ))}
          </div>
          {dayLabels.map(date => (
            <div key={date.toISOString()} className="flex items-center gap-2">
              <div className="w-16 text-[10px] text-zinc-500 shrink-0 font-mono">
                {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const status = getStatusForHour(date, hour);
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-5 rounded-sm ${getHourBlock(status, hour)}`}
                      title={`${date.toLocaleDateString()} ${String(hour).padStart(2, '0')}:00 - ${status || 'unknown'}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" /> On
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-700" /> Off
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-800" /> Unknown
        </div>
      </div>
    </div>
  );
}
