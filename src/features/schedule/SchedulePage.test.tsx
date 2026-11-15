import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPromptModal } from '@/features/auth/components/LoginPromptModal';
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

  it('prompts login for Guest on My List filter and filters personal Watching/My List with Behind badges when authenticated', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const makeScheduleItem = (id: number, mediaId: number, episode: number, romaji: string) => ({
      id,
      airingAt: nowSec + 3600,
      timeUntilAiring: 3600,
      episode,
      mediaId,
      media: {
        id: mediaId,
        type: 'ANIME',
        format: 'TV',
        status: 'RELEASING',
        title: { romaji, english: romaji, native: null },
        coverImage: { large: null, extraLarge: null, color: null },
        bannerImage: null,
        episodes: 12,
        chapters: null,
        volumes: null,
        season: 'FALL',
        seasonYear: 2026,
        meanScore: 84,
        averageScore: 84,
        popularity: 2000,
        isAdult: false,
        genres: ['Action'],
        nextAiringEpisode: null,
        mediaListEntry: null,
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        if (body.query?.includes('UserMediaListCollection')) {
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
                          id: 901,
                          mediaId: 101,
                          status: 'CURRENT',
                          score: 80,
                          progress: 5,
                          progressVolumes: 0,
                          repeat: 0,
                          private: false,
                          notes: null,
                          startedAt: null,
                          completedAt: null,
                          updatedAt: 1700000000,
                          media: makeScheduleItem(1, 101, 10, 'My Watching Show').media,
                        },
                      ],
                    },
                    {
                      name: 'Planning',
                      isCustomList: false,
                      status: 'PLANNING',
                      entries: [
                        {
                          id: 902,
                          mediaId: 102,
                          status: 'PLANNING',
                          score: 0,
                          progress: 0,
                          progressVolumes: 0,
                          repeat: 0,
                          private: false,
                          notes: null,
                          startedAt: null,
                          completedAt: null,
                          updatedAt: 1700000000,
                          media: makeScheduleItem(2, 102, 3, 'My Planning Show').media,
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

        return new Response(
          JSON.stringify({
            data: {
              Page: {
                airingSchedules: [
                  makeScheduleItem(1, 101, 10, 'My Watching Show'),
                  makeScheduleItem(2, 102, 3, 'My Planning Show'),
                  makeScheduleItem(3, 103, 4, 'Unlisted Show'),
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SchedulePage />
          <LoginPromptModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Unlisted Show')).toBeInTheDocument();

    // Guest clicking My List triggers LoginPromptModal
    fireEvent.click(screen.getByRole('tab', { name: 'My List' }));
    expect(screen.getByRole('dialog', { name: /log in with anilist/i })).toBeInTheDocument();

    // Authenticated user loads personal status & Behind badges
    useAuthStore.setState({
      accessToken: 'sched-tok',
      viewer: {
        id: 42,
        name: 'Tester',
        about: null,
        avatar: null,
        bannerImage: null,
        siteUrl: null,
        options: null,
        mediaListOptions: null,
        statistics: null,
        favourites: null,
      },
      isHydrated: true,
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SchedulePage />
          <LoginPromptModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Waiting for my-list badges to appear on cards: 10-1-5 = 4 behind for 101, 3-1-0 = 2 behind for 102
    expect(await screen.findByText('Behind 4 ep')).toBeInTheDocument();
    expect(screen.getByText('Behind 2 ep')).toBeInTheDocument();
    expect(screen.getByText('Watching', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Planning', { selector: 'span' })).toBeInTheDocument();

    // Switch to My List -> Unlisted Show disappears
    fireEvent.click(screen.getByRole('tab', { name: 'My List' }));
    expect(screen.getByText('My Watching Show')).toBeInTheDocument();
    expect(screen.getByText('My Planning Show')).toBeInTheDocument();
    expect(screen.queryByText('Unlisted Show')).not.toBeInTheDocument();

    // Switch to Watching -> Planning disappears
    fireEvent.click(screen.getByRole('tab', { name: 'Watching' }));
    expect(screen.getByText('My Watching Show')).toBeInTheDocument();
    expect(screen.queryByText('My Planning Show')).not.toBeInTheDocument();
  });
});
