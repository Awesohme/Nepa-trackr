import { useState, useEffect } from 'react';
import { parseDbDate } from '../lib/time';

function useElapsed(startedAt) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const start = parseDbDate(startedAt);
  if (!start) return '';
  const secs = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function QuickToggle() {
  const [openEvent, setOpenEvent] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch('/api/entries?days=1')
      .then(r => r.json())
      .then(rows => {
        const list = Array.isArray(rows) ? rows : [];
        setOpenEvent(list.find(r => !r.ended_at) || null);
        setLastEvent(list[0] || null); // most recent, ordered started_at DESC
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    setToggling(true);
    // Single atomic call: the backend closes the open event (if any) and opens the new
    // one in one transaction, so a failure can't orphan a closed event without a successor.
    const newStatus = openEvent ? (openEvent.status === 'on' ? 'off' : 'on') : 'on';
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', status: newStatus }),
      });
      if (!res.ok) throw new Error(`toggle failed: ${res.status}`);
      const ev = { status: newStatus, started_at: new Date().toISOString() };
      setOpenEvent(ev);
      setLastEvent(ev);
    } catch (e) {
      console.error('Toggle failed', e);
    } finally {
      setToggling(false);
    }
  }

  const isOn = openEvent?.status === 'on';
  const elapsed = useElapsed(openEvent?.started_at);

  if (loading) {
    return (
      <div className="glass-card grid place-items-center h-56">
        <div className="animate-pulse text-muted text-sm">Loading…</div>
      </div>
    );
  }

  const grad = isOn
    ? 'linear-gradient(160deg, #10b981, #047857)'
    : 'linear-gradient(160deg, #f43f5e, #9f1239)';
  const glow = isOn ? 'rgba(16,185,129,0.45)' : 'rgba(244,63,94,0.45)';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="w-full h-56 rounded-[1.75rem] font-bold text-white transition-transform duration-300 ease-out active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: grad, boxShadow: `0 20px 50px -12px ${glow}` }}
      >
        {toggling ? (
          <span className="text-3xl animate-pulse">…</span>
        ) : (
          <span className="flex flex-col items-center gap-2">
            <span className="text-6xl drop-shadow">{isOn ? '⚡' : '🔴'}</span>
            <span className="text-2xl tracking-tight">{isOn ? 'POWER IS ON' : 'POWER IS OFF'}</span>
            {openEvent && (
              <span className="text-sm font-semibold opacity-90 font-mono">{elapsed}</span>
            )}
            <span className="text-xs font-normal opacity-75">
              {isOn ? 'tap if power goes off' : 'tap when power returns'}
            </span>
          </span>
        )}
      </button>

      {lastEvent && (
        <div className="text-xs text-muted font-mono text-center">
          {openEvent
            ? `${isOn ? 'On' : 'Off'} since ${parseDbDate(lastEvent.started_at)?.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
            : `Last logged ${lastEvent.status === 'on' ? 'On' : 'Off'} · ${parseDbDate(lastEvent.started_at)?.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
        </div>
      )}
    </div>
  );
}
