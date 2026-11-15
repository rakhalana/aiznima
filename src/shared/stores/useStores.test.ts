import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';
import { usePrefsStore } from './usePrefsStore';

describe('core Zustand stores', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark', 'theme-transition');
    await useAuthStore.getState().logout();
    usePrefsStore.setState({
      theme: 'light',
      guestShowAdult: false,
      activeMediaType: 'ANIME',
      searchViewMode: 'grid',
      listViewMode: 'grid',
      isHydrated: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('defaults to Paper Slate Light mode, animates theme-transition on toggle, and clears after settling', async () => {
    vi.useFakeTimers();

    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);

    await usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(true);

    // Repeating same theme does not restart transition once settled
    vi.advanceTimersByTime(350);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);
    await usePrefsStore.getState().setTheme('dark');
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);

    // Rapid consecutive toggles keep transition alive until 320ms after the latest toggle
    await usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(true);

    vi.advanceTimersByTime(200);
    await usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().theme).toBe('dark');
    vi.advanceTimersByTime(200);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(true);

    vi.advanceTimersByTime(150);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);
  });

  it('skips theme-transition class when prefers-reduced-motion is enabled', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    await usePrefsStore.getState().hydrate();
    await usePrefsStore.getState().toggleTheme();

    expect(usePrefsStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false);
  });

  it('persists searchViewMode and listViewMode across store rehydration', async () => {
    await usePrefsStore.getState().setSearchViewMode('list');
    await usePrefsStore.getState().setListViewMode('list');

    usePrefsStore.setState({ searchViewMode: 'grid', listViewMode: 'grid', isHydrated: false });
    await usePrefsStore.getState().hydrate();

    expect(usePrefsStore.getState().searchViewMode).toBe('list');
    expect(usePrefsStore.getState().listViewMode).toBe('list');
  });

  it('persists valid auth tokens and discards expired tokens on hydrate', async () => {
    await useAuthStore.getState().setSession('valid-token', 3600);
    expect(useAuthStore.getState().accessToken).toBe('valid-token');

    // Simulate expired stored token
    window.localStorage.setItem(
      'aiznima:auth',
      JSON.stringify({ accessToken: 'old-token', expiresAt: Date.now() - 1000 }),
    );
    useAuthStore.setState({ accessToken: null, expiresAt: null, isHydrated: false });

    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });
});
