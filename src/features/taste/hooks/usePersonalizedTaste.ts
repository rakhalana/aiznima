import { useMemo } from 'react';
import { useMyListQuery } from '@/features/my-list/api/myListQueries';
import {
  usePersonalizedCandidatesQuery,
  useViewerDeepStatsQuery,
} from '@/features/taste/api/tasteQueries';
import {
  buildPersonalEntryLookup,
  buildTasteProfile,
  scoreAndRankRecommendations,
  type ScoredRecommendation,
  type TasteProfile,
} from '@/features/taste/utils/tasteEngine';
import type { MediaListEntry, MediaType } from '@/shared/api/types';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { useAuthStore } from '@/shared/stores/useAuthStore';

interface UsePersonalizedTasteOptions {
  includeRecommendations?: boolean;
  skipColdStartCheck?: boolean;
}

export interface UsePersonalizedTasteResult {
  profile: TasteProfile | null;
  entriesByMediaId: Map<number, MediaListEntry>;
  recommendations: ScoredRecommendation[];
  isLoadingStats: boolean;
  isLoadingRecommendations: boolean;
  isErrorStats: boolean;
  isErrorRecommendations: boolean;
  refetchAll: () => Promise<void>;
}

export function usePersonalizedTaste(
  mediaType: MediaType,
  options: UsePersonalizedTasteOptions = {},
): UsePersonalizedTasteResult {
  const { includeRecommendations = false, skipColdStartCheck = false } = options;

  const accessToken = useAuthStore((state) => state.accessToken);
  const viewer = useAuthStore((state) => state.viewer);
  const { allowAdult, isAdultQueryArg } = useIsAdultFilter();

  const knownCount =
    mediaType === 'ANIME'
      ? viewer?.statistics?.anime?.count
      : viewer?.statistics?.manga?.count;

  const hasEnoughKnownTitles =
    skipColdStartCheck || knownCount === undefined || knownCount >= 3;

  const isAuthenticated = Boolean(accessToken && viewer?.id);
  const shouldFetchBase = isAuthenticated && hasEnoughKnownTitles;

  const deepStatsQuery = useViewerDeepStatsQuery(shouldFetchBase);
  const myListQuery = useMyListQuery(
    shouldFetchBase ? viewer?.id : undefined,
    mediaType,
  );

  const lookup = useMemo(
    () => buildPersonalEntryLookup(myListQuery.data),
    [myListQuery.data],
  );

  const rawStats =
    mediaType === 'ANIME'
      ? deepStatsQuery.data?.statistics?.anime ?? viewer?.statistics?.anime
      : deepStatsQuery.data?.statistics?.manga ?? viewer?.statistics?.manga;

  const profile = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }
    return buildTasteProfile({
      mediaType,
      stats: rawStats,
      entries: lookup.entries,
      scoreFormat: viewer?.mediaListOptions?.scoreFormat,
      allowAdult,
    });
  }, [
    isAuthenticated,
    mediaType,
    rawStats,
    lookup.entries,
    viewer?.mediaListOptions?.scoreFormat,
    allowAdult,
  ]);

  const candidatesQuery = usePersonalizedCandidatesQuery({
    mediaType,
    profile,
    entriesByMediaId: lookup.entriesByMediaId,
    allowAdult,
    isAdultQueryArg,
    enabled: Boolean(
      includeRecommendations &&
        shouldFetchBase &&
        profile?.isReady &&
        !myListQuery.isLoading,
    ),
  });

  const recommendations = useMemo(() => {
    if (!includeRecommendations || !profile?.isReady || !candidatesQuery.data) {
      return [];
    }
    return scoreAndRankRecommendations({
      candidates: candidatesQuery.data,
      profile,
      entriesByMediaId: lookup.entriesByMediaId,
      planningIds: lookup.planningIds,
      excludedIds: lookup.excludedIds,
      allowAdult,
    });
  }, [
    includeRecommendations,
    profile,
    candidatesQuery.data,
    lookup,
    allowAdult,
  ]);

  const refetchAll = async () => {
    await Promise.all([
      deepStatsQuery.refetch(),
      myListQuery.refetch(),
      ...(includeRecommendations ? [candidatesQuery.refetch()] : []),
    ]);
  };

  return {
    profile,
    entriesByMediaId: lookup.entriesByMediaId,
    recommendations,
    isLoadingStats: deepStatsQuery.isLoading || myListQuery.isLoading,
    isLoadingRecommendations: candidatesQuery.isLoading,
    isErrorStats: deepStatsQuery.isError && myListQuery.isError,
    isErrorRecommendations: candidatesQuery.isError,
    refetchAll,
  };
}
