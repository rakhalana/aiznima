import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ToastViewport } from '@/shared/components/ToastViewport';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

export function App() {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydratePrefs = usePrefsStore((state) => state.hydrate);
  const theme = usePrefsStore((state) => state.theme);

  useEffect(() => {
    void hydrateAuth();
    void hydratePrefs();
  }, [hydrateAuth, hydratePrefs]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)] text-[var(--text-primary)]">
          <section className="max-w-md w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-token-xs">
            <span className="inline-flex items-center rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-ink)]">
              Phase 2 Core Ready ({theme})
            </span>
            <h1 className="mt-3 text-xl font-bold tracking-tight">Aiznima</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Paper Slate design tokens, platform adapters, GraphQL client, and core stores initialized.
            </p>
          </section>
        </main>
        <ToastViewport />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
