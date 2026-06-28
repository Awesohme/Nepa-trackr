// Shared time utilities — single source of truth for parsing DB timestamps.
//
// The Turso/SQLite backend historically wrote naive-UTC strings via datetime('now'),
// e.g. "2026-06-28 18:50:00" (space-separated, no timezone). JS `new Date()` parses
// such a string as LOCAL time, shifting every event ~1h early in WAT (UTC+1).
// Newer rows are written timezone-aware ("...Z"). parseDbDate normalises both so all
// timestamps render in the user's correct local time.

export function parseDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);

  const s = value.trim();
  if (!s) return null;

  // Already has an explicit zone (Z, +hh:mm, -hh:mm) -> trust it.
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (hasZone) return new Date(s);

  // Naive "YYYY-MM-DD HH:MM:SS" (or with a T) -> treat as UTC.
  return new Date(s.replace(' ', 'T') + 'Z');
}

// Localised date/time string from a DB value. `opts` are Intl.DateTimeFormat options.
export function fmtTime(value, opts) {
  const d = parseDbDate(value);
  return d ? d.toLocaleString('en-GB', opts) : '';
}

// Localised wall-clock (HH:MM:SS) from a DB value.
export function fmtClock(value) {
  const d = parseDbDate(value);
  return d ? d.toLocaleTimeString('en-GB') : '';
}

// Convert a DB value into the `YYYY-MM-DDTHH:MM` string a <input type="datetime-local">
// expects, in the user's local time.
export function toDatetimeLocal(value) {
  const d = parseDbDate(value);
  if (!d) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Human duration from minutes, e.g. 135 -> "2h 15m". Null/undefined -> "ongoing".
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return 'ongoing';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
