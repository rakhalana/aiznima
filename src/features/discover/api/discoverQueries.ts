import { useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type { MediaSeason, MediaSummary, MediaType } from '@/shared/api/types';
import { getCurrentAndNextSeason } from '@/shared/utils/formatters';

const DISCOVER_ANIME_QUERY = `
  query DiscoverAnime(
    $season: MediaSeason
    $seasonYear: Int
    $nextSeason: MediaSeason
    $nextYear: Int
    $isAdult: Boolean
  ) {
    trending: Page(page: 1, perPage: 12) {
      media(type: ANIME, sort: [TRENDING_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    popularSeason: Page(page: 1, perPage: 12) {
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    upcoming: Page(page: 1, perPage: 12) {
      media(type: ANIME, season: $nextSeason, seasonYear: $nextYear, status: NOT_YET_RELEASED, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    topRated: Page(page: 1, perPage: 12) {
      media(type: ANIME, sort: [SCORE_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
  }
`;

const DISCOVER_MANGA_QUERY = `
  query DiscoverManga($isAdult: Boolean) {
    trending: Page(page: 1, perPage: 12) {
      media(type: MANGA, sort: [TRENDING_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    popular: Page(page: 1, perPage: 12) {
      media(type: MANGA, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    releasing: Page(page: 1, perPage: 12) {
      media(type: MANGA, status: RELEASING, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    topRated: Page(page: 1, perPage: 12) {
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

function formatSeasonLabel(season: MediaSeason, year: number): string {
  const label = season.charAt(0) + season.slice(1).toLowerCase();
  return `${label} ${year}`;
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
              title: `Popular · ${formatSeasonLabel(current.season, current.year)}`,
              seeAllTo: `/search?type=ANIME&season=${current.season}&year=${current.year}&sort=POPULARITY_DESC`,
              items: raw.popularSeason.media,
            },
            {
              key: 'upcoming',
              title: `Upcoming · ${formatSeasonLabel(next.season, next.year)}`,
              seeAllTo: `/search?type=ANIME&season=${next.season}&year=${next.year}&status=NOT_YET_RELEASED&sort=POPULARITY_DESC`,
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
