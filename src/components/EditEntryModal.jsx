import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toDatetimeLocal } from '../lib/time';

export default function EditEntryModal({ open, entry, onSaved, onCancel }) {
  const isEdit = !!entry?.id;
  const [status, setStatus] = useState('on');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync fields each time the modal opens (edit -> entry's values; create -> defaults).
  useEffect(() => {
    if (!open) return;
    setStatus(entry?.status || 'off');
    setStartedAt(toDatetimeLocal(entry?.started_at) || toDatetimeLocal(new Date().toISOString()));
    setEndedAt(toDatetimeLocal(entry?.ended_at));
    setNotes(entry?.notes || '');
  }, [open, entry]);

  if (!open) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!startedAt) return;
    setSaving(true);
    try {
      const body = {
        ...(isEdit ? { id: entry.id } : {}),
        status,
        started_at: new Date(startedAt).toISOString(),
        ended_at: endedAt ? new Date(endedAt).toISOString() : null,
        duration_minutes: null,
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/entry', {
        method: isEdit ? 'PUT' : 'POST',
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative glass-card w-full max-w-sm rounded-b-none sm:rounded-2xl shadow-[var(--shadow-pop)] animate-fade-in flex flex-col max-h-[90vh]">
        <form onSubmit={handleSave} className="flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 overflow-y-auto space-y-4">
            <h3 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Entry' : 'Log Manual Entry'}</h3>

            <div className="segmented">
              <button
                type="button"
                onClick={() => setStatus('on')}
                data-active={status === 'on'}
                className="segmented-item"
                style={status === 'on' ? { color: '#059669' } : undefined}
              >
                Power On
              </button>
              <button
                type="button"
                onClick={() => setStatus('off')}
                data-active={status === 'off'}
                className="segmented-item"
                style={status === 'off' ? { color: '#e11d48' } : undefined}
              >
                No Power
              </button>
              <button
                type="button"
                onClick={() => setStatus('unknown')}
                data-active={status === 'unknown'}
                className="segmented-item"
              >
                Unknown
              </button>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Start time</label>
              <input
                type="datetime-local"
                value={startedAt}
                onChange={e => setStartedAt(e.target.value)}
                required
                className="field"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">
                End time <span className="text-faint">{status === 'unknown' ? '(required for Unknown)' : '(leave blank if ongoing)'}</span>
              </label>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={e => setEndedAt(e.target.value)}
                required={status === 'unknown'}
                className="field"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. transformer fault"
                className="field"
              />
            </div>
          </div>

          {/* Sticky action bar */}
          <div className="flex gap-3 px-6 py-4 glass border-x-0 border-b-0">
            <button type="button" onClick={onCancel} className="flex-1 btn-quiet py-2.5 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-accent py-2.5 text-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
