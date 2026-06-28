import { useState } from 'react';
import QuickToggle from './components/QuickToggle';
import TimelineView from './components/TimelineView';
import HistoryList from './components/HistoryList';
import AnalysisPanel from './components/AnalysisPanel';
import LogForm from './components/LogForm';
import UpdateBanner from './components/UpdateBanner';

const TABS = [
  { key: 'toggle', label: 'Log' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'history', label: 'History' },
  { key: 'analysis', label: 'Analysis' },
];

export default function App() {
  const [tab, setTab] = useState('toggle');

  return (
    <div className="min-h-screen bg-[#0f1117] text-zinc-100">
      <header className="sticky top-0 z-10 bg-[#0f1117]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-amber-500">NEPA</span> Trackr
            </h1>
            <span className="text-[10px] text-zinc-600 font-mono">Igbe Rd, Ikorodu</span>
          </div>
          <nav className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === t.key
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {tab === 'toggle' && (
          <>
            <QuickToggle />
            <LogForm />
          </>
        )}
        {tab === 'timeline' && <TimelineView />}
        {tab === 'history' && <HistoryList />}
        {tab === 'analysis' && <AnalysisPanel />}
      </main>
      <UpdateBanner />
    </div>
  );
}
