import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscoverPage } from '@/features/discover/pages/DiscoverPage';
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
    season: 'FALL',
    seasonYear: 2026,
    meanScore: overrides.meanScore ?? 85,
    popularity: 10000,
    isAdult: overrides.isAdult ?? false,
    genres: ['Action', 'Drama'],
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

  it('renders Anime sections and HeroBanner without Anime/Manga tabs, and navigates via Discover Notification button', async () => {
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

      return new Response(
        JSON.stringify({
          data: {
            trending: { media: [makeMedia({ id: 101, title: { romaji: 'Frieren', english: 'Frieren', native: null } })] },
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
    expect(screen.getByRole('heading', { name: 'Top Rated Anime' })).toBeInTheDocument();

    expect(screen.queryByRole('tab', { name: 'Anime' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Manga' })).not.toBeInTheDocument();

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
});
