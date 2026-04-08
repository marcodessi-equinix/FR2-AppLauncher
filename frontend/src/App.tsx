import React, { startTransition } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { DashboardGrid } from './components/dashboard/DashboardGrid';
import { useStore } from './store/useStore';
import api from './lib/api';
import { ThemeManager } from './components/ThemeManager';
import { useI18n } from './lib/i18n';
import { cn } from './lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

import { SplashIntro } from './components/SplashIntro';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minuten
const INTRO_STORAGE_KEY = 'applauncher_intro_seen';

const shouldForceSplashIntro = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const splashParam = searchParams.get('splash');

  return import.meta.env.DEV || splashParam === '1' || splashParam === 'true' || splashParam === 'always';
};

function LanguageManager() {
  const { language, locale } = useI18n();
  const syncPreferredLanguageWithSystem = useStore((state) => state.syncPreferredLanguageWithSystem);

  React.useEffect(() => {
    syncPreferredLanguageWithSystem();

    const handleLanguageChange = () => {
      syncPreferredLanguageWithSystem();
    };

    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, [syncPreferredLanguageWithSystem]);

  React.useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.locale = locale;
  }, [language, locale]);

  return null;
}

function AppContent() {
  const setIsAdmin = useStore((state) => state.setIsAdmin);
  const initClientIdentity = useStore((state) => state.initClientIdentity);
  const isAdmin = useStore((state) => state.isAdmin);
  const [showIntro, setShowIntro] = React.useState(() => {
    return shouldForceSplashIntro() || !localStorage.getItem(INTRO_STORAGE_KEY);
  });
  const [cameFromSplash, setCameFromSplash] = React.useState(false);

  React.useEffect(() => {
    void initClientIdentity();
  }, [initClientIdentity]);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const lastActivityMatch = localStorage.getItem('app_last_activity');
        if (lastActivityMatch) {
            const lastActivity = parseInt(lastActivityMatch, 10);
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                // Session expired due to inactivity while away
                await api.post('/auth/logout').catch(() => {});
                setIsAdmin(false);
                localStorage.removeItem('app_last_activity');
                return;
            }
        }

        const res = await api.get('/auth/me');
        const adminStatus = Boolean(res.data?.isAdmin);
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
            localStorage.setItem('app_last_activity', Date.now().toString());
        }
      } catch {
        setIsAdmin(false);
      }
    };
    checkAuth();
  }, [setIsAdmin]);

  // Inactivity tracking & Server Heartbeat
  React.useEffect(() => {
    if (!isAdmin) return;

    localStorage.setItem('app_last_activity', Date.now().toString());
    let throttleTimeout: NodeJS.Timeout | null = null;

    const updateActivity = () => {
      if (!throttleTimeout) {
        localStorage.setItem('app_last_activity', Date.now().toString());
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 5000); // 5 Seconds throttle to prevent excessive writes
      }
    };

    const inactivityIntervalId = setInterval(() => {
      const lastActivityStr = localStorage.getItem('app_last_activity');
      if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          if (Date.now() - lastActivity > TIMEOUT_MS) {
            api.post('/auth/logout').catch(() => {});
            setIsAdmin(false);
            localStorage.removeItem('app_last_activity');
          }
      }
    }, 10000); // Check every 10 seconds

    // Server Heartbeat to keep the exclusive admin session lock alive
    const heartbeatIntervalId = setInterval(() => {
       api.post('/auth/heartbeat').catch((err) => {
         // If heartbeat fails with 403, our session was taken over
         if (err.response?.status === 403) {
            setIsAdmin(false);
            localStorage.removeItem('app_last_activity');
         }
       });
    }, 10000); // Send heartbeat every 10 seconds

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });

    return () => {
      clearInterval(inactivityIntervalId);
      clearInterval(heartbeatIntervalId);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [isAdmin, setIsAdmin]);

  const handleSplashExitStart = React.useCallback(() => {
    startTransition(() => {
      setCameFromSplash(true);
    });
  }, []);

  const handleSplashComplete = React.useCallback(() => {
    if (!shouldForceSplashIntro()) {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    }

    startTransition(() => {
      setShowIntro(false);
    });
  }, []);

  return (
    <>
      <div
        className={cn(
          showIntro && !cameFromSplash && 'splash-dashboard-underlay',
          cameFromSplash && 'splash-dashboard-reveal',
        )}
      >
        <Layout>
          <DashboardGrid />
        </Layout>
      </div>
      {showIntro ? <SplashIntro onExitStart={handleSplashExitStart} onComplete={handleSplashComplete} /> : null}
    </>
  );
}

import { TooltipProvider } from './components/ui/tooltip';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <ThemeManager />
        <LanguageManager />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
