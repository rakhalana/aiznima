import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import {
  CHARACTER_SUMMARY_FIELDS,
  MEDIA_SUMMARY_FIELDS,
  STAFF_SUMMARY_FIELDS,
  STUDIO_SUMMARY_FIELDS,
  USER_SUMMARY_FIELDS,
} from '@/shared/api/mediaFragments';
import {
  buildFallbackSearchQueries,
  filterCharacterMedia,
  normalizeSearchInput,
  type MediaFilterCriteria,
} from '@/features/search/utils/searchHelpers';
import type {
  SearchCharacterTasteItem,
  SearchStaffTasteItem,
  SearchStudioTasteItem,
  TasteMainCharacterMedia,
} from '@/features/search/utils/searchTasteEngine';
import type {
  CharacterSort,
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaStatus,
  MediaSummary,
  PageInfo,
  SearchCharacterSort,
  SearchEntityType,
  SearchStaffSort,
  SearchStudioSort,
  StaffSort,
  StudioSort,
  UserSearchSummary,
  UserSort,
} from '@/shared/api/types';

export interface SearchMediaItem extends MediaSummary {
  matchedCharacterName?: string | null;
}

export interface SearchFilters {
  search: string;
  type: SearchEntityType;
  format?: MediaFormat;
  status?: MediaStatus;
  season?: MediaSeason;
  year?: number;
  genres: string[];
  tags: string[];
  tagCategories: string[];
  sort: MediaSort;
  characterSort: SearchCharacterSort;
  staffSort: SearchStaffSort;
  studioSort: SearchStudioSort;
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
    tagCategories: [],
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
    $tagCategory_in: [String]
    $sort: [MediaSort]
    $isAdult: Boolean
    $includeCharacters: Boolean = false
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
        tagCategory_in: $tagCategory_in
        sort: $sort
        isAdult: $isAdult
      ) {
        ${MEDIA_SUMMARY_FIELDS}
      }
    }
    charMatches: Page(page: 1, perPage: 6) @include(if: $includeCharacters) {
      characters(search: $search, sort: [SEARCH_MATCH]) {
        id
        name {
          full
          native
        }
        media(type: $type, perPage: 6, sort: [POPULARITY_DESC]) {
          nodes {
            ${MEDIA_SUMMARY_FIELDS}
          }
        }
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
        media(sort: [POPULARITY_DESC], perPage: 3) {
          nodes {
            id
            type
            isAdult
            title {
              romaji
              english
              native
            }
          }
        }
      }
    }
  }
`;

const SEARCH_CHARACTERS_TASTE_QUERY = `
  query SearchCharactersTaste(
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
        media(sort: [POPULARITY_DESC], perPage: 12) {
          edges {
            characterRole
            node {
              id
              type
              isAdult
              genres
              meanScore
              title {
                romaji
                english
                native
              }
            }
          }
        }
      }
    }
  }
`;

const SEARCH_TASTE_MAIN_CHARACTERS_QUERY = `
  query SearchTasteMainCharacters($mediaIds: [Int]) {
    Page(page: 1, perPage: 25) {
      media(id_in: $mediaIds) {
        id
        type
        isAdult
        title {
          romaji
          english
          native
        }
        characters(role: MAIN, sort: [FAVOURITES_DESC], perPage: 8) {
          nodes {
            ${CHARACTER_SUMMARY_FIELDS}
          }
        }
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

const SEARCH_STAFF_TASTE_QUERY = `
  query SearchStaffTaste(
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
        staffMedia(perPage: 10, sort: [POPULARITY_DESC]) {
          nodes {
            id
            genres
            meanScore
            isAdult
          }
        }
        characterMedia(perPage: 8, sort: [POPULARITY_DESC]) {
          nodes {
            id
            genres
            meanScore
            isAdult
          }
        }
      }
    }
  }
`;

const SEARCH_TASTE_STAFF_BY_IDS_QUERY = `
  query SearchTasteStaffByIds($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      staff(id_in: $ids) {
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

const SEARCH_STUDIOS_TASTE_QUERY = `
  query SearchStudiosTaste(
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
        media(isMain: true, perPage: 10, sort: [POPULARITY_DESC]) {
          nodes {
            id
            genres
            meanScore
            isAdult
          }
        }
      }
    }
  }
`;

const SEARCH_TASTE_STUDIOS_BY_IDS_QUERY = `
  query SearchTasteStudiosByIds($ids: [Int]) {
    Page(page: 1, perPage: 25) {
      studios(id_in: $ids) {
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

interface CharacterMatchNode {
  id: number;
  name: {
    full: string | null;
    native: string | null;
  };
  media?: {
    nodes: MediaSummary[];
  } | null;
}

interface SearchMediaRaw {
  Page: {
    pageInfo: PageInfo;
    media: MediaSummary[];
  };
  charMatches?: {
    characters: CharacterMatchNode[];
  } | null;
}

interface SearchMediaResult {
  Page: {
    pageInfo: PageInfo;
    media: SearchMediaItem[];
  };
}

function mergeSearchMediaResults(
  raw: SearchMediaRaw,
  criteria: MediaFilterCriteria,
  allowAdult: boolean,
): SearchMediaResult {
  const seen = new Set<number>();
  const merged: SearchMediaItem[] = [];

  for (const item of raw.Page.media) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  for (const character of raw.charMatches?.characters ?? []) {
    const charName = character.name.full || character.name.native || null;
    for (const mediaNode of character.media?.nodes ?? []) {
      if (seen.has(mediaNode.id)) {
        continue;
      }
      if (!filterCharacterMedia(mediaNode, criteria, allowAdult)) {
        continue;
      }
      seen.add(mediaNode.id);
      merged.push({
        ...mediaNode,
        matchedCharacterName: charName,
      });
    }
  }

  return {
    Page: {
      pageInfo: raw.Page.pageInfo,
      media: merged,
    },
  };
}

interface SearchCharactersRaw {
  Page: {
    pageInfo: PageInfo;
    characters: SearchCharacterTasteItem[];
  };
}

interface SearchStaffRaw {
  Page: {
    pageInfo: PageInfo;
    staff: SearchStaffTasteItem[];
  };
}

interface SearchStudiosRaw {
  Page: {
    pageInfo: PageInfo;
    studios: SearchStudioTasteItem[];
  };
}

interface TasteMainCharactersRaw {
  Page: {
    media: TasteMainCharacterMedia[];
  };
}

interface TasteStaffByIdsRaw {
  Page: {
    staff: SearchStaffTasteItem[];
  };
}

interface TasteStudiosByIdsRaw {
  Page: {
    studios: SearchStudioTasteItem[];
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
  const normalizedSearch = normalizeSearchInput(filters.search);
  const mediaType = filters.type === 'MANGA' ? 'MANGA' : 'ANIME';
  const allowAdult = isAdultQueryArg === undefined;
  const effectiveSort: MediaSort =
    normalizedSearch.length > 0 && filters.sort === 'TRENDING_DESC'
      ? 'SEARCH_MATCH'
      : filters.sort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'media',
      filters,
      normalizedSearch,
      effectiveSort,
      isAdultQueryArg ?? 'all',
    ],
    enabled: isMediaTab,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: async ({ pageParam, signal }) => {
      const criteria: MediaFilterCriteria = {
        type: mediaType,
        format: filters.format,
        status: filters.status,
        season: filters.season,
        year: filters.year,
        genres: filters.genres,
      };
      const hasTagFilters =
        filters.tags.length > 0 || filters.tagCategories.length > 0;
      const includeCharacters =
        pageParam === 1 && normalizedSearch.length >= 2 && !hasTagFilters;

      const executeQuery = async (searchTerm: string | undefined, pageNum: number, withChars: boolean) => {
        const raw = await anilistRequest<SearchMediaRaw>(
          SEARCH_MEDIA_QUERY,
          {
            page: pageNum,
            perPage: 24,
            search: searchTerm,
            type: mediaType,
            format: filters.format || undefined,
            status: filters.status || undefined,
            season: mediaType === 'ANIME' ? filters.season || undefined : undefined,
            seasonYear: filters.year || undefined,
            genre_in: filters.genres.length > 0 ? filters.genres : undefined,
            tag_in: filters.tags.length > 0 ? filters.tags : undefined,
            tagCategory_in:
              filters.tagCategories.length > 0 ? filters.tagCategories : undefined,
            sort: [effectiveSort],
            isAdult: isAdultQueryArg,
            includeCharacters: withChars,
          },
          { signal },
        );
        return mergeSearchMediaResults(raw, criteria, allowAdult);
      };

      const primary = await executeQuery(normalizedSearch || undefined, pageParam, includeCharacters);
      if (pageParam === 1 && primary.Page.media.length === 0 && normalizedSearch.length >= 2) {
        const fallbacks = buildFallbackSearchQueries(normalizedSearch);
        for (const fallback of fallbacks) {
          const retryResult = await executeQuery(fallback, 1, !hasTagFilters);
          if (retryResult.Page.media.length > 0) {
            return retryResult;
          }
        }
      }

      return primary;
    },
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useSearchCharactersQuery(
  filters: SearchFilters,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const normalizedSearch = normalizeSearchInput(filters.search);
  const isTasteSort = filters.characterSort === 'TASTE_MATCH';
  const needsPagedSearch = !isTasteSort || normalizedSearch.length > 0 || Boolean(filters.isBirthday);
  const effectiveSort: CharacterSort =
    filters.characterSort === 'TASTE_MATCH'
      ? normalizedSearch.length > 0
        ? 'SEARCH_MATCH'
        : 'FAVOURITES_DESC'
      : normalizedSearch.length > 0 && filters.characterSort === 'FAVOURITES_DESC'
        ? 'SEARCH_MATCH'
        : filters.characterSort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'character',
      normalizedSearch,
      filters.isBirthday ?? false,
      effectiveSort,
      isTasteSort ? 'taste' : 'standard',
    ],
    enabled: Boolean(enabled && filters.type === 'CHARACTER' && needsPagedSearch),
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: async ({ pageParam, signal }) => {
      const query = isTasteSort ? SEARCH_CHARACTERS_TASTE_QUERY : SEARCH_CHARACTERS_QUERY;
      const executeQuery = (searchTerm: string | undefined, pageNum: number) =>
        anilistRequest<SearchCharactersRaw>(
          query,
          {
            page: pageNum,
            perPage: 24,
            search: searchTerm,
            isBirthday: filters.isBirthday ? true : undefined,
            sort: [effectiveSort],
          },
          { signal },
        );

      const primary = await executeQuery(normalizedSearch || undefined, pageParam);
      if (pageParam === 1 && primary.Page.characters.length === 0 && normalizedSearch.length >= 2) {
        for (const fallback of buildFallbackSearchQueries(normalizedSearch)) {
          const retryResult = await executeQuery(fallback, 1);
          if (retryResult.Page.characters.length > 0) {
            return retryResult;
          }
        }
      }

      return primary;
    },
    getNextPageParam: (lastPage) =>
      lastPage.Page.pageInfo.hasNextPage
        ? (lastPage.Page.pageInfo.currentPage ?? 1) + 1
        : undefined,
  });
}

export function useTasteMainCharactersQuery(params: {
  mediaIds: number[];
  enabled: boolean;
}) {
  const { mediaIds, enabled } = params;
  return useQuery({
    queryKey: ['search', 'character', 'taste-main', mediaIds],
    enabled: Boolean(enabled && mediaIds.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<TasteMainCharactersRaw>(
        SEARCH_TASTE_MAIN_CHARACTERS_QUERY,
        { mediaIds },
        { signal },
      );
      return raw?.Page?.media ?? [];
    },
  });
}

export function useSearchStaffQuery(
  filters: SearchFilters,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const normalizedSearch = normalizeSearchInput(filters.search);
  const isTasteSort = filters.staffSort === 'TASTE_MATCH';
  const needsPagedSearch = !isTasteSort || normalizedSearch.length > 0 || Boolean(filters.isBirthday);
  const effectiveSort: StaffSort =
    filters.staffSort === 'TASTE_MATCH'
      ? normalizedSearch.length > 0
        ? 'SEARCH_MATCH'
        : 'FAVOURITES_DESC'
      : normalizedSearch.length > 0 && filters.staffSort === 'FAVOURITES_DESC'
        ? 'SEARCH_MATCH'
        : filters.staffSort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'staff',
      normalizedSearch,
      filters.isBirthday ?? false,
      effectiveSort,
      isTasteSort ? 'taste' : 'standard',
    ],
    enabled: Boolean(enabled && filters.type === 'STAFF' && needsPagedSearch),
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchStaffRaw>(
        isTasteSort ? SEARCH_STAFF_TASTE_QUERY : SEARCH_STAFF_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: normalizedSearch || undefined,
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

export function useTasteStaffByIdsQuery(params: {
  staffIds: number[];
  enabled: boolean;
}) {
  const { staffIds, enabled } = params;
  return useQuery({
    queryKey: ['search', 'staff', 'taste-ids', staffIds],
    enabled: Boolean(enabled && staffIds.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<TasteStaffByIdsRaw>(
        SEARCH_TASTE_STAFF_BY_IDS_QUERY,
        { ids: staffIds },
        { signal },
      );
      return raw?.Page?.staff ?? [];
    },
  });
}

export function useSearchStudiosQuery(
  filters: SearchFilters,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const normalizedSearch = normalizeSearchInput(filters.search);
  const isTasteSort = filters.studioSort === 'TASTE_MATCH';
  const needsPagedSearch = !isTasteSort || normalizedSearch.length > 0;
  const effectiveSort: StudioSort =
    filters.studioSort === 'TASTE_MATCH'
      ? normalizedSearch.length > 0
        ? 'SEARCH_MATCH'
        : 'FAVOURITES_DESC'
      : normalizedSearch.length > 0 && filters.studioSort === 'FAVOURITES_DESC'
        ? 'SEARCH_MATCH'
        : filters.studioSort;

  return useInfiniteQuery({
    queryKey: [
      'search',
      'studio',
      normalizedSearch,
      effectiveSort,
      isTasteSort ? 'taste' : 'standard',
    ],
    enabled: Boolean(enabled && filters.type === 'STUDIO' && needsPagedSearch),
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    queryFn: ({ pageParam, signal }) =>
      anilistRequest<SearchStudiosRaw>(
        isTasteSort ? SEARCH_STUDIOS_TASTE_QUERY : SEARCH_STUDIOS_QUERY,
        {
          page: pageParam,
          perPage: 24,
          search: normalizedSearch || undefined,
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

export function useTasteStudiosByIdsQuery(params: {
  studioIds: number[];
  enabled: boolean;
}) {
  const { studioIds, enabled } = params;
  return useQuery({
    queryKey: ['search', 'studio', 'taste-ids', studioIds],
    enabled: Boolean(enabled && studioIds.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<TasteStudiosByIdsRaw>(
        SEARCH_TASTE_STUDIOS_BY_IDS_QUERY,
        { ids: studioIds },
        { signal },
      );
      return raw?.Page?.studios ?? [];
    },
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
