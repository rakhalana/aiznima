import { Moon, ShieldAlert, Sun } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

export function SettingsPage() {
  const theme = usePrefsStore((state) => state.theme);
  const setTheme = usePrefsStore((state) => state.setTheme);
  const guestShowAdult = usePrefsStore((state) => state.guestShowAdult);
  const setGuestShowAdult = usePrefsStore((state) => state.setGuestShowAdult);
  const accessToken = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Appearance, content filtering, and session preferences.
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

        <div className="border-t border-[var(--border-hairline)] pt-3 flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
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
      </div>

      {accessToken ? (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">AniList Session</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Signed in on this device.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      ) : null}

      <footer className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--text-secondary)] shadow-token-xs">
        <p className="font-semibold text-[var(--text-primary)]">Aiznima</p>
        <p className="mt-1">Unofficial client powered by AniList API.</p>
      </footer>
    </section>
  );
}
