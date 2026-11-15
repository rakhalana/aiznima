import { useQuery } from '@tanstack/react-query';
import { anilistRequest } from '@/shared/api/graphqlClient';
import { MEDIA_SUMMARY_FIELDS } from '@/shared/api/mediaFragments';
import type {
  MediaListEntry,
  MediaSummary,
  MediaType,
  UserDeepStatisticsPayload,
} from '@/shared/api/types';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import {
  collectMissingPrequelIds,
  resolveSeriesEntryPoint,
  type TasteProfile,
} from '@/features/taste/utils/tasteEngine';

const ANIME_DEEP_STATS_FIELDS = `
  count
  meanScore
  standardDeviation
  minutesWatched
  episodesWatched
  formats(sort: [COUNT_DESC]) {
    format
    count
    meanScore
    minutesWatched
    mediaIds
  }
  statuses(sort: [COUNT_DESC]) {
    status
    count
    meanScore
    minutesWatched
    mediaIds
  }
  scores {
    score
    count
    minutesWatched
    mediaIds
  }
  lengths {
    length
    count
    meanScore
    minutesWatched
    mediaIds
  }
  releaseYears {
    releaseYear
    count
    meanScore
    minutesWatched
    mediaIds
  }
  countries(sort: [COUNT_DESC]) {
    country
    count
    meanScore
    minutesWatched
    mediaIds
  }
  genres(limit: 25, sort: [COUNT_DESC]) {
    genre
    count
    meanScore
    minutesWatched
    mediaIds
  }
  tags(limit: 30, sort: [COUNT_DESC]) {
    count
    meanScore
    minutesWatched
    mediaIds
    tag {
      id
      name
      category
      isGeneralSpoiler
      isAdult
    }
  }
  studios(limit: 20, sort: [COUNT_DESC]) {
    count
    meanScore
    minutesWatched
    mediaIds
    studio {
      id
      name
      isAnimationStudio
    }
  }
  voiceActors(limit: 20, sort: [COUNT_DESC]) {
    count
    meanScore
    minutesWatched
    mediaIds
    voiceActor {
      id
      name {
        full
        native
      }
      languageV2
      image {
        medium
        large
      }
    }
  }
  staff(limit: 20, sort: [COUNT_DESC]) {
    count
    meanScore
    minutesWatched
    mediaIds
    staff {
      id
      name {
        full
        native
      }
      primaryOccupations
      image {
        medium
        large
      }
    }
  }
`;

const MANGA_DEEP_STATS_FIELDS = `
  count
  meanScore
  standardDeviation
  chaptersRead
  volumesRead
  formats(sort: [COUNT_DESC]) {
    format
    count
    meanScore
    chaptersRead
    mediaIds
  }
  statuses(sort: [COUNT_DESC]) {
    status
    count
    meanScore
    chaptersRead
    mediaIds
  }
  scores {
    score
    count
    chaptersRead
    mediaIds
  }
  lengths {
    length
    count
    meanScore
    chaptersRead
    mediaIds
  }
  releaseYears {
    releaseYear
    count
    meanScore
    chaptersRead
    mediaIds
  }
  countries(sort: [COUNT_DESC]) {
    country
    count
    meanScore
    chaptersRead
    mediaIds
  }
  genres(limit: 25, sort: [COUNT_DESC]) {
    genre
    count
    meanScore
    chaptersRead
    mediaIds
  }
  tags(limit: 30, sort: [COUNT_DESC]) {
    count
    meanScore
    chaptersRead
    mediaIds
    tag {
      id
      name
      category
      isGeneralSpoiler
      isAdult
    }
  }
  staff(limit: 20, sort: [COUNT_DESC]) {
    count
    meanScore
    chaptersRead
    mediaIds
    staff {
      id
      name {
        full
        native
      }
      primaryOccupations
      image {
        medium
        large
      }
    }
  }
`;

export const VIEWER_DEEP_STATS_QUERY = `
  query ViewerDeepStatistics {
    Viewer {
      id
      name
      statistics {
        anime {
          ${ANIME_DEEP_STATS_FIELDS}
        }
        manga {
          ${MANGA_DEEP_STATS_FIELDS}
        }
      }
    }
  }
`;

interface ViewerDeepStatsRaw {
  Viewer: UserDeepStatisticsPayload | null;
}

export function viewerDeepStatsQueryKey(userId: number | undefined) {
  return ['viewer-deep-stats', userId ?? 'anon'] as const;
}

export function useViewerDeepStatsQuery(enabled = true) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const viewerId = useAuthStore((state) => state.viewer?.id);

  return useQuery({
    queryKey: viewerDeepStatsQueryKey(viewerId),
    enabled: Boolean(enabled && isHydrated && accessToken && viewerId),
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const raw = await anilistRequest<ViewerDeepStatsRaw>(
        VIEWER_DEEP_STATS_QUERY,
        undefined,
        { signal },
      );
      return raw?.Viewer ?? null;
    },
  });
}

function getCandidateFields(mediaType: MediaType): string {
  const creatorFragment =
    mediaType === 'ANIME'
      ? `
        studios(isMain: true) {
          nodes {
            id
            name
            isAnimationStudio
          }
        }
      `
      : `
        staff(sort: [RELEVANCE], perPage: 3) {
          nodes {
            id
            name {
              full
              native
            }
          }
        }
      `;

  return `
    ${MEDIA_SUMMARY_FIELDS}
    startDate {
      year
    }
    tags {
      id
      name
      category
      rank
      isGeneralSpoiler
      isMediaSpoiler
      isAdult
    }
    relations {
      edges {
        relationType
        node {
          id
          type
          status
        }
      }
    }
    ${creatorFragment}
  `;
}

function buildMediaByIdsQuery(mediaType: MediaType): string {
  const fields = getCandidateFields(mediaType);
  return `
    query PersonalizedRecommendationPrequels(
      $ids: [Int]
      $type: MediaType!
      $isAdult: Boolean
    ) {
      Page(page: 1, perPage: 25) {
        media(id_in: $ids, type: $type, isAdult: $isAdult) {
          ${fields}
        }
      }
    }
  `;
}

function buildCandidatesQuery(params: {
  mediaType: MediaType;
  hasEra: boolean;
  hasHiddenTags: boolean;
  hasStudio: boolean;
  hasStaff: boolean;
}): string {
  const fields = getCandidateFields(params.mediaType);

  const eraBlock = params.hasEra
    ? `
      eraGems: Page(page: 1, perPage: 20) {
        media(
          type: $type
          status_not: NOT_YET_RELEASED
          isAdult: $isAdult
          startDate_greater: $eraStart
          startDate_lesser: $eraEnd
          genre_in: $topGenres
          genre_not_in: $avoidGenres
          averageScore_greater: 68
          sort: [POPULARITY_DESC]
        ) {
          ${fields}
        }
      }
    `
    : '';

  const hiddenGemsBlock = params.hasHiddenTags
    ? `
      hiddenGems: Page(page: 1, perPage: 20) {
        media(
          type: $type
          status_not: NOT_YET_RELEASED
          isAdult: $isAdult
          genre_in: $topGenres
          genre_not_in: $avoidGenres
          tag_in: $topTags
          popularity_lesser: 75000
          averageScore_greater: 72
          sort: [SCORE_DESC]
        ) {
          ${fields}
        }
      }
    `
    : `
      hiddenGems: Page(page: 1, perPage: 20) {
        media(
          type: $type
          status_not: NOT_YET_RELEASED
          isAdult: $isAdult
          genre_in: $topGenres
          genre_not_in: $avoidGenres
          popularity_lesser: 75000
          averageScore_greater: 72
          sort: [SCORE_DESC]
        ) {
          ${fields}
        }
      }
    `;

  const studioBlock =
    params.mediaType === 'ANIME' && params.hasStudio
      ? `
        topStudio: Studio(id: $topStudioId) {
          id
          name
          media(sort: [SCORE_DESC], perPage: 16, isMain: true) {
            nodes {
              ${fields}
            }
          }
        }
      `
      : '';

  const staffBlock =
    params.mediaType === 'MANGA' && params.hasStaff
      ? `
        topStaff: Staff(id: $topStaffId) {
          id
          staffMedia(sort: [SCORE_DESC], perPage: 16, type: MANGA) {
            nodes {
              ${fields}
            }
          }
        }
      `
      : '';

  return `
    query PersonalizedRecommendations(
      $type: MediaType!
      $isAdult: Boolean
      $topGenres: [String]
      $avoidGenres: [String]
      ${params.hasHiddenTags ? '$topTags: [String]' : ''}
      ${params.hasEra ? '$eraStart: FuzzyDateInt, $eraEnd: FuzzyDateInt' : ''}
      ${params.mediaType === 'ANIME' && params.hasStudio ? '$topStudioId: Int!' : ''}
      ${params.mediaType === 'MANGA' && params.hasStaff ? '$topStaffId: Int!' : ''}
    ) {
      topGenreHits: Page(page: 1, perPage: 25) {
        media(
          type: $type
          status_not: NOT_YET_RELEASED
          isAdult: $isAdult
          genre_in: $topGenres
          genre_not_in: $avoidGenres
          averageScore_greater: 68
          sort: [SCORE_DESC]
        ) {
          ${fields}
        }
      }
      ${eraBlock}
      ${hiddenGemsBlock}
      ${studioBlock}
      ${staffBlock}
    }
  `;
}

interface PersonalizedCandidatesRaw {
  topGenreHits?: { media: MediaSummary[] };
  eraGems?: { media: MediaSummary[] };
  hiddenGems?: { media: MediaSummary[] };
  topStudio?: { media: { nodes: MediaSummary[] } } | null;
  topStaff?: { staffMedia: { nodes: MediaSummary[] } } | null;
}

function dedupeCandidates(raw: PersonalizedCandidatesRaw): MediaSummary[] {
  const seen = new Map<number, MediaSummary>();
  const buckets = [
    raw.topGenreHits?.media ?? [],
    raw.eraGems?.media ?? [],
    raw.hiddenGems?.media ?? [],
    raw.topStudio?.media?.nodes ?? [],
    raw.topStaff?.staffMedia?.nodes ?? [],
  ];

  for (const list of buckets) {
    for (const item of list) {
      if (item && !seen.has(item.id)) {
        seen.set(item.id, item);
      }
    }
  }
  return Array.from(seen.values());
}

function computeEntriesDigest(
  entriesByMediaId: Map<number, MediaListEntry>,
): string {
  let count = 0;
  let xor = 0;
  let sum = 0;
  for (const [id, entry] of entriesByMediaId) {
    count++;
    const statusCode = entry.status
      ? entry.status.charCodeAt(0) + entry.status.length * 7
      : 0;
    const term = Math.imul(id ^ statusCode, 2654435761) >>> 0;
    xor ^= term;
    sum = (sum + term) >>> 0;
  }
  return `${count}:${xor.toString(36)}:${sum.toString(36)}`;
}

const PREQUEL_FETCH_BATCH_SIZE = 25;
const MAX_PREQUEL_FETCH_HOPS = 5;

export function usePersonalizedCandidatesQuery(params: {
  mediaType: MediaType;
  profile: TasteProfile | null;
  entriesByMediaId: Map<number, MediaListEntry>;
  allowAdult: boolean;
  isAdultQueryArg: false | undefined;
  enabled: boolean;
}) {
  const {
    mediaType,
    profile,
    entriesByMediaId,
    allowAdult,
    isAdultQueryArg,
    enabled,
  } = params;
  const accessToken = useAuthStore((state) => state.accessToken);
  const viewerId = useAuthStore((state) => state.viewer?.id);

  const signature = profile
    ? [
        profile.topGenres.join(','),
        profile.avoidGenres.join(','),
        profile.topTagNames.join(','),
        profile.favoriteEra?.label ?? '',
        profile.topStudioId ?? '',
        profile.topStaffId ?? '',
      ].join('|')
    : 'none';

  const entriesDigest = computeEntriesDigest(entriesByMediaId);

  return useQuery({
    queryKey: [
      'personalized-candidates',
      viewerId ?? 'anon',
      mediaType,
      isAdultQueryArg ?? 'all',
      signature,
      entriesDigest,
    ],
    enabled: Boolean(enabled && accessToken && viewerId && profile?.isReady),
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      if (!profile) return [];

      const hasEra = Boolean(profile.favoriteEra);
      const hasHiddenTags = profile.topTagNames.length > 0;
      const hasStudio = mediaType === 'ANIME' && profile.topStudioId !== null;
      const hasStaff = mediaType === 'MANGA' && profile.topStaffId !== null;

      const query = buildCandidatesQuery({
        mediaType,
        hasEra,
        hasHiddenTags,
        hasStudio,
        hasStaff,
      });

      const variables: Record<string, unknown> = {
        type: mediaType,
        isAdult: isAdultQueryArg,
        topGenres: profile.topGenres.length > 0 ? profile.topGenres : undefined,
        avoidGenres: profile.avoidGenres.length > 0 ? profile.avoidGenres : undefined,
      };
      if (hasHiddenTags) {
        variables.topTags = profile.topTagNames;
      }
      if (hasEra && profile.favoriteEra) {
        variables.eraStart = profile.favoriteEra.startYear * 10000 + 101;
        variables.eraEnd = profile.favoriteEra.endYear * 10000 + 1231;
      }
      if (hasStudio && profile.topStudioId) {
        variables.topStudioId = profile.topStudioId;
      }
      if (hasStaff && profile.topStaffId) {
        variables.topStaffId = profile.topStaffId;
      }

      const raw = await anilistRequest<PersonalizedCandidatesRaw>(
        query,
        variables,
        { signal },
      );
      const initialCandidates = dedupeCandidates(raw ?? {});

      const knownById = new Map<number, MediaSummary>(
        initialCandidates.map((item) => [item.id, item]),
      );

      // Batch-resolve missing same-type prequels up to MAX_PREQUEL_FETCH_HOPS hops
      const prequelQuery = buildMediaByIdsQuery(mediaType);
      for (let hop = 0; hop < MAX_PREQUEL_FETCH_HOPS; hop++) {
        const missingIds = collectMissingPrequelIds({
          candidates: initialCandidates,
          knownById,
          entriesByMediaId,
          allowAdult,
        });
        if (missingIds.length === 0) break;

        let addedCount = 0;
        for (let i = 0; i < missingIds.length; i += PREQUEL_FETCH_BATCH_SIZE) {
          const batchIds = missingIds.slice(i, i + PREQUEL_FETCH_BATCH_SIZE);
          try {
            const prequelRaw = await anilistRequest<{
              Page?: { media?: MediaSummary[] };
            }>(
              prequelQuery,
              {
                ids: batchIds,
                type: mediaType,
                isAdult: isAdultQueryArg,
              },
              { signal },
            );
            for (const media of prequelRaw?.Page?.media ?? []) {
              if (media && !knownById.has(media.id)) {
                knownById.set(media.id, media);
                addedCount++;
              }
            }
          } catch (error) {
            if (signal?.aborted) {
              throw error;
            }
            // Fall back to existing resolved candidates on transient secondary lookup errors
            addedCount = 0;
            break;
          }
        }

        if (addedCount === 0) break;
      }

      const resolvedMap = new Map<number, MediaSummary>();
      for (const candidate of initialCandidates) {
        const entryPoint = resolveSeriesEntryPoint({
          candidate,
          knownById,
          entriesByMediaId,
          allowAdult,
        });
        if (entryPoint && !resolvedMap.has(entryPoint.id)) {
          resolvedMap.set(entryPoint.id, entryPoint);
        }
      }

      return Array.from(resolvedMap.values());
    },
  });
}
