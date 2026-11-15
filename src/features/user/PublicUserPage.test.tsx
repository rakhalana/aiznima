import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicUserPage } from '@/features/user/pages/PublicUserPage';
import type { UserProfile } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function RouteEcho() {
  const location = useLocation();
  return <div data-testid="route-echo">{`${location.pathname}${location.search}`}</div>;
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
        count: 10,
        meanScore: 84,
        minutesWatched: 1200,
        episodesWatched: 50,
        chaptersRead: 0,
        volumesRead: 0,
      },
      manga: {
        count: 2,
        meanScore: 88,
        minutesWatched: 0,
        episodesWatched: 0,
        chaptersRead: 40,
        volumesRead: 4,
      },
    },
    favourites: { anime: { nodes: [] }, manga: { nodes: [] } },
    ...overrides,
  };
}

function renderPublicUserRoute(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/user/:username" element={<PublicUserPage />} />
          <Route path="/search" element={<RouteEcho />} />
          <Route path="/media/:id" element={<RouteEcho />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicUserPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, viewer: null, isHydrated: true });
    usePrefsStore.setState({ guestShowAdult: false, isHydrated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders public user profile, read-only public list, and Find Users button', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        if (body.query?.includes('PublicUserProfile')) {
          return new Response(
            JSON.stringify({ data: { User: makeUser({ name: 'FrierenFan' }) } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              MediaListCollection: {
                hasNextChunk: false,
                lists: [
                  {
                    name: 'Watching',
                    isCustomList: false,
                    status: 'CURRENT',
                    entries: [
                      {
                        id: 101,
                        status: 'CURRENT',
                        score: 90,
                        progress: 8,
                        progressVolumes: 0,
                        repeat: 0,
                        priority: 0,
                        private: false,
                        notes: null,
                        startedAt: null,
                        completedAt: null,
                        updatedAt: 1700000000,
                        mediaId: 154587,
                        media: {
                          id: 154587,
                          idMal: null,
                          type: 'ANIME',
                          format: 'TV',
                          status: 'FINISHED',
                          title: { romaji: 'Sousou no Frieren', english: 'Frieren', native: null },
                          coverImage: { medium: null, large: null, extraLarge: null, color: null },
                          bannerImage: null,
                          episodes: 28,
                          chapters: null,
                          volumes: null,
                          season: 'FALL',
                          seasonYear: 2023,
                          meanScore: 91,
                          popularity: 310000,
                          isAdult: false,
                          genres: ['Adventure'],
                          nextAiringEpisode: null,
                          mediaListEntry: null,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    renderPublicUserRoute('/user/FrierenFan');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'FrierenFan' })).toBeInTheDocument();
    });

    expect(await screen.findByText('Sousou no Frieren')).toBeInTheDocument();
    expect(screen.getByText('8 / 28 ep')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in to compare/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /find users/i }));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('/search?type=USER');
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

    renderPublicUserRoute('/user/PrivateUser');

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

    renderPublicUserRoute('/user/NoSuchUser999');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user not found/i })).toBeInTheDocument();
    });
  });

  it('renders Taste Compatibility % and shared titles when authenticated without recommendations', async () => {
    useAuthStore.setState({
      accessToken: 'tok-compare',
      isHydrated: true,
      viewer: makeUser({ id: 99, name: 'MyViewer' }),
    });

    const sharedEntries = Array.from({ length: 5 }, (_, idx) => ({
      id: 500 + idx,
      status: 'COMPLETED',
      score: 88 - idx,
      progress: 12,
      progressVolumes: 0,
      repeat: 0,
      private: false,
      notes: null,
      startedAt: null,
      completedAt: null,
      updatedAt: 1700000000,
      mediaId: 1001 + idx,
      media: {
        id: 1001 + idx,
        idMal: null,
        type: 'ANIME',
        format: 'TV',
        status: 'FINISHED',
        title: {
          romaji: `Shared Show ${idx + 1}`,
          english: `Shared Show ${idx + 1}`,
          native: null,
        },
        coverImage: { medium: null, large: null, extraLarge: null, color: null },
        bannerImage: null,
        episodes: 12,
        chapters: null,
        volumes: null,
        season: 'FALL',
        seasonYear: 2024,
        meanScore: 86,
        popularity: 120000 - idx * 1000,
        isAdult: false,
        genres: ['Drama', 'Fantasy'],
        nextAiringEpisode: null,
        mediaListEntry: null,
      },
    }));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { userId?: number; userName?: string };
        };
        if (body.query?.includes('PublicUserProfile')) {
          return new Response(
            JSON.stringify({ data: { User: makeUser({ id: 7, name: 'FrierenFan' }) } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const isViewerCall = body.variables?.userId === 99;
        return new Response(
          JSON.stringify({
            data: {
              MediaListCollection: {
                hasNextChunk: false,
                lists: [
                  {
                    name: 'Completed',
                    isCustomList: false,
                    status: 'COMPLETED',
                    entries: isViewerCall
                      ? sharedEntries.map((entry) => ({
                          ...entry,
                          score: entry.score - 2,
                        }))
                      : sharedEntries,
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    renderPublicUserRoute('/user/FrierenFan');

    const compatSection = await screen.findByRole('region', {
      name: /taste compatibility/i,
    });
    expect(compatSection).toBeInTheDocument();
    expect(compatSection).toHaveTextContent(/5 shared anime/i);
    expect(compatSection).toHaveTextContent(/% Match/);
    expect(compatSection).not.toHaveTextContent(/recommended for you/i);

    // Initially shows 4 shared titles inside CompatibilityCard; expanding reveals the 5th
    expect(within(compatSection).queryByRole('button', { name: /Shared Show 5/i })).not.toBeInTheDocument();
    fireEvent.click(within(compatSection).getByRole('button', { name: /show all 5 shared anime/i }));
    expect(within(compatSection).getByRole('button', { name: /Shared Show 5/i })).toBeInTheDocument();
  });
});
