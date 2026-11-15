import { useEffect, useLayoutEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import { useViewerQuery } from '@/features/auth/api/viewerQuery';
import { LoginPromptModal } from '@/features/auth/components/LoginPromptModal';
import { LogoutConfirmModal } from '@/features/auth/components/LogoutConfirmModal';
import { completeOAuthLogin, startAniListLogin } from '@/features/auth/services/oauth';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { useLogoutConfirmStore } from '@/features/auth/stores/useLogoutConfirmStore';
import { registerNativeLifecycle } from '@/platform';
import { queryClient } from '@/shared/api/queryClient';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ToastViewport } from '@/shared/components/ToastViewport';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';
import { AppShell } from './layouts/AppShell';
import { AppRoutes } from './router';

const MAX_SCROLL_HISTORY_KEYS = 50;

function readScrollY(): number {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  );
}

function applyScrollY(y: number): void {
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;
  window.scrollTo?.({ top: y, left: 0, behavior: 'auto' });
}

function saveScrollPosition(map: Map<string, number>, key: string, y: number): void {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, y);
  while (map.size > MAX_SCROLL_HISTORY_KEYS) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    map.delete(oldestKey);
  }
}

function AppRuntimeEffects() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydratePrefs = usePrefsStore((state) => state.hydrate);
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const activeKeyRef = useRef(location.key);
  const activePathnameRef = useRef(location.pathname);
  const isFirstRenderRef = useRef(true);
  const hasScrollEventForActiveKeyRef = useRef(false);

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

  useEffect(() => {
    const handleScroll = () => {
      hasScrollEventForActiveKeyRef.current = true;
      saveScrollPosition(
        scrollPositionsRef.current,
        activeKeyRef.current,
        readScrollY(),
      );
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      activeKeyRef.current = location.key;
      activePathnameRef.current = location.pathname;
      hasScrollEventForActiveKeyRef.current = false;
      applyScrollY(0);
      return;
    }

    const prevKey = activeKeyRef.current;
    const prevPathname = activePathnameRef.current;

    if (prevKey !== location.key) {
      const currentY = readScrollY();
      const recordedY = scrollPositionsRef.current.get(prevKey) ?? 0;
      if (!hasScrollEventForActiveKeyRef.current || currentY > recordedY) {
        saveScrollPosition(scrollPositionsRef.current, prevKey, currentY);
      }
    }

    activeKeyRef.current = location.key;
    activePathnameRef.current = location.pathname;
    hasScrollEventForActiveKeyRef.current = false;

    if (navigationType === 'POP') {
      const savedY = scrollPositionsRef.current.get(location.key) ?? 0;
      applyScrollY(savedY);
    } else if (location.pathname !== prevPathname) {
      applyScrollY(0);
    }
  }, [location.key, location.pathname, navigationType]);

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
        const logoutModal = useLogoutConfirmStore.getState();
        if (logoutModal.isOpen) {
          logoutModal.closeLogoutConfirm();
          return true;
        }
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
      <LogoutConfirmModal />
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
