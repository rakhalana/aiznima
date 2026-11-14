import { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { startAniListLogin } from '@/features/auth/services/oauth';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { BottomSheetOrModal } from '@/shared/components/BottomSheetOrModal';
import { Button } from '@/shared/components/Button';
import { hasOAuthConfig } from '@/shared/config/env';

export function LoginPromptModal() {
  const isOpen = useLoginPromptStore((state) => state.isOpen);
  const reason = useLoginPromptStore((state) => state.reason);
  const returnTo = useLoginPromptStore((state) => state.returnTo);
  const closeLoginPrompt = useLoginPromptStore((state) => state.closeLoginPrompt);

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const configured = hasOAuthConfig();

  const handleLogin = async () => {
    setConfigError(null);
    setIsRedirecting(true);
    try {
      await startAniListLogin(returnTo ?? undefined);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Unable to start AniList login.');
      setIsRedirecting(false);
    }
  };

  return (
    <BottomSheetOrModal
      open={isOpen}
      onClose={closeLoginPrompt}
      title="Log in with AniList"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {reason ??
            'Connect your AniList account to track episodes and chapters, manage your watchlist, and sync profile preferences.'}
        </p>

        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-secondary)]">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>
            You stay in Guest Mode until you authorize Aiznima on AniList. No passwords are ever handled by this app.
          </span>
        </div>

        {!configured || configError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-300/60 bg-[var(--status-paused-bg)] p-3 text-xs font-medium text-[var(--status-paused-text)]"
          >
            {configError ??
              'VITE_ANILIST_CLIENT_ID is not set yet. Add your AniList Client ID in .env.local to enable OAuth sign-in.'}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={closeLoginPrompt}>
            Continue as Guest
          </Button>
          <Button
            variant="primary"
            isLoading={isRedirecting}
            disabled={!configured}
            onClick={() => void handleLogin()}
            leftIcon={<LogIn className="h-4 w-4" strokeWidth={1.75} />}
          >
            Login with AniList
          </Button>
        </div>
      </div>
    </BottomSheetOrModal>
  );
}
