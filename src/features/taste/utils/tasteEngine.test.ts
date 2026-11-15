import { describe, expect, it } from 'vitest';
import {
  buildPersonalEntryLookup,
  buildTasteProfile,
  collectMissingPrequelIds,
  flattenCollectionEntries,
  resolveSeriesEntryPoint,
  scoreAndRankRecommendations,
} from '@/features/taste/utils/tasteEngine';
import type {
  MediaListCollection,
  MediaListEntry,
  MediaSummary,
  UserMediaDeepStatistics,
} from '@/shared/api/types';

function makeMedia(overrides: Partial<MediaSummary> & { id: number }): MediaSummary {
  return {
    id: overrides.id,
    idMal: null,
    type: overrides.type ?? 'ANIME',
    format: overrides.format ?? 'TV',
    status: overrides.status ?? 'FINISHED',
    title: overrides.title ?? {
      romaji: `Title ${overrides.id}`,
      english: `Title ${overrides.id}`,
      native: null,
    },
    coverImage: null,
    bannerImage: null,
    episodes: overrides.episodes ?? 12,
    chapters: overrides.chapters ?? null,
    volumes: overrides.volumes ?? null,
    duration: overrides.duration ?? 24,
    source: overrides.source ?? 'LIGHT_NOVEL',
    season: overrides.season ?? 'FALL',
    seasonYear: overrides.seasonYear ?? 2012,
    startDate: overrides.startDate ?? { year: overrides.seasonYear ?? 2012, month: 10, day: 1 },
    meanScore: overrides.meanScore ?? 82,
    popularity: overrides.popularity ?? 60_000,
    genres: overrides.genres ?? ['Drama'],
    tags: overrides.tags ?? [],
    studios: overrides.studios ?? null,
    staff: overrides.staff ?? null,
    relations: overrides.relations ?? null,
    isAdult: overrides.isAdult ?? false,
    nextAiringEpisode: null,
    mediaListEntry: null,
  };
}

function makeEntry(
  overrides: Omit<Partial<MediaListEntry>, 'media'> & {
    mediaId: number;
    media?: Partial<MediaSummary>;
  },
): MediaListEntry {
  return {
    id: overrides.id ?? overrides.mediaId * 10,
    mediaId: overrides.mediaId,
    status: overrides.status ?? 'COMPLETED',
    score: overrides.score ?? 85,
    progress: overrides.progress ?? 12,
    progressVolumes: null,
    repeat: overrides.repeat ?? 0,
    private: false,
    notes: null,
    startedAt: null,
    completedAt: null,
    updatedAt: 1700000000,
    media: makeMedia({ id: overrides.mediaId, ...(overrides.media ?? {}) }),
  };
}

describe('tasteEngine', () => {
  it('deduplicates collection entries, flags cold start (< 3), and separates planning vs watched/dropped', () => {
    const e1 = makeEntry({ id: 1, mediaId: 10, status: 'COMPLETED' });
    const e2 = makeEntry({ id: 2, mediaId: 20, status: 'PLANNING' });
    const dup = makeEntry({ id: 1, mediaId: 10, status: 'COMPLETED' });

    const collection: MediaListCollection = {
      hasNextChunk: false,
      lists: [
        { name: 'Completed', isCustomList: false, status: 'COMPLETED', entries: [e1, dup] },
        { name: 'Favorites', isCustomList: true, status: null, entries: [e1] },
        { name: 'Planning', isCustomList: false, status: 'PLANNING', entries: [e2] },
      ],
    };

    const flattened = flattenCollectionEntries(collection);
    expect(flattened).toHaveLength(2);

    const lookup = buildPersonalEntryLookup(collection);
    expect(lookup.excludedIds.has(10)).toBe(true);
    expect(lookup.excludedIds.has(20)).toBe(false);
    expect(lookup.planningIds.has(20)).toBe(true);

    const coldProfile = buildTasteProfile({
      mediaType: 'ANIME',
      stats: null,
      entries: flattened,
    });
    expect(coldProfile.totalTitles).toBe(2);
    expect(coldProfile.isReady).toBe(false);
  });

  it('computes Genre Matrix tags, Source affinity, Studio loyalty, Favorite Era, and Balanced Taste Mix recommendations', () => {
    const entries: MediaListEntry[] = [
      makeEntry({
        mediaId: 1,
        score: 92,
        repeat: 2,
        status: 'COMPLETED',
        media: { genres: ['Drama', 'Psychological'], source: 'LIGHT_NOVEL', seasonYear: 2011, popularity: 55_000 },
      }),
      makeEntry({
        mediaId: 2,
        score: 90,
        status: 'COMPLETED',
        media: { genres: ['Drama', 'Mystery'], source: 'LIGHT_NOVEL', seasonYear: 2012, popularity: 45_000 },
      }),
      makeEntry({
        mediaId: 3,
        score: 88,
        status: 'COMPLETED',
        media: { genres: ['Drama', 'Mystery'], source: 'ORIGINAL', seasonYear: 2013, popularity: 40_000 },
      }),
      makeEntry({
        mediaId: 4,
        score: 40,
        status: 'DROPPED',
        media: { genres: ['Ecchi'], source: 'MANGA', seasonYear: 2020, popularity: 150_000 },
      }),
      makeEntry({
        mediaId: 5,
        score: 45,
        status: 'DROPPED',
        media: { genres: ['Ecchi'], source: 'MANGA', seasonYear: 2021, popularity: 180_000 },
      }),
      makeEntry({
        mediaId: 6,
        score: 50,
        status: 'DROPPED',
        media: { genres: ['Ecchi'], source: 'MANGA', seasonYear: 2022, popularity: 120_000 },
      }),
      makeEntry({
        mediaId: 7,
        score: 0,
        status: 'PLANNING',
        media: { genres: ['Psychological', 'Mystery'], source: 'LIGHT_NOVEL', seasonYear: 2012, popularity: 52_000 },
      }),
    ];

    const stats: UserMediaDeepStatistics = {
      count: 7,
      meanScore: 80,
      standardDeviation: 14.5,
      minutesWatched: 2400,
      episodesWatched: 100,
      chaptersRead: 0,
      volumesRead: 0,
      genres: [
        { genre: 'Drama', count: 3, meanScore: 90, minutesWatched: 900, chaptersRead: 0, mediaIds: [1, 2, 3] },
        { genre: 'Mystery', count: 3, meanScore: 89, minutesWatched: 700, chaptersRead: 0, mediaIds: [2, 3, 7] },
        { genre: 'Psychological', count: 2, meanScore: 92, minutesWatched: 400, chaptersRead: 0, mediaIds: [1, 7] },
        { genre: 'Ecchi', count: 3, meanScore: 45, minutesWatched: 200, chaptersRead: 0, mediaIds: [4, 5, 6] },
      ],
      tags: [
        {
          count: 3,
          meanScore: 91,
          minutesWatched: 800,
          chaptersRead: 0,
          mediaIds: [1, 2, 3],
          tag: { id: 50, name: 'Psychological', category: 'Theme', rank: 90, isMediaSpoiler: false, isGeneralSpoiler: false, isAdult: false },
        },
        {
          count: 4,
          meanScore: 95,
          minutesWatched: 900,
          chaptersRead: 0,
          mediaIds: [1, 2],
          tag: { id: 99, name: 'Spoiler Plot', category: 'Theme', rank: 95, isMediaSpoiler: true, isGeneralSpoiler: false, isAdult: false },
        },
      ],
      studios: [
        {
          count: 3,
          meanScore: 91,
          minutesWatched: 900,
          mediaIds: [1, 2, 3],
          studio: { id: 11, name: 'Madhouse', isAnimationStudio: true },
        },
      ],
      releaseYears: [
        { releaseYear: 2011, count: 2, meanScore: 92, minutesWatched: 500, chaptersRead: 0, mediaIds: [1] },
        { releaseYear: 2012, count: 3, meanScore: 90, minutesWatched: 700, chaptersRead: 0, mediaIds: [2, 7] },
      ],
      formats: [
        { format: 'TV', count: 6, meanScore: 82, minutesWatched: 2000, chaptersRead: 0, mediaIds: [1, 2, 3] },
      ],
      statuses: [
        { status: 'COMPLETED', count: 3, meanScore: 90, minutesWatched: 1500, chaptersRead: 0, mediaIds: [1, 2, 3] },
        { status: 'DROPPED', count: 3, meanScore: 45, minutesWatched: 200, chaptersRead: 0, mediaIds: [4, 5, 6] },
      ],
    };

    const profile = buildTasteProfile({
      mediaType: 'ANIME',
      stats,
      entries,
      allowAdult: false,
    });

    expect(profile.isReady).toBe(true);
    expect(profile.favoriteEra?.label).toBe('2010–2014');
    expect(profile.topSource?.source).toBe('LIGHT_NOVEL');
    expect(profile.topStudioId).toBe(11);
    expect(profile.avoidGenres).toContain('Ecchi');
    expect(profile.tags.map((t) => t.name)).not.toContain('Spoiler Plot');
    expect(profile.rewatches.totalTitles).toBe(1);
    expect(profile.rewatches.totalRepeats).toBe(2);

    const lookup = buildPersonalEntryLookup({
      hasNextChunk: false,
      lists: [{ name: 'All', isCustomList: false, status: null, entries }],
    });

    const candidates: MediaSummary[] = [
      // Completed title (must be excluded)
      makeMedia({ id: 1, genres: ['Drama'], meanScore: 95 }),
      // Unreleased title (must be excluded)
      makeMedia({ id: 500, status: 'NOT_YET_RELEASED', genres: ['Drama', 'Mystery'] }),
      // Adult title (excluded in safe mode)
      makeMedia({ id: 501, isAdult: true, genres: ['Drama'] }),
      // Planning title that aligns strongly with Madhouse + Era + Light Novel
      makeMedia({
        id: 7,
        genres: ['Drama', 'Mystery', 'Psychological'],
        source: 'LIGHT_NOVEL',
        seasonYear: 2012,
        popularity: 52_000,
        meanScore: 86,
        studios: { nodes: [{ id: 11, name: 'Madhouse', isAnimationStudio: true }] },
        tags: [{ id: 50, name: 'Psychological', category: 'Theme', rank: 90, isMediaSpoiler: false, isGeneralSpoiler: false, isAdult: false }],
      }),
      // Fresh non-list high match
      makeMedia({
        id: 502,
        genres: ['Drama', 'Mystery'],
        source: 'LIGHT_NOVEL',
        seasonYear: 2013,
        popularity: 120_000,
        meanScore: 88,
        studios: { nodes: [{ id: 11, name: 'Madhouse', isAnimationStudio: true }] },
      }),
      // Dropped genre heavy match (penalized & ranks below clean match)
      makeMedia({
        id: 503,
        genres: ['Ecchi'],
        source: 'MANGA',
        seasonYear: 2023,
        popularity: 95_000,
        meanScore: 70,
      }),
    ];

    const ranked = scoreAndRankRecommendations({
      candidates,
      profile,
      entriesByMediaId: lookup.entriesByMediaId,
      planningIds: lookup.planningIds,
      excludedIds: lookup.excludedIds,
      allowAdult: false,
    });

    expect(ranked.map((r) => r.media.id)).not.toContain(1);
    expect(ranked.map((r) => r.media.id)).not.toContain(500);
    expect(ranked.map((r) => r.media.id)).not.toContain(501);
    expect(ranked.map((r) => r.media.id)).not.toContain(503);
    expect(ranked[0]?.media.id).toBe(7);
    expect(ranked[0]?.inPlanning).toBe(true);
    expect(ranked[0]?.isHiddenGem).toBe(true);
    expect(ranked[0]?.subtitleHint).toContain('Match');
  });

  it('resolves sequel candidates back to Season 1 or next unwatched entry and rejects dropped/current franchises', () => {
    const season1 = makeMedia({ id: 101, title: { romaji: 'Series S1', english: 'Series S1', native: null } });
    const season2 = makeMedia({
      id: 102,
      title: { romaji: 'Series S2', english: 'Series S2', native: null },
      relations: {
        edges: [{ relationType: 'PREQUEL', node: { id: 101, type: 'ANIME', status: 'FINISHED' } }],
      },
    });
    const season3 = makeMedia({
      id: 103,
      title: { romaji: 'Series S3', english: 'Series S3', native: null },
      relations: {
        edges: [
          { relationType: 'ADAPTATION', node: { id: 999, type: 'MANGA', status: 'FINISHED' } },
          { relationType: 'SIDE_STORY', node: { id: 888, type: 'ANIME', status: 'FINISHED' } },
          { relationType: 'PREQUEL', node: { id: 102, type: 'ANIME', status: 'FINISHED' } },
        ],
      },
    });

    // 1. Nothing watched yet -> collects missing prequels iteratively and resolves S3 -> S1
    const emptyEntries = new Map<number, MediaListEntry>();
    const hop1Known = new Map<number, MediaSummary>([[103, season3]]);
    expect(
      collectMissingPrequelIds({
        candidates: [season3],
        knownById: hop1Known,
        entriesByMediaId: emptyEntries,
        allowAdult: false,
      }),
    ).toEqual([102]);

    hop1Known.set(102, season2);
    expect(
      collectMissingPrequelIds({
        candidates: [season3],
        knownById: hop1Known,
        entriesByMediaId: emptyEntries,
        allowAdult: false,
      }),
    ).toEqual([101]);

    hop1Known.set(101, season1);
    expect(
      collectMissingPrequelIds({
        candidates: [season3],
        knownById: hop1Known,
        entriesByMediaId: emptyEntries,
        allowAdult: false,
      }),
    ).toEqual([]);

    expect(
      resolveSeriesEntryPoint({
        candidate: season3,
        knownById: hop1Known,
        entriesByMediaId: emptyEntries,
        allowAdult: false,
      })?.id,
    ).toBe(101);

    // 2. Season 1 COMPLETED, Season 2 unwatched -> resolves S3 -> S2 (next unwatched)
    const completedS1Entries = new Map<number, MediaListEntry>([
      [101, makeEntry({ id: 5001, mediaId: 101, status: 'COMPLETED', score: 90, media: season1 })],
    ]);
    expect(
      resolveSeriesEntryPoint({
        candidate: season3,
        knownById: hop1Known,
        entriesByMediaId: completedS1Entries,
        allowAdult: false,
      })?.id,
    ).toBe(102);

    // 3. Season 1 DROPPED -> excludes entire franchise even when S2/S3 are unwatched
    const droppedS1Entries = new Map<number, MediaListEntry>([
      [101, makeEntry({ id: 5002, mediaId: 101, status: 'DROPPED', score: 30, media: season1 })],
    ]);
    expect(
      resolveSeriesEntryPoint({
        candidate: season3,
        knownById: hop1Known,
        entriesByMediaId: droppedS1Entries,
        allowAdult: false,
      }),
    ).toBeNull();

    // 4. Season 1 CURRENT -> rejects S3 since user hasn't finished S1 yet
    const currentS1Entries = new Map<number, MediaListEntry>([
      [101, makeEntry({ id: 5003, mediaId: 101, status: 'CURRENT', score: 0, media: season1 })],
    ]);
    expect(
      resolveSeriesEntryPoint({
        candidate: season3,
        knownById: hop1Known,
        entriesByMediaId: currentS1Entries,
        allowAdult: false,
      }),
    ).toBeNull();

    // 5. Ignores ADAPTATION / SIDE_STORY and handles cyclic PREQUEL safely
    const cyclicA = makeMedia({
      id: 201,
      relations: {
        edges: [
          { relationType: 'ADAPTATION', node: { id: 9999, type: 'MANGA', status: 'FINISHED' } },
          { relationType: 'PREQUEL', node: { id: 202, type: 'ANIME', status: 'FINISHED' } },
        ],
      },
    });
    const cyclicB = makeMedia({
      id: 202,
      relations: {
        edges: [{ relationType: 'PREQUEL', node: { id: 201, type: 'ANIME', status: 'FINISHED' } }],
      },
    });
    const cyclicKnown = new Map<number, MediaSummary>([
      [201, cyclicA],
      [202, cyclicB],
    ]);
    expect(
      resolveSeriesEntryPoint({
        candidate: cyclicA,
        knownById: cyclicKnown,
        entriesByMediaId: emptyEntries,
        allowAdult: false,
      })?.id,
    ).toBe(202);
  });
});
