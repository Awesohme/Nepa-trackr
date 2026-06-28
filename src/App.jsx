import { useState } from 'react';
import QuickToggle from './components/QuickToggle';
import TimelineView from './components/TimelineView';
import HistoryList from './components/HistoryList';
import AnalysisPanel from './components/AnalysisPanel';
import LogForm from './components/LogForm';
import EditEntryModal from './components/EditEntryModal';
import UpdateBanner from './components/UpdateBanner';
import { useTheme } from './lib/theme';

const TABS = [
  { key: 'toggle', label: 'Log' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'history', label: 'History' },
  { key: 'analysis', label: 'Analysis' },
];

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid place-items-center w-9 h-9 rounded-full glass text-secondary hover:text-primary transition-colors active:scale-95"
    >
      {isDark ? (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState('toggle');
  const { theme, toggle } = useTheme();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 glass border-x-0 border-t-0">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-bold tracking-tight text-primary">
                <span style={{ color: 'var(--accent)' }}>NEPA</span> Trackr
              </h1>
              <span className="text-[10px] text-muted font-mono">Igbe Rd, Ikorodu</span>
            </div>
            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
          <nav className="segmented">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                data-active={tab === t.key}
                className="segmented-item"
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main key={tab} className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {tab === 'toggle' && (
          <>
            <QuickToggle />
            <LogForm onOpenManual={() => setManualEntryOpen(true)} />
          </>
        )}
        {tab === 'timeline' && <TimelineView />}
        {tab === 'history' && <HistoryList />}
        {tab === 'analysis' && <AnalysisPanel />}
      </main>

      <EditEntryModal
        open={manualEntryOpen}
        entry={null}
        onSaved={() => { setManualEntryOpen(false); window.location.reload(); }}
        onCancel={() => setManualEntryOpen(false)}
      />

      <UpdateBanner />
    </div>
  );
}
