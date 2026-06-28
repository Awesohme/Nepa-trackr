import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 shadow-2xl flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-200">
          A new version is available.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
