import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveSeasonalMediaSort,
  SeasonalPage,
} from '@/features/discover/pages/SeasonalPage';
import type { MediaSummary } from '@/shared/api/types';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import {
  buildSequentialSeasons,
  formatSeasonLabel,
  getCurrentAndNextSeason,
} from '@/shared/utils/formatters';

function makeSeasonalMedia(overrides: Partial<MediaSummary> & { id: number }): MediaSummary {
  return {
    id: overrides.id,
    idMal: null,
    type: 'ANIME',
    format: overrides.format ?? 'TV',
    status: overrides.status ?? 'RELEASING',
    title: overrides.title ?? {
      romaji: `Seasonal Anime ${overrides.id}`,
      english: `Seasonal Anime ${overrides.id}`,
      native: null,
    },
    coverImage: { medium: null, large: null, extraLarge: null, color: null },
    bannerImage: null,
    episodes: 12,
    chapters: null,
    volumes: null,
    season: overrides.season ?? 'FALL',
    seasonYear: overrides.seasonYear ?? 2026,
    meanScore: overrides.meanScore ?? 82,
    popularity: overrides.popularity ?? 50000,
    isAdult: overrides.isAdult ?? false,
    genres: overrides.genres ?? ['Action'],
    studios: null,
    relations: null,
    nextAiringEpisode: null,
    mediaListEntry: null,
  };
}

describe('SeasonalPage', () => {
  beforeEach(() => {
    usePrefsStore.setState({ guestShowAdult: false, isHydrated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps seasonal sort fields and orders to exact AniList MediaSort values', () => {
    expect(resolveSeasonalMediaSort('POPULARITY', 'DESC')).toBe('POPULARITY_DESC');
    expect(resolveSeasonalMediaSort('POPULARITY', 'ASC')).toBe('POPULARITY');
    expect(resolveSeasonalMediaSort('SCORE', 'DESC')).toBe('SCORE_DESC');
    expect(resolveSeasonalMediaSort('SCORE', 'ASC')).toBe('SCORE');
    expect(resolveSeasonalMediaSort('FAVOURITES', 'ASC')).toBe('FAVOURITES');
    expect(resolveSeasonalMediaSort('TITLE', 'ASC', 'ROMAJI')).toBe('TITLE_ROMAJI');
    expect(resolveSeasonalMediaSort('TITLE', 'DESC', 'ENGLISH')).toBe('TITLE_ENGLISH_DESC');
  });

  it('renders 5-year sequential tabs (+1 upcoming), defaults to list view, supports Format/Sort/Order/LoadMore', async () => {
    const { current, next } = getCurrentAndNextSeason();
    const seasons = buildSequentialSeasons(5);
    const prevSeason = seasons[2]!;

    const requests: Array<{
      season?: string;
      seasonYear?: number;
      format?: string;
      sort?: string[];
      page?: number;
    }> = [];

    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        variables?: {
          season?: string;
          seasonYear?: number;
          format?: string;
          sort?: string[];
          page?: number;
        };
      };
      const vars = body.variables ?? {};
      requests.push(vars);

      const page = vars.page ?? 1;
      const seasonPrefix = `${vars.season ?? current.season}-${vars.seasonYear ?? current.year}`;

      if (page === 2) {
        return new Response(
          JSON.stringify({
            data: {
              Page: {
                pageInfo: {
                  total: 26,
                  perPage: 25,
                  currentPage: 2,
                  lastPage: 2,
                  hasNextPage: false,
                },
                media: [
                  makeSeasonalMedia({
                    id: 202,
                    season: (vars.season as MediaSummary['season']) ?? current.season,
                    seasonYear: vars.seasonYear ?? current.year,
                    title: {
                      romaji: `${seasonPrefix} Page 2 Show`,
                      english: `${seasonPrefix} Page 2 Show`,
                      native: null,
                    },
                  }),
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
              pageInfo: {
                total: 26,
                perPage: 25,
                currentPage: 1,
                lastPage: 2,
                hasNextPage: true,
              },
              media: [
                makeSeasonalMedia({
                  id: 201,
                  season: (vars.season as MediaSummary['season']) ?? current.season,
                  seasonYear: vars.seasonYear ?? current.year,
                  format: (vars.format as MediaSummary['format']) ?? 'TV',
                  title: {
                    romaji: `${seasonPrefix} Lead Show`,
                    english: `${seasonPrefix} Lead Show`,
                    native: null,
                  },
                }),
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter
          initialEntries={[`/discover/seasonal?season=${current.season}&year=${current.year}`]}
        >
          <Routes>
            <Route path="/discover/seasonal" element={<SeasonalPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(21);
    expect(tabs[0]).toHaveTextContent(formatSeasonLabel(next.season, next.year));
    expect(tabs[1]).toHaveTextContent(formatSeasonLabel(current.season, current.year));
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

    // Defaults directly to list view ("Switch to grid view" toggle button is active)
    const viewToggle = screen.getByRole('button', { name: /switch to grid view/i });
    expect(viewToggle).toHaveAttribute('aria-pressed', 'true');

    expect(
      await screen.findByText(`${current.season}-${current.year} Lead Show`),
    ).toBeInTheDocument();

    // Toggle to grid view cleanly
    fireEvent.click(viewToggle);
    expect(
      screen.getByRole('button', { name: /switch to row view/i }),
    ).toHaveAttribute('aria-pressed', 'false');

    // Switch season tab sequentially to previous season
    fireEvent.click(tabs[2]!);
    expect(
      await screen.findByText(`${prevSeason.season}-${prevSeason.year} Lead Show`),
    ).toBeInTheDocument();

    // Filter Format = Movie
    fireEvent.click(screen.getByRole('button', { name: 'Movie' }));
    await waitFor(() => {
      expect(requests.some((r) => r.format === 'MOVIE')).toBe(true);
    });

    // Change Sort by = Score and Order by = Ascending -> SCORE
    fireEvent.click(screen.getByRole('combobox', { name: 'Sort seasonal anime by' }));
    fireEvent.click(screen.getByRole('option', { name: 'Score' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Order seasonal anime' }));
    fireEvent.click(screen.getByRole('option', { name: 'Ascending' }));

    await waitFor(() => {
      expect(requests.some((r) => r.sort?.[0] === 'SCORE')).toBe(true);
    });

    // Load More fetches page 2
    fireEvent.click(await screen.findByRole('button', { name: /load more anime/i }));
    expect(
      await screen.findByText(`${prevSeason.season}-${prevSeason.year} Page 2 Show`),
    ).toBeInTheDocument();
  });
});
