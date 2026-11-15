import { describe, expect, it } from 'vitest';
import { computeUserCompatibility } from '@/features/user/utils/compatibilityEngine';
import type {
  MediaListCollection,
  MediaListEntry,
  MediaSummary,
} from '@/shared/api/types';

function makeMedia(overrides: Partial<MediaSummary> & { id: number }): MediaSummary {
  return {
    id: overrides.id,
    idMal: null,
    type: overrides.type ?? 'ANIME',
    format: overrides.format ?? 'TV',
    status: overrides.status ?? 'FINISHED',
    title: overrides.title ?? {
      romaji: `Show ${overrides.id}`,
      english: `Show ${overrides.id}`,
      native: null,
    },
    coverImage: null,
    bannerImage: null,
    episodes: 12,
    chapters: null,
    volumes: null,
    season: 'FALL',
    seasonYear: 2024,
    meanScore: overrides.meanScore ?? 85,
    popularity: overrides.popularity ?? 100000,
    genres: overrides.genres ?? ['Action', 'Drama'],
    studios: null,
    relations: null,
    isAdult: overrides.isAdult ?? false,
    nextAiringEpisode: null,
    mediaListEntry: null,
  };
}

function makeEntry(params: {
  id: number;
  mediaId: number;
  status?: MediaListEntry['status'];
  score?: number;
  genres?: string[];
  isAdult?: boolean;
}): MediaListEntry {
  return {
    id: params.id,
    mediaId: params.mediaId,
    status: params.status ?? 'COMPLETED',
    score: params.score ?? 85,
    progress: 12,
    progressVolumes: 0,
    repeat: 0,
    private: false,
    notes: null,
    startedAt: null,
    completedAt: null,
    updatedAt: 1700000000,
    media: makeMedia({
      id: params.mediaId,
      genres: params.genres ?? ['Action', 'Drama'],
      isAdult: params.isAdult ?? false,
    }),
  };
}

function wrapCollection(entries: MediaListEntry[]): MediaListCollection {
  return {
    hasNextChunk: false,
    lists: [
      {
        name: 'Completed',
        isCustomList: false,
        status: 'COMPLETED',
        entries,
      },
    ],
  };
}

describe('compatibilityEngine', () => {
  it('computes high compatibility across differing ScoreFormats and ignores planning/18+ items in safe mode', () => {
    const viewer = wrapCollection([
      makeEntry({ id: 1, mediaId: 101, score: 9, genres: ['Drama', 'Fantasy'] }), // 90/100 in POINT_10
      makeEntry({ id: 2, mediaId: 102, score: 8, genres: ['Drama', 'Mystery'] }), // 80/100 in POINT_10
      makeEntry({ id: 3, mediaId: 103, status: 'PLANNING', score: 0, genres: ['Comedy'] }),
      makeEntry({ id: 4, mediaId: 104, score: 9, genres: ['Ecchi'], isAdult: true }),
    ]);

    const target = wrapCollection([
      makeEntry({ id: 11, mediaId: 101, score: 90, genres: ['Drama', 'Fantasy'] }),
      makeEntry({ id: 12, mediaId: 102, score: 82, genres: ['Drama', 'Mystery'] }),
      makeEntry({ id: 13, mediaId: 103, status: 'PLANNING', score: 0, genres: ['Comedy'] }),
      makeEntry({ id: 14, mediaId: 104, score: 95, genres: ['Ecchi'], isAdult: true }),
    ]);

    const result = computeUserCompatibility({
      mediaType: 'ANIME',
      viewerCollection: viewer,
      targetCollection: target,
      viewerScoreFormat: 'POINT_10',
      targetScoreFormat: 'POINT_100',
      allowAdult: false,
    });

    expect(result.compatibilityPercent).toBeGreaterThanOrEqual(85);
    expect(result.verdict).toBe('Soulmates');
    expect(result.sharedTitles.map((item) => item.media.id)).toEqual([101, 102]);
    expect(result.sharedRatedCount).toBe(2);
    expect(result.avgScoreDiff).toBe(1);
    expect(result.sharedTopGenres).toContain('Drama');
  });

  it('lowers compatibility on large score disagreement and returns null when data is too small', () => {
    const harshViewer = wrapCollection([
      makeEntry({ id: 1, mediaId: 201, score: 40, genres: ['Action'] }),
      makeEntry({ id: 2, mediaId: 202, score: 45, genres: ['Action'] }),
    ]);
    const generousTarget = wrapCollection([
      makeEntry({ id: 11, mediaId: 201, score: 95, genres: ['Romance'] }),
      makeEntry({ id: 12, mediaId: 202, score: 92, genres: ['Romance'] }),
    ]);

    const disagree = computeUserCompatibility({
      mediaType: 'ANIME',
      viewerCollection: harshViewer,
      targetCollection: generousTarget,
      allowAdult: false,
    });

    expect(disagree.compatibilityPercent).not.toBeNull();
    expect(disagree.compatibilityPercent!).toBeLessThan(50);
    expect(disagree.verdict).toBe('Different Vibes');

    const tinyResult = computeUserCompatibility({
      mediaType: 'ANIME',
      viewerCollection: wrapCollection([makeEntry({ id: 1, mediaId: 301, score: 80 })]),
      targetCollection: generousTarget,
      allowAdult: false,
    });

    expect(tinyResult.compatibilityPercent).toBeNull();
    expect(tinyResult.verdict).toBeNull();
  });
});
