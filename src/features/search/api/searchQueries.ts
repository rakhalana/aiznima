import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import {
  CHARACTER_SUMMARY_FIELDS,
  MEDIA_SUMMARY_FIELDS,
  STAFF_SUMMARY_FIELDS,
  STUDIO_SUMMARY_FIELDS,
  USER_SUMMARY_FIELDS,
} from '@/shared/api/mediaFragments';
import type {
  CharacterSort,
  CharacterSummary,
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaStatus,
  MediaSummary,
  PageInfo,
  SearchEntityType,
  StaffSort,
  StaffSummary,
  StudioSort,
  StudioSummary,
  UserSearchSummary,
  UserSort,
} from '@/shared/api/types';

export interface SearchFilters {
  search: string;
  type: SearchEntityType;
  format?: MediaFormat;
  status?: MediaStatus;
  season?: MediaSeason;
  year?: number;
  genres: string[];
  tags: string[];
  sort: MediaSort;
  characterSort: CharacterSort;
  staffSort: StaffSort;
  studioSort: StudioSort;
  userSort: UserSort;
  isBirthday?: boolean;
  animationStudioOnly?: boolean;
  isModerator?: boolean;
}

export function createDefaultSearchFilters(
  type: SearchEntityType = 'ANIME',
  search = '',
): SearchFilters {
  return {
    search,
    type,
    genres: [],
    tags: [],
    sort: 'TRENDING_DESC',
    characterSort: 'FAVOURITES_DESC',
    staffSort: 'FAVOURITES_DESC',
    studioSort: 'FAVOURITES_DESC',
    userSort: 'SEARCH_MATCH',
  };
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

const SEARCH_CHARACTERS_QUERY = `
  query SearchCharacters(
    $page: Int
    $perPage: Int
    $search: String
    $isBirthday: Boolean
    $sort: [CharacterSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      characters(search: $search, isBirthday: $isBirthday, sort: $sort) {
        ${CHARACTER_SUMMARY_FIELDS}
      }
    }
  }
`;

const SEARCH_STAFF_QUERY = `
  query SearchStaff(
    $page: Int
    $perPage: Int
    $search: String
    $isBirthday: Boolean
    $sort: [StaffSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      staff(search: $search, isBirthday: $isBirthday, sort: $sort) {
        ${STAFF_SUMMARY_FIELDS}
      }
    }
  }
`;

const SEARCH_STUDIOS_QUERY = `
  query SearchStudios(
    $page: Int
    $perPage: Int
    $search: String
    $sort: [StudioSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      studios(search: $search, sort: $sort) {
        ${STUDIO_SUMMARY_FIELDS}
      }
    }
  }
`;

const SEARCH_USERS_QUERY = `
  query SearchUsers(
    $page: Int
    $perPage: Int
    $search: String
    $isModerator: Boolean
    $sort: [UserSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      users(search: $search, isModerator: $isModerator, sort: $sort) {
        ${USER_SUMMARY_FIELDS}
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

interface SearchCharactersRaw {
  Page: {
    pageInfo: PageInfo;
    characters: CharacterSummary[];
  };
}

interface SearchStaffRaw {
  Page: {
    pageInfo: PageInfo;
    staff: StaffSummary[];
  };
}

interface SearchStudiosRaw {
  Page: {
    pageInfo: PageInfo;
    studios: StudioSummary[];
  };
}

interface SearchUsersRaw {
  Page: {
    pageInfo: PageInfo;
    users: UserSearchSummary[];
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
  const isMediaTab = filters.type === 'ANIME' || filters.type === 'MANGA';
  const effectiveSort: MediaSort =
    filters.search.trim().length > 0 && filters.sort === 'TRENDING_DESC'
      ? 'SEARCH_MATCH'
      : filters.sort;

  return useInfiniteQuery({
    queryKey: ['search', 'media', filters, effectiveSort, isAdultQueryArg ?? 'all'],
    enabled: isMediaTab,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchMediaRaw>(
        SEARCH_MEDIA_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: filters.search.trim() || undefined,
          type: filters.type === 'MANGA' ? 'MANGA' : 'ANIME',
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

export function useSearchCharactersQuery(filters: SearchFilters) {
  const effectiveSort: CharacterSort =
    filters.search.trim().length > 0 && filters.characterSort === 'FAVOURITES_DESC'
      ? 'SEARCH_MATCH'
      : filters.characterSort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'character',
      filters.search,
      filters.isBirthday ?? false,
      effectiveSort,
    ],
    enabled: filters.type === 'CHARACTER',
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchCharactersRaw>(
        SEARCH_CHARACTERS_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: filters.search.trim() || undefined,
          isBirthday: filters.isBirthday ? true : undefined,
          sort: [effectiveSort],
        },
        { signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useSearchStaffQuery(filters: SearchFilters) {
  const effectiveSort: StaffSort =
    filters.search.trim().length > 0 && filters.staffSort === 'FAVOURITES_DESC'
      ? 'SEARCH_MATCH'
      : filters.staffSort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'staff',
      filters.search,
      filters.isBirthday ?? false,
      effectiveSort,
    ],
    enabled: filters.type === 'STAFF',
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchStaffRaw>(
        SEARCH_STAFF_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: filters.search.trim() || undefined,
          isBirthday: filters.isBirthday ? true : undefined,
          sort: [effectiveSort],
        },
        { signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useSearchStudiosQuery(filters: SearchFilters) {
  const effectiveSort: StudioSort =
    filters.search.trim().length > 0 && filters.studioSort === 'FAVOURITES_DESC'
      ? 'SEARCH_MATCH'
      : filters.studioSort;

  return useInfiniteQuery({
    queryKey: ['search', 'studio', filters.search, effectiveSort],
    enabled: filters.type === 'STUDIO',
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchStudiosRaw>(
        SEARCH_STUDIOS_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: filters.search.trim() || undefined,
          sort: [effectiveSort],
        },
        { signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useSearchUsersQuery(filters: SearchFilters) {
  const trimmedSearch = filters.search.trim();
  // AniList throws HTTP 500 when Page.users is queried with stat sorts without a search term.
  const canQuery = trimmedSearch.length > 0 || filters.isModerator === true;
  const effectiveSort: UserSort =
    trimmedSearch.length === 0 &&
    (filters.userSort === 'WATCHED_TIME_DESC' ||
      filters.userSort === 'CHAPTERS_READ_DESC' ||
      filters.userSort === 'SEARCH_MATCH')
      ? 'USERNAME'
      : filters.userSort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'user',
      trimmedSearch,
      filters.isModerator ?? false,
      effectiveSort,
    ],
    enabled: filters.type === 'USER' && canQuery,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchUsersRaw>(
        SEARCH_USERS_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: trimmedSearch || undefined,
          isModerator: filters.isModerator ? true : undefined,
          sort: [effectiveSort],
        },
        { signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useSearchMetadataQuery(enabled = true) {
  return useQuery({
    queryKey: ['search-meta-collections'],
    enabled,
    staleTime: 60 * 60 * 1000,
    queryFn: ({ signal }) =>
      anilistRequest<MetaCollectionsRaw>(META_COLLECTIONS_QUERY, undefined, { signal }),
  });
}
