import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import type { UserProfile } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function SearchRedirectEcho() {
  const location = useLocation();
  return <div data-testid="search-route">{`${location.pathname}${location.search}`}</div>;
}

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 7,
    name: 'Himmel',
    about: '<p>Hero of the party</p>',
    avatar: { large: null, medium: null },
    bannerImage: null,
    siteUrl: 'https://anilist.co/user/Himmel',
    options: {
      titleLanguage: 'ROMAJI',
      displayAdultContent: false,
      includeAdultContentInSearch: false,
      profileColor: 'blue',
    },
    mediaListOptions: { scoreFormat: 'POINT_100', rowOrder: 'score' },
    statistics: {
      anime: {
        count: 48,
        meanScore: 84,
        minutesWatched: 14400,
        episodesWatched: 600,
        chaptersRead: 0,
        volumesRead: 0,
      },
      manga: {
        count: 15,
        meanScore: 88,
        minutesWatched: 0,
        episodesWatched: 0,
        chaptersRead: 320,
        volumesRead: 25,
      },
    },
    favourites: { anime: { nodes: [] }, manga: { nodes: [] } },
    ...overrides,
  };
}

function renderProfileRoute(initialEntry = '/profile') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/search" element={<SearchRedirectEcho />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePrefsStore.setState({ guestShowAdult: false, isHydrated: true });
    useAuthStore.setState({
      accessToken: null,
      expiresAt: null,
      viewer: null,
      isHydrated: true,
      sessionExpiredFlag: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers Search Users shortcut on Guest gateway instead of inline public lookup', () => {
    renderProfileRoute('/profile');

    expect(screen.queryByPlaceholderText(/enter anilist username/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /search users/i }));

    expect(screen.getByTestId('search-route')).toHaveTextContent('/search?type=USER');
  });

  it('renders authenticated viewer stats and submits EditProfileModal UpdateUser mutation', async () => {
    const viewer = makeUser({ name: 'RakhaViewer' });
    useAuthStore.setState({
      accessToken: 'token-123',
      expiresAt: Date.now() + 60_000,
      viewer,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              UpdateUser: makeUser({
                name: 'RakhaViewer',
                about: '<p>Updated bio</p>',
                options: {
                  titleLanguage: 'ENGLISH',
                  displayAdultContent: false,
                  includeAdultContentInSearch: false,
                  profileColor: 'purple',
                },
              }),
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderProfileRoute('/profile');

    expect(screen.getByRole('heading', { name: 'RakhaViewer' })).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(
      screen.getByRole('dialog', { name: /edit profile & preferences/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/write a short bio/i), {
      target: { value: 'Updated bio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /edit profile & preferences/i }),
      ).not.toBeInTheDocument();
    });
    expect(useAuthStore.getState().viewer?.options?.titleLanguage).toBe('ENGLISH');
  });
});
