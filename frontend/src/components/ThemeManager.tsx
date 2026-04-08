import React from 'react';
import { useStore, Theme } from '../store/useStore';

export const ThemeManager: React.FC = () => {
  React.useEffect(() => {
    const storageKey = 'applauncher-storage';
    const root = document.documentElement;

    const applyTheme = (theme: Theme) => {
      // Kill all transitions so the theme flips instantly
      const kill = document.createElement('style');
      kill.textContent = '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }';
      document.head.appendChild(kill);

      root.classList.remove('dark', 'light');
      root.classList.add(theme);
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;

      // Force reflow so browser paints with zero-duration, then restore
      void root.offsetHeight;
      requestAnimationFrame(() => {
        document.head.removeChild(kill);
      });
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

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (state.theme !== prevState.theme) {
        applyTheme(state.theme);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
};
