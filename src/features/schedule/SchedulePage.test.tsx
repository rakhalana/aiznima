import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDayBoundsSeconds } from '@/features/schedule/api/scheduleQueries';
import { SchedulePage } from '@/features/schedule/pages/SchedulePage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

describe('SchedulePage', () => {
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

  it('filters out 18+ entries client-side in safe mode and displays countdown & episode number', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              Page: {
                airingSchedules: [
                  {
                    id: 1,
                    airingAt: nowSec + 3600,
                    timeUntilAiring: 3600,
                    episode: 5,
                    mediaId: 500,
                    media: {
                      id: 500,
                      type: 'ANIME',
                      format: 'TV',
                      status: 'RELEASING',
                      title: { romaji: 'Safe Show', english: 'Safe Show', native: null },
                      coverImage: { large: 'https://example.com/500.jpg', extraLarge: null, color: null },
                      bannerImage: null,
                      episodes: 12,
                      chapters: null,
                      volumes: null,
                      season: 'FALL',
                      seasonYear: 2026,
                      meanScore: 80,
                      averageScore: 80,
                      popularity: 2000,
                      isAdult: false,
                      genres: ['Action'],
                      nextAiringEpisode: null,
                      mediaListEntry: null,
                    },
                  },
                  {
                    id: 2,
                    airingAt: nowSec + 7200,
                    timeUntilAiring: 7200,
                    episode: 1,
                    mediaId: 501,
                    media: {
                      id: 501,
                      type: 'ANIME',
                      format: 'OVA',
                      status: 'RELEASING',
                      title: { romaji: 'Hidden 18+ Show', english: 'Hidden 18+ Show', native: null },
                      coverImage: { large: 'https://example.com/501.jpg', extraLarge: null, color: null },
                      bannerImage: null,
                      episodes: 2,
                      chapters: null,
                      volumes: null,
                      season: 'FALL',
                      seasonYear: 2026,
                      meanScore: 70,
                      averageScore: 70,
                      popularity: 500,
                      isAdult: true,
                      genres: ['Hentai'],
                      nextAiringEpisode: null,
                      mediaListEntry: null,
                    },
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SchedulePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Safe Show')).toBeInTheDocument();
    });

    expect(screen.queryByText('Hidden 18+ Show')).not.toBeInTheDocument();
    expect(screen.getByText(/Episode 5/)).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
  });

  it('shows EmptyState on an empty future day with View Today shortcut', async () => {
    const todayBounds = getDayBoundsSeconds(0);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          variables?: { start?: number };
        };
        const isToday = body.variables?.start === todayBounds.start;
        return new Response(
          JSON.stringify({
            data: {
              Page: {
                airingSchedules: isToday
                  ? [
                      {
                        id: 1,
                        airingAt: todayBounds.start + 1800,
                        timeUntilAiring: 1800,
                        episode: 9,
                        mediaId: 777,
                        media: {
                          id: 777,
                          type: 'ANIME',
                          format: 'TV',
                          status: 'RELEASING',
                          title: { romaji: 'Today Anime', english: 'Today Anime', native: null },
                          coverImage: { large: null, extraLarge: null, color: null },
                          bannerImage: null,
                          episodes: 12,
                          chapters: null,
                          volumes: null,
                          season: 'FALL',
                          seasonYear: 2026,
                          meanScore: 82,
                          averageScore: 82,
                          popularity: 1200,
                          isAdult: false,
                          genres: ['Drama'],
                          nextAiringEpisode: null,
                          mediaListEntry: null,
                        },
                      },
                    ]
                  : [],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SchedulePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Today Anime')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /tomorrow/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no episodes scheduled/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view today/i }));

    await waitFor(() => {
      expect(screen.getByText('Today Anime')).toBeInTheDocument();
    });
  });
});
