import { useState, useEffect } from 'react';
import TimeRangeFilter from './TimeRangeFilter';

function getHourBlock(status) {
  if (status === 'on') return 'bg-emerald-600';
  if (status === 'off') return 'bg-rose-700';
  return 'bg-zinc-800';
}

export default function TimelineView() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [customRange, setCustomRange] = useState(null);

  function buildUrl() {
    if (customRange) {
      return `/api/entries?start=${encodeURIComponent(customRange.start)}&end=${encodeURIComponent(customRange.end)}`;
    }
    return `/api/entries?days=${days}`;
  }

  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then(r => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [days, customRange]);

  const today = new Date();
  const dayLabels = [];
  const numDays = customRange
    ? Math.ceil((new Date(customRange.end) - new Date(customRange.start)) / (1000 * 60 * 60 * 24)) + 1
    : days;

  for (let i = numDays - 1; i >= 0; i--) {
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

  function handlePreset(d) {
    setDays(d);
    setCustomRange(null);
  }

  function handleCustom(start, end) {
    setCustomRange({ start, end });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Timeline</h2>
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

      {loading ? (
        <div className="animate-pulse text-zinc-500 text-sm text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-0.5 mb-1">
            <div className="w-16 shrink-0" />
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
                      className={`flex-1 h-5 rounded-sm ${getHourBlock(status)}`}
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
          <div className="w-3 h-3 rounded-sm bg-emerald-600" /> On
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-700" /> Off
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-800" /> Unknown
        </div>
      </div>
    </div>
  );
}
