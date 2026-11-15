import { useState } from 'react';
import { LogOut, TriangleAlert } from 'lucide-react';
import { useLogoutConfirmStore } from '@/features/auth/stores/useLogoutConfirmStore';
import { BottomSheetOrModal } from '@/shared/components/BottomSheetOrModal';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useToastStore } from '@/shared/stores/useToastStore';

export function LogoutConfirmModal() {
  const isOpen = useLogoutConfirmStore((state) => state.isOpen);
  const closeLogoutConfirm = useLogoutConfirmStore((state) => state.closeLogoutConfirm);
  const viewer = useAuthStore((state) => state.viewer);
  const logout = useAuthStore((state) => state.logout);
  const addToast = useToastStore((state) => state.addToast);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClose = () => {
    if (!isLoggingOut) {
      closeLogoutConfirm();
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      closeLogoutConfirm();
      addToast({ variant: 'info', message: 'Signed out of AniList.' });
    } catch {
      addToast({
        variant: 'error',
        message: 'Unable to sign out right now. Please try again.',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <BottomSheetOrModal
      open={isOpen}
      onClose={handleClose}
      title="Log out of AniList?"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {viewer?.name ? (
            <>
              You are currently signed in as{' '}
              <span className="font-semibold text-[var(--text-primary)]">{viewer.name}</span>.{' '}
              Logging out will disconnect your AniList account from this device and switch you back
              to Guest Mode.
            </>
          ) : (
            'Logging out will disconnect your AniList account from this device and switch you back to Guest Mode.'
          )}
        </p>

        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-[var(--status-paused-bg)] p-3 text-xs text-[var(--status-paused-text)] dark:border-amber-500/30">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>
            You won&apos;t be able to update watchlist progress, edit list scores, or view AniList
            notifications until you sign in again.
          </span>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={isLoggingOut} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isLoggingOut}
            onClick={() => void handleConfirmLogout()}
            leftIcon={<LogOut className="h-4 w-4" strokeWidth={1.75} />}
          >
            Confirm Log out
          </Button>
        </div>
      </div>
    </BottomSheetOrModal>
  );
}
