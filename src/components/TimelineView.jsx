import { useState, useEffect, useRef } from 'react';
import TimeRangeFilter from './TimeRangeFilter';
import { parseDbDate, formatDuration } from '../lib/time';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Short label for a run's length in whole hours, e.g. 6 -> "6h".
function shortHours(h) {
  return `${h}h`;
}

function cellColor(status) {
  if (status === 'on') return 'var(--c-on)';
  if (status === 'off') return 'var(--c-off)';
  return null;
}

export default function TimelineView() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [customRange, setCustomRange] = useState(null);
  const scrollRef = useRef(null);

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
      .then(rows => setEntries(Array.isArray(rows) ? rows : []))
      .finally(() => setLoading(false));
  }, [days, customRange]);

  // Snap the horizontally-scrollable grid so the current hour is centred on first render.
  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;
    const hourFrac = (new Date().getHours() + 0.5) / 24;
    const target = hourFrac * el.scrollWidth - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [loading]);

  const now = new Date();
  const today = new Date();
  const numDays = customRange
    ? Math.ceil((new Date(customRange.end) - new Date(customRange.start)) / (1000 * 60 * 60 * 24)) + 1
    : days;

  const dayLabels = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayLabels.push(d);
  }

  // Status for a given calendar hour.
  //  - Future hours stay empty.
  //  - An event whose span overlaps the hour wins (open events extend to `now`).
  //  - Otherwise carry the most recent prior event's status forward to `now`, so a gap after
  //    a closed event (e.g. a stray close) still reads as the last known state up to now,
  //    instead of a grey "unknown" hole.
  //  - Hours before the very first event remain unknown (null).
  function getStatusForHour(date, hour) {
    const startOfHour = new Date(date);
    startOfHour.setHours(hour, 0, 0, 0);
    if (startOfHour > now) return 'future';

    const endOfHour = new Date(date);
    endOfHour.setHours(hour, 59, 59, 999);

    // entries arrive ordered started_at DESC, so the first match is the most recent.
    const overlapping = entries.find(e => {
      const eventStart = parseDbDate(e.started_at);
      if (!eventStart) return false;
      const eventEnd = e.ended_at ? parseDbDate(e.ended_at) : now;
      return eventStart <= endOfHour && eventEnd >= startOfHour;
    });
    if (overlapping) return overlapping.status;

    // Carry-forward: latest event that started at or before this hour.
    const prior = entries.find(e => {
      const eventStart = parseDbDate(e.started_at);
      return eventStart && eventStart <= endOfHour;
    });
    return prior ? prior.status : null;
  }

  const isToday = d => d.toDateString() === today.toDateString();
  const currentHour = now.getHours();

  // Contiguous runs of the same on/off status across a day-row's 24 cells.
  // Returns [{ status, startHour, hours }] (null/future hours break runs).
  function getRunsForDay(date) {
    const runs = [];
    let cur = null;
    for (let h = 0; h < 24; h++) {
      const s = getStatusForHour(date, h);
      if (s === 'on' || s === 'off') {
        if (cur && cur.status === s) cur.hours += 1;
        else { cur = { status: s, startHour: h, hours: 1 }; runs.push(cur); }
      } else {
        cur = null;
      }
    }
    return runs;
  }

  // Batch summary straight from events (each event = one batch), newest first.
  const batches = entries
    .map(e => {
      const start = parseDbDate(e.started_at);
      if (!start) return null;
      const ongoing = !e.ended_at;
      const end = ongoing ? now : parseDbDate(e.ended_at);
      const minutes = e.duration_minutes ?? Math.round((end - start) / 60000);
      return { id: e.id, status: e.status, start, end, minutes, ongoing };
    })
    .filter(Boolean);

  const fmtHM = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  function handlePreset(d) { setDays(d); setCustomRange(null); }
  function handleCustom(start, end) { setCustomRange({ start, end }); }

  return (
    <div style={{ '--c-on': '#10b981', '--c-off': '#f43f5e' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Timeline</h2>
        <span className="text-[11px] text-faint font-mono">
          {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
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
      ) : (
        <div ref={scrollRef} className="glass-card p-3 overflow-x-auto scrollbar-none">
          <div className="min-w-[620px] space-y-1.5">
            {/* Hour header — all 24 labels */}
            <div className="flex gap-px mb-1">
              <div className="w-14 shrink-0" />
              {HOURS.map(h => (
                <div
                  key={h}
                  className="flex-1 text-center font-mono text-[8px]"
                  style={{
                    color: h === currentHour ? 'var(--accent)' : 'var(--text-faint)',
                    fontWeight: h === currentHour ? 700 : 400,
                  }}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>

            {dayLabels.map(date => {
              const todayRow = isToday(date);
              const runs = getRunsForDay(date);
              return (
                <div key={date.toISOString()} className="flex items-center gap-2">
                  <div
                    className="w-14 shrink-0 text-[10px] font-mono"
                    style={{ color: todayRow ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    {todayRow ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                  </div>
                  {/* relative wrapper so run-duration labels can overlay the hour cells */}
                  <div className="relative flex gap-px flex-1">
                    {HOURS.map(hour => {
                      const status = getStatusForHour(date, hour);
                      const color = cellColor(status);
                      const isNowCell = todayRow && hour === currentHour;
                      return (
                        <div
                          key={hour}
                          title={`${date.toLocaleDateString()} ${String(hour).padStart(2, '0')}:00 — ${status === 'future' ? '—' : status || 'unknown'}`}
                          className="flex-1 h-5 rounded-[3px] transition-transform hover:scale-y-110"
                          style={{
                            background: color || 'var(--surface-sunken)',
                            opacity: status === 'future' ? 0.35 : 1,
                            outline: isNowCell ? '1.5px solid var(--accent)' : 'none',
                            outlineOffset: isNowCell ? '1px' : '0',
                          }}
                        />
                      );
                    })}
                    {runs.filter(r => r.hours >= 2).map(r => (
                      <span
                        key={`${r.status}-${r.startHour}`}
                        className="pointer-events-none absolute top-0 h-5 flex items-center justify-center text-[9px] font-semibold text-white"
                        style={{
                          left: `${(r.startHour / 24) * 100}%`,
                          width: `${(r.hours / 24) * 100}%`,
                          textShadow: '0 1px 2px rgba(0,0,0,0.45)',
                        }}
                      >
                        {shortHours(r.hours)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && batches.length > 0 && (
        <div className="glass-card mt-4 divide-y" style={{ borderColor: 'transparent' }}>
          {batches.map((b, i) => (
            <div
              key={b.id ?? i}
              className="flex items-center gap-3 px-3 py-2 text-xs"
              style={i > 0 ? { borderTop: '1px solid var(--hairline)' } : undefined}
            >
              <span className={`badge ${b.status === 'on' ? 'badge-on' : 'badge-off'} shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'on' ? 'dot-on' : 'dot-off'}`} />
                {b.status === 'on' ? 'ON' : 'OFF'}
              </span>
              <span className="text-primary font-semibold font-mono shrink-0 w-16">
                {formatDuration(b.minutes)}
              </span>
              <span className="text-muted font-mono">
                {fmtHM(b.start)} – {b.ongoing ? 'now' : fmtHM(b.end)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-muted">
        <span className="badge badge-on"><span className="w-2 h-2 rounded-full dot-on" />On</span>
        <span className="badge badge-off"><span className="w-2 h-2 rounded-full dot-off" />Off</span>
        <span className="badge badge-unknown"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-faint)' }} />Unknown</span>
      </div>
    </div>
  );
}
