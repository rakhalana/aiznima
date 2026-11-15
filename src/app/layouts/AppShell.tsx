import type { ReactNode } from 'react';
import {
  Bell,
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
import { useUnreadNotificationCount } from '@/features/notifications/api/notificationQueries';
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
  const unreadNotificationCount = useUnreadNotificationCount();

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
  const showMobileHeader =
    location.pathname === '/profile' || location.pathname.startsWith('/profile/');
  const isRateLimited = Boolean(rateLimitUntil && rateLimitUntil > Date.now());
  const retryRemaining =
    isRateLimited && rateLimitUntil
      ? Math.max(1, Math.ceil((rateLimitUntil - Date.now()) / 1000))
      : 0;

  return (
    <div className="relative min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <div
        aria-hidden="true"
        className="ambient-canvas-wash pointer-events-none absolute inset-x-0 top-0 z-0 h-80 md:h-[420px]"
      />

      {/* Desktop Floating Glass Top-Navbar */}
      <header className="pointer-events-none sticky top-0 z-40 hidden px-4 pt-3 md:block md:px-8">
        <div className="glass-floating-nav pointer-events-auto mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 rounded-2xl px-3.5 lg:px-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-crisp hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-sm font-bold text-white shadow-token-xs">
              A
            </span>
            <span className="text-[15px] font-bold tracking-tight">Aiznima</span>
          </button>

          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-0.5 rounded-xl border border-[var(--border-hairline)]/70 bg-[var(--bg-subtle)]/65 p-1 dark:border-white/[0.06] dark:bg-white/[0.04]"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 lg:px-3 ${
                      isActive
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-token-xs dark:bg-white/12 dark:text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/55 hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`hidden h-3.5 w-3.5 shrink-0 lg:block ${
                          isActive ? 'text-[var(--accent-primary)]' : ''
                        }`}
                        strokeWidth={isActive ? 2 : 1.75}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <NavLink
              to="/notifications"
              aria-label={
                unreadNotificationCount > 0
                  ? `Notifications (${unreadNotificationCount} unread)`
                  : 'Notifications'
              }
              title="Notifications"
              className={({ isActive }) =>
                `relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/80 hover:text-[var(--text-primary)] dark:hover:bg-white/[0.08]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Bell
                    className="h-4 w-4"
                    strokeWidth={isActive ? 2 : 1.75}
                    aria-hidden="true"
                  />
                  {unreadNotificationCount > 0 ? (
                    <span className="tabular-nums absolute right-1 top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[9px] font-bold leading-[16px] text-white shadow-token-xs">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>

            <NavLink
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className={({ isActive }) =>
                `inline-flex h-9 w-9 items-center justify-center rounded-xl transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/80 hover:text-[var(--text-primary)] dark:hover:bg-white/[0.08]'
                }`
              }
            >
              {({ isActive }) => (
                <Settings
                  className="h-4 w-4"
                  strokeWidth={isActive ? 2 : 1.75}
                  aria-hidden="true"
                />
              )}
            </NavLink>

            <button
              type="button"
              onClick={() => void toggleTheme()}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/80 hover:text-[var(--text-primary)] dark:hover:bg-white/[0.08] transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>

            <div
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-[var(--border-hairline)]"
            />

            {isLoggedIn ? (
              <div className="flex items-center gap-1 rounded-xl border border-[var(--border-hairline)]/80 bg-[var(--bg-surface)]/70 p-0.5 pl-1 dark:border-white/[0.08] dark:bg-white/[0.05]">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  aria-label={`Open profile for ${viewer?.name ?? 'AniList User'}`}
                  className="flex items-center gap-2 rounded-lg py-0.5 pr-1.5 text-left transition-crisp hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  {viewer?.avatar?.medium ? (
                    <img
                      src={viewer.avatar.medium}
                      alt={viewer.name}
                      className="h-7 w-7 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent-ink)]">
                      {viewer?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  )}
                  <span className="hidden max-w-[96px] truncate text-xs font-semibold text-[var(--text-primary)] lg:inline">
                    {viewer?.name ?? 'AniList User'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Log out"
                  title="Log out"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--error-text)] transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                aria-label="Login with AniList"
                leftIcon={<LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />}
                onClick={() =>
                  openLoginPrompt(
                    undefined,
                    location.pathname + location.search,
                  )
                }
              >
                <span className="hidden xl:inline">Login with AniList</span>
                <span className="xl:hidden">Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Wrapper */}
      <div
        className={`relative z-10 flex min-w-0 flex-1 flex-col ${
          showMobileHeader ? '' : 'pt-safe-header md:pt-0'
        }`}
      >

        {/* Mobile Top Bar (Profile only) */}
        {showMobileHeader ? (
          <header className="glass-chrome-docked sticky top-0 z-30 flex items-center justify-between border-b px-3.5 pb-2.5 pt-safe-header sm:px-4 md:hidden">
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
        ) : null}

        {/* Global Status Banners */}
        {isOffline || isRateLimited || sessionExpiredFlag ? (
          <div className="relative z-10 mx-auto w-full max-w-7xl px-3.5 pt-2.5 sm:px-4 md:px-8 md:pt-3">
            {isOffline ? (
              <div
                role="status"
                className="mb-2.5 flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-secondary)] shadow-token-xs"
              >
                <WifiOff className="h-4 w-4 shrink-0 text-[var(--status-paused-text)]" strokeWidth={1.75} />
                <span>You are currently offline. Cached data remains available.</span>
              </div>
            ) : null}

            {isRateLimited ? (
              <div
                role="status"
                className="mb-2.5 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-[var(--status-paused-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--status-paused-text)]"
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
                className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/70 bg-[var(--error-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--error-text)]"
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
        ) : null}

        {/* Main Page Area */}
        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-3.5 pb-24 pt-2.5 sm:px-4 md:px-8 md:pb-14 md:pt-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="glass-chrome-docked fixed inset-x-0 bottom-0 z-30 border-t pb-safe-nav md:hidden"
      >
        <div className="grid grid-cols-5 px-1 pt-1">
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
