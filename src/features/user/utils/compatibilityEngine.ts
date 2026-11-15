import { flattenCollectionEntries } from '@/features/taste/utils/tasteEngine';
import type {
  MediaListCollection,
  MediaListEntry,
  MediaListStatus,
  MediaSummary,
  MediaType,
  ScoreFormat,
} from '@/shared/api/types';
import { normalizeScoreTo100 } from '@/shared/utils/formatters';

export type CompatibilityVerdict =
  | 'Soulmates'
  | 'High Match'
  | 'Balanced'
  | 'Different Vibes';

export interface SharedMediaItem {
  media: MediaSummary;
  viewerStatus: MediaListStatus | null;
  targetStatus: MediaListStatus | null;
  viewerRawScore: number;
  targetRawScore: number;
  viewerScore100: number;
  targetScore100: number;
  scoreDiff: number | null;
}

export interface UserCompatibilityResult {
  compatibilityPercent: number | null;
  verdict: CompatibilityVerdict | null;
  sharedTitles: SharedMediaItem[];
  sharedRatedCount: number;
  avgScoreDiff: number | null;
  sharedTopGenres: string[];
  viewerActiveCount: number;
  targetActiveCount: number;
}

function isActiveEntry(status: MediaListStatus | null | undefined): boolean {
  return Boolean(status && status !== 'PLANNING');
}

function buildActiveEntryMap(
  collection: MediaListCollection | undefined,
  allowAdult: boolean,
): Map<number, MediaListEntry> {
  const map = new Map<number, MediaListEntry>();
  for (const entry of flattenCollectionEntries(collection)) {
    if (!allowAdult && entry.media.isAdult) continue;
    if (!isActiveEntry(entry.status)) continue;
    if (!map.has(entry.mediaId)) {
      map.set(entry.mediaId, entry);
    }
  }
  return map;
}

function buildGenreVector(
  entries: Iterable<MediaListEntry>,
  scoreFormat: ScoreFormat,
): Map<string, number> {
  const weights = new Map<string, number>();

  for (const entry of entries) {
    if (entry.status === 'DROPPED') continue;
    const norm = normalizeScoreTo100(entry.score, scoreFormat);
    const weight = norm > 0 ? 0.6 + (norm / 100) * 1.2 : 1;

    for (const genre of entry.media.genres ?? []) {
      weights.set(genre, (weights.get(genre) ?? 0) + weight);
    }
  }

  return weights;
}

function computeCosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
): { similarity: number; sharedTopGenres: string[] } {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const combined: Array<{ genre: string; score: number }> = [];

  for (const [genre, a] of vecA) {
    normA += a * a;
    const b = vecB.get(genre);
    if (b) {
      dot += a * b;
      combined.push({ genre, score: a * b });
    }
  }

  for (const b of vecB.values()) {
    normB += b * b;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  const similarity = denom > 0 ? Math.max(0, Math.min(1, dot / denom)) : 0;
  const sharedTopGenres = combined
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.genre);

  return { similarity, sharedTopGenres };
}

function getVerdict(percent: number): CompatibilityVerdict {
  if (percent >= 85) return 'Soulmates';
  if (percent >= 70) return 'High Match';
  if (percent >= 50) return 'Balanced';
  return 'Different Vibes';
}

export function computeUserCompatibility(params: {
  mediaType: MediaType;
  viewerCollection: MediaListCollection | undefined;
  targetCollection: MediaListCollection | undefined;
  viewerScoreFormat?: ScoreFormat | null;
  targetScoreFormat?: ScoreFormat | null;
  allowAdult: boolean;
}): UserCompatibilityResult {
  const {
    viewerCollection,
    targetCollection,
    viewerScoreFormat = 'POINT_100',
    targetScoreFormat = 'POINT_100',
    allowAdult,
  } = params;

  const viewerMap = buildActiveEntryMap(viewerCollection, allowAdult);
  const targetMap = buildActiveEntryMap(targetCollection, allowAdult);

  const sharedTitles: SharedMediaItem[] = [];
  let scoreDiffSum = 0;
  let sharedRatedCount = 0;

  for (const [mediaId, viewerEntry] of viewerMap) {
    const targetEntry = targetMap.get(mediaId);
    if (!targetEntry) continue;

    const viewerRawScore = viewerEntry.score ?? 0;
    const targetRawScore = targetEntry.score ?? 0;
    const viewerScore100 = normalizeScoreTo100(viewerRawScore, viewerScoreFormat);
    const targetScore100 = normalizeScoreTo100(targetRawScore, targetScoreFormat);

    const bothRated = viewerScore100 > 0 && targetScore100 > 0;
    const scoreDiff = bothRated ? Math.abs(viewerScore100 - targetScore100) : null;
    if (scoreDiff !== null) {
      scoreDiffSum += scoreDiff;
      sharedRatedCount++;
    }

    sharedTitles.push({
      media: targetEntry.media ?? viewerEntry.media,
      viewerStatus: viewerEntry.status ?? null,
      targetStatus: targetEntry.status ?? null,
      viewerRawScore,
      targetRawScore,
      viewerScore100,
      targetScore100,
      scoreDiff,
    });
  }

  sharedTitles.sort((a, b) => {
    const aBoth = a.scoreDiff !== null ? 1 : 0;
    const bBoth = b.scoreDiff !== null ? 1 : 0;
    if (bBoth !== aBoth) return bBoth - aBoth;

    if (a.scoreDiff !== null && b.scoreDiff !== null) {
      const aAvg = (a.viewerScore100 + a.targetScore100) / 2;
      const bAvg = (b.viewerScore100 + b.targetScore100) / 2;
      if (a.scoreDiff !== b.scoreDiff) return a.scoreDiff - b.scoreDiff;
      if (bAvg !== aAvg) return bAvg - aAvg;
    }

    return (b.media.popularity ?? 0) - (a.media.popularity ?? 0);
  });

  const viewerGenres = buildGenreVector(
    viewerMap.values(),
    viewerScoreFormat ?? 'POINT_100',
  );
  const targetGenres = buildGenreVector(
    targetMap.values(),
    targetScoreFormat ?? 'POINT_100',
  );
  const { similarity: genreSimilarity, sharedTopGenres } = computeCosineSimilarity(
    viewerGenres,
    targetGenres,
  );

  const avgScoreDiff =
    sharedRatedCount > 0 ? scoreDiffSum / sharedRatedCount : null;

  const canComputeScore = viewerMap.size >= 2 && targetMap.size >= 2;
  let compatibilityPercent: number | null = null;

  if (canComputeScore) {
    const baseTarget = Math.max(
      4,
      Math.min(viewerMap.size, targetMap.size) * 0.45,
    );
    const overlapRatio = Math.min(1, sharedTitles.length / baseTarget);
    const scoreAlignment =
      avgScoreDiff !== null
        ? Math.max(0, Math.min(1, 1 - avgScoreDiff / 40))
        : 0;

    let raw = 0;
    if (sharedRatedCount >= 2) {
      raw = scoreAlignment * 0.55 + genreSimilarity * 0.25 + overlapRatio * 0.2;
    } else if (sharedRatedCount === 1) {
      raw = scoreAlignment * 0.35 + genreSimilarity * 0.45 + overlapRatio * 0.2;
    } else {
      raw = genreSimilarity * 0.7 + overlapRatio * 0.3;
    }

    compatibilityPercent = Math.max(15, Math.min(99, Math.round(raw * 100)));
  }

  return {
    compatibilityPercent,
    verdict:
      compatibilityPercent !== null ? getVerdict(compatibilityPercent) : null,
    sharedTitles,
    sharedRatedCount,
    avgScoreDiff,
    sharedTopGenres,
    viewerActiveCount: viewerMap.size,
    targetActiveCount: targetMap.size,
  };
}
