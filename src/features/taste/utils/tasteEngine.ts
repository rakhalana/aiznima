import type {
  MediaFormat,
  MediaListCollection,
  MediaListEntry,
  MediaListStatus,
  MediaSummary,
  MediaTag,
  MediaType,
  ScoreFormat,
  StaffSummary,
  StudioSummary,
  UserCountryStatistic,
  UserFormatStatistic,
  UserGenreStatistic,
  UserLengthStatistic,
  UserMediaDeepStatistics,
  UserReleaseYearStatistic,
  UserScoreStatistic,
  UserStatusStatistic,
} from '@/shared/api/types';
import {
  formatCountryCode,
  formatListStatusLabel,
  formatMediaFormat,
  formatMediaSource,
  normalizeScoreTo100,
} from '@/shared/utils/formatters';

export type GenreMatrixTag =
  | 'Signature'
  | 'Hidden Favorite'
  | 'Habitual'
  | 'High Drop'
  | 'Standard';

export interface GenreMatrixRow {
  genre: string;
  count: number;
  minutesWatched: number;
  chaptersRead: number;
  meanScore: number;
  completionRate: number;
  dropRate: number;
  volumeRank: number;
  qualityRank: number;
  matrixTag: GenreMatrixTag;
  affinityScore: number;
  mediaIds: number[];
}

export interface TagAffinityRow {
  id: number;
  name: string;
  category: string | null;
  count: number;
  meanScore: number;
  affinityScore: number;
  mediaIds: number[];
}

export interface EntityLoyaltyRow {
  id: number;
  name: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  count: number;
  meanScore: number;
  progressUnits: number;
  isLoyal: boolean;
  affinityScore: number;
  mediaIds: number[];
}

export interface SourceAffinityRow {
  source: string;
  label: string;
  count: number;
  meanScore: number;
  completionRate: number;
  dropRate: number;
  affinityScore: number;
  mediaIds: number[];
}

export interface EraWindow {
  label: string;
  startYear: number;
  endYear: number;
  count: number;
  meanScore: number;
}

export interface RewatchSummary {
  totalTitles: number;
  totalRepeats: number;
  estimatedExtraHours: number;
  estimatedExtraChapters: number;
  topEntries: Array<{
    entry: MediaListEntry;
    repeat: number;
    extraUnits: number;
  }>;
  mediaIds: number[];
}

export interface BreakdownBucketRow {
  key: string;
  label: string;
  count: number;
  meanScore: number;
  progressUnits: number;
  mediaIds: number[];
}

export interface TasteProfile {
  mediaType: MediaType;
  totalTitles: number;
  isReady: boolean;
  meanScore: number;
  standardDeviation: number;
  completionRate: number;
  dropRate: number;
  averagePopularity: number;
  nicheRatio: number;
  mainstreamProfile: 'Niche Explorer' | 'Balanced' | 'Mainstream Fan';
  favoriteEra: EraWindow | null;
  topSource: SourceAffinityRow | null;
  statuses: BreakdownBucketRow[];
  scores: BreakdownBucketRow[];
  formats: BreakdownBucketRow[];
  lengths: BreakdownBucketRow[];
  countries: BreakdownBucketRow[];
  releaseYears: Array<UserReleaseYearStatistic & { progressUnits: number }>;
  genreMatrix: GenreMatrixRow[];
  tags: TagAffinityRow[];
  studios: EntityLoyaltyRow[];
  staff: EntityLoyaltyRow[];
  voiceActors: EntityLoyaltyRow[];
  sourceAffinity: SourceAffinityRow[];
  rewatches: RewatchSummary;
  topGenres: string[];
  avoidGenres: string[];
  topTagNames: string[];
  topStudioId: number | null;
  topStaffId: number | null;
  vector: {
    genreWeights: Map<string, number>;
    avoidGenreSet: Set<string>;
    tagWeights: Map<string, number>;
    studioWeights: Map<number, number>;
    staffWeights: Map<number, number>;
    sourceWeights: Map<string, number>;
    formatWeights: Map<MediaFormat, number>;
    yearWeights: Map<number, number>;
  };
}

export interface PersonalEntryLookup {
  entries: MediaListEntry[];
  entriesByMediaId: Map<number, MediaListEntry>;
  planningIds: Set<number>;
  excludedIds: Set<number>;
}

export interface ScoredRecommendation {
  media: MediaSummary;
  matchPercent: number;
  isHiddenGem: boolean;
  inPlanning: boolean;
  reasons: string[];
  subtitleHint: string;
}

const EXCLUDED_STATUSES: ReadonlySet<MediaListStatus> = new Set([
  'CURRENT',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
  'REPEATING',
]);

export function flattenCollectionEntries(
  collection: MediaListCollection | null | undefined,
): MediaListEntry[] {
  if (!collection?.lists) {
    return [];
  }

  const byMediaId = new Map<number, MediaListEntry>();
  for (const group of collection.lists) {
    for (const entry of group.entries) {
      if (!byMediaId.has(entry.mediaId)) {
        byMediaId.set(entry.mediaId, entry);
      }
    }
  }
  return Array.from(byMediaId.values());
}

export function buildPersonalEntryLookup(
  collection: MediaListCollection | null | undefined,
): PersonalEntryLookup {
  const entries = flattenCollectionEntries(collection);
  const entriesByMediaId = new Map<number, MediaListEntry>();
  const planningIds = new Set<number>();
  const excludedIds = new Set<number>();

  for (const entry of entries) {
    entriesByMediaId.set(entry.mediaId, entry);
    if (entry.status === 'PLANNING') {
      planningIds.add(entry.mediaId);
    } else if (entry.status && EXCLUDED_STATUSES.has(entry.status)) {
      excludedIds.add(entry.mediaId);
    }
  }

  return { entries, entriesByMediaId, planningIds, excludedIds };
}

function getProgressMetric(
  mediaType: MediaType,
  minutesWatched: number | undefined,
  chaptersRead: number | undefined,
): number {
  return mediaType === 'MANGA' ? (chaptersRead ?? 0) : (minutesWatched ?? 0);
}

function computeQualityWeight(count: number, meanScore: number, baselineScore: number): number {
  const effectiveScore = meanScore > 0 ? meanScore : baselineScore;
  const confidence = Math.min(1, count / 4);
  const scoreBoost = Math.max(0.25, effectiveScore / 100);
  const logVolume = Math.log2(count + 1);
  return Number((scoreBoost * logVolume * (0.55 + 0.45 * confidence)).toFixed(3));
}

function computeFallbackGenres(
  entries: MediaListEntry[],
  scoreFormat: ScoreFormat,
): UserGenreStatistic[] {
  const map = new Map<
    string,
    { count: number; scoreSum: number; scoredCount: number; mediaIds: number[]; minutes: number; chapters: number }
  >();

  for (const entry of entries) {
    const normalized = normalizeScoreTo100(entry.score, scoreFormat);
    for (const genre of entry.media.genres) {
      let bucket = map.get(genre);
      if (!bucket) {
        bucket = { count: 0, scoreSum: 0, scoredCount: 0, mediaIds: [], minutes: 0, chapters: 0 };
        map.set(genre, bucket);
      }
      bucket.count += 1;
      bucket.mediaIds.push(entry.mediaId);
      if (entry.media.type === 'MANGA') {
        bucket.chapters += entry.progress ?? 0;
      } else {
        bucket.minutes += (entry.progress ?? 0) * (entry.media.duration ?? 24);
      }
      if (normalized > 0) {
        bucket.scoreSum += normalized;
        bucket.scoredCount += 1;
      }
    }
  }

  return Array.from(map.entries())
    .map(([genre, b]) => ({
      genre,
      count: b.count,
      meanScore: b.scoredCount > 0 ? Math.round((b.scoreSum / b.scoredCount) * 10) / 10 : 0,
      minutesWatched: b.minutes,
      chaptersRead: b.chapters,
      mediaIds: b.mediaIds,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildGenreOutcomeMap(entries: MediaListEntry[]) {
  const map = new Map<string, { completed: number; dropped: number; finishedOrDropped: number; allIds: number[] }>();
  for (const entry of entries) {
    for (const genre of entry.media.genres) {
      let bucket = map.get(genre);
      if (!bucket) {
        bucket = { completed: 0, dropped: 0, finishedOrDropped: 0, allIds: [] };
        map.set(genre, bucket);
      }
      bucket.allIds.push(entry.mediaId);
      if (entry.status === 'COMPLETED' || entry.status === 'REPEATING') {
        bucket.completed += 1;
        bucket.finishedOrDropped += 1;
      } else if (entry.status === 'DROPPED') {
        bucket.dropped += 1;
        bucket.finishedOrDropped += 1;
      }
    }
  }
  return map;
}

function buildGenreMatrix(
  mediaType: MediaType,
  rawGenres: UserGenreStatistic[],
  entries: MediaListEntry[],
  baselineScore: number,
  totalTitles: number,
): GenreMatrixRow[] {
  const outcomeMap = buildGenreOutcomeMap(entries);
  const minThreshold = totalTitles >= 10 ? 3 : 2;

  const baseRows = rawGenres.map((row) => {
    const outcome = outcomeMap.get(row.genre);
    const denom = outcome?.finishedOrDropped ?? 0;
    const completionRate = denom > 0 ? Math.round((outcome!.completed / denom) * 100) : 0;
    const dropRate = denom > 0 ? Math.round((outcome!.dropped / denom) * 100) : 0;
    const mediaIds = row.mediaIds.length > 0 ? row.mediaIds : (outcome?.allIds ?? []);
    const affinityScore = computeQualityWeight(row.count, row.meanScore, baselineScore);

    return {
      genre: row.genre,
      count: row.count,
      minutesWatched: row.minutesWatched,
      chaptersRead: row.chaptersRead,
      meanScore: row.meanScore,
      completionRate,
      dropRate,
      volumeRank: 0,
      qualityRank: 0,
      matrixTag: 'Standard' as GenreMatrixTag,
      affinityScore,
      mediaIds,
    };
  });

  const byVolume = [...baseRows].sort((a, b) => {
    const pDiff =
      getProgressMetric(mediaType, b.minutesWatched, b.chaptersRead) -
      getProgressMetric(mediaType, a.minutesWatched, a.chaptersRead);
    return pDiff !== 0 ? pDiff : b.count - a.count;
  });
  byVolume.forEach((r, idx) => {
    r.volumeRank = idx + 1;
  });

  const byQuality = [...baseRows].sort((a, b) => {
    const aQualified = a.count >= minThreshold && a.meanScore > 0 ? 1 : 0;
    const bQualified = b.count >= minThreshold && b.meanScore > 0 ? 1 : 0;
    if (aQualified !== bQualified) return bQualified - aQualified;
    if (b.meanScore !== a.meanScore) return b.meanScore - a.meanScore;
    return b.count - a.count;
  });
  byQuality.forEach((r, idx) => {
    r.qualityRank = idx + 1;
  });

  for (const row of baseRows) {
    if (row.count >= minThreshold && row.dropRate >= 45 && row.meanScore > 0 && row.meanScore < baselineScore - 6) {
      row.matrixTag = 'High Drop';
    } else if (row.volumeRank <= 3 && row.qualityRank <= 4) {
      row.matrixTag = 'Signature';
    } else if (row.count >= minThreshold && row.qualityRank <= 4 && row.volumeRank > 4) {
      row.matrixTag = 'Hidden Favorite';
    } else if (row.volumeRank <= 3 && row.qualityRank > 5) {
      row.matrixTag = 'Habitual';
    }
  }

  return byVolume;
}

function buildSourceAffinity(
  entries: MediaListEntry[],
  scoreFormat: ScoreFormat,
  baselineScore: number,
): SourceAffinityRow[] {
  const map = new Map<
    string,
    {
      count: number;
      scoreSum: number;
      scoredCount: number;
      completed: number;
      dropped: number;
      finishedOrDropped: number;
      mediaIds: number[];
    }
  >();

  for (const entry of entries) {
    const src = entry.media.source;
    if (!src) continue;
    let bucket = map.get(src);
    if (!bucket) {
      bucket = {
        count: 0,
        scoreSum: 0,
        scoredCount: 0,
        completed: 0,
        dropped: 0,
        finishedOrDropped: 0,
        mediaIds: [],
      };
      map.set(src, bucket);
    }
    bucket.count += 1;
    bucket.mediaIds.push(entry.mediaId);
    const normalized = normalizeScoreTo100(entry.score, scoreFormat);
    if (normalized > 0) {
      bucket.scoreSum += normalized;
      bucket.scoredCount += 1;
    }
    if (entry.status === 'COMPLETED' || entry.status === 'REPEATING') {
      bucket.completed += 1;
      bucket.finishedOrDropped += 1;
    } else if (entry.status === 'DROPPED') {
      bucket.dropped += 1;
      bucket.finishedOrDropped += 1;
    }
  }

  return Array.from(map.entries())
    .map(([source, b]) => {
      const meanScore =
        b.scoredCount > 0 ? Math.round((b.scoreSum / b.scoredCount) * 10) / 10 : 0;
      const completionRate =
        b.finishedOrDropped > 0 ? Math.round((b.completed / b.finishedOrDropped) * 100) : 0;
      const dropRate =
        b.finishedOrDropped > 0 ? Math.round((b.dropped / b.finishedOrDropped) * 100) : 0;

      return {
        source,
        label: formatMediaSource(source),
        count: b.count,
        meanScore,
        completionRate,
        dropRate,
        affinityScore: computeQualityWeight(b.count, meanScore, baselineScore),
        mediaIds: b.mediaIds,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function findFavoriteEra(
  releaseYears: UserReleaseYearStatistic[],
  baselineScore: number,
): EraWindow | null {
  const valid = releaseYears.filter((y) => y.releaseYear > 1950 && y.count > 0);
  if (valid.length === 0) {
    return null;
  }

  const decadeMap = new Map<
    number,
    { count: number; weightedScore: number; scoredCount: number }
  >();

  for (const row of valid) {
    const bucketStart = Math.floor(row.releaseYear / 5) * 5;
    let bucket = decadeMap.get(bucketStart);
    if (!bucket) {
      bucket = { count: 0, weightedScore: 0, scoredCount: 0 };
      decadeMap.set(bucketStart, bucket);
    }
    bucket.count += row.count;
    if (row.meanScore > 0) {
      bucket.weightedScore += row.meanScore * row.count;
      bucket.scoredCount += row.count;
    }
  }

  let best: EraWindow | null = null;
  let bestStrength = -1;

  for (const [startYear, bucket] of decadeMap.entries()) {
    const endYear = startYear + 4;
    const meanScore =
      bucket.scoredCount > 0
        ? Math.round((bucket.weightedScore / bucket.scoredCount) * 10) / 10
        : baselineScore;
    const strength = computeQualityWeight(bucket.count, meanScore, baselineScore);
    if (strength > bestStrength) {
      bestStrength = strength;
      best = {
        label: `${startYear}–${endYear}`,
        startYear,
        endYear,
        count: bucket.count,
        meanScore,
      };
    }
  }

  return best;
}

function buildRewatchSummary(entries: MediaListEntry[], mediaType: MediaType): RewatchSummary {
  const repeated = entries
    .filter((e) => (e.repeat ?? 0) > 0)
    .map((entry) => {
      const repeat = entry.repeat ?? 0;
      const unitsPerRun =
        mediaType === 'MANGA'
          ? (entry.media.chapters ?? entry.progress ?? 0)
          : (entry.media.episodes ?? entry.progress ?? 0);
      return {
        entry,
        repeat,
        extraUnits: repeat * unitsPerRun,
      };
    })
    .sort((a, b) => (b.repeat !== a.repeat ? b.repeat - a.repeat : b.extraUnits - a.extraUnits));

  const totalRepeats = repeated.reduce((sum, item) => sum + item.repeat, 0);
  const totalExtraMinutes = repeated.reduce((sum, item) => {
    if (mediaType === 'MANGA') return sum;
    return sum + item.extraUnits * (item.entry.media.duration ?? 24);
  }, 0);
  const totalExtraChapters = mediaType === 'MANGA'
    ? repeated.reduce((sum, item) => sum + item.extraUnits, 0)
    : 0;

  return {
    totalTitles: repeated.length,
    totalRepeats,
    estimatedExtraHours: Math.round(totalExtraMinutes / 60),
    estimatedExtraChapters: totalExtraChapters,
    topEntries: repeated.slice(0, 6),
    mediaIds: repeated.map((item) => item.entry.mediaId),
  };
}

function mapFormatRows(
  rows: UserFormatStatistic[] | undefined,
  mediaType: MediaType,
): BreakdownBucketRow[] {
  return (rows ?? [])
    .filter((r) => Boolean(r.format))
    .map((r) => ({
      key: r.format!,
      label: formatMediaFormat(r.format),
      count: r.count,
      meanScore: r.meanScore,
      progressUnits: getProgressMetric(mediaType, r.minutesWatched, r.chaptersRead),
      mediaIds: r.mediaIds,
    }))
    .sort((a, b) => b.count - a.count);
}

function mapStatusRows(
  rows: UserStatusStatistic[] | undefined,
  mediaType: MediaType,
): BreakdownBucketRow[] {
  return (rows ?? [])
    .filter((r) => Boolean(r.status))
    .map((r) => ({
      key: r.status!,
      label: formatListStatusLabel(r.status!, mediaType),
      count: r.count,
      meanScore: r.meanScore,
      progressUnits: getProgressMetric(mediaType, r.minutesWatched, r.chaptersRead),
      mediaIds: r.mediaIds,
    }))
    .sort((a, b) => b.count - a.count);
}

function mapScoreRows(
  rows: UserScoreStatistic[] | undefined,
  mediaType: MediaType,
): BreakdownBucketRow[] {
  return [...(rows ?? [])]
    .filter((r) => r.score > 0 && r.count > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      key: String(r.score),
      label: `${r.score}`,
      count: r.count,
      meanScore: r.score,
      progressUnits: getProgressMetric(mediaType, r.minutesWatched, r.chaptersRead),
      mediaIds: r.mediaIds,
    }));
}

function mapLengthRows(
  rows: UserLengthStatistic[] | undefined,
  mediaType: MediaType,
): BreakdownBucketRow[] {
  return [...(rows ?? [])]
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      key: r.length ?? 'UNKNOWN',
      label: r.length ? `${r.length} ${mediaType === 'MANGA' ? 'ch' : 'ep'}` : 'Ongoing / TBA',
      count: r.count,
      meanScore: r.meanScore,
      progressUnits: getProgressMetric(mediaType, r.minutesWatched, r.chaptersRead),
      mediaIds: r.mediaIds,
    }));
}

function mapCountryRows(
  rows: UserCountryStatistic[] | undefined,
  mediaType: MediaType,
): BreakdownBucketRow[] {
  return (rows ?? [])
    .filter((r) => Boolean(r.country))
    .map((r) => ({
      key: r.country!,
      label: formatCountryCode(r.country),
      count: r.count,
      meanScore: r.meanScore,
      progressUnits: getProgressMetric(mediaType, r.minutesWatched, r.chaptersRead),
      mediaIds: r.mediaIds,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildLoyaltyList<T extends { count: number; meanScore: number; minutesWatched: number; chaptersRead?: number; mediaIds: number[] }>(
  items: T[] | undefined,
  mediaType: MediaType,
  baselineScore: number,
  minLoyalCount: number,
  extractEntity: (row: T) => { id: number; name: string; imageUrl?: string | null; subtitle?: string | null } | null,
): EntityLoyaltyRow[] {
  const result: EntityLoyaltyRow[] = [];
  for (const row of items ?? []) {
    const entity = extractEntity(row);
    if (!entity) continue;
    result.push({
      id: entity.id,
      name: entity.name,
      imageUrl: entity.imageUrl ?? null,
      subtitle: entity.subtitle ?? null,
      count: row.count,
      meanScore: row.meanScore,
      progressUnits: getProgressMetric(mediaType, row.minutesWatched, row.chaptersRead),
      isLoyal: row.count >= minLoyalCount,
      affinityScore: computeQualityWeight(row.count, row.meanScore, baselineScore),
      mediaIds: row.mediaIds,
    });
  }
  return result.sort((a, b) => {
    if (a.isLoyal !== b.isLoyal) return a.isLoyal ? -1 : 1;
    if (b.affinityScore !== a.affinityScore) return b.affinityScore - a.affinityScore;
    return b.count - a.count;
  });
}

export function buildTasteProfile(params: {
  mediaType: MediaType;
  stats: UserMediaDeepStatistics | null | undefined;
  entries: MediaListEntry[];
  scoreFormat?: ScoreFormat | null;
  allowAdult?: boolean;
}): TasteProfile {
  const {
    mediaType,
    stats,
    entries,
    scoreFormat = 'POINT_100',
    allowAdult = false,
  } = params;

  const resolvedScoreFormat: ScoreFormat = scoreFormat ?? 'POINT_100';
  const safeEntries = entries.filter((e) => allowAdult || !e.media.isAdult);
  const totalTitles = Math.max(stats?.count ?? 0, safeEntries.length);
  const isReady = totalTitles >= 3;

  const meanScore =
    stats?.meanScore && stats.meanScore > 0
      ? Math.round(stats.meanScore * 10) / 10
      : (() => {
          const scored = safeEntries
            .map((e) => normalizeScoreTo100(e.score, resolvedScoreFormat))
            .filter((s) => s > 0);
          if (scored.length === 0) return 0;
          return Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10;
        })();

  const baselineScore = meanScore > 0 ? meanScore : 75;
  const standardDeviation = Math.round((stats?.standardDeviation ?? 0) * 10) / 10;

  let finishedCompleted = 0;
  let finishedDropped = 0;
  for (const e of safeEntries) {
    if (e.status === 'COMPLETED' || e.status === 'REPEATING') finishedCompleted += 1;
    else if (e.status === 'DROPPED') finishedDropped += 1;
  }
  const finishedTotal = finishedCompleted + finishedDropped;
  const completionRate =
    finishedTotal > 0 ? Math.round((finishedCompleted / finishedTotal) * 100) : 0;
  const dropRate = finishedTotal > 0 ? Math.round((finishedDropped / finishedTotal) * 100) : 0;

  const pops = safeEntries
    .map((e) => e.media.popularity)
    .filter((p): p is number => typeof p === 'number' && p > 0);
  const averagePopularity =
    pops.length > 0 ? Math.round(pops.reduce((a, b) => a + b, 0) / pops.length) : 0;
  const nicheCount = pops.filter((p) => p < 75_000).length;
  const nicheRatio = pops.length > 0 ? Math.round((nicheCount / pops.length) * 100) : 0;
  const mainstreamProfile =
    pops.length === 0
      ? 'Balanced'
      : nicheRatio >= 55
        ? 'Niche Explorer'
        : nicheRatio <= 25
          ? 'Mainstream Fan'
          : 'Balanced';

  const rawGenres =
    stats?.genres && stats.genres.length > 0
      ? stats.genres
      : computeFallbackGenres(safeEntries, resolvedScoreFormat);

  const genreMatrix = buildGenreMatrix(
    mediaType,
    rawGenres,
    safeEntries,
    baselineScore,
    totalTitles,
  );

  const tags: TagAffinityRow[] = (stats?.tags ?? [])
    .filter(
      (item): item is typeof item & { tag: MediaTag } =>
        Boolean(item.tag) &&
        !item.tag!.isMediaSpoiler &&
        !item.tag!.isGeneralSpoiler &&
        (allowAdult || !item.tag!.isAdult),
    )
    .map((item) => ({
      id: item.tag.id,
      name: item.tag.name,
      category: item.tag.category ?? null,
      count: item.count,
      meanScore: item.meanScore,
      affinityScore: computeQualityWeight(item.count, item.meanScore, baselineScore),
      mediaIds: item.mediaIds,
    }))
    .sort((a, b) => b.affinityScore - a.affinityScore);

  const minLoyal = totalTitles >= 10 ? 3 : 2;
  const studios = buildLoyaltyList(
    stats?.studios,
    mediaType,
    baselineScore,
    minLoyal,
    (row) => {
      const studio: StudioSummary | null = row.studio;
      return studio ? { id: studio.id, name: studio.name } : null;
    },
  );

  const staff = buildLoyaltyList(
    stats?.staff,
    mediaType,
    baselineScore,
    minLoyal,
    (row) => {
      const s: StaffSummary | null = row.staff;
      if (!s) return null;
      return {
        id: s.id,
        name: s.name.full || s.name.native || 'Unknown',
        imageUrl: s.image?.medium || s.image?.large,
        subtitle: s.primaryOccupations?.[0] ?? null,
      };
    },
  );

  const voiceActors = buildLoyaltyList(
    stats?.voiceActors,
    mediaType,
    baselineScore,
    minLoyal,
    (row) => {
      const va: StaffSummary | null = row.voiceActor;
      if (!va) return null;
      return {
        id: va.id,
        name: va.name.full || va.name.native || 'Unknown',
        imageUrl: va.image?.medium || va.image?.large,
        subtitle: va.languageV2 ?? null,
      };
    },
  );

  const sourceAffinity = buildSourceAffinity(
    safeEntries,
    resolvedScoreFormat,
    baselineScore,
  );
  const topSource =
    [...sourceAffinity].sort((a, b) => b.affinityScore - a.affinityScore)[0] ?? null;

  const releaseYears = [...(stats?.releaseYears ?? [])]
    .filter((y) => y.releaseYear > 1950)
    .map((y) => ({
      ...y,
      progressUnits: getProgressMetric(mediaType, y.minutesWatched, y.chaptersRead),
    }))
    .sort((a, b) => b.releaseYear - a.releaseYear);

  const favoriteEra = findFavoriteEra(stats?.releaseYears ?? [], baselineScore);
  const statuses = mapStatusRows(stats?.statuses, mediaType);
  const scores = mapScoreRows(stats?.scores, mediaType);
  const formats = mapFormatRows(stats?.formats, mediaType);
  const lengths = mapLengthRows(stats?.lengths, mediaType);
  const countries = mapCountryRows(stats?.countries, mediaType);
  const rewatches = buildRewatchSummary(safeEntries, mediaType);

  const avoidGenres = genreMatrix
    .filter((g) => g.matrixTag === 'High Drop')
    .map((g) => g.genre);
  const avoidGenreSet = new Set(avoidGenres);

  const rankedGenres = [...genreMatrix]
    .filter((g) => !avoidGenreSet.has(g.genre))
    .sort((a, b) => b.affinityScore - a.affinityScore);

  const topGenres = rankedGenres.slice(0, 4).map((g) => g.genre);
  const topTagNames = tags.slice(0, 5).map((t) => t.name);
  const topStudioId =
    studios.find((s) => s.isLoyal)?.id ?? studios[0]?.id ?? null;
  const topStaffId =
    staff.find((s) => s.isLoyal)?.id ?? staff[0]?.id ?? null;

  const genreWeights = new Map<string, number>(
    genreMatrix.map((g) => [g.genre, g.affinityScore]),
  );
  const tagWeights = new Map<string, number>(tags.map((t) => [t.name, t.affinityScore]));
  const studioWeights = new Map<number, number>(
    studios.map((s) => [s.id, s.affinityScore]),
  );
  const staffWeights = new Map<number, number>(staff.map((s) => [s.id, s.affinityScore]));
  const sourceWeights = new Map<string, number>(
    sourceAffinity.map((s) => [s.source, s.affinityScore]),
  );

  const formatWeights = new Map<MediaFormat, number>();
  for (const f of stats?.formats ?? []) {
    if (f.format) {
      formatWeights.set(
        f.format,
        computeQualityWeight(f.count, f.meanScore, baselineScore),
      );
    }
  }

  const yearWeights = new Map<number, number>();
  for (const y of stats?.releaseYears ?? []) {
    yearWeights.set(
      y.releaseYear,
      computeQualityWeight(y.count, y.meanScore, baselineScore),
    );
  }

  return {
    mediaType,
    totalTitles,
    isReady,
    meanScore,
    standardDeviation,
    completionRate,
    dropRate,
    averagePopularity,
    nicheRatio,
    mainstreamProfile,
    favoriteEra,
    topSource,
    statuses,
    scores,
    formats,
    lengths,
    countries,
    releaseYears,
    genreMatrix,
    tags,
    studios,
    staff,
    voiceActors,
    sourceAffinity,
    rewatches,
    topGenres,
    avoidGenres,
    topTagNames,
    topStudioId,
    topStaffId,
    vector: {
      genreWeights,
      avoidGenreSet,
      tagWeights,
      studioWeights,
      staffWeights,
      sourceWeights,
      formatWeights,
      yearWeights,
    },
  };
}

function getEraRangeBonus(
  seasonYear: number | null | undefined,
  profile: TasteProfile,
): { pts: number; matchedEraLabel: string | null } {
  if (!seasonYear) {
    return { pts: 0, matchedEraLabel: null };
  }

  const exact = profile.vector.yearWeights.get(seasonYear) ?? 0;
  if (
    profile.favoriteEra &&
    seasonYear >= profile.favoriteEra.startYear &&
    seasonYear <= profile.favoriteEra.endYear
  ) {
    return { pts: 12 + Math.min(4, exact), matchedEraLabel: `Era ${profile.favoriteEra.label}` };
  }

  if (profile.favoriteEra) {
    const distance = Math.min(
      Math.abs(seasonYear - profile.favoriteEra.startYear),
      Math.abs(seasonYear - profile.favoriteEra.endYear),
    );
    if (distance <= 3) {
      return { pts: 6, matchedEraLabel: null };
    }
  }

  if (exact > 0) {
    return { pts: Math.min(8, exact * 3), matchedEraLabel: null };
  }

  return { pts: 0, matchedEraLabel: null };
}

export function scoreAndRankRecommendations(params: {
  candidates: MediaSummary[];
  profile: TasteProfile;
  entriesByMediaId: Map<number, MediaListEntry>;
  planningIds: Set<number>;
  excludedIds: Set<number>;
  allowAdult: boolean;
}): ScoredRecommendation[] {
  const {
    candidates,
    profile,
    entriesByMediaId,
    planningIds,
    excludedIds,
    allowAdult,
  } = params;

  if (!profile.isReady || candidates.length === 0) {
    return [];
  }

  const maxGenreW = Math.max(1, ...profile.vector.genreWeights.values());
  const maxTagW = Math.max(1, ...profile.vector.tagWeights.values());
  const maxStudioW = Math.max(1, ...profile.vector.studioWeights.values());
  const maxStaffW = Math.max(1, ...profile.vector.staffWeights.values());
  const maxSourceW = Math.max(1, ...profile.vector.sourceWeights.values());

  const scored: Array<ScoredRecommendation & { rawScore: number }> = [];

  for (const rawMedia of candidates) {
    if (rawMedia.type !== profile.mediaType) continue;
    if (!allowAdult && rawMedia.isAdult) continue;
    if (rawMedia.status === 'NOT_YET_RELEASED') continue;
    if (excludedIds.has(rawMedia.id)) continue;

    const existingEntry = entriesByMediaId.get(rawMedia.id);
    if (existingEntry?.status && EXCLUDED_STATUSES.has(existingEntry.status)) {
      continue;
    }

    const inPlanning =
      planningIds.has(rawMedia.id) || rawMedia.mediaListEntry?.status === 'PLANNING';
    const media: MediaSummary = existingEntry
      ? { ...rawMedia, mediaListEntry: existingEntry }
      : rawMedia;

    let rawScore = 0;
    const reasonCandidates: Array<{ score: number; label: string }> = [];

    // 1. Genre match & drop penalty (up to 34 pts)
    let genrePts = 0;
    let bestGenreLabel: { w: number; name: string } | null = null;
    for (const genre of media.genres) {
      if (profile.vector.avoidGenreSet.has(genre)) {
        genrePts -= 16;
        continue;
      }
      const w = profile.vector.genreWeights.get(genre) ?? 0;
      if (w > 0) {
        const contrib = (w / maxGenreW) * 14;
        genrePts += contrib;
        if (!bestGenreLabel || w > bestGenreLabel.w) {
          bestGenreLabel = { w, name: genre };
        }
      }
    }
    const clampedGenrePts = Math.min(34, Math.max(-24, genrePts));
    rawScore += clampedGenrePts;
    if (bestGenreLabel) {
      reasonCandidates.push({ score: clampedGenrePts, label: bestGenreLabel.name });
    }

    // 2. Tag proximity weighted by tag rank (up to 24 pts)
    let tagPts = 0;
    let bestTagLabel: { pts: number; name: string } | null = null;
    for (const tag of media.tags ?? []) {
      if (tag.isMediaSpoiler || tag.isGeneralSpoiler) continue;
      if (!allowAdult && tag.isAdult) continue;
      const w = profile.vector.tagWeights.get(tag.name) ?? 0;
      if (w > 0) {
        const rankFactor = (tag.rank ?? 60) / 100;
        const contrib = (w / maxTagW) * 10 * rankFactor;
        tagPts += contrib;
        if (!bestTagLabel || contrib > bestTagLabel.pts) {
          bestTagLabel = { pts: contrib, name: tag.name };
        }
      }
    }
    const clampedTagPts = Math.min(24, tagPts);
    rawScore += clampedTagPts;
    if (bestTagLabel && bestTagLabel.pts >= 2) {
      reasonCandidates.push({ score: clampedTagPts, label: bestTagLabel.name });
    }

    // 3. Studio (Anime) or Staff (Manga) loyalty (up to 16 pts)
    let creatorPts = 0;
    let creatorLabel: string | null = null;
    if (media.type === 'ANIME') {
      const studioNodes =
        media.studios?.nodes ??
        media.studios?.edges?.map((e) => e.node) ??
        [];
      for (const studio of studioNodes) {
        const w = profile.vector.studioWeights.get(studio.id) ?? 0;
        if (w > 0) {
          const pts = 6 + (w / maxStudioW) * 10;
          if (pts > creatorPts) {
            creatorPts = pts;
            creatorLabel = studio.name;
          }
        }
      }
    } else {
      const staffNodes =
        media.staff?.nodes ?? media.staff?.edges?.map((e) => e.node) ?? [];
      for (const st of staffNodes) {
        const w = profile.vector.staffWeights.get(st.id) ?? 0;
        if (w > 0) {
          const pts = 6 + (w / maxStaffW) * 10;
          if (pts > creatorPts) {
            creatorPts = pts;
            creatorLabel = st.name.full || st.name.native || null;
          }
        }
      }
    }
    rawScore += creatorPts;
    if (creatorLabel && creatorPts >= 6) {
      reasonCandidates.push({ score: creatorPts + 2, label: creatorLabel });
    }

    // 4. Era proximity (up to 12 pts)
    const releaseYear = media.seasonYear ?? media.startDate?.year;
    const eraMatch = getEraRangeBonus(releaseYear, profile);
    rawScore += eraMatch.pts;
    if (eraMatch.matchedEraLabel) {
      reasonCandidates.push({ score: eraMatch.pts, label: eraMatch.matchedEraLabel });
    }

    // 5. Source & Format affinity (up to 10 pts)
    let affinityPts = 0;
    if (media.source) {
      const sw = profile.vector.sourceWeights.get(media.source) ?? 0;
      if (sw > 0) {
        const sPts = (sw / maxSourceW) * 6;
        affinityPts += sPts;
        if (sPts >= 4) {
          reasonCandidates.push({ score: sPts, label: formatMediaSource(media.source) });
        }
      }
    }
    if (media.format) {
      const fw = profile.vector.formatWeights.get(media.format) ?? 0;
      if (fw > 0) {
        affinityPts += Math.min(4, fw);
      }
    }
    rawScore += affinityPts;

    // 6. Community quality & Hidden Gem signal
    const meanBonus = media.meanScore ? Math.max(0, (media.meanScore - 62) / 5) : 2;
    const isHiddenGem =
      (media.popularity ?? 0) > 0 &&
      (media.popularity ?? 0) < 75_000 &&
      (media.meanScore ?? 0) >= 72;
    const nicheBonus =
      isHiddenGem && profile.mainstreamProfile !== 'Mainstream Fan' ? 5 : isHiddenGem ? 2 : 0;
    const planningBonus = inPlanning ? 4 : 0;

    rawScore += meanBonus + nicheBonus + planningBonus;

    // Skip candidates that have negative or virtually zero taste overlap
    if (rawScore < 16) {
      continue;
    }

    const matchPercent = Math.max(60, Math.min(98, Math.round(52 + rawScore * 0.56)));

    if (isHiddenGem) {
      reasonCandidates.push({ score: 5, label: 'Hidden Gem' });
    }

    const dedupReasons: string[] = [];
    for (const rc of reasonCandidates.sort((a, b) => b.score - a.score)) {
      if (!dedupReasons.includes(rc.label)) {
        dedupReasons.push(rc.label);
      }
      if (dedupReasons.length >= 2) break;
    }

    const subtitleHint =
      dedupReasons.length > 0
        ? `${matchPercent}% Match · ${dedupReasons.join(' · ')}`
        : `${matchPercent}% Match`;

    scored.push({
      media,
      matchPercent,
      isHiddenGem,
      inPlanning,
      reasons: dedupReasons,
      subtitleHint,
      rawScore,
    });
  }

  const ordered = scored.sort((a, b) =>
    b.matchPercent !== a.matchPercent
      ? b.matchPercent - a.matchPercent
      : b.rawScore - a.rawScore,
  );

  // Balanced Taste Mix: promote 1 strong Hidden Gem into the top 5 carousel when available
  const hasTopHiddenGem = ordered.slice(0, 5).some((item) => item.isHiddenGem);
  if (!hasTopHiddenGem && ordered.length > 5) {
    const gemIndex = ordered.findIndex(
      (item, idx) => idx >= 5 && item.isHiddenGem && item.matchPercent >= 74,
    );
    if (gemIndex !== -1) {
      const [gemItem] = ordered.splice(gemIndex, 1);
      ordered.splice(4, 0, gemItem);
    }
  }

  return ordered.map(({ rawScore: _raw, ...rest }) => rest);
}

const MAX_PREQUEL_HOPS = 5;
const FINISHED_PREQUEL_STATUSES = new Set<MediaListStatus>(['COMPLETED', 'REPEATING']);

function findSameTypePrequelId(media: MediaSummary): number | null {
  const edges = media.relations?.edges ?? [];
  for (const edge of edges) {
    if (edge?.relationType !== 'PREQUEL' || !edge.node?.id) continue;
    if (edge.node.id === media.id) continue;
    if (edge.node.type && edge.node.type !== media.type) continue;
    if (edge.node.status === 'NOT_YET_RELEASED') continue;
    return edge.node.id;
  }
  return null;
}

function getEffectiveEntryStatus(
  mediaId: number,
  knownMedia: MediaSummary | undefined,
  entriesByMediaId: Map<number, MediaListEntry>,
): MediaListStatus | null {
  return (
    entriesByMediaId.get(mediaId)?.status ??
    knownMedia?.mediaListEntry?.status ??
    null
  );
}

/**
 * Collects missing same-type PREQUEL media IDs that need to be fetched in order to
 * resolve candidates back to Season 1 or the next unwatched franchise entry.
 */
export function collectMissingPrequelIds(params: {
  candidates: MediaSummary[];
  knownById: Map<number, MediaSummary>;
  entriesByMediaId: Map<number, MediaListEntry>;
  allowAdult: boolean;
}): number[] {
  const { candidates, knownById, entriesByMediaId, allowAdult } = params;
  const missing = new Set<number>();

  for (const root of candidates) {
    if (!allowAdult && root.isAdult) continue;
    if (root.status === 'NOT_YET_RELEASED') continue;
    const rootStatus = getEffectiveEntryStatus(root.id, root, entriesByMediaId);
    if (rootStatus && EXCLUDED_STATUSES.has(rootStatus)) continue;

    let curr: MediaSummary = root;
    const visited = new Set<number>([curr.id]);

    for (let hop = 0; hop < MAX_PREQUEL_HOPS; hop++) {
      const prequelId = findSameTypePrequelId(curr);
      if (prequelId === null || visited.has(prequelId)) break;

      const knownPrequel = knownById.get(prequelId);
      const prequelStatus = getEffectiveEntryStatus(
        prequelId,
        knownPrequel,
        entriesByMediaId,
      );

      // No need to fetch further if prequel already finished or excludes the branch
      if (prequelStatus && EXCLUDED_STATUSES.has(prequelStatus)) {
        break;
      }

      if (!knownPrequel) {
        missing.add(prequelId);
        break;
      }

      visited.add(prequelId);
      curr = knownPrequel;
    }
  }

  return Array.from(missing);
}

/**
 * Walks same-type PREQUEL relations backward so recommendations suggest either
 * the first series entry (when nothing prior was finished) or the next unwatched
 * season right after the user's last COMPLETED/REPEATING installment.
 */
export function resolveSeriesEntryPoint(params: {
  candidate: MediaSummary;
  knownById: Map<number, MediaSummary>;
  entriesByMediaId: Map<number, MediaListEntry>;
  allowAdult: boolean;
}): MediaSummary | null {
  const { candidate, knownById, entriesByMediaId, allowAdult } = params;

  if (!allowAdult && candidate.isAdult) return null;
  if (candidate.status === 'NOT_YET_RELEASED') return null;

  const candidateStatus = getEffectiveEntryStatus(
    candidate.id,
    candidate,
    entriesByMediaId,
  );
  if (candidateStatus && EXCLUDED_STATUSES.has(candidateStatus)) {
    return null;
  }

  let curr: MediaSummary = candidate;
  const visited = new Set<number>([curr.id]);

  for (let hop = 0; hop < MAX_PREQUEL_HOPS; hop++) {
    const prequelId = findSameTypePrequelId(curr);
    if (prequelId === null || visited.has(prequelId)) break;

    const nextPrequel = knownById.get(prequelId);
    const prequelStatus = getEffectiveEntryStatus(
      prequelId,
      nextPrequel,
      entriesByMediaId,
    );

    if (prequelStatus === 'DROPPED') {
      return null;
    }

    if (prequelStatus && FINISHED_PREQUEL_STATUSES.has(prequelStatus)) {
      break;
    }

    if (prequelStatus && EXCLUDED_STATUSES.has(prequelStatus)) {
      return null;
    }

    if (!nextPrequel) {
      break;
    }

    visited.add(prequelId);
    curr = nextPrequel;
  }

  if (!allowAdult && curr.isAdult) return null;
  if (curr.status === 'NOT_YET_RELEASED') return null;

  const resolvedStatus = getEffectiveEntryStatus(curr.id, curr, entriesByMediaId);
  if (resolvedStatus && EXCLUDED_STATUSES.has(resolvedStatus)) {
    return null;
  }

  return curr;
}
