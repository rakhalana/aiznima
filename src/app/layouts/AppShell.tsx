import type { ReactNode } from 'react';
import {
  Bookmark,
  Calendar,
  Compass,
  LogIn,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  User,
  WifiOff,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/', label: 'Discover', icon: Compass, end: true },
  { to: '/search', label: 'Search', icon: Search, end: false },
  { to: '/schedule', label: 'Schedule', icon: Calendar, end: false },
  { to: '/my-list', label: 'My List', icon: Bookmark, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
] as const;

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const theme = usePrefsStore((state) => state.theme);
  const toggleTheme = usePrefsStore((state) => state.toggleTheme);

  const accessToken = useAuthStore((state) => state.accessToken);
  const viewer = useAuthStore((state) => state.viewer);
  const logout = useAuthStore((state) => state.logout);
  const sessionExpiredFlag = useAuthStore((state) => state.sessionExpiredFlag);
  const clearSessionExpiredFlag = useAuthStore((state) => state.clearSessionExpiredFlag);

  const isOffline = useToastStore((state) => state.isOffline);
  const rateLimitUntil = useToastStore((state) => state.rateLimitUntil);

  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);

  const isLoggedIn = Boolean(accessToken);
  const isRateLimited = Boolean(rateLimitUntil && rateLimitUntil > Date.now());
  const retryRemaining =
    isRateLimited && rateLimitUntil
      ? Math.max(1, Math.ceil((rateLimitUntil - Date.now()) / 1000))
      : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] md:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-[232px] md:shrink-0 md:flex-col md:border-r md:border-[var(--border-hairline)] md:bg-[var(--bg-surface)] md:sticky md:top-0 md:h-screen">
        <div className="flex h-16 items-center justify-between border-b border-[var(--border-hairline)] px-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-lg"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-sm font-bold text-white shadow-token-xs">
              A
            </span>
            <span className="text-base font-bold tracking-tight">Aiznima</span>
          </button>
          <button
            type="button"
            onClick={() => void toggleTheme()}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-crisp"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={isActive ? 2 : 1.75}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={isActive ? 2 : 1.75}
                  aria-hidden="true"
                />
                <span>Settings</span>
              </>
            )}
          </NavLink>
        </nav>

        <div className="border-t border-[var(--border-hairline)] p-3">
          {isLoggedIn ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex min-w-0 items-center gap-2.5 text-left"
              >
                {viewer?.avatar?.medium ? (
                  <img
                    src={viewer.avatar.medium}
                    alt={viewer.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">
                    {viewer?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {viewer?.name ?? 'AniList User'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">Synced</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Log out"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--error-text)] transition-crisp"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              leftIcon={<LogIn className="h-4 w-4" strokeWidth={1.75} />}
              onClick={() =>
                openLoginPrompt(
                  undefined,
                  location.pathname + location.search,
                )
              }
            >
              Login with AniList
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-glass)] px-4 py-2.5 backdrop-blur-md pt-safe md:hidden">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-lg"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-xs font-bold text-white shadow-token-xs">
              A
            </span>
            <span className="text-base font-bold tracking-tight">Aiznima</span>
          </button>

          <div className="flex items-center gap-1">
            {!isLoggedIn ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  openLoginPrompt(
                    undefined,
                    location.pathname + location.search,
                  )
                }
              >
                Login
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => void toggleTheme()}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
              ) : (
                <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              aria-label="Open settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {/* Global Status Banners */}
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 md:px-8">
          {isOffline ? (
            <div
              role="status"
              className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-secondary)] shadow-token-xs"
            >
              <WifiOff className="h-4 w-4 shrink-0 text-[var(--status-paused-text)]" strokeWidth={1.75} />
              <span>You are currently offline. Cached data remains available.</span>
            </div>
          ) : null}

          {isRateLimited ? (
            <div
              role="status"
              className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-[var(--status-paused-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--status-paused-text)]"
            >
              <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="tabular-nums">
                Rate limit reached. Showing cached data — please wait ~{retryRemaining}s.
              </span>
            </div>
          ) : null}

          {sessionExpiredFlag ? (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/70 bg-[var(--error-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--error-text)]"
            >
              <span>Your AniList session expired. Log in again to sync changes.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearSessionExpiredFlag();
                    openLoginPrompt(undefined, location.pathname + location.search);
                  }}
                  className="rounded-md bg-white/80 px-2.5 py-1 font-semibold text-[var(--error-text)] hover:bg-white"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={clearSessionExpiredFlag}
                  className="rounded-md px-2 py-1 opacity-80 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Main Page Area */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-2 md:px-8 md:pb-10 md:pt-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-hairline)] bg-[var(--bg-glass)] backdrop-blur-md pb-safe md:hidden"
      >
        <div className="grid grid-cols-5 px-1 py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-medium transition-crisp ${
                    isActive
                      ? 'text-[var(--accent-primary)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`inline-flex h-7 w-12 items-center justify-center rounded-full transition-crisp ${
                        isActive ? 'bg-[var(--accent-soft)]' : ''
                      }`}
                    >
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={isActive ? 2 : 1.75}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
