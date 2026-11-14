import type { ReactNode } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';

interface AuthGuardProps {
  title: string;
  description: string;
  children: ReactNode;
  secondarySlot?: ReactNode;
}

export function AuthGuard({
  title,
  description,
  children,
  secondarySlot,
}: AuthGuardProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="space-y-4 py-6" aria-hidden="true">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
      </div>
    );
  }

  if (!accessToken) {
    return (
      <section className="mx-auto max-w-lg py-8">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 text-center shadow-token-xs">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p>
          <div className="mt-5 flex justify-center">
            <Button
              variant="primary"
              leftIcon={<LogIn className="h-4 w-4" strokeWidth={1.75} />}
              onClick={() =>
                openLoginPrompt(description, location.pathname + location.search)
              }
            >
              Login with AniList
            </Button>
          </div>
          {secondarySlot ? (
            <div className="mt-6 border-t border-[var(--border-hairline)] pt-5 text-left">
              {secondarySlot}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
