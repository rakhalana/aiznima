import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContent } from './App';
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
  });

  afterEach(() => {
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

  it('renders 404 NotFoundPage for unknown paths', () => {
    renderWithRoute('/does-not-exist');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});
