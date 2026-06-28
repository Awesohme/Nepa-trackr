import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-lg mx-auto glass-card shadow-[var(--shadow-pop)] px-5 py-4 flex items-center justify-between gap-4 animate-fade-in">
        <p className="text-sm text-secondary">
          A new version is available.
        </p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 btn-accent px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
