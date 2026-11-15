import { describe, expect, it } from 'vitest';
import {
  buildMainCharactersFromMedia,
  buildSearchTasteContext,
  rankCharactersByTaste,
  rankStaffByTaste,
  rankStudiosByTaste,
  type SearchCharacterTasteItem,
  type SearchStaffTasteItem,
  type SearchStudioTasteItem,
} from '@/features/search/utils/searchTasteEngine';
import { buildTasteProfile } from '@/features/taste/utils/tasteEngine';
import type { MediaListEntry, UserMediaDeepStatistics } from '@/shared/api/types';

function makeEntry(
  mediaId: number,
  title: string,
  score: number,
  genres: string[],
  type: 'ANIME' | 'MANGA' = 'ANIME',
  status: MediaListEntry['status'] = 'COMPLETED',
  isAdult = false,
): MediaListEntry {
  return {
    id: mediaId * 10,
    mediaId,
    status,
    score,
    progress: 12,
    progressVolumes: null,
    repeat: 0,
    private: false,
    notes: null,
    startedAt: null,
    completedAt: null,
    updatedAt: 1_700_000_000,
    media: {
      id: mediaId,
      idMal: null,
      type,
      format: type === 'ANIME' ? 'TV' : 'MANGA',
      status: 'FINISHED',
      title: { romaji: title, english: title, native: null },
      coverImage: { medium: null, large: null, extraLarge: null, color: null },
      bannerImage: null,
      episodes: 12,
      chapters: null,
      volumes: null,
      duration: 24,
      source: 'ORIGINAL',
      season: 'SPRING',
      seasonYear: 2024,
      meanScore: 84,
      popularity: 60000,
      genres,
      isAdult,
      nextAiringEpisode: null,
      mediaListEntry: null,
    },
  };
}

const SAMPLE_ANIME_STATS: UserMediaDeepStatistics = {
  count: 3,
  meanScore: 85,
  standardDeviation: 6,
  minutesWatched: 1500,
  episodesWatched: 60,
  chaptersRead: 0,
  volumesRead: 0,
  genres: [
    {
      genre: 'Fantasy',
      count: 3,
      meanScore: 90,
      minutesWatched: 1200,
      chaptersRead: 0,
      mediaIds: [1, 2, 3],
    },
    {
      genre: 'Drama',
      count: 2,
      meanScore: 88,
      minutesWatched: 800,
      chaptersRead: 0,
      mediaIds: [1, 2],
    },
  ],
  studios: [
    {
      count: 3,
      meanScore: 92,
      minutesWatched: 1000,
      mediaIds: [1, 2, 3],
      studio: { id: 11, name: 'Madhouse', isAnimationStudio: true },
    },
    {
      count: 2,
      meanScore: 76,
      minutesWatched: 500,
      mediaIds: [4, 5],
      studio: { id: 569, name: 'MAPPA', isAnimationStudio: true },
    },
  ],
  staff: [
    {
      count: 3,
      meanScore: 92,
      minutesWatched: 900,
      chaptersRead: 0,
      mediaIds: [1, 2, 3],
      staff: {
        id: 500,
        name: { full: 'Keiichiro Saito', native: null },
        languageV2: 'Japanese',
        primaryOccupations: ['Director'],
        image: { medium: null, large: null },
      },
    },
  ],
  voiceActors: [
    {
      count: 4,
      meanScore: 90,
      minutesWatched: 1100,
      mediaIds: [1, 2, 3],
      voiceActor: {
        id: 10687,
        name: { full: 'Atsumi Tanezaki', native: null },
        languageV2: 'Japanese',
        image: { medium: null, large: null },
      },
    },
  ],
};

describe('searchTasteEngine', () => {
  const entries: MediaListEntry[] = [
    makeEntry(1, 'Frieren', 96, ['Fantasy', 'Drama']),
    makeEntry(2, 'Odd Taxi', 82, ['Drama']),
    makeEntry(3, 'Dropped Fantasy', 35, ['Fantasy'], 'ANIME', 'DROPPED'),
    makeEntry(99, 'Adult Entry', 99, ['Fantasy'], 'ANIME', 'COMPLETED', true),
  ];

  const animeProfile = buildTasteProfile({
    mediaType: 'ANIME',
    stats: SAMPLE_ANIME_STATS,
    entries,
    scoreFormat: 'POINT_100',
    allowAdult: false,
  });

  it('builds context excluding dropped/adult media and merging staff + voice actors', () => {
    const context = buildSearchTasteContext({
      animeProfile,
      mangaProfile: null,
      animeEntries: entries,
      mangaEntries: [],
      scoreFormat: 'POINT_100',
      allowAdult: false,
    });

    expect(context.isReady).toBe(true);
    expect(context.topTasteMediaIds).toEqual([1, 2]);
    expect(context.topTasteMediaIds).not.toContain(3);
    expect(context.topTasteMediaIds).not.toContain(99);
    expect(context.orderedStudioIds[0]).toBe(11);
    expect(context.orderedStaffIds).toContain(10687);
    expect(context.orderedStaffIds).toContain(500);
  });

  it('builds and sorts MAIN characters by aggregated media taste affinity without adult leakage', () => {
    const context = buildSearchTasteContext({
      animeProfile,
      mangaProfile: null,
      animeEntries: entries,
      mangaEntries: [],
      scoreFormat: 'POINT_100',
      allowAdult: false,
    });

    const characters = buildMainCharactersFromMedia({
      mediaAffinityById: context.mediaAffinityById,
      allowAdult: false,
      mediaItems: [
        {
          id: 2,
          type: 'ANIME',
          isAdult: false,
          title: { romaji: 'Odd Taxi', english: null, native: null },
          characters: {
            nodes: [
              {
                id: 201,
                name: { full: 'Hiroshi Odokawa', native: null },
                image: { medium: null, large: null },
                favourites: 40000,
              },
            ],
          },
        },
        {
          id: 1,
          type: 'ANIME',
          isAdult: false,
          title: { romaji: 'Frieren', english: null, native: null },
          characters: {
            nodes: [
              {
                id: 101,
                name: { full: 'Frieren', native: null },
                image: { medium: null, large: null },
                favourites: 25000,
              },
            ],
          },
        },
        {
          id: 99,
          type: 'ANIME',
          isAdult: true,
          title: { romaji: 'Adult Entry', english: null, native: null },
          characters: {
            nodes: [
              {
                id: 999,
                name: { full: 'Hidden Adult Char', native: null },
                image: { medium: null, large: null },
                favourites: 90000,
              },
            ],
          },
        },
      ],
    });

    expect(characters.map((c) => c.name.full)).toEqual(['Frieren', 'Hiroshi Odokawa']);
    expect(characters[0]?.media?.nodes[0]?.title.romaji).toBe('Frieren');
  });

  it('ranks keyword character results strictly using characterRole === MAIN and keeps original order on ties', () => {
    const context = buildSearchTasteContext({
      animeProfile,
      mangaProfile: null,
      animeEntries: entries,
      mangaEntries: [],
      scoreFormat: 'POINT_100',
      allowAdult: false,
    });

    const items: SearchCharacterTasteItem[] = [
      {
        id: 10,
        name: { full: 'Random Unwatched', native: null },
        image: null,
        favourites: 1000,
        media: {
          nodes: [],
          edges: [
            {
              characterRole: 'SUPPORTING',
              node: {
                id: 1,
                type: 'ANIME',
                isAdult: false,
                genres: ['Fantasy'],
                meanScore: 90,
                title: { romaji: 'Frieren', english: null, native: null },
              },
            },
          ],
        },
      },
      {
        id: 20,
        name: { full: 'Fern', native: null },
        image: null,
        favourites: 5000,
        media: {
          nodes: [],
          edges: [
            {
              characterRole: 'MAIN',
              node: {
                id: 1,
                type: 'ANIME',
                isAdult: false,
                genres: ['Fantasy'],
                meanScore: 90,
                title: { romaji: 'Frieren', english: null, native: null },
              },
            },
          ],
        },
      },
      {
        id: 30,
        name: { full: 'Background Char', native: null },
        image: null,
        favourites: 99999,
        media: {
          nodes: [],
          edges: [
            {
              characterRole: 'BACKGROUND',
              node: {
                id: 1,
                type: 'ANIME',
                isAdult: false,
                genres: ['Fantasy'],
                meanScore: 90,
                title: { romaji: 'Frieren', english: null, native: null },
              },
            },
          ],
        },
      },
    ];

    const ranked = rankCharactersByTaste({ items, context, allowAdult: false });
    // Fern (MAIN in watched Frieren) rises to #1; SUPPORTING & BACKGROUND get 0 Taste score and stay in original order
    expect(ranked.map((c) => c.name.full)).toEqual([
      'Fern',
      'Random Unwatched',
      'Background Char',
    ]);
  });

  it('ranks Staff & Studios using Taste DNA affinity and watched media overlap', () => {
    const context = buildSearchTasteContext({
      animeProfile,
      mangaProfile: null,
      animeEntries: entries,
      mangaEntries: [],
      scoreFormat: 'POINT_100',
      allowAdult: false,
    });

    const staffItems: SearchStaffTasteItem[] = [
      {
        id: 900,
        name: { full: 'Unknown Staff', native: null },
        languageV2: 'Japanese',
        image: null,
        favourites: 50000,
      },
      {
        id: 10687,
        name: { full: 'Atsumi Tanezaki', native: null },
        languageV2: 'Japanese',
        image: null,
        favourites: 12000,
      },
    ];
    expect(rankStaffByTaste({ items: staffItems, context, allowAdult: false }).map((s) => s.id)).toEqual([
      10687,
      900,
    ]);

    const studioItems: SearchStudioTasteItem[] = [
      { id: 569, name: 'MAPPA', isAnimationStudio: true, favourites: 50000 },
      { id: 11, name: 'Madhouse', isAnimationStudio: true, favourites: 41000 },
    ];
    expect(rankStudiosByTaste({ items: studioItems, context, allowAdult: false }).map((s) => s.id)).toEqual([
      11,
      569,
    ]);
  });
});
