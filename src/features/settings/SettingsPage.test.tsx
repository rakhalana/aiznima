import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoginPromptModal } from '@/features/auth/components/LoginPromptModal';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
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
});
