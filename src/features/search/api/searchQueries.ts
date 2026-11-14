import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaStatus,
  MediaSummary,
  MediaType,
  PageInfo,
} from '@/shared/api/types';

export interface SearchFilters {
  search: string;
  type: MediaType;
  format?: MediaFormat;
  status?: MediaStatus;
  season?: MediaSeason;
  year?: number;
  genres: string[];
  tags: string[];
  sort: MediaSort;
}

const SEARCH_MEDIA_QUERY = `
  query SearchMedia(
    $page: Int
    $perPage: Int
    $search: String
    $type: MediaType
    $format: MediaFormat
    $status: MediaStatus
    $season: MediaSeason
    $seasonYear: Int
    $genre_in: [String]
    $tag_in: [String]
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
        search: $search
        type: $type
        format: $format
        status: $status
        season: $season
        seasonYear: $seasonYear
        genre_in: $genre_in
        tag_in: $tag_in
        sort: $sort
        isAdult: $isAdult
      ) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
  }
`;

const META_COLLECTIONS_QUERY = `
  query SearchMetaCollections {
    GenreCollection
    MediaTagCollection {
      id
      name
      category
      isAdult
    }
  }
`;

interface SearchMediaRaw {
  Page: {
    pageInfo: PageInfo;
    media: MediaSummary[];
  };
}

export interface MediaTagCollectionItem {
  id: number;
  name: string;
  category: string | null;
  isAdult: boolean | null;
}

interface MetaCollectionsRaw {
  GenreCollection: string[];
  MediaTagCollection: MediaTagCollectionItem[];
}

export function useSearchMediaQuery(
  filters: SearchFilters,
  isAdultQueryArg: false | undefined,
) {
  const effectiveSort: MediaSort =
    filters.search.trim().length > 0 && filters.sort === 'TRENDING_DESC'
      ? 'SEARCH_MATCH'
      : filters.sort;

  return useInfiniteQuery({
    queryKey: ['search', filters, effectiveSort, isAdultQueryArg ?? 'all'],
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchMediaRaw>(
        SEARCH_MEDIA_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: filters.search.trim() || undefined,
          type: filters.type,
          format: filters.format || undefined,
          status: filters.status || undefined,
          season: filters.type === 'ANIME' ? filters.season || undefined : undefined,
          seasonYear: filters.year || undefined,
          genre_in: filters.genres.length > 0 ? filters.genres : undefined,
          tag_in: filters.tags.length > 0 ? filters.tags : undefined,
          sort: [effectiveSort],
          isAdult: isAdultQueryArg,
        },
        { signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useSearchMetadataQuery() {
  return useQuery({
    queryKey: ['search-meta-collections'],
    staleTime: 60 * 60 * 1000,
    queryFn: ({ signal }) =>
      anilistRequest<MetaCollectionsRaw>(META_COLLECTIONS_QUERY, undefined, { signal }),
  });
}
