import { createPortal } from 'react-dom';

export default function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative glass-card w-full max-w-sm rounded-b-none sm:rounded-2xl shadow-[var(--shadow-pop)] animate-fade-in">
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
          <p className="text-sm text-secondary">{message}</p>
        </div>
        <div className="flex gap-3 px-6 py-4 glass border-x-0 border-b-0">
          <button onClick={onCancel} className="flex-1 btn-quiet py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-[0.875rem] bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            {confirmLabel || 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
