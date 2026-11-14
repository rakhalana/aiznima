import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import type { UserProfile } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

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

function renderProfileRoute(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage & Public User Lookup', () => {
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
    expect(screen.getByText('600')).toBeInTheDocument(); // episodesWatched
    expect(screen.getByText('240')).toBeInTheDocument(); // 14400 / 60 hours

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

  it('handles private public user lists gracefully (AF-05) on /user/:username', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        if (body.query?.includes('PublicUserProfile')) {
          return new Response(
            JSON.stringify({ data: { User: makeUser({ name: 'PrivateUser' }) } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            errors: [{ status: 403, message: 'User is private' }],
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    renderProfileRoute('/user/PrivateUser');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'PrivateUser' })).toBeInTheDocument();
    });
    expect(
      await screen.findByRole('heading', { name: /this user's list is private/i }),
    ).toBeInTheDocument();
  });

  it('renders User not found when lookup target does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ errors: [{ status: 404, message: 'Not Found.' }] }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderProfileRoute('/user/NoSuchUser999');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user not found/i })).toBeInTheDocument();
    });
  });
});
