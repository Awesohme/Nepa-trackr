import { useState } from 'react';

const PRESETS = [
  { label: '24h', days: 1 },
  { label: '3d', days: 3 },
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: 'Custom', days: null },
];

function toDateInput(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function TimeRangeFilter({ value, onPreset, onCustom, start, end }) {
  const [customStart, setCustomStart] = useState(start ? toDateInput(start) : '');
  const [customEnd, setCustomEnd] = useState(end ? toDateInput(end) : '');

  const isCustom = value === null;

  function handlePreset(p) {
    if (p.days !== null) {
      onPreset(p.days);
    } else {
      onPreset(null);
    }
  }

  function applyCustom() {
    if (customStart && customEnd) {
      onCustom(customStart + 'T00:00:00', customEnd + 'T23:59:59');
    }
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              (p.days === null && isCustom) || value === p.days
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isCustom && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors [color-scheme:dark]"
          />
          <span className="text-zinc-600 text-xs">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors [color-scheme:dark]"
          />
          <button
            onClick={applyCustom}
            disabled={!customStart || !customEnd}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
