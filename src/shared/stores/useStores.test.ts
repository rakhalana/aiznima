import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './useAuthStore';
import { usePrefsStore } from './usePrefsStore';

describe('core Zustand stores', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    await useAuthStore.getState().logout();
    usePrefsStore.setState({
      theme: 'light',
      guestShowAdult: false,
      activeMediaType: 'ANIME',
      isHydrated: false,
    });
  });

  it('defaults to Paper Slate Light mode and toggles Dark mode on DOM', async () => {
    await usePrefsStore.getState().hydrate();
    expect(usePrefsStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
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
