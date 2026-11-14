import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { completeOAuthLogin, startAniListLogin } from '@/features/auth/services/oauth';
import { useToastStore } from '@/shared/stores/useToastStore';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    async function processCallback() {
      const result = await completeOAuthLogin(window.location.href);
      const addToast = useToastStore.getState().addToast;

      if (result.ok) {
        addToast({
          variant: 'success',
          message: 'Signed in to AniList.',
        });
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
    }

    void processCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2
        className="h-7 w-7 animate-spin text-[var(--accent-primary)]"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Completing AniList sign-in...
      </p>
    </div>
  );
}
