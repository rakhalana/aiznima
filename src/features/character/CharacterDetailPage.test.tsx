import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterDetailPage } from '@/features/character/pages/CharacterDetailPage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function LocationEcho({ prefix }: { prefix: string }) {
  const location = useLocation();
  return <div data-testid="route-echo">{`${prefix}:${location.pathname}`}</div>;
}

function renderCharacterRoute(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/character/:id" element={<CharacterDetailPage />} />
          <Route path="/media/:id" element={<LocationEcho prefix="media" />} />
          <Route path="/staff/:id" element={<LocationEcho prefix="staff" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CharacterDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, viewer: null, isHydrated: true });
    usePrefsStore.setState({ activeMediaType: 'ANIME', guestShowAdult: false, isHydrated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders character profile, filters media appearances, expands extra VAs, and navigates to VA', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { type?: string };
        };

        if (body.query?.includes('query CharacterDetail')) {
          return new Response(
            JSON.stringify({
              data: {
                Character: {
                  id: 17,
                  name: {
                    full: 'Frieren',
                    native: 'フリーレン',
                    alternative: ['Frieren the Slayer'],
                    alternativeSpoiler: [],
                  },
                  image: { medium: null, large: null },
                  favourites: 24500,
                  description: '<p>Elven mage of the Hero Party.</p>',
                  gender: 'Female',
                  dateOfBirth: { year: null, month: null, day: null },
                  age: '1000+',
                  bloodType: null,
                  siteUrl: 'https://anilist.co/character/17',
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const isManga = body.variables?.type === 'MANGA';
        return new Response(
          JSON.stringify({
            data: {
              Character: {
                id: 17,
                media: {
                  pageInfo: {
                    total: isManga ? 0 : 1,
                    perPage: 18,
                    currentPage: 1,
                    lastPage: 1,
                    hasNextPage: false,
                  },
                  edges: isManga
                    ? []
                    : [
                        {
                          id: 501,
                          relationType: null,
                          characterRole: 'MAIN',
                          voiceActors: [
                            {
                              id: 10687,
                              name: { full: 'Atsumi Tanezaki' },
                              languageV2: 'Japanese',
                              image: { medium: null },
                            },
                            {
                              id: 22222,
                              name: { full: 'Mallorie Rodak' },
                              languageV2: 'English',
                              image: { medium: null },
                            },
                            {
                              id: 33333,
                              name: { full: 'Erika Ugalde' },
                              languageV2: 'Spanish',
                              image: { medium: null },
                            },
                          ],
                          node: {
                            id: 154587,
                            type: 'ANIME',
                            format: 'TV',
                            status: 'FINISHED',
                            title: {
                              romaji: 'Sousou no Frieren',
                              english: 'Frieren: Beyond Journey’s End',
                              native: null,
                            },
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
                            genres: ['Adventure', 'Fantasy'],
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

    renderCharacterRoute('/character/17');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Frieren' })).toBeInTheDocument();
    });

    expect(screen.getByText('24.5K')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('1000+')).toBeInTheDocument();
    expect(screen.getByText(/Elven mage/)).toBeInTheDocument();

    expect(await screen.findByText('Sousou no Frieren')).toBeInTheDocument();
    expect(screen.getByText('Atsumi Tanezaki')).toBeInTheDocument();
    expect(screen.getByText('Mallorie Rodak')).toBeInTheDocument();
    expect(screen.queryByText('Erika Ugalde')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /\+1 more languages/i }));
    expect(screen.getByText('Erika Ugalde')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Manga' }));
    expect(await screen.findByRole('heading', { name: /no appearances found/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(await screen.findByText('Atsumi Tanezaki')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Atsumi Tanezaki'));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('staff:/staff/10687');
  });

  it('shows invalid ID feedback cleanly', () => {
    renderCharacterRoute('/character/not-a-number');
    expect(screen.getByRole('heading', { name: /invalid character id/i })).toBeInTheDocument();
  });

  it('clamps long character About bio with click-to-expand Read more', async () => {
    const longDescription = `<p>${'Frieren is an elven mage who traveled with the Hero Party for ten years. '.repeat(6)}</p>`;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };

        if (body.query?.includes('query CharacterDetail')) {
          return new Response(
            JSON.stringify({
              data: {
                Character: {
                  id: 17,
                  name: { full: 'Frieren', native: 'フリーレン', alternative: [], alternativeSpoiler: [] },
                  image: { medium: null, large: null },
                  favourites: 24500,
                  description: longDescription,
                  gender: 'Female',
                  dateOfBirth: { year: null, month: null, day: null },
                  age: '1000+',
                  bloodType: null,
                  siteUrl: 'https://anilist.co/character/17',
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              Character: {
                id: 17,
                media: {
                  pageInfo: { total: 0, perPage: 18, currentPage: 1, lastPage: 1, hasNextPage: false },
                  edges: [],
                },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    renderCharacterRoute('/character/17');

    const aboutText = await screen.findByText(/Frieren is an elven mage/);
    expect(aboutText.closest('.max-h-28')).not.toBeNull();

    const readMoreBtn = screen.getByRole('button', { name: /read more/i });
    expect(readMoreBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(readMoreBtn);
    const showLessBtn = screen.getByRole('button', { name: /show less/i });
    expect(showLessBtn).toHaveAttribute('aria-expanded', 'true');
    expect(aboutText.closest('.max-h-28')).toBeNull();

    fireEvent.click(showLessBtn);
    expect(screen.getByRole('button', { name: /read more/i })).toHaveAttribute('aria-expanded', 'false');
    expect(aboutText.closest('.max-h-28')).not.toBeNull();
  });

  it('copies character link via floating Share button and toggles Favorite via ToggleFavourite', async () => {
    useAuthStore.setState({ accessToken: 'char-tok', isHydrated: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { characterId?: number };
      };

      if (body.query?.includes('ToggleFavourite')) {
        return new Response(
          JSON.stringify({ data: { ToggleFavourite: { anime: { pageInfo: { total: 1 } } } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.query?.includes('query CharacterDetail')) {
        return new Response(
          JSON.stringify({
            data: {
              Character: {
                id: 17,
                name: { full: 'Frieren', native: 'フリーレン', alternative: [], alternativeSpoiler: [] },
                image: { medium: null, large: null },
                favourites: 24500,
                isFavourite: false,
                isFavouriteBlocked: false,
                description: '<p>Mage</p>',
                gender: 'Female',
                dateOfBirth: { year: null, month: null, day: null },
                age: '1000+',
                bloodType: null,
                siteUrl: 'https://anilist.co/character/17',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            Character: {
              id: 17,
              media: {
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

    renderCharacterRoute('/character/17');

    const favButton = await screen.findByRole('button', { name: 'Favorite' });
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://anilist.co/character/17');
    });

    fireEvent.click(favButton);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Favorited' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const payload = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: { characterId?: number };
        };
        return Boolean(
          payload.query?.includes('ToggleFavourite') && payload.variables?.characterId === 17,
        );
      }),
    ).toBe(true);
  });
});
