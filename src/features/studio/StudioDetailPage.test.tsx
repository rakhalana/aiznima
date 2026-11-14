import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioDetailPage } from '@/features/studio/pages/StudioDetailPage';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

function LocationEcho() {
  const location = useLocation();
  return <div data-testid="route-echo">{location.pathname}</div>;
}

function renderStudioRoute(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/studio/:id" element={<StudioDetailPage />} />
          <Route path="/media/:id" element={<LocationEcho />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudioDetailPage', () => {
  beforeEach(() => {
    usePrefsStore.setState({ activeMediaType: 'ANIME', guestShowAdult: false, isHydrated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders studio details, toggles Main Studio filter, sorts works, and navigates to media', async () => {
    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { isMain?: boolean; sort?: string[] };
      };

      if (body.query?.includes('query StudioDetail')) {
        return new Response(
          JSON.stringify({
            data: {
              Studio: {
                id: 11,
                name: 'Madhouse',
                isAnimationStudio: true,
                favourites: 41200,
                siteUrl: 'https://anilist.co/studio/11',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const edges = [
        {
          id: 1,
          isMainStudio: true,
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
        {
          id: 2,
          isMainStudio: false,
          node: {
            id: 999,
            type: 'ANIME',
            format: 'TV',
            status: 'FINISHED',
            title: { romaji: 'Support Credit Show', english: 'Support Credit Show', native: null },
            coverImage: { medium: null, large: null, extraLarge: null, color: null },
            bannerImage: null,
            episodes: 12,
            chapters: null,
            volumes: null,
            season: 'SPRING',
            seasonYear: 2020,
            meanScore: 76,
            popularity: 50000,
            isAdult: false,
            genres: ['Action'],
            nextAiringEpisode: null,
            mediaListEntry: null,
          },
        },
      ].filter((edge) => !body.variables?.isMain || edge.isMainStudio);

      return new Response(
        JSON.stringify({
          data: {
            Studio: {
              id: 11,
              media: {
                pageInfo: {
                  total: edges.length,
                  perPage: 24,
                  currentPage: 1,
                  lastPage: 1,
                  hasNextPage: false,
                },
                edges,
              },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStudioRoute('/studio/11');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Madhouse' })).toBeInTheDocument();
    });

    expect(screen.getByText('Animation Studio')).toBeInTheDocument();
    expect(screen.getByText('41.2K')).toBeInTheDocument();

    expect(await screen.findByText('Sousou no Frieren')).toBeInTheDocument();
    expect(screen.getByText('Support Credit Show')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Main Studio$/i }));
    await waitFor(() => {
      expect(screen.queryByText('Support Credit Show')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Sort studio works'), {
      target: { value: 'SCORE_DESC' },
    });
    await waitFor(() => {
      const hasScoreSort = fetchMock.mock.calls.some(([, init]) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          variables?: { sort?: string[] };
        };
        return body.variables?.sort?.includes('SCORE_DESC');
      });
      expect(hasScoreSort).toBe(true);
    });

    fireEvent.click(screen.getByText('Sousou no Frieren'));
    expect(screen.getByTestId('route-echo')).toHaveTextContent('/media/154587');
  });
});
