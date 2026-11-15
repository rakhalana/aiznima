import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContent } from './App';
import { useLogoutConfirmStore } from '@/features/auth/stores/useLogoutConfirmStore';
import { createAppQueryClient } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useToastStore } from '@/shared/stores/useToastStore';

function renderWithRoute(initialEntry: string) {
  const testQueryClient = createAppQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppContent />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppShell, AuthGuard & AuthCallback routes', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await useAuthStore.getState().logout();
    useAuthStore.setState({ isHydrated: true });
    useLogoutConfirmStore.getState().closeLogoutConfirm();
    useToastStore.setState({ toasts: [], rateLimitUntil: null, isOffline: false });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        if (body.query?.includes('PublicUserProfile')) {
          return new Response(
            JSON.stringify({
              data: {
                User: {
                  id: 2,
                  name: 'Natsu',
                  about: null,
                  avatar: null,
                  bannerImage: null,
                  siteUrl: 'https://anilist.co/user/Natsu',
                  options: { titleLanguage: 'ROMAJI', displayAdultContent: false, profileColor: 'orange' },
                  mediaListOptions: { scoreFormat: 'POINT_100', rowOrder: 'score' },
                  statistics: {
                    anime: { count: 12, meanScore: 80, minutesWatched: 1200, episodesWatched: 50 },
                    manga: { count: 4, meanScore: 78, chaptersRead: 20, volumesRead: 2 },
                  },
                  favourites: { anime: { nodes: [] }, manga: { nodes: [] } },
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (body.query?.includes('UserMediaListCollection')) {
          return new Response(
            JSON.stringify({ data: { MediaListCollection: { hasNextChunk: false, lists: [] } } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              Viewer: {
                id: 1,
                name: 'TestUser',
                about: null,
                avatar: null,
                bannerImage: null,
                siteUrl: 'https://anilist.co/user/TestUser',
                options: { titleLanguage: 'ROMAJI', displayAdultContent: false, profileColor: 'blue' },
                mediaListOptions: { scoreFormat: 'POINT_100', rowOrder: 'score' },
                statistics: null,
                favourites: null,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows Guest gateway on protected /my-list route and opens LoginPromptModal', () => {
    renderWithRoute('/my-list');

    expect(
      screen.getByRole('heading', { name: /track your anime & manga/i }),
    ).toBeInTheDocument();

    const loginButtons = screen.getAllByRole('button', { name: /login with anilist/i });
    fireEvent.click(loginButtons[0]!);

    expect(screen.getByRole('dialog', { name: /log in with anilist/i })).toBeInTheDocument();
  });

  it('navigates from /profile Guest gateway to Search Users tab', async () => {
    renderWithRoute('/profile');

    fireEvent.click(screen.getByRole('button', { name: /search users/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('heading', { name: /search anilist users/i })).toBeInTheDocument();
  });

  it('renders public user profile directly at /user/:username route', async () => {
    renderWithRoute('/user/Natsu');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Natsu' })).toBeInTheDocument();
    });
  });

  it('completes OAuth callback and redirects back to saved returnTo route', async () => {
    window.localStorage.setItem('aiznima:oauth_state', 'state-abc');
    window.localStorage.setItem('aiznima:oauth_return_to', '/schedule');

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        href: 'http://localhost:5173/auth/callback#access_token=live-token&expires_in=3600&state=state-abc',
        pathname: '/auth/callback',
        hash: '#access_token=live-token&expires_in=3600&state=state-abc',
      },
    });

    renderWithRoute('/auth/callback');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /airing schedule/i })).toBeInTheDocument();
    });
    expect(useAuthStore.getState().accessToken).toBe('live-token');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders mobile top header only on /profile and hides it on other routes', () => {
    renderWithRoute('/search');
    expect(screen.queryByRole('button', { name: 'Open settings' })).not.toBeInTheDocument();

    renderWithRoute('/profile');
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument();
  });

  it('shows mobile bottom navbar on top-level tabs and hides it on detail/sub-pages', () => {
    for (const rootPath of ['/', '/search', '/schedule', '/my-list', '/profile']) {
      const view = renderWithRoute(rootPath);
      expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
      view.unmount();
    }

    for (const subPath of [
      '/discover/seasonal?season=FALL&year=2026',
      '/discover/recommended',
      '/media/154587',
      '/character/1',
      '/staff/1',
      '/studio/1',
      '/user/Natsu',
      '/notifications',
      '/settings',
    ]) {
      const view = renderWithRoute(subPath);
      expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('renders 404 NotFoundPage for unknown paths', () => {
    renderWithRoute('/does-not-exist');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('resets scroll position to top whenever navigating to a different route', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo');
    scrollToSpy.mockClear();
    document.documentElement.scrollTop = 320;
    document.body.scrollTop = 180;

    renderWithRoute('/');
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });

    scrollToSpy.mockClear();
    document.documentElement.scrollTop = 540;
    document.body.scrollTop = 240;

    fireEvent.click(screen.getAllByRole('link', { name: 'Search' })[0]!);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('renders desktop Floating Glass Top-Navbar with primary nav, utilities, and account controls', () => {
    useAuthStore.setState({
      accessToken: 'token-abc',
      expiresAt: Date.now() + 60_000,
      viewer: {
        id: 1,
        name: 'FrierenUser',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        unreadNotificationCount: 4,
        options: null,
        mediaListOptions: null,
        statistics: null,
      },
    });

    renderWithRoute('/');

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: /open profile for frierenuser/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('shows warning confirmation dialog before logging out from desktop navbar', async () => {
    useAuthStore.setState({
      accessToken: 'token-abc',
      expiresAt: Date.now() + 60_000,
      viewer: {
        id: 1,
        name: 'FrierenUser',
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

    renderWithRoute('/');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    const dialog = screen.getByRole('dialog', { name: /log out of anilist\?/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('FrierenUser');
    expect(useAuthStore.getState().accessToken).toBe('token-abc');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: /log out of anilist\?/i })).not.toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('token-abc');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm log out/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: /log out of anilist\?/i })).not.toBeInTheDocument();
    expect(screen.getByText(/signed out of anilist\./i)).toBeInTheDocument();
  });
});
