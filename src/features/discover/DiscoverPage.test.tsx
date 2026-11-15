import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscoverPage } from '@/features/discover/pages/DiscoverPage';
import { RecommendedPage } from '@/features/discover/pages/RecommendedPage';
import type { MediaSummary } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function makeMedia(overrides: Partial<MediaSummary> & { id: number }): MediaSummary {
  return {
    id: overrides.id,
    idMal: overrides.idMal ?? null,
    type: overrides.type ?? 'ANIME',
    format: overrides.format ?? 'TV',
    status: overrides.status ?? 'RELEASING',
    title: overrides.title ?? {
      romaji: `Media ${overrides.id}`,
      english: `Media ${overrides.id}`,
      native: `メディア ${overrides.id}`,
    },
    coverImage: {
      medium: `https://example.com/${overrides.id}-m.jpg`,
      large: `https://example.com/${overrides.id}.jpg`,
      extraLarge: `https://example.com/${overrides.id}-xl.jpg`,
      color: '#2563EB',
    },
    bannerImage: `https://example.com/${overrides.id}-banner.jpg`,
    episodes: overrides.episodes ?? 12,
    chapters: overrides.chapters ?? null,
    volumes: overrides.volumes ?? null,
    season: overrides.season ?? 'FALL',
    seasonYear: overrides.seasonYear ?? 2026,
    meanScore: overrides.meanScore ?? 85,
    popularity: overrides.popularity ?? 10000,
    isAdult: overrides.isAdult ?? false,
    genres: overrides.genres ?? ['Action', 'Drama'],
    studios: overrides.studios ?? null,
    relations: overrides.relations ?? null,
    nextAiringEpisode: null,
    mediaListEntry: null,
  };
}

describe('DiscoverPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ accessToken: null, viewer: null, isHydrated: true });
    usePrefsStore.setState({
      activeMediaType: 'ANIME',
      guestShowAdult: false,
      isHydrated: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders Anime/Manga tabs, caps sections to 5 items with See all links, and navigates via Notification button', async () => {
    useAuthStore.setState({
      accessToken: 'test-token',
      isHydrated: true,
      viewer: {
        id: 1,
        name: 'Tester',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        unreadNotificationCount: 3,
        options: null,
        mediaListOptions: null,
        statistics: null,
      },
    });

    const sixAnimeItems = Array.from({ length: 6 }, (_, idx) =>
      makeMedia({
        id: 101 + idx,
        title: {
          romaji: idx === 0 ? 'Frieren' : `Anime ${idx + 1}`,
          english: idx === 0 ? 'Frieren' : `Anime ${idx + 1}`,
          native: null,
        },
      }),
    );

    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('UnreadNotificationCount')) {
        return new Response(
          JSON.stringify({
            data: {
              Viewer: {
                id: 1,
                unreadNotificationCount: 3,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('DiscoverManga')) {
        return new Response(
          JSON.stringify({
            data: {
              trending: {
                media: [
                  makeMedia({
                    id: 201,
                    type: 'MANGA',
                    format: 'MANGA',
                    episodes: null,
                    chapters: 140,
                    title: { romaji: 'Witch Hat Manga', english: 'Witch Hat Manga', native: null },
                  }),
                ],
              },
              popular: {
                media: [
                  makeMedia({
                    id: 202,
                    type: 'MANGA',
                    format: 'MANGA',
                    episodes: null,
                    chapters: 300,
                    title: { romaji: 'Berserk', english: 'Berserk', native: null },
                  }),
                ],
              },
              releasing: { media: [] },
              topRated: { media: [] },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            trending: { media: sixAnimeItems },
            popularSeason: { media: [makeMedia({ id: 102, title: { romaji: 'Dandadan', english: 'Dandadan', native: null } })] },
            upcoming: { media: [makeMedia({ id: 103, title: { romaji: 'Witch Hat Atelier', english: 'Witch Hat Atelier', native: null } })] },
            topRated: { media: [makeMedia({ id: 104, title: { romaji: 'Fullmetal Alchemist', english: 'Fullmetal Alchemist', native: null } })] },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const LocationSpy = () => {
      const loc = useLocation();
      return <div data-testid="path-echo">{loc.pathname}</div>;
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <DiscoverPage />
                  <LocationSpy />
                </>
              }
            />
            <Route path="/notifications" element={<LocationSpy />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('#1 Trending')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trending Now' })).toBeInTheDocument();
    const seasonalHeading = screen.getByRole('heading', { name: /^Seasonal: /i });
    expect(seasonalHeading).toBeInTheDocument();
    expect(seasonalHeading.closest('section')?.querySelector('a')?.getAttribute('href')).toMatch(
      /^\/discover\/seasonal\?season=/,
    );
    const upcomingHeading = screen.getByRole('heading', { name: /^Upcoming/i });
    expect(upcomingHeading).toBeInTheDocument();
    expect(upcomingHeading.closest('section')?.querySelector('a')?.getAttribute('href')).toMatch(
      /^\/discover\/seasonal\?season=/,
    );
    expect(screen.getByRole('heading', { name: 'Top Rated Anime' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Anime 5' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Anime 6' })).not.toBeInTheDocument();

    const animeTab = screen.getByRole('tab', { name: 'Anime' });
    const mangaTab = screen.getByRole('tab', { name: 'Manga' });
    expect(animeTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(mangaTab);
    expect(await screen.findByRole('heading', { name: 'Trending Manga' })).toBeInTheDocument();
    expect(usePrefsStore.getState().activeMediaType).toBe('MANGA');
    const seeAllLinks = screen.getAllByRole('link', { name: /see all/i });
    expect(seeAllLinks[0]).toHaveAttribute('href', '/search?type=MANGA&sort=TRENDING_DESC');

    const notifButton = screen.getByRole('button', { name: /notifications/i });
    expect(notifButton).toHaveTextContent('3');

    fireEvent.click(notifButton);
    await waitFor(() => {
      expect(screen.getByTestId('path-echo')).toHaveTextContent('/notifications');
    });

    useAuthStore.setState({ accessToken: null, viewer: null });
  });

  it('keeps cached sections visible with cached fallback banner when a refetch fails (AF-03/AF-04)', async () => {
    let shouldFail = false;
    const fetchMock = vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new TypeError('Network request failed');
      }
      return new Response(
        JSON.stringify({
          data: {
            trending: { media: [makeMedia({ id: 101, title: { romaji: 'Cached Anime', english: 'Cached Anime', native: null } })] },
            popularSeason: { media: [] },
            upcoming: { media: [] },
            topRated: { media: [] },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscoverPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Cached Anime' })).toBeInTheDocument();
    });

    shouldFail = true;
    await act(async () => {
      await queryClient.refetchQueries();
    });

    await waitFor(() => {
      expect(screen.getByText('Showing cached data')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Cached Anime' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('hides Recommended For You when Guest or user has < 3 titles, and renders Taste Match + In Planning + See all when ready', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };

      if (body.query?.includes('ViewerDeepStatistics')) {
        return new Response(
          JSON.stringify({
            data: {
              Viewer: {
                id: 7,
                name: 'TasteTester',
                statistics: {
                  anime: {
                    count: 6,
                    meanScore: 86,
                    standardDeviation: 9.5,
                    minutesWatched: 1500,
                    episodesWatched: 60,
                    genres: [
                      { genre: 'Drama', count: 5, meanScore: 90, minutesWatched: 1200, mediaIds: [1, 2, 3, 4, 5] },
                      { genre: 'Psychological', count: 4, meanScore: 92, minutesWatched: 900, mediaIds: [1, 2, 3, 4] },
                    ],
                    tags: [
                      {
                        count: 4,
                        meanScore: 91,
                        minutesWatched: 900,
                        mediaIds: [1, 2],
                        tag: { id: 50, name: 'Time Travel', category: 'Theme-Sci-Fi', isGeneralSpoiler: false, isAdult: false },
                      },
                    ],
                    studios: [
                      { count: 3, meanScore: 92, minutesWatched: 800, mediaIds: [1, 2, 3], studio: { id: 11, name: 'Madhouse', isAnimationStudio: true } },
                    ],
                    voiceActors: [],
                    staff: [],
                    formats: [{ format: 'TV', count: 6, meanScore: 86, minutesWatched: 1500, mediaIds: [1] }],
                    statuses: [{ status: 'COMPLETED', count: 5, meanScore: 86, minutesWatched: 1500, mediaIds: [1] }],
                    scores: [],
                    lengths: [],
                    releaseYears: [{ releaseYear: 2011, count: 4, meanScore: 91, minutesWatched: 1100, mediaIds: [1] }],
                    countries: [],
                  },
                  manga: { count: 0, meanScore: 0, chaptersRead: 0, volumesRead: 0 },
                },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('UserMediaListCollection')) {
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
                    entries: [
                      {
                        id: 1001,
                        mediaId: 9001,
                        status: 'COMPLETED',
                        score: 90,
                        progress: 12,
                        progressVolumes: null,
                        repeat: 0,
                        private: false,
                        notes: null,
                        startedAt: null,
                        completedAt: null,
                        updatedAt: 1700000000,
                        media: makeMedia({ id: 9001, title: { romaji: 'Already Watched Hit', english: 'Already Watched Hit', native: null } }),
                      },
                    ],
                  },
                  {
                    name: 'Planning',
                    isCustomList: false,
                    status: 'PLANNING',
                    entries: [
                      {
                        id: 1002,
                        mediaId: 9002,
                        status: 'PLANNING',
                        score: 0,
                        progress: 0,
                        progressVolumes: null,
                        repeat: 0,
                        private: false,
                        notes: null,
                        startedAt: null,
                        completedAt: null,
                        updatedAt: 1700000000,
                        media: makeMedia({ id: 9002, title: { romaji: 'Planned Gem Show', english: 'Planned Gem Show', native: null } }),
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

      if (body.query?.includes('PersonalizedRecommendations')) {
        return new Response(
          JSON.stringify({
            data: {
              topGenreHits: {
                media: [
                  makeMedia({
                    id: 9001,
                    title: { romaji: 'Already Watched Hit', english: 'Already Watched Hit', native: null },
                    genres: ['Drama', 'Psychological'],
                  }),
                  makeMedia({
                    id: 9002,
                    status: 'FINISHED',
                    seasonYear: 2011,
                    popularity: 42_000,
                    meanScore: 87,
                    title: { romaji: 'Planned Gem Show', english: 'Planned Gem Show', native: null },
                    genres: ['Drama', 'Psychological'],
                    studios: { nodes: [{ id: 11, name: 'Madhouse', isAnimationStudio: true }] },
                  }),
                  makeMedia({
                    id: 9003,
                    status: 'NOT_YET_RELEASED',
                    title: { romaji: 'Unreleased Future', english: 'Unreleased Future', native: null },
                    genres: ['Drama'],
                  }),
                  makeMedia({
                    id: 9004,
                    status: 'FINISHED',
                    seasonYear: 2012,
                    popularity: 160_000,
                    meanScore: 89,
                    title: { romaji: 'Madhouse Masterpiece', english: 'Madhouse Masterpiece', native: null },
                    genres: ['Drama', 'Psychological'],
                    studios: { nodes: [{ id: 11, name: 'Madhouse', isAnimationStudio: true }] },
                  }),
                  makeMedia({
                    id: 9010,
                    status: 'FINISHED',
                    seasonYear: 2015,
                    popularity: 120_000,
                    meanScore: 88,
                    title: { romaji: 'Franchise Season 2', english: 'Franchise Season 2', native: null },
                    genres: ['Drama', 'Psychological'],
                    studios: { nodes: [{ id: 11, name: 'Madhouse', isAnimationStudio: true }] },
                    relations: {
                      edges: [
                        {
                          relationType: 'PREQUEL',
                          node: { id: 9011, type: 'ANIME', status: 'FINISHED' },
                        },
                      ],
                    },
                  }),
                ],
              },
              eraGems: { media: [] },
              hiddenGems: { media: [] },
              topStudio: { media: { nodes: [] } },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('PersonalizedRecommendationPrequels')) {
        return new Response(
          JSON.stringify({
            data: {
              Page: {
                media: [
                  makeMedia({
                    id: 9011,
                    status: 'FINISHED',
                    seasonYear: 2011,
                    popularity: 110_000,
                    meanScore: 88,
                    title: { romaji: 'Franchise Season 1', english: 'Franchise Season 1', native: null },
                    genres: ['Drama', 'Psychological'],
                    studios: { nodes: [{ id: 11, name: 'Madhouse', isAnimationStudio: true }] },
                  }),
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('UnreadNotificationCount')) {
        return new Response(
          JSON.stringify({ data: { Viewer: { unreadNotificationCount: 0 } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            trending: { media: [makeMedia({ id: 101, title: { romaji: 'Trending Show', english: 'Trending Show', native: null } })] },
            popularSeason: { media: [] },
            upcoming: { media: [] },
            topRated: { media: [] },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    // 1. Cold start (< 3 titles) stays completely hidden
    useAuthStore.setState({
      accessToken: 'tok-cold',
      isHydrated: true,
      viewer: {
        id: 7,
        name: 'NewUser',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        options: null,
        mediaListOptions: null,
        statistics: {
          anime: { count: 2, meanScore: 80, minutesWatched: 120, episodesWatched: 5, chaptersRead: 0, volumesRead: 0 },
          manga: { count: 0, meanScore: 0, minutesWatched: 0, episodesWatched: 0, chaptersRead: 0, volumesRead: 0 },
        },
      },
    });

    const qc1 = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={qc1}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/discover/recommended" element={<RecommendedPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Trending Now' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recommended For You' })).not.toBeInTheDocument();
    unmount();

    // 2. Ready user (>= 3 titles) sees Recommended For You + In Planning + See all route filters
    useAuthStore.setState({
      accessToken: 'tok-ready',
      isHydrated: true,
      viewer: {
        id: 7,
        name: 'TasteTester',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        options: null,
        mediaListOptions: null,
        statistics: {
          anime: { count: 6, meanScore: 86, minutesWatched: 1500, episodesWatched: 60, chaptersRead: 0, volumesRead: 0 },
          manga: { count: 0, meanScore: 0, minutesWatched: 0, episodesWatched: 0, chaptersRead: 0, volumesRead: 0 },
        },
      },
    });

    const qc2 = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc2}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/discover/recommended" element={<RecommendedPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Recommended For You' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Planned Gem Show')).toBeInTheDocument();
    expect(screen.getByText('In Planning')).toBeInTheDocument();
    expect(screen.getByText('Madhouse Masterpiece')).toBeInTheDocument();
    expect(screen.getByText('Franchise Season 1')).toBeInTheDocument();
    expect(screen.queryByText('Franchise Season 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Already Watched Hit')).not.toBeInTheDocument();
    expect(screen.queryByText('Unreleased Future')).not.toBeInTheDocument();

    // Navigate via See all link to RecommendedPage and test Hidden Gems filter pill
    const recSection = screen
      .getByRole('heading', { name: 'Recommended For You' })
      .closest('section')!;
    const seeAllRec = recSection.querySelector('a')!;
    expect(seeAllRec).toHaveAttribute('href', '/discover/recommended?type=ANIME');
    fireEvent.click(seeAllRec);

    expect(
      await screen.findByRole('button', { name: 'Hidden Gems' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hidden Gems' }));
    expect(screen.getByText('Planned Gem Show')).toBeInTheDocument();
    expect(screen.queryByText('Madhouse Masterpiece')).not.toBeInTheDocument();
  });
});
