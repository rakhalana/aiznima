import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoginPromptModal } from '@/features/auth/components/LoginPromptModal';
import { LogoutConfirmModal } from '@/features/auth/components/LogoutConfirmModal';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { useLogoutConfirmStore } from '@/features/auth/stores/useLogoutConfirmStore';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { queryClient } from '@/shared/api/queryClient';
import { ToastViewport } from '@/shared/components/ToastViewport';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsPage />
      <LoginPromptModal />
      <LogoutConfirmModal />
      <ToastViewport />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    queryClient.clear();
    useToastStore.setState({ toasts: [], rateLimitUntil: null, isOffline: false });
    usePrefsStore.setState({ theme: 'light', guestShowAdult: false, isHydrated: true });
    useAuthStore.setState({ accessToken: null, viewer: null, isHydrated: true });
    useLoginPromptStore.getState().closeLoginPrompt();
    useLogoutConfirmStore.getState().closeLogoutConfirm();
  });

  it('toggles Paper Slate Light / Deep Slate Dark theme and Guest 18+ filter', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /^dark$/i }));
    expect(usePrefsStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const adultToggle = screen.getByRole('checkbox', {
      name: /allow 18\+ content in guest mode/i,
    });
    fireEvent.click(adultToggle);
    expect(usePrefsStore.getState().guestShowAdult).toBe(true);
  });

  it('clears local query cache and exposes Login / Logout actions based on auth state', () => {
    queryClient.setQueryData(['discover', 'ANIME'], { cached: true });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /clear cache/i }));
    expect(queryClient.getQueryData(['discover', 'ANIME'])).toBeUndefined();
    expect(screen.getByText(/local cache cleared/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /login with anilist/i }));
    expect(screen.getByRole('dialog', { name: /log in with anilist/i })).toBeInTheDocument();
  });

  it('requires confirmation dialog before logging out from AniList Session', async () => {
    useAuthStore.setState({
      accessToken: 'token-xyz',
      expiresAt: Date.now() + 60_000,
      viewer: {
        id: 7,
        name: 'FernUser',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        unreadNotificationCount: 0,
        options: null,
        mediaListOptions: null,
        statistics: null,
      },
    });

    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    const dialog = screen.getByRole('dialog', { name: /log out of anilist\?/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('FernUser');
    expect(useAuthStore.getState().accessToken).toBe('token-xyz');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: /log out of anilist\?/i })).not.toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('token-xyz');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm log out/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: /log out of anilist\?/i })).not.toBeInTheDocument();
    expect(screen.getByText(/currently browsing in guest mode\./i)).toBeInTheDocument();
  });
});
