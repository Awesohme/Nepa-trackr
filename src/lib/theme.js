// Theme state: 'dark' | 'light'. Persists to localStorage and falls back to the OS
// preference on first visit. Applies/removes the `dark` class on <html> so CSS tokens
// (in index.css) switch. An inline script in index.html sets the initial class before
// React mounts to avoid a flash of the wrong theme.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'nepa-theme';

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
