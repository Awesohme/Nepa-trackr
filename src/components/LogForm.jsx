import { useState } from 'react';

export default function LogForm({ onLogged }) {
  const [status, setStatus] = useState('on');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const open = await fetch('/api/entries?days=1').then(r => r.json());
      const existingOpen = open.find(r => !r.ended_at);

      if (existingOpen) {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' }),
        });
      }

      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', status, notes: notes.trim() || null }),
      });

      setNotes('');
      if (onLogged) onLogged();
    } catch (e) {
      console.error('Log failed', e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Manual Entry</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStatus('on')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            status === 'on'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          Power On
        </button>
        <button
          type="button"
          onClick={() => setStatus('off')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            status === 'off'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          Power Off
        </button>
      </div>
      <input
        type="text"
        placeholder="Notes (optional) — e.g. transformer fault"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-600 transition-colors"
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
      >
        {submitting ? 'Logging...' : 'Log Entry'}
      </button>
    </form>
  );
}
