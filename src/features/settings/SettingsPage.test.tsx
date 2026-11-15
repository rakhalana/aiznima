import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

type ViewerState = NonNullable<ReturnType<typeof useAuthStore.getState>['viewer']>;

function makeViewer(overrides?: Partial<ViewerState>): ViewerState {
  return {
    id: 7,
    name: 'FernUser',
    about: null,
    avatar: null,
    bannerImage: null,
    siteUrl: null,
    unreadNotificationCount: 0,
    options: {
      titleLanguage: 'ROMAJI',
      displayAdultContent: false,
      includeAdultContentInSearch: false,
      profileColor: 'blue',
    },
    mediaListOptions: {
      scoreFormat: 'POINT_100',
      rowOrder: null,
    },
    statistics: null,
    ...overrides,
  };
}

function renderSettings() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
        <LoginPromptModal />
        <LogoutConfirmModal />
        <ToastViewport />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark', 'theme-transition');
    queryClient.clear();
    useToastStore.setState({ toasts: [], rateLimitUntil: null, isOffline: false });
    usePrefsStore.setState({ theme: 'light', guestShowAdult: false, isHydrated: true });
    useAuthStore.setState({
      accessToken: null,
      expiresAt: null,
      viewer: null,
      sessionExpiredFlag: false,
      isHydrated: true,
    });
    useLoginPromptStore.getState().closeLoginPrompt();
    useLogoutConfirmStore.getState().closeLogoutConfirm();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('toggles Paper Slate Light / Deep Slate Dark appearance with smooth transition state', () => {
    renderSettings();

    const lightButton = screen.getByRole('button', { name: /^light$/i });
    const darkButton = screen.getByRole('button', { name: /^dark$/i });
    expect(lightButton).toHaveAttribute('aria-pressed', 'true');
    expect(darkButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(darkButton);
    expect(usePrefsStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-transition')).toBe(true);
    expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    expect(lightButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(lightButton);
    expect(usePrefsStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(lightButton).toHaveAttribute('aria-pressed', 'true');
    expect(darkButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables AniList Account Preferences controls while browsing in Guest mode', () => {
    renderSettings();

    expect(screen.getByRole('combobox', { name: /title language/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /score format/i })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /display 18\+ \(adult\) content on anilist/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /include 18\+ entries in search results/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeDisabled();
  });

  it('submits AniList account preferences and updates viewer on SettingsPage', async () => {
    useAuthStore.setState({
      accessToken: 'token-xyz',
      expiresAt: Date.now() + 60_000,
      viewer: makeViewer(),
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            UpdateUser: makeViewer({
              options: {
                titleLanguage: 'ENGLISH',
                displayAdultContent: true,
                includeAdultContentInSearch: true,
                profileColor: 'blue',
              },
              mediaListOptions: {
                scoreFormat: 'POINT_10',
                rowOrder: null,
              },
            }),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderSettings();

    const saveBtn = screen.getByRole('button', { name: /save preferences/i });
    expect(saveBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('combobox', { name: /title language/i }));
    fireEvent.click(screen.getByRole('option', { name: /^english \(/i }));

    fireEvent.click(screen.getByRole('combobox', { name: /score format/i }));
    fireEvent.click(screen.getByRole('option', { name: /10 point \(9 \/ 10\)/i }));

    fireEvent.click(
      screen.getByRole('checkbox', { name: /display 18\+ \(adult\) content on anilist/i }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: /include 18\+ entries in search results/i }),
    );

    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(requestInit?.body)) as {
      variables: Record<string, unknown>;
    };
    expect(body.variables).toEqual({
      titleLanguage: 'ENGLISH',
      scoreFormat: 'POINT_10',
      displayAdultContent: true,
      includeAdultContentInSearch: true,
    });

    await waitFor(() => {
      expect(useAuthStore.getState().viewer?.options?.titleLanguage).toBe('ENGLISH');
    });
    expect(useAuthStore.getState().viewer?.mediaListOptions?.scoreFormat).toBe('POINT_10');
    expect(useAuthStore.getState().viewer?.options?.displayAdultContent).toBe(true);
    expect(useAuthStore.getState().viewer?.options?.includeAdultContentInSearch).toBe(true);
    expect(screen.getByText(/anilist preferences updated\./i)).toBeInTheDocument();
  });

  it('preserves preference draft and shows Log in again banner on 401 UnauthorizedError', async () => {
    useAuthStore.setState({
      accessToken: 'token-xyz',
      expiresAt: Date.now() + 60_000,
      viewer: makeViewer(),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: [{ message: 'Invalid token' }] }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    renderSettings();

    fireEvent.click(screen.getByRole('combobox', { name: /title language/i }));
    fireEvent.click(screen.getByRole('option', { name: /^english \(/i }));

    const displayAdultCheckbox = screen.getByRole('checkbox', {
      name: /display 18\+ \(adult\) content on anilist/i,
    });
    fireEvent.click(displayAdultCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      /your session expired\. log in again on this page to save your preference changes\./i,
    );
    expect(screen.getByRole('combobox', { name: /title language/i })).toHaveTextContent(/english/i);
    expect(displayAdultCheckbox).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /log in again/i }));
    expect(screen.getByRole('dialog', { name: /log in with anilist/i })).toBeInTheDocument();
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
      viewer: makeViewer({ options: null, mediaListOptions: null }),
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
