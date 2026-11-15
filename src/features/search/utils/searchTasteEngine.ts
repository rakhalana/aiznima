import type { TasteProfile } from '@/features/taste/utils/tasteEngine';
import type {
  CharacterSummary,
  MediaListEntry,
  MediaTitle,
  MediaType,
  ScoreFormat,
  StaffSummary,
  StudioSummary,
} from '@/shared/api/types';
import { normalizeScoreTo100 } from '@/shared/utils/formatters';

export interface TasteMediaNodeRef {
  id: number;
  type: MediaType | null;
  isAdult?: boolean | null;
  genres?: string[];
  meanScore?: number | null;
  title?: MediaTitle;
}

export interface SearchCharacterTasteItem extends CharacterSummary {
  media?: {
    nodes: Array<{
      id: number;
      type: MediaType | null;
      isAdult?: boolean | null;
      title: MediaTitle;
    }>;
    edges?: Array<{
      characterRole?: string | null;
      node: TasteMediaNodeRef | null;
    }> | null;
  } | null;
}

export interface SearchStaffTasteItem extends StaffSummary {
  staffMedia?: { nodes: TasteMediaNodeRef[] } | null;
  characterMedia?: { nodes: TasteMediaNodeRef[] } | null;
}

export interface SearchStudioTasteItem extends StudioSummary {
  media?: { nodes: TasteMediaNodeRef[] } | null;
}

export interface TasteMainCharacterMedia {
  id: number;
  type: MediaType | null;
  isAdult?: boolean | null;
  title: MediaTitle;
  characters?: {
    nodes: CharacterSummary[];
  } | null;
}

export interface MediaAffinityEntry {
  score: number;
  weight: number;
}

export interface SearchTasteContext {
  isReady: boolean;
  totalTrackedTitles: number;
  mediaAffinityById: Map<number, MediaAffinityEntry>;
  topTasteMediaIds: number[];
  studioScores: Map<number, number>;
  orderedStudioIds: number[];
  staffScores: Map<number, number>;
  orderedStaffIds: number[];
  genreWeights: Map<string, number>;
  avoidGenres: Set<string>;
}

const MAX_TASTE_MEDIA_IDS = 25;
const MAX_TASTE_STAFF_IDS = 50;
const MAX_TASTE_STUDIO_IDS = 25;

function scoreGenreAlignment(
  genres: string[] | undefined,
  genreWeights: Map<string, number>,
  avoidGenres: Set<string>,
): number {
  if (!genres || genres.length === 0) {
    return 0;
  }
  let positiveSum = 0;
  let positiveHits = 0;
  let avoidPenalty = 0;

  for (const genre of genres) {
    if (avoidGenres.has(genre)) {
      avoidPenalty += 0.85;
    }
    const weight = genreWeights.get(genre);
    if (weight && weight > 0) {
      positiveSum += weight;
      positiveHits += 1;
    }
  }

  const avgPositive = positiveHits > 0 ? positiveSum / positiveHits : 0;
  return avgPositive * (1 + Math.min(0.6, positiveHits * 0.15)) - avoidPenalty;
}

function computeEntryAffinity(
  entry: MediaListEntry,
  profile: TasteProfile | null,
  scoreFormat: ScoreFormat,
): number {
  const normalizedScore = normalizeScoreTo100(entry.score, scoreFormat);
  const baseline = profile?.meanScore && profile.meanScore > 0 ? profile.meanScore : 75;
  const baseScore = normalizedScore > 0 ? normalizedScore : baseline;

  let statusBonus = 0;
  if (entry.status === 'COMPLETED' || entry.status === 'REPEATING') {
    statusBonus = 8;
  } else if (entry.status === 'CURRENT') {
    statusBonus = 4;
  } else if (entry.status === 'PAUSED') {
    statusBonus = 1;
  } else if (entry.status === 'PLANNING') {
    statusBonus = -18;
  } else if (entry.status === 'DROPPED') {
    statusBonus = -45;
  }

  const repeatBonus = Math.min(12, (entry.repeat ?? 0) * 4);
  const genreDelta = profile
    ? scoreGenreAlignment(entry.media.genres, profile.vector.genreWeights, profile.vector.avoidGenreSet) * 10
    : 0;

  return Math.max(1, Math.round((baseScore + statusBonus + repeatBonus + genreDelta) * 10) / 10);
}

/**
 * Builds unified Taste DNA context across anime & manga profiles/lists for
 * Search Character (MAIN only), Staff, and Studio Taste Match ranking.
 */
export function buildSearchTasteContext(params: {
  animeProfile: TasteProfile | null;
  mangaProfile: TasteProfile | null;
  animeEntries: MediaListEntry[];
  mangaEntries: MediaListEntry[];
  scoreFormat?: ScoreFormat | null;
  allowAdult: boolean;
}): SearchTasteContext {
  const {
    animeProfile,
    mangaProfile,
    animeEntries,
    mangaEntries,
    scoreFormat = 'POINT_100',
    allowAdult,
  } = params;

  const resolvedScoreFormat: ScoreFormat = scoreFormat ?? 'POINT_100';
  const safeAnimeEntries = animeEntries.filter((e) => allowAdult || !e.media.isAdult);
  const safeMangaEntries = mangaEntries.filter((e) => allowAdult || !e.media.isAdult);

  const uniqueTitleIds = new Set<number>();
  for (const e of safeAnimeEntries) uniqueTitleIds.add(e.mediaId);
  for (const e of safeMangaEntries) uniqueTitleIds.add(e.mediaId);

  const totalTrackedTitles = Math.max(
    uniqueTitleIds.size,
    (animeProfile?.totalTitles ?? 0) + (mangaProfile?.totalTitles ?? 0),
  );
  const isReady = Boolean(
    animeProfile?.isReady || mangaProfile?.isReady || totalTrackedTitles >= 3,
  );

  // Merge genre weights & avoid genres across anime + manga
  const genreWeights = new Map<string, number>();
  const avoidGenres = new Set<string>();
  for (const profile of [animeProfile, mangaProfile]) {
    if (!profile) continue;
    for (const [genre, weight] of profile.vector.genreWeights) {
      genreWeights.set(genre, Math.max(genreWeights.get(genre) ?? 0, weight));
    }
    for (const genre of profile.vector.avoidGenreSet) {
      avoidGenres.add(genre);
    }
  }

  // Build media affinity lookup & select top media IDs for MAIN Character extraction
  const mediaAffinityById = new Map<number, MediaAffinityEntry>();
  const activeOrCompleted: Array<{ mediaId: number; affinity: number; rawScore: number }> = [];
  const planningFallback: Array<{ mediaId: number; affinity: number; rawScore: number }> = [];

  const collectEntries = (entries: MediaListEntry[], profile: TasteProfile | null) => {
    for (const entry of entries) {
      const affinity = computeEntryAffinity(entry, profile, resolvedScoreFormat);
      const weight = Number((affinity / 10).toFixed(3));
      const prev = mediaAffinityById.get(entry.mediaId);
      if (!prev || affinity > prev.score) {
        mediaAffinityById.set(entry.mediaId, { score: affinity, weight });
      }

      if (entry.status === 'DROPPED') {
        continue;
      }
      const item = {
        mediaId: entry.mediaId,
        affinity,
        rawScore: normalizeScoreTo100(entry.score, resolvedScoreFormat),
      };
      if (entry.status === 'PLANNING') {
        planningFallback.push(item);
      } else {
        activeOrCompleted.push(item);
      }
    }
  };

  collectEntries(safeAnimeEntries, animeProfile);
  collectEntries(safeMangaEntries, mangaProfile);

  const pool =
    activeOrCompleted.length >= 3
      ? activeOrCompleted
      : [...activeOrCompleted, ...planningFallback];

  const sortedPool = [...pool].sort((a, b) => {
    if (b.affinity !== a.affinity) return b.affinity - a.affinity;
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    return a.mediaId - b.mediaId;
  });

  const seenMediaIds = new Set<number>();
  const topTasteMediaIds: number[] = [];
  for (const item of sortedPool) {
    if (seenMediaIds.has(item.mediaId)) continue;
    seenMediaIds.add(item.mediaId);
    topTasteMediaIds.push(item.mediaId);
    if (topTasteMediaIds.length >= MAX_TASTE_MEDIA_IDS) break;
  }

  // Merge Studio scores (anime stats)
  const studioScores = new Map<number, number>();
  for (const row of animeProfile?.studios ?? []) {
    const score =
      row.affinityScore * (row.isLoyal ? 1.2 : 1) + Math.min(1.5, row.count * 0.15);
    studioScores.set(row.id, Number(score.toFixed(3)));
  }
  const orderedStudioIds = Array.from(studioScores.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, MAX_TASTE_STUDIO_IDS)
    .map(([id]) => id);

  // Merge Staff + Voice Actors (anime staff, anime voiceActors, manga staff)
  const staffScores = new Map<number, number>();
  for (const rows of [
    animeProfile?.staff ?? [],
    animeProfile?.voiceActors ?? [],
    mangaProfile?.staff ?? [],
  ]) {
    for (const row of rows) {
      const contribution =
        row.affinityScore * (row.isLoyal ? 1.2 : 1) + Math.min(1.5, row.count * 0.15);
      staffScores.set(row.id, Number(((staffScores.get(row.id) ?? 0) + contribution).toFixed(3)));
    }
  }
  const orderedStaffIds = Array.from(staffScores.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, MAX_TASTE_STAFF_IDS)
    .map(([id]) => id);

  return {
    isReady,
    totalTrackedTitles,
    mediaAffinityById,
    topTasteMediaIds,
    studioScores,
    orderedStudioIds,
    staffScores,
    orderedStaffIds,
    genreWeights,
    avoidGenres,
  };
}

/**
 * Extracts and ranks unique MAIN characters from the user's highest-affinity
 * anime & manga entries, weighted cleanly by Taste DNA without extra badges.
 */
export function buildMainCharactersFromMedia(params: {
  mediaItems: TasteMainCharacterMedia[];
  mediaAffinityById: Map<number, MediaAffinityEntry>;
  allowAdult: boolean;
}): CharacterSummary[] {
  const { mediaItems, mediaAffinityById, allowAdult } = params;

  const aggregated = new Map<
    number,
    {
      character: CharacterSummary;
      weights: number[];
      parentNodes: Array<{
        weight: number;
        node: {
          id: number;
          type: MediaType | null;
          isAdult?: boolean | null;
          title: MediaTitle;
        };
      }>;
      seenMediaIds: Set<number>;
    }
  >();

  for (const media of mediaItems) {
    if (!allowAdult && media.isAdult) {
      continue;
    }
    const mediaWeight = mediaAffinityById.get(media.id)?.weight ?? 5;
    const seenInMedia = new Set<number>();

    for (const char of media.characters?.nodes ?? []) {
      if (!char || seenInMedia.has(char.id)) {
        continue;
      }
      seenInMedia.add(char.id);

      let bucket = aggregated.get(char.id);
      if (!bucket) {
        bucket = {
          character: char,
          weights: [],
          parentNodes: [],
          seenMediaIds: new Set<number>(),
        };
        aggregated.set(char.id, bucket);
      }

      bucket.weights.push(mediaWeight);
      if (!bucket.seenMediaIds.has(media.id)) {
        bucket.seenMediaIds.add(media.id);
        bucket.parentNodes.push({
          weight: mediaWeight,
          node: {
            id: media.id,
            type: media.type,
            isAdult: media.isAdult,
            title: media.title,
          },
        });
      }
    }
  }

  const ranked = Array.from(aggregated.values()).map((entry) => {
    const sortedWeights = [...entry.weights].sort((a, b) => b - a);
    let score = sortedWeights[0] ?? 0;
    for (let i = 1; i < sortedWeights.length; i++) {
      score += sortedWeights[i]! * 0.45;
    }
    score += Math.log10((entry.character.favourites ?? 0) + 10) * 0.2;

    const orderedNodes = [...entry.parentNodes]
      .sort((a, b) => b.weight - a.weight)
      .map((item) => item.node);

    return {
      score,
      favourites: entry.character.favourites ?? 0,
      character: {
        ...entry.character,
        media: { nodes: orderedNodes },
      } satisfies CharacterSummary,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.favourites !== a.favourites) return b.favourites - a.favourites;
    return a.character.id - b.character.id;
  });

  return ranked.map((r) => r.character);
}

function accumulateDiminishingScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => b - a);
  let total = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    total += sorted[i]! * 0.45;
  }
  return total;
}

/**
 * Re-ranks Character search results using strictly characterRole === 'MAIN' edges
 * matched against the user's Taste DNA, preserving input order on ties.
 */
export function rankCharactersByTaste(params: {
  items: SearchCharacterTasteItem[];
  context: SearchTasteContext | null;
  allowAdult: boolean;
}): CharacterSummary[] {
  const { items, context, allowAdult } = params;
  if (!context || !context.isReady) {
    return items.map(normalizeCharacterParentNodes);
  }

  const scored = items.map((item, originalIndex) => {
    const edges = item.media?.edges ?? [];
    const watchedMainScores: number[] = [];
    const genreMainScores: number[] = [];
    const displayNodes: Array<{
      score: number;
      node: {
        id: number;
        type: MediaType | null;
        isAdult?: boolean | null;
        title: MediaTitle;
      };
    }> = [];

    for (const edge of edges) {
      const node = edge?.node;
      if (!node || (!allowAdult && node.isAdult)) {
        continue;
      }

      const isMain = edge.characterRole === 'MAIN';
      const watched = context.mediaAffinityById.get(node.id);
      let nodePriority = isMain ? 1 : 0;

      if (isMain) {
        if (watched) {
          const watchedScore = watched.weight * 2.5;
          watchedMainScores.push(watchedScore);
          nodePriority = 100 + watchedScore;
        } else {
          const gAlign = scoreGenreAlignment(
            node.genres,
            context.genreWeights,
            context.avoidGenres,
          );
          const qualityBonus = (node.meanScore ?? 70) / 100;
          const totalGenre = gAlign * 1.4 + (gAlign > 0 ? qualityBonus * 0.4 : 0);
          if (totalGenre !== 0) {
            genreMainScores.push(totalGenre);
          }
          nodePriority = 10 + Math.max(0, totalGenre);
        }
      }

      if (node.title) {
        displayNodes.push({
          score: nodePriority,
          node: {
            id: node.id,
            type: node.type,
            isAdult: node.isAdult,
            title: node.title,
          },
        });
      }
    }

    const primaryWatched = accumulateDiminishingScores(watchedMainScores);
    const secondaryGenre = accumulateDiminishingScores(genreMainScores);
    const tasteScore = primaryWatched + secondaryGenre;

    const normalizedNodes =
      item.media?.nodes && item.media.nodes.length > 0
        ? item.media.nodes
        : [...displayNodes]
            .sort((a, b) => b.score - a.score)
            .map((entry) => entry.node);

    return {
      tasteScore,
      originalIndex,
      favourites: item.favourites ?? 0,
      character: {
        id: item.id,
        name: item.name,
        image: item.image,
        favourites: item.favourites,
        media: { nodes: normalizedNodes },
      } satisfies CharacterSummary,
    };
  });

  scored.sort((a, b) => {
    if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
    return a.originalIndex - b.originalIndex;
  });

  return scored.map((entry) => entry.character);
}

function normalizeCharacterParentNodes(item: SearchCharacterTasteItem): CharacterSummary {
  if (item.media?.nodes && item.media.nodes.length > 0) {
    return item;
  }
  const nodes = (item.media?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is TasteMediaNodeRef & { title: MediaTitle } =>
      Boolean(node && node.title),
    )
    .map((node) => ({
      id: node.id,
      type: node.type,
      isAdult: node.isAdult,
      title: node.title,
    }));

  return {
    id: item.id,
    name: item.name,
    image: item.image,
    favourites: item.favourites,
    media: { nodes },
  };
}

function scoreMediaRefOverlap(
  nodes: TasteMediaNodeRef[],
  context: SearchTasteContext,
  allowAdult: boolean,
): number {
  const watchedHits: number[] = [];
  const genreHits: number[] = [];
  const seenIds = new Set<number>();

  for (const node of nodes) {
    if (!node || (!allowAdult && node.isAdult) || seenIds.has(node.id)) {
      continue;
    }
    seenIds.add(node.id);

    const watched = context.mediaAffinityById.get(node.id);
    if (watched) {
      watchedHits.push(watched.weight * 1.4);
    } else {
      const gAlign = scoreGenreAlignment(
        node.genres,
        context.genreWeights,
        context.avoidGenres,
      );
      if (gAlign > 0) {
        genreHits.push(gAlign * 0.45 + ((node.meanScore ?? 70) / 100) * 0.15);
      }
    }
  }

  return (
    accumulateDiminishingScores(watchedHits) +
    accumulateDiminishingScores(genreHits.slice(0, 4))
  );
}

/**
 * Ranks Staff & Voice Actor search results using Taste DNA affinity scores
 * (direct viewer stats + overlap with watched/favoured media).
 */
export function rankStaffByTaste(params: {
  items: SearchStaffTasteItem[];
  context: SearchTasteContext | null;
  allowAdult: boolean;
  tieBreakByFavourites?: boolean;
}): StaffSummary[] {
  const { items, context, allowAdult, tieBreakByFavourites = false } = params;
  if (!context || !context.isReady) {
    return items;
  }

  const scored = items.map((item, originalIndex) => {
    const directScore = (context.staffScores.get(item.id) ?? 0) * 15;
    const mediaNodes = [
      ...(item.staffMedia?.nodes ?? []),
      ...(item.characterMedia?.nodes ?? []),
    ];
    const mediaOverlap = scoreMediaRefOverlap(mediaNodes, context, allowAdult);

    return {
      tasteScore: directScore + mediaOverlap,
      originalIndex,
      favourites: item.favourites ?? 0,
      staff: {
        id: item.id,
        name: item.name,
        languageV2: item.languageV2,
        image: item.image,
        primaryOccupations: item.primaryOccupations,
        favourites: item.favourites,
      } satisfies StaffSummary,
    };
  });

  scored.sort((a, b) => {
    if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
    if (tieBreakByFavourites && b.favourites !== a.favourites) {
      return b.favourites - a.favourites;
    }
    return a.originalIndex - b.originalIndex;
  });

  return scored.map((entry) => entry.staff);
}

/**
 * Ranks Studio search results using Taste DNA studio loyalty + watched media overlap.
 */
export function rankStudiosByTaste(params: {
  items: SearchStudioTasteItem[];
  context: SearchTasteContext | null;
  allowAdult: boolean;
  tieBreakByFavourites?: boolean;
}): StudioSummary[] {
  const { items, context, allowAdult, tieBreakByFavourites = false } = params;
  if (!context || !context.isReady) {
    return items;
  }

  const scored = items.map((item, originalIndex) => {
    const directScore = (context.studioScores.get(item.id) ?? 0) * 15;
    const mediaOverlap = scoreMediaRefOverlap(item.media?.nodes ?? [], context, allowAdult);

    return {
      tasteScore: directScore + mediaOverlap,
      originalIndex,
      favourites: item.favourites ?? 0,
      studio: {
        id: item.id,
        name: item.name,
        isAnimationStudio: item.isAnimationStudio,
        favourites: item.favourites,
      } satisfies StudioSummary,
    };
  });

  scored.sort((a, b) => {
    if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
    if (tieBreakByFavourites && b.favourites !== a.favourites) {
      return b.favourites - a.favourites;
    }
    return a.originalIndex - b.originalIndex;
  });

  return scored.map((entry) => entry.studio);
}
