import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('renders authenticated viewer stats and submits EditProfileModal UpdateUser mutation without account preferences', async () => {
    const viewer = makeUser({ name: 'RakhaViewer' });
    useAuthStore.setState({
      accessToken: 'token-123',
      expiresAt: Date.now() + 60_000,
      viewer,
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            UpdateUser: makeUser({
              name: 'RakhaViewer',
              about: '<p>Updated bio</p>',
              options: {
                titleLanguage: 'ROMAJI',
                displayAdultContent: false,
                includeAdultContentInSearch: false,
                profileColor: 'purple',
              },
            }),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderProfileRoute('/profile');

    expect(screen.getByRole('heading', { name: 'RakhaViewer' })).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(
      screen.getByRole('dialog', { name: /^edit profile$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /title language/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /score format/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /display 18\+/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /include 18\+ entries in search/i }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/write a short bio/i), {
      target: { value: 'Updated bio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /^edit profile$/i }),
      ).not.toBeInTheDocument();
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(requestInit?.body)) as {
      variables: Record<string, unknown>;
    };
    expect(body.variables).toMatchObject({ about: 'Updated bio' });
    expect(body.variables).toHaveProperty('profileColor');
    expect(body.variables).not.toHaveProperty('titleLanguage');
    expect(body.variables).not.toHaveProperty('scoreFormat');
    expect(body.variables).not.toHaveProperty('displayAdultContent');
    expect(body.variables).not.toHaveProperty('includeAdultContentInSearch');
    expect(useAuthStore.getState().viewer?.options?.profileColor).toBe('purple');
  });

  it('switches to Deep Stats tab, displays Taste DNA + Genre Matrix + Studio Loyalty, and opens local drill-down modal', async () => {
    const viewer = makeUser({ name: 'DeepStatsUser' });
    useAuthStore.setState({
      accessToken: 'token-deep',
      expiresAt: Date.now() + 60_000,
      viewer,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { type?: string };
        };

        if (body.query?.includes('ViewerDeepStatistics')) {
          return new Response(
            JSON.stringify({
              data: {
                Viewer: {
                  id: 7,
                  name: 'DeepStatsUser',
                  statistics: {
                    anime: {
                      count: 18,
                      meanScore: 84,
                      standardDeviation: 11.2,
                      minutesWatched: 6400,
                      episodesWatched: 270,
                      genres: [
                        { genre: 'Action', count: 10, meanScore: 76, minutesWatched: 3200, mediaIds: [101] },
                        { genre: 'Drama', count: 6, meanScore: 91, minutesWatched: 1800, mediaIds: [102] },
                        { genre: 'Psychological', count: 4, meanScore: 93, minutesWatched: 1200, mediaIds: [102] },
                      ],
                      tags: [
                        {
                          count: 4,
                          meanScore: 92,
                          minutesWatched: 1200,
                          mediaIds: [102],
                          tag: { id: 50, name: 'Time Travel', category: 'Theme-Sci-Fi', isGeneralSpoiler: false, isAdult: false },
                        },
                      ],
                      studios: [
                        { count: 4, meanScore: 91, minutesWatched: 1300, mediaIds: [102], studio: { id: 11, name: 'Madhouse', isAnimationStudio: true } },
                      ],
                      voiceActors: [],
                      staff: [],
                      formats: [{ format: 'TV', count: 16, meanScore: 84, minutesWatched: 5800, mediaIds: [101, 102] }],
                      statuses: [{ status: 'COMPLETED', count: 15, meanScore: 85, minutesWatched: 5400, mediaIds: [101, 102] }],
                      scores: [{ score: 90, count: 6, minutesWatched: 1800, mediaIds: [102] }],
                      lengths: [{ length: '11-25', count: 12, meanScore: 86, minutesWatched: 4200, mediaIds: [102] }],
                      releaseYears: [{ releaseYear: 2011, count: 5, meanScore: 92, minutesWatched: 1600, mediaIds: [102] }],
                      countries: [{ country: 'JP', count: 18, meanScore: 84, minutesWatched: 6400, mediaIds: [101, 102] }],
                    },
                    manga: {
                      count: 5,
                      meanScore: 89,
                      standardDeviation: 8.5,
                      chaptersRead: 210,
                      volumesRead: 20,
                      genres: [{ genre: 'Mystery', count: 4, meanScore: 90, chaptersRead: 160, mediaIds: [201] }],
                      tags: [],
                      staff: [{ count: 3, meanScore: 91, chaptersRead: 140, mediaIds: [201], staff: { id: 99, name: { full: 'Naoki Urasawa', native: null }, primaryOccupations: ['Mangaka'], image: null } }],
                      formats: [{ format: 'MANGA', count: 5, meanScore: 89, chaptersRead: 210, mediaIds: [201] }],
                      statuses: [],
                      scores: [],
                      lengths: [],
                      releaseYears: [],
                      countries: [],
                    },
                  },
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.query?.includes('UserMediaListCollection')) {
          const isManga = body.variables?.type === 'MANGA';
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
                      entries: isManga
                        ? [
                            {
                              id: 901,
                              mediaId: 201,
                              status: 'COMPLETED',
                              score: 90,
                              progress: 162,
                              progressVolumes: 18,
                              repeat: 0,
                              private: false,
                              notes: null,
                              startedAt: null,
                              completedAt: null,
                              updatedAt: 1700000000,
                              media: {
                                id: 201,
                                idMal: null,
                                type: 'MANGA',
                                format: 'MANGA',
                                status: 'FINISHED',
                                title: { romaji: 'Monster', english: 'Monster', native: null },
                                coverImage: null,
                                bannerImage: null,
                                episodes: null,
                                chapters: 162,
                                volumes: 18,
                                duration: null,
                                source: 'ORIGINAL',
                                season: null,
                                seasonYear: 1994,
                                meanScore: 91,
                                popularity: 210000,
                                genres: ['Mystery'],
                                isAdult: false,
                                nextAiringEpisode: null,
                                mediaListEntry: null,
                              },
                            },
                          ]
                        : [
                            {
                              id: 801,
                              mediaId: 102,
                              status: 'COMPLETED',
                              score: 92,
                              progress: 24,
                              progressVolumes: null,
                              repeat: 1,
                              private: false,
                              notes: null,
                              startedAt: null,
                              completedAt: null,
                              updatedAt: 1700000000,
                              media: {
                                id: 102,
                                idMal: null,
                                type: 'ANIME',
                                format: 'TV',
                                status: 'FINISHED',
                                title: { romaji: 'Steins;Gate', english: 'Steins;Gate', native: null },
                                coverImage: null,
                                bannerImage: null,
                                episodes: 24,
                                chapters: null,
                                volumes: null,
                                duration: 24,
                                source: 'VISUAL_NOVEL',
                                season: 'SPRING',
                                seasonYear: 2011,
                                meanScore: 91,
                                popularity: 600000,
                                genres: ['Drama', 'Psychological'],
                                isAdult: false,
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
        }

        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    renderProfileRoute('/profile');

    fireEvent.click(screen.getByRole('tab', { name: /deep stats/i }));

    expect(
      await screen.findByText(/Genre Matrix \(Quantity vs Quality\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('2010–2014')).toBeInTheDocument();
    expect(screen.getAllByText('Visual Novel').length).toBeGreaterThan(0);
    expect(screen.getByText('Madhouse')).toBeInTheDocument();
    expect(screen.getByText('Time Travel')).toBeInTheDocument();

    // Local drill-down modal opens without leaving /profile
    fireEvent.click(screen.getByRole('button', { name: /Madhouse/i }));
    const modal = await screen.findByRole('dialog', { name: /Madhouse \(4\)/i });
    expect(within(modal).getByText('Steins;Gate')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: /close modal/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Switch to Manga deep stats
    fireEvent.click(screen.getByRole('tab', { name: 'Manga' }));
    expect(await screen.findByText('Naoki Urasawa')).toBeInTheDocument();
  });
});
