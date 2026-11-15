import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaSummary,
  MediaType,
  PageInfo,
} from '@/shared/api/types';
import {
  formatSeasonLabel,
  getCurrentAndNextSeason,
} from '@/shared/utils/formatters';

const DISCOVER_ANIME_QUERY = `
  query DiscoverAnime(
    $season: MediaSeason
    $seasonYear: Int
    $nextSeason: MediaSeason
    $nextYear: Int
    $isAdult: Boolean
  ) {
    trending: Page(page: 1, perPage: 5) {
      media(type: ANIME, sort: [TRENDING_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    popularSeason: Page(page: 1, perPage: 5) {
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    upcoming: Page(page: 1, perPage: 5) {
      media(type: ANIME, season: $nextSeason, seasonYear: $nextYear, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    topRated: Page(page: 1, perPage: 5) {
      media(type: ANIME, sort: [SCORE_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
  }
`;

const DISCOVER_MANGA_QUERY = `
  query DiscoverManga($isAdult: Boolean) {
    trending: Page(page: 1, perPage: 5) {
      media(type: MANGA, sort: [TRENDING_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    popular: Page(page: 1, perPage: 5) {
      media(type: MANGA, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    releasing: Page(page: 1, perPage: 5) {
      media(type: MANGA, status: RELEASING, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    topRated: Page(page: 1, perPage: 5) {
      media(type: MANGA, sort: [SCORE_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
  }
`;

interface DiscoverAnimeRaw {
  trending: { media: MediaSummary[] };
  popularSeason: { media: MediaSummary[] };
  upcoming: { media: MediaSummary[] };
  topRated: { media: MediaSummary[] };
}

interface DiscoverMangaRaw {
  trending: { media: MediaSummary[] };
  popular: { media: MediaSummary[] };
  releasing: { media: MediaSummary[] };
  topRated: { media: MediaSummary[] };
}

export interface DiscoverSection {
  key: string;
  title: string;
  seeAllTo: string;
  items: MediaSummary[];
}

export interface DiscoverData {
  hero: MediaSummary | null;
  sections: DiscoverSection[];
}

export function useDiscoverQuery(
  mediaType: MediaType,
  isAdultQueryArg: false | undefined,
) {
  const { current, next } = getCurrentAndNextSeason();

  return useQuery({
    queryKey: [
      'discover',
      mediaType,
      isAdultQueryArg ?? 'all',
      mediaType === 'ANIME' ? `${current.season}-${current.year}` : 'manga',
    ],
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }): Promise<DiscoverData> => {
      if (mediaType === 'ANIME') {
        const raw = await anilistRequest<DiscoverAnimeRaw>(
          DISCOVER_ANIME_QUERY,
          {
            season: current.season,
            seasonYear: current.year,
            nextSeason: next.season,
            nextYear: next.year,
            isAdult: isAdultQueryArg,
          },
          { signal },
        );

        return {
          hero: raw.trending.media[0] ?? null,
          sections: [
            {
              key: 'trending',
              title: 'Trending Now',
              seeAllTo: '/search?type=ANIME&sort=TRENDING_DESC',
              items: raw.trending.media,
            },
            {
              key: 'popularSeason',
              title: `Seasonal: ${formatSeasonLabel(current.season, current.year)}`,
              seeAllTo: `/discover/seasonal?season=${current.season}&year=${current.year}`,
              items: raw.popularSeason.media,
            },
            {
              key: 'upcoming',
              title: `Upcoming · ${formatSeasonLabel(next.season, next.year)}`,
              seeAllTo: `/discover/seasonal?season=${next.season}&year=${next.year}`,
              items: raw.upcoming.media,
            },
            {
              key: 'topRated',
              title: 'Top Rated Anime',
              seeAllTo: '/search?type=ANIME&sort=SCORE_DESC',
              items: raw.topRated.media,
            },
          ],
        };
      }

      const raw = await anilistRequest<DiscoverMangaRaw>(
        DISCOVER_MANGA_QUERY,
        { isAdult: isAdultQueryArg },
        { signal },
      );

      return {
        hero: raw.trending.media[0] ?? null,
        sections: [
          {
            key: 'trending',
            title: 'Trending Manga',
            seeAllTo: '/search?type=MANGA&sort=TRENDING_DESC',
            items: raw.trending.media,
          },
          {
            key: 'popular',
            title: 'All-Time Popular',
            seeAllTo: '/search?type=MANGA&sort=POPULARITY_DESC',
            items: raw.popular.media,
          },
          {
            key: 'releasing',
            title: 'Currently Releasing',
            seeAllTo: '/search?type=MANGA&status=RELEASING&sort=POPULARITY_DESC',
            items: raw.releasing.media,
          },
          {
            key: 'topRated',
            title: 'Top Rated Manga',
            seeAllTo: '/search?type=MANGA&sort=SCORE_DESC',
            items: raw.topRated.media,
          },
        ],
      };
    },
  });
}

const SEASONAL_ANIME_QUERY = `
  query SeasonalAnime(
    $page: Int
    $perPage: Int
    $season: MediaSeason
    $seasonYear: Int
    $format: MediaFormat
    $sort: [MediaSort]
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        format: $format
        sort: $sort
        isAdult: $isAdult
      ) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
  }
`;

export interface SeasonalPagePayload {
  pageInfo: PageInfo;
  media: MediaSummary[];
}

export function flattenSeasonalMedia(
  pages: SeasonalPagePayload[] | undefined,
): MediaSummary[] {
  const seen = new Set<number>();
  const result: MediaSummary[] = [];

  for (const page of pages ?? []) {
    for (const item of page.media ?? []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
  }

  return result;
}

export function useSeasonalAnimeInfiniteQuery(params: {
  season: MediaSeason;
  seasonYear: number;
  format?: MediaFormat;
  sort: MediaSort;
  isAdultQueryArg: false | undefined;
}) {
  const { season, seasonYear, format, sort, isAdultQueryArg } = params;

  return useInfiniteQuery({
    queryKey: [
      'seasonal-anime',
      season,
      seasonYear,
      format ?? 'ALL',
      sort,
      isAdultQueryArg ?? 'all',
    ],
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ pageParam, signal }): Promise<SeasonalPagePayload> => {
      const raw = await anilistRequest<{ Page: SeasonalPagePayload }>(
        SEASONAL_ANIME_QUERY,
        {
          page: pageParam,
          perPage: 25,
          season,
          seasonYear,
          format,
          sort: [sort],
          isAdult: isAdultQueryArg,
        },
        { signal },
      );

      return (
        raw?.Page ?? {
          pageInfo: {
            total: 0,
            perPage: 25,
            currentPage: pageParam,
            lastPage: pageParam,
            hasNextPage: false,
          },
          media: [],
        }
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage
        ? (lastPage.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}
