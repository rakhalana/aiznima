import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from '@/features/search/pages/SearchPage';
import type { MediaSummary } from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function makeSearchMedia(id: number, title: string): MediaSummary {
  return {
    id,
    idMal: null,
    type: 'ANIME',
    format: 'TV',
    status: 'FINISHED',
    title: { romaji: title, english: title, native: null },
    coverImage: {
      medium: null,
      large: `https://example.com/${id}.jpg`,
      extraLarge: null,
      color: null,
    },
    bannerImage: null,
    episodes: 24,
    chapters: null,
    volumes: null,
    season: 'SPRING',
    seasonYear: 2025,
    meanScore: 88,
    popularity: 5000,
    isAdult: false,
    genres: ['Mystery'],
    nextAiringEpisode: null,
    mediaListEntry: null,
  };
}

describe('SearchPage', () => {
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

  it('renders search results and opens FilterSheet with genre/tag metadata', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { genre_in?: string[] };
      };

      if (body.query?.includes('SearchMetaCollections')) {
        return new Response(
          JSON.stringify({
            data: {
              GenreCollection: ['Action', 'Mystery', 'Hentai'],
              MediaTagCollection: [
                { id: 1, name: 'Time Loop', category: 'Theme', isAdult: false },
                { id: 2, name: 'Adult Only', category: 'Sexual', isAdult: true },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const items = body.variables?.genre_in?.includes('Action')
        ? [makeSearchMedia(2, 'Attack on Titan')]
        : [makeSearchMedia(1, 'Steins;Gate')];

      return new Response(
        JSON.stringify({
          data: {
            Page: {
              pageInfo: { total: items.length, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
              media: items,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/search']}>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Steins;Gate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const dialog = await screen.findByRole('dialog', { name: /filter & sort/i });
    expect(dialog).toBeInTheDocument();

    // Adult genre/tag filtered out in safe mode
    expect(screen.queryByRole('button', { name: 'Hentai' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adult Only' })).not.toBeInTheDocument();

    // Open custom Sort By dropdown inside FilterSheet and switch option without closing sheet
    fireEvent.click(screen.getByLabelText('Sort By'));
    fireEvent.click(screen.getByRole('option', { name: 'Highest Score' }));
    expect(screen.getByRole('dialog', { name: /filter & sort/i })).toBeInTheDocument();

    // Year input preserves partial keystrokes while typing character-by-character
    const yearInput = screen.getByLabelText('Year');
    fireEvent.change(yearInput, { target: { value: '2' } });
    expect(yearInput).toHaveValue('2');
    fireEvent.change(yearInput, { target: { value: '20' } });
    expect(yearInput).toHaveValue('20');
    fireEvent.change(yearInput, { target: { value: '2026' } });
    expect(yearInput).toHaveValue('2026');

    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(screen.getByText('Attack on Titan')).toBeInTheDocument();
    });

    const hasYear2026 = fetchMock.mock.calls.some(([, init]) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        variables?: { seasonYear?: number };
      };
      return body.variables?.seasonYear === 2026;
    });
    expect(hasYear2026).toBe(true);
  });

  it('shows EmptyState when search yields no results and resets filters via Reset Filters', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { search?: string };
      };

      if (body.query?.includes('SearchMetaCollections')) {
        return new Response(
          JSON.stringify({ data: { GenreCollection: ['Action'], MediaTagCollection: [] } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const items =
        body.variables?.search === 'nonexistent-xyz'
          ? []
          : [makeSearchMedia(10, 'Cowboy Bebop')];

      return new Response(
        JSON.stringify({
          data: {
            Page: {
              pageInfo: { total: items.length, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
              media: items,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/search?q=nonexistent-xyz']}>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no results found/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() => {
      expect(screen.getByText('Cowboy Bebop')).toBeInTheDocument();
    });
  });

  it('supports Character, Staff, Studios, and Users search tabs with adaptive FilterSheet', async () => {
    function RouteEcho() {
      const location = useLocation();
      return <div data-testid="route-echo">{location.pathname}</div>;
    }

    const userSearchCalls: unknown[] = [];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { search?: string; isBirthday?: boolean };
        };

        if (body.query?.includes('SearchMetaCollections')) {
          return new Response(
            JSON.stringify({ data: { GenreCollection: ['Action'], MediaTagCollection: [] } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.query?.includes('SearchCharacters')) {
          return new Response(
            JSON.stringify({
              data: {
                Page: {
                  pageInfo: { total: 1, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                  characters: [
                    {
                      id: 17,
                      name: { full: 'Frieren', native: 'フリーレン' },
                      image: { medium: null, large: null },
                      favourites: 24500,
                      media: {
                        nodes: [
                          {
                            id: 154587,
                            type: 'ANIME',
                            isAdult: false,
                            title: {
                              romaji: 'Sousou no Frieren',
                              english: 'Frieren: Beyond Journey’s End',
                              native: '葬送のフリーレン',
                            },
                          },
                          {
                            id: 118586,
                            type: 'MANGA',
                            isAdult: false,
                            title: {
                              romaji: 'Sousou no Frieren Manga',
                              english: 'Frieren Manga',
                              native: null,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.query?.includes('SearchStaff')) {
          return new Response(
            JSON.stringify({
              data: {
                Page: {
                  pageInfo: { total: 1, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                  staff: [
                    {
                      id: 10687,
                      name: { full: 'Atsumi Tanezaki', native: '種崎敦美' },
                      languageV2: 'Japanese',
                      image: { medium: null, large: null },
                      primaryOccupations: ['Voice Actor'],
                      favourites: 12400,
                    },
                  ],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.query?.includes('SearchStudios')) {
          return new Response(
            JSON.stringify({
              data: {
                Page: {
                  pageInfo: { total: 1, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                  studios: [
                    {
                      id: 11,
                      name: 'Madhouse',
                      isAnimationStudio: true,
                      favourites: 41200,
                    },
                  ],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.query?.includes('SearchUsers')) {
          userSearchCalls.push(body.variables);
          return new Response(
            JSON.stringify({
              data: {
                Page: {
                  pageInfo: { total: 1, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                  users: [
                    {
                      id: 55,
                      name: 'Rakha',
                      avatar: { medium: null, large: null },
                      bannerImage: null,
                      moderatorRoles: null,
                      statistics: {
                        anime: { count: 25, minutesWatched: 3600 },
                        manga: { count: 10, chaptersRead: 120 },
                      },
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
                pageInfo: { total: 0, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                media: [],
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
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/character/:id" element={<RouteEcho />} />
            <Route path="/staff/:id" element={<RouteEcho />} />
            <Route path="/studio/:id" element={<RouteEcho />} />
            <Route path="/user/:username" element={<RouteEcho />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // All 6 category tabs visible
    expect(screen.getByRole('tab', { name: 'Anime' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Manga' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Character' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Staff' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Studios' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();

    // Switch to Character
    fireEvent.click(screen.getByRole('tab', { name: 'Character' }));
    expect(await screen.findByText('Frieren')).toBeInTheDocument();
    // CharacterCard shows strictly 1 parent anime/manga origin
    expect(screen.getByText('Anime · Sousou no Frieren')).toBeInTheDocument();
    expect(screen.queryByText(/Sousou no Frieren Manga/i)).not.toBeInTheDocument();

    // Toggle grid <-> row view beside search input
    fireEvent.click(screen.getByRole('button', { name: /switch to row view/i }));
    const gridToggle = screen.getByRole('button', { name: /switch to grid view/i });
    expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
    expect(usePrefsStore.getState().searchViewMode).toBe('list');
    fireEvent.click(gridToggle);
    expect(usePrefsStore.getState().searchViewMode).toBe('grid');

    // Adaptive FilterSheet hides Search Category and Genres, exposing Birthday Today Only
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(await screen.findByRole('dialog', { name: /filter & sort/i })).toBeInTheDocument();
    expect(screen.queryByText(/search category/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Genres')).not.toBeInTheDocument();
    expect(screen.getByText('Birthday Today Only')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));

    // Switch to Staff
    fireEvent.click(screen.getByRole('tab', { name: 'Staff' }));
    expect(await screen.findByText('Atsumi Tanezaki')).toBeInTheDocument();

    // Switch to Studios
    fireEvent.click(screen.getByRole('tab', { name: 'Studios' }));
    expect(await screen.findByText('Madhouse')).toBeInTheDocument();

    // Switch to Users (empty query shows prompt without sending blank SearchUsers request)
    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    expect(await screen.findByRole('heading', { name: /search anilist users/i })).toBeInTheDocument();
    expect(userSearchCalls).toHaveLength(0);

    // Typing username queries Users and navigates to /user/:username on click
    const input = screen.getByPlaceholderText(/search anilist usernames/i);
    fireEvent.change(input, { target: { value: 'Rakha' } });

    expect(await screen.findByText('Rakha', {}, { timeout: 2000 })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Rakha'));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('/user/Rakha');
  });

  it('finds Anime via character names with fallback and shows matched Romaji/Native hints', async () => {
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
        options: {
          titleLanguage: 'ENGLISH',
          displayAdultContent: false,
          includeAdultContentInSearch: false,
          profileColor: null,
        },
        mediaListOptions: null,
        statistics: null,
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { search?: string };
        };

        if (body.query?.includes('SearchMetaCollections')) {
          return new Response(
            JSON.stringify({ data: { GenreCollection: ['Action'], MediaTagCollection: [] } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.variables?.search === 'Levi') {
          return new Response(
            JSON.stringify({
              data: {
                Page: {
                  pageInfo: { total: 0, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                  media: [],
                },
                charMatches: {
                  characters: [
                    {
                      id: 45627,
                      name: { full: 'Levi', native: 'リヴァイ' },
                      media: {
                        nodes: [
                          {
                            ...makeSearchMedia(16498, 'Shingeki no Kyojin'),
                            title: {
                              romaji: 'Shingeki no Kyojin',
                              english: 'Attack on Titan',
                              native: '進撃の巨人',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.variables?.search === '葬送のフリーレン') {
          return new Response(
            JSON.stringify({
              data: {
                Page: {
                  pageInfo: { total: 1, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                  media: [
                    {
                      ...makeSearchMedia(154587, 'Sousou no Frieren'),
                      title: {
                        romaji: 'Sousou no Frieren',
                        english: 'Frieren: Beyond Journey’s End',
                        native: '葬送のフリーレン',
                      },
                    },
                  ],
                },
                charMatches: { characters: [] },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              Page: {
                pageInfo: { total: 0, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
                media: [],
              },
              charMatches: { characters: [] },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/search?q=Levi+Ackerman']}>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Character-based Anime lookup triggers token fallback ('Levi') -> Attack on Titan + Char hint
    expect(await screen.findByText('Attack on Titan')).toBeInTheDocument();
    expect(screen.getByText('Char: Levi')).toBeInTheDocument();

    // Typing native title under ENGLISH preference returns Frieren and displays native hint
    const input = screen.getByPlaceholderText(/search anime titles/i);
    fireEvent.change(input, { target: { value: '葬送のフリーレン' } });

    expect(
      await screen.findByText('Frieren: Beyond Journey’s End', {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('葬送のフリーレン')).toBeInTheDocument();
  });

  it('filters media by cleaned Tag Categories labels while hiding Sexual Content in safe mode', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { tagCategory_in?: string[] };
      };

      if (body.query?.includes('SearchMetaCollections')) {
        return new Response(
          JSON.stringify({
            data: {
              GenreCollection: ['Sports'],
              MediaTagCollection: [
                { id: 10, name: 'Basketball', category: 'Theme-Game-Sport', isAdult: false },
                { id: 11, name: 'Shogi', category: 'Theme-Game-Card & Board Game', isAdult: false },
                { id: 12, name: 'Real Robot', category: 'Theme-Sci-Fi-Mecha', isAdult: false },
                { id: 13, name: 'Adult Tag', category: 'Sexual Content', isAdult: true },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const items = body.variables?.tagCategory_in?.includes('Theme-Game-Sport')
        ? [makeSearchMedia(77, 'Haikyuu!!')]
        : [makeSearchMedia(1, 'Steins;Gate')];

      return new Response(
        JSON.stringify({
          data: {
            Page: {
              pageInfo: { total: items.length, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
              media: items,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Steins;Gate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(await screen.findByText('Game Sport')).toBeInTheDocument();
    expect(screen.getByText('Card & Board Game')).toBeInTheDocument();
    expect(screen.getByText('Mecha')).toBeInTheDocument();
    expect(screen.queryByText('Sexual Content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Game Sport' }));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(await screen.findByText('Haikyuu!!')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const parsed = JSON.parse(String(init?.body ?? '{}')) as {
          variables?: { tagCategory_in?: string[] };
        };
        return parsed.variables?.tagCategory_in?.includes('Theme-Game-Sport') ?? false;
      }),
    ).toBe(true);
  });
});
