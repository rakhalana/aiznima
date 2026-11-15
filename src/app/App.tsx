import { useEffect, useLayoutEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { useViewerQuery } from '@/features/auth/api/viewerQuery';
import { LoginPromptModal } from '@/features/auth/components/LoginPromptModal';
import { completeOAuthLogin, startAniListLogin } from '@/features/auth/services/oauth';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { registerNativeLifecycle } from '@/platform';
import { queryClient } from '@/shared/api/queryClient';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ToastViewport } from '@/shared/components/ToastViewport';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';
import { AppShell } from './layouts/AppShell';
import { AppRoutes } from './router';

function AppRuntimeEffects() {
  const location = useLocation();
  const navigate = useNavigate();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydratePrefs = usePrefsStore((state) => state.hydrate);

  useViewerQuery();

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) {
      return undefined;
    }
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    void hydrateAuth();
    void hydratePrefs();
  }, [hydrateAuth, hydratePrefs]);

  useEffect(() => {
    const handleOnline = () => useToastStore.getState().setIsOffline(false);
    const handleOffline = () => useToastStore.getState().setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    return registerNativeLifecycle({
      onDeepLink: (url) => {
        if (!url.startsWith('aiznima://auth/callback')) {
          return;
        }
        void completeOAuthLogin(url).then((result) => {
          const addToast = useToastStore.getState().addToast;
          if (result.ok) {
            addToast({ variant: 'success', message: 'Signed in to AniList.' });
          } else {
            addToast({
              variant: 'warning',
              message: result.message,
              action: {
                label: 'Try Again',
                onClick: () => {
                  void startAniListLogin(result.returnTo);
                },
              },
              durationMs: 6000,
            });
          }
          navigate(result.returnTo, { replace: true });
        });
      },
      onBackButton: () => {
        const loginModal = useLoginPromptStore.getState();
        if (loginModal.isOpen) {
          loginModal.closeLoginPrompt();
          return true;
        }
        return false;
      },
    });
  }, [navigate]);

  return null;
}

export function AppContent() {
  return (
    <>
      <AppRuntimeEffects />
      <AppShell>
        <AppRoutes />
      </AppShell>
      <LoginPromptModal />
      <ToastViewport />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
