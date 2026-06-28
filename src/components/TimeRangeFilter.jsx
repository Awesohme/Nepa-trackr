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
    onPreset(p.days !== null ? p.days : null);
  }

  function applyCustom() {
    if (customStart && customEnd) {
      onCustom(customStart + 'T00:00:00', customEnd + 'T23:59:59');
    }
  }

  return (
    <div>
      <div className="segmented overflow-x-auto scrollbar-none">
        {PRESETS.map(p => {
          const active = (p.days === null && isCustom) || value === p.days;
          return (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              data-active={active}
              className="segmented-item shrink-0 px-3"
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {isCustom && (
        <div className="flex items-center gap-2 mt-2 animate-fade-in">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="field flex-1 text-xs"
          />
          <span className="text-faint text-xs">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="field flex-1 text-xs"
          />
          <button
            onClick={applyCustom}
            disabled={!customStart || !customEnd}
            className="shrink-0 btn-accent px-3.5 py-2 text-xs"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
