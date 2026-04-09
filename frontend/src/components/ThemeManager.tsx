import React from 'react';
import { useStore, Theme } from '../store/useStore';

export const ThemeManager: React.FC = () => {
  React.useEffect(() => {
    const storageKey = 'applauncher-storage';
    const root = document.documentElement;
    let frameOne: number | null = null;
    let frameTwo: number | null = null;

    const applyTheme = (theme: Theme) => {
      root.dataset.themeTransition = 'off';

      root.classList.remove('dark', 'light');
      root.classList.add(theme);
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;

      if (frameOne !== null) {
        cancelAnimationFrame(frameOne);
      }
      if (frameTwo !== null) {
        cancelAnimationFrame(frameTwo);
      }

      frameOne = requestAnimationFrame(() => {
        frameTwo = requestAnimationFrame(() => {
          delete root.dataset.themeTransition;
          frameOne = null;
          frameTwo = null;
        });
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
      if (frameOne !== null) {
        cancelAnimationFrame(frameOne);
      }
      if (frameTwo !== null) {
        cancelAnimationFrame(frameTwo);
      }
      delete root.dataset.themeTransition;
      unsubscribe();
    };
  }, []);

  return null;
};
