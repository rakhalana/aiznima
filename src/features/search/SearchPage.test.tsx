import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(screen.getByText('Attack on Titan')).toBeInTheDocument();
    });
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
});
