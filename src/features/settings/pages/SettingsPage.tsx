import { LogIn, Moon, ShieldAlert, Sun, Trash2, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { queryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = usePrefsStore((state) => state.theme);
  const setTheme = usePrefsStore((state) => state.setTheme);
  const guestShowAdult = usePrefsStore((state) => state.guestShowAdult);
  const setGuestShowAdult = usePrefsStore((state) => state.setGuestShowAdult);

  const accessToken = useAuthStore((state) => state.accessToken);
  const viewer = useAuthStore((state) => state.viewer);
  const logout = useAuthStore((state) => state.logout);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);
  const addToast = useToastStore((state) => state.addToast);

  const handleClearCache = () => {
    queryClient.clear();
    addToast({ variant: 'success', message: 'Local cache cleared.' });
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Appearance, content filtering, local cache, and session preferences.
        </p>
      </header>

      <div className="space-y-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Paper Slate Light is default; switch to Deep Slate Dark anytime.
            </p>
          </div>
          <div className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1">
            <button
              type="button"
              onClick={() => void setTheme('light')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-crisp ${
                theme === 'light'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={1.75} />
              Light
            </button>
            <button
              type="button"
              onClick={() => void setTheme('dark')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-crisp ${
                theme === 'dark'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={1.75} />
              Dark
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Guest 18+ Content Filter
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {accessToken
                  ? 'Controlled by your AniList account settings while signed in.'
                  : 'Show adult-rated entries in Discover and Search when browsing as Guest.'}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Allow 18+ content in Guest Mode"
            disabled={Boolean(accessToken)}
            checked={guestShowAdult}
            onChange={(e) => void setGuestShowAdult(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent-primary)]"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Local Query Cache
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Clear cached feed and media metadata from memory without signing out.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearCache}
            leftIcon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs">
        <div className="flex items-start gap-2.5">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">AniList Session</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {accessToken
                ? `Signed in${viewer?.name ? ` as ${viewer.name}` : ' on this device'}.`
                : 'Currently browsing in Guest Mode.'}
            </p>
          </div>
        </div>

        {accessToken ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>
              Profile
            </Button>
            <Button variant="danger" size="sm" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />}
            onClick={() =>
              openLoginPrompt(
                'Connect your AniList account to track your watchlist and profile preferences.',
                location.pathname + location.search,
              )
            }
          >
            Login with AniList
          </Button>
        )}
      </div>

      <footer className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--text-secondary)] shadow-token-xs">
        <p className="font-semibold text-[var(--text-primary)]">Aiznima</p>
        <p className="mt-1">Unofficial client powered by AniList API.</p>
      </footer>
    </section>
  );
}
