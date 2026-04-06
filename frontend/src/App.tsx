import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { DashboardGrid } from './components/dashboard/DashboardGrid';
import { useStore } from './store/useStore';
import api from './lib/api';
import { ThemeManager } from './components/ThemeManager';

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

function AppContent() {
  const setIsAdmin = useStore((state) => state.setIsAdmin);
  const initClientIdentity = useStore((state) => state.initClientIdentity);
  const isAdmin = useStore((state) => state.isAdmin);
  const [showIntro, setShowIntro] = React.useState(() => {
    return !localStorage.getItem('fr2_intro_seen');
  });

  React.useEffect(() => {
    void initClientIdentity();
  }, [initClientIdentity]);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const lastActivityMatch = localStorage.getItem('fr2_last_activity');
        if (lastActivityMatch) {
            const lastActivity = parseInt(lastActivityMatch, 10);
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                // Session expired due to inactivity while away
                await api.post('/auth/logout').catch(() => {});
                setIsAdmin(false);
                localStorage.removeItem('fr2_last_activity');
                return;
            }
        }

        const res = await api.get('/auth/me');
        const adminStatus = Boolean(res.data?.isAdmin);
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
            localStorage.setItem('fr2_last_activity', Date.now().toString());
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

    localStorage.setItem('fr2_last_activity', Date.now().toString());
    let throttleTimeout: NodeJS.Timeout | null = null;

    const updateActivity = () => {
      if (!throttleTimeout) {
        localStorage.setItem('fr2_last_activity', Date.now().toString());
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 5000); // 5 Seconds throttle to prevent excessive writes
      }
    };

    const inactivityIntervalId = setInterval(() => {
      const lastActivityStr = localStorage.getItem('fr2_last_activity');
      if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          if (Date.now() - lastActivity > TIMEOUT_MS) {
            api.post('/auth/logout').catch(() => {});
            setIsAdmin(false);
            localStorage.removeItem('fr2_last_activity');
          }
      }
    }, 10000); // Check every 10 seconds

    // Server Heartbeat to keep the exclusive admin session lock alive
    const heartbeatIntervalId = setInterval(() => {
       api.post('/auth/heartbeat').catch((err) => {
         // If heartbeat fails with 403, our session was taken over
         if (err.response?.status === 403) {
            setIsAdmin(false);
            localStorage.removeItem('fr2_last_activity');
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

  const handleSplashComplete = () => {
    localStorage.setItem('fr2_intro_seen', 'true');
    setShowIntro(false);
  };

  if (showIntro) {
    return <SplashIntro onComplete={handleSplashComplete} />;
  }

  return (
    <div className="animate-[dashboard-reveal_0.5s_ease-out_forwards]">
      <Layout>
        <DashboardGrid />
      </Layout>
    </div>
  );
}

import { TooltipProvider } from './components/ui/tooltip';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <ThemeManager />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
