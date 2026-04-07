import React from 'react';
import { useStore, Theme } from '../store/useStore';

export const ThemeManager: React.FC = () => {
  React.useEffect(() => {
    const storageKey = 'applauncher-storage';
    const root = document.documentElement;
    let transitionTimeout: number | null = null;

    const applyTheme = (theme: Theme) => {
      root.classList.add('theme-switching');
      root.classList.remove('dark', 'light', 'equinix');
      root.classList.add(theme);
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;

      if (transitionTimeout !== null) {
        window.clearTimeout(transitionTimeout);
      }

      transitionTimeout = window.setTimeout(() => {
        root.classList.remove('theme-switching');
        transitionTimeout = null;
      }, 180);
    };

    let initialTheme: Theme = 'dark';
    const storedState = window.localStorage.getItem(storageKey);

    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        const storedTheme = parsed?.state?.theme;
        if (storedTheme === 'light' || storedTheme === 'dark') {
          initialTheme = storedTheme;
        } else if (parsed?.state && storedTheme === 'equinix') {
          parsed.state.theme = 'dark';
          window.localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch (error) {
        console.error('Failed to normalize theme storage', error);
      }
    }

    applyTheme(initialTheme);

    const unsubscribe = useStore.subscribe((state) => {
      applyTheme(state.theme);
    });

    return () => {
      if (transitionTimeout !== null) {
        window.clearTimeout(transitionTimeout);
      }
      root.classList.remove('theme-switching');
      unsubscribe();
    };
  }, []);

  return null;
};
