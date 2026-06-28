import { useState } from 'react';

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEntryModal({ open, entry, onSaved, onCancel }) {
  const [status, setStatus] = useState(entry?.status || 'on');
  const [startedAt, setStartedAt] = useState(toDatetimeLocal(entry?.started_at));
  const [endedAt, setEndedAt] = useState(toDatetimeLocal(entry?.ended_at));
  const [notes, setNotes] = useState(entry?.notes || '');
  const [saving, setSaving] = useState(false);

  if (!open || !entry) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!startedAt) return;
    setSaving(true);
    try {
      const body = {
        id: entry.id,
        status,
        started_at: new Date(startedAt).toISOString(),
        ended_at: endedAt ? new Date(endedAt).toISOString() : null,
        duration_minutes: null,
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/entry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok && onSaved) onSaved();
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Edit Entry</h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus('on')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                status === 'on'
                   ? 'bg-emerald-600 text-white'
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
                   ? 'bg-rose-700 text-white'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              Power Off
            </button>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Start time</label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={e => setStartedAt(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">End time <span className="text-zinc-600">(leave blank if ongoing)</span></label>
            <input
              type="datetime-local"
              value={endedAt}
              onChange={e => setEndedAt(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. transformer fault"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
               className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
