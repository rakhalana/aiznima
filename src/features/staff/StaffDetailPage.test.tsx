import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffDetailPage } from '@/features/staff/pages/StaffDetailPage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function LocationEcho({ prefix }: { prefix: string }) {
  const location = useLocation();
  return <div data-testid="route-echo">{`${prefix}:${location.pathname}`}</div>;
}

function renderStaffRoute(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/staff/:id" element={<StaffDetailPage />} />
          <Route path="/character/:id" element={<LocationEcho prefix="character" />} />
          <Route path="/media/:id" element={<LocationEcho prefix="media" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StaffDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, viewer: null, isHydrated: true });
    usePrefsStore.setState({ activeMediaType: 'ANIME', guestShowAdult: false, isHydrated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders staff bio/metadata, switches between voice roles and staff credits, and navigates to character', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };

        if (body.query?.includes('query StaffDetail')) {
          return new Response(
            JSON.stringify({
              data: {
                Staff: {
                  id: 10687,
                  name: {
                    full: 'Atsumi Tanezaki',
                    native: '種崎敦美',
                    alternative: [],
                  },
                  languageV2: 'Japanese',
                  image: { medium: null, large: null },
                  primaryOccupations: ['Voice Actor'],
                  favourites: 12400,
                  description: '<p>Acclaimed voice actress.</p>',
                  gender: 'Female',
                  dateOfBirth: { year: null, month: 9, day: 27 },
                  dateOfDeath: null,
                  age: null,
                  yearsActive: [2012, 0],
                  homeTown: 'Oita Prefecture',
                  bloodType: 'A',
                  siteUrl: 'https://anilist.co/staff/10687',
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (body.query?.includes('query StaffMedia')) {
          return new Response(
            JSON.stringify({
              data: {
                Staff: {
                  id: 10687,
                  staffMedia: {
                    pageInfo: {
                      total: 1,
                      perPage: 18,
                      currentPage: 1,
                      lastPage: 1,
                      hasNextPage: false,
                    },
                    edges: [
                      {
                        id: 901,
                        staffRole: 'Theme Song Performance',
                        node: {
                          id: 140960,
                          type: 'ANIME',
                          format: 'TV',
                          status: 'FINISHED',
                          title: { romaji: 'SPY x FAMILY', english: 'SPY x FAMILY', native: null },
                          coverImage: { medium: null, large: null, extraLarge: null, color: null },
                          bannerImage: null,
                          episodes: 12,
                          chapters: null,
                          volumes: null,
                          season: 'SPRING',
                          seasonYear: 2022,
                          meanScore: 85,
                          popularity: 400000,
                          isAdult: false,
                          genres: ['Comedy'],
                          nextAiringEpisode: null,
                          mediaListEntry: null,
                        },
                      },
                    ],
                  },
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              Staff: {
                id: 10687,
                characterMedia: {
                  pageInfo: {
                    total: 1,
                    perPage: 18,
                    currentPage: 1,
                    lastPage: 1,
                    hasNextPage: false,
                  },
                  edges: [
                    {
                      id: 701,
                      characterRole: 'MAIN',
                      characters: [
                        {
                          id: 17,
                          name: { full: 'Frieren', native: 'フリーレン' },
                          image: { medium: null, large: null },
                        },
                      ],
                      node: {
                        id: 154587,
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
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    renderStaffRoute('/staff/10687');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Atsumi Tanezaki' })).toBeInTheDocument();
    });

    expect(screen.getByText('Voice Actor')).toBeInTheDocument();
    expect(screen.getByText('Oita Prefecture')).toBeInTheDocument();
    expect(screen.getByText('2012–Present')).toBeInTheDocument();

    expect(await screen.findByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText('Sousou no Frieren')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Staff Credits' }));
    expect(await screen.findByText('Theme Song Performance')).toBeInTheDocument();
    expect(screen.getByText('SPY x FAMILY')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Voice Roles' }));
    expect(await screen.findByText('Frieren')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Frieren'));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('character:/character/17');
  });

  it('copies staff link via floating Share button and toggles Favorite via ToggleFavourite', async () => {
    useAuthStore.setState({ accessToken: 'staff-tok', isHydrated: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };

      if (body.query?.includes('ToggleFavourite')) {
        return new Response(
          JSON.stringify({ data: { ToggleFavourite: { anime: { pageInfo: { total: 1 } } } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('query StaffDetail')) {
        return new Response(
          JSON.stringify({
            data: {
              Staff: {
                id: 10687,
                name: { full: 'Atsumi Tanezaki', native: '種﨑敦美', alternative: [] },
                image: { medium: null, large: null },
                languageV2: 'Japanese',
                primaryOccupations: ['Voice Actor'],
                favourites: 12400,
                isFavourite: false,
                isFavouriteBlocked: false,
                description: '<p>VA</p>',
                gender: 'Female',
                dateOfBirth: { year: null, month: 9, day: 27 },
                dateOfDeath: { year: null, month: null, day: null },
                age: 34,
                yearsActive: [2012],
                homeTown: 'Oita Prefecture',
                bloodType: 'A',
                siteUrl: 'https://anilist.co/staff/10687',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            Staff: {
              id: 10687,
              characterMedia: {
                pageInfo: { total: 0, perPage: 18, currentPage: 1, lastPage: 1, hasNextPage: false },
                edges: [],
              },
              staffMedia: {
                pageInfo: { total: 0, perPage: 18, currentPage: 1, lastPage: 1, hasNextPage: false },
                edges: [],
              },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStaffRoute('/staff/10687');

    const favButton = await screen.findByRole('button', { name: 'Favorite' });
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://anilist.co/staff/10687');
    });

    fireEvent.click(favButton);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Favorited' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const payload = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { staffId?: number };
        };
        return Boolean(
          payload.query?.includes('ToggleFavourite') && payload.variables?.staffId === 10687,
        );
      }),
    ).toBe(true);
  });
});
