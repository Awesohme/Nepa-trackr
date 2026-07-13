import { useState, useEffect, useRef, useCallback } from 'react';
import TimeRangeFilter from './TimeRangeFilter';
import ConfirmModal from './ConfirmModal';
import EditEntryModal from './EditEntryModal';
import { parseDbDate, fmtTime, formatDuration } from '../lib/time';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TIME_OPTS = {
  weekday: 'short', day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit',
};

const PAGE_INITIAL = 5;
const PAGE_STEP = 10;
const HOUR_MS = 60 * 60 * 1000;

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
  const [visible, setVisible] = useState(PAGE_INITIAL);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const scrollRef = useRef(null);

  // Tick every 30s so the latest (ongoing) entry's duration counts up live.
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const buildUrl = useCallback(() => {
    if (customRange) {
      return `/api/entries?start=${encodeURIComponent(customRange.start)}&end=${encodeURIComponent(customRange.end)}&baseline=1`;
    }
    return `/api/entries?days=${days}&baseline=1`;
  }, [days, customRange]);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch(buildUrl())
      .then(r => r.json())
      .then(rows => setEntries(Array.isArray(rows) ? rows : []))
      .finally(() => setLoading(false));
  }, [buildUrl]);

  // Reload when the range changes, and reset pagination to the first page.
  useEffect(() => { loadEntries(); setVisible(PAGE_INITIAL); }, [loadEntries]);

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

  // A brief power restoration can otherwise make a whole hour look "on". Keep the
  // hour's normal background, but expose each partial on-period as a small vertical
  // green marker positioned at its midpoint within that hour.
  function getBriefOnSegmentsForHour(date, hour) {
    const hourStart = new Date(date);
    hourStart.setHours(hour, 0, 0, 0);
    const startMs = hourStart.getTime();
    const endMs = startMs + HOUR_MS;

    return entries.flatMap(entry => {
      if (entry.status !== 'on') return [];
      const eventStart = parseDbDate(entry.started_at)?.getTime();
      const eventEnd = entry.ended_at
        ? parseDbDate(entry.ended_at)?.getTime()
        : nowTs;
      if (!eventStart || !eventEnd || eventStart >= endMs || eventEnd <= startMs) return [];

      const clippedStart = Math.max(eventStart, startMs);
      const clippedEnd = Math.min(eventEnd, endMs);
      const actualWidth = ((clippedEnd - clippedStart) / HOUR_MS) * 100;
      if (actualWidth >= 100) return [];

      // Keep the marker fully inside even when a restoration occurs close to an edge.
      const rawPosition = (((clippedStart + clippedEnd) / 2 - startMs) / HOUR_MS) * 100;
      const position = Math.min(94, Math.max(6, rawPosition));

      return [{ position }];
    });
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

  // Duration of an entry derived from the log itself: a period runs until the NEXT
  // status change (the next-newer entry's start), regardless of any stored ended_at —
  // which can drift (e.g. an orphaned close). entries are newest-first, so the next
  // change for index i is entries[i-1]; the latest entry (i===0) is ongoing -> counts
  // up to now. Falls back to the start-of-day at index boundaries gracefully.
  function entryDurationMinutes(i) {
    const start = parseDbDate(entries[i].started_at);
    if (!start) return null;
    const end = i === 0 ? nowTs : parseDbDate(entries[i - 1].started_at)?.getTime();
    if (!end) return null;
    return Math.max(0, Math.round((end - start) / 60000));
  }

  // Newest-first slice for the editable "Recent events" list (grid keeps full set).
  const visibleEntries = entries.slice(0, visible);
  const hasMore = visible < entries.length;
  const remaining = entries.length - visible;

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
                      const briefOnSegments = getBriefOnSegmentsForHour(date, hour);
                      const hasBriefPower = briefOnSegments.length > 0;
                      const isNowCell = todayRow && hour === currentHour;
                      return (
                        <div
                          key={hour}
                          title={`${date.toLocaleDateString()} ${String(hour).padStart(2, '0')}:00 — ${hasBriefPower ? 'brief power restoration' : status === 'future' ? '—' : status || 'unknown'}`}
                          className="relative flex-1 h-5 overflow-hidden rounded-[3px] transition-transform hover:scale-y-110"
                          style={{
                            // A short on-period is drawn as a strip rather than filling the cell.
                            background: hasBriefPower && status === 'on'
                              ? 'var(--surface-sunken)'
                              : color || 'var(--surface-sunken)',
                            opacity: status === 'future' ? 0.35 : 1,
                            outline: isNowCell ? '1.5px solid var(--accent)' : 'none',
                            outlineOffset: isNowCell ? '1px' : '0',
                          }}
                        >
                          {briefOnSegments.map((segment, index) => (
                            <span
                              key={index}
                              className="absolute inset-y-[3px] w-[3px] rounded-full"
                              style={{
                                left: `calc(${segment.position}% - 1.5px)`,
                                background: 'var(--c-on)',
                              }}
                            />
                          ))}
                        </div>
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

      <div className="flex items-center gap-4 mt-4 text-xs text-muted">
        <span className="badge badge-on"><span className="w-2 h-2 rounded-full dot-on" />On</span>
        <span className="badge badge-off"><span className="w-2 h-2 rounded-full dot-off" />No Power</span>
        <span className="badge badge-unknown"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-faint)' }} />Unknown</span>
      </div>

      {/* Recent events — the single editable list (replaces the old History tab). */}
      {!loading && entries.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Recent events
          </h2>

          <div className="max-h-[19rem] overflow-y-auto scrollbar-none space-y-2 pr-0.5">
            {visibleEntries.map((e, i) => {
              const ongoing = i === 0; // latest entry = current state, still running
              const mins = entryDurationMinutes(i);
              return (
              <div key={e.id} className="glass-card flex items-center gap-3 px-3 py-2.5">
                <span className={`badge ${e.status === 'on' ? 'badge-on' : 'badge-off'} shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${e.status === 'on' ? 'dot-on' : 'dot-off'}`} />
                  {e.status === 'on' ? 'ON' : 'NO POWER'}
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
                  {ongoing ? (
                    <span className="text-secondary">{formatDuration(mins)} · now</span>
                  ) : (
                    formatDuration(mins)
                  )}
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
              );
            })}
          </div>

          {(hasMore || visible > PAGE_INITIAL) && (
            <div className="flex items-center justify-center gap-4 mt-3">
              {hasMore && (
                <button
                  onClick={() => setVisible(v => v + PAGE_STEP)}
                  className="text-xs font-medium text-muted hover:text-primary transition-colors"
                >
                  See more ({remaining})
                </button>
              )}
              {visible > PAGE_INITIAL && (
                <button
                  onClick={() => setVisible(PAGE_INITIAL)}
                  className="text-xs font-medium text-faint hover:text-secondary transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Entry"
        message={`Delete this ${deleteTarget?.status === 'on' ? 'Power On' : 'No Power'} entry from ${deleteTarget ? fmtTime(deleteTarget.started_at, TIME_OPTS) : ''}? This cannot be undone.`}
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
