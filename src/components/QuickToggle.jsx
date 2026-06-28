import { useState, useEffect } from 'react';

export default function QuickToggle() {
  const [openEvent, setOpenEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch('/api/entries?days=1')
      .then(r => r.json())
      .then(rows => {
        const open = rows.find(r => !r.ended_at);
        setOpenEvent(open || null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    setToggling(true);
    try {
      if (openEvent) {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' }),
        });
        const newStatus = openEvent.status === 'on' ? 'off' : 'on';
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open', status: newStatus }),
        });
        setOpenEvent({ status: newStatus, started_at: new Date().toISOString() });
      } else {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open', status: 'on' }),
        });
        setOpenEvent({ status: 'on', started_at: new Date().toISOString() });
      }
    } catch (e) {
      console.error('Toggle failed', e);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  const isOn = openEvent?.status === 'on';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`
          w-full max-w-xs h-28 rounded-2xl font-bold text-xl
          transition-all duration-300 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOn
            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/30'
            : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
          }
        `}
      >
        {toggling ? (
          <span className="animate-pulse">...</span>
        ) : isOn ? (
          <span className="flex flex-col items-center gap-1">
            <span className="text-3xl">⚡</span>
            <span>POWER IS ON</span>
            <span className="text-xs font-normal opacity-70">tap if power goes off</span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1">
            <span className="text-3xl">🔴</span>
            <span>POWER IS OFF</span>
            <span className="text-xs font-normal opacity-70">tap when power returns</span>
          </span>
        )}
      </button>
      {openEvent && (
        <div className="text-xs text-zinc-500 font-mono">
          Since {new Date(openEvent.started_at).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
