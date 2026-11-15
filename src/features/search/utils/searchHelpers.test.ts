import { describe, expect, it } from 'vitest';
import {
  buildFallbackSearchQueries,
  extractAvailableTagCategories,
  filterCharacterMedia,
  formatTagCategoryLabel,
  getSearchCardHint,
  normalizeSearchInput,
} from '@/features/search/utils/searchHelpers';
import type { MediaSummary } from '@/shared/api/types';

function makeMedia(overrides: Partial<MediaSummary> = {}): MediaSummary {
  return {
    id: 1,
    idMal: null,
    type: 'ANIME',
    format: 'TV',
    status: 'FINISHED',
    title: {
      romaji: 'Sousou no Frieren',
      english: 'Frieren: Beyond Journey’s End',
      native: '葬送のフリーレン',
    },
    coverImage: null,
    bannerImage: null,
    episodes: 28,
    chapters: null,
    volumes: null,
    season: 'FALL',
    seasonYear: 2023,
    meanScore: 91,
    popularity: 310000,
    genres: ['Adventure', 'Fantasy'],
    isAdult: false,
    nextAiringEpisode: null,
    mediaListEntry: null,
    ...overrides,
  };
}

describe('searchHelpers', () => {
  it('normalizes macrons, fullwidth chars, and symbols while preserving Japanese kana dakuten', () => {
    expect(normalizeSearchInput('Tanjirō Kamado')).toBe('Tanjiro Kamado');
    expect(normalizeSearchInput('ＳＰＹ×ＦＡＭＩＬＹ')).toBe('SPY FAMILY');
    expect(normalizeSearchInput('葬送のフリーレン')).toBe('葬送のフリーレン');
    expect(normalizeSearchInput('ぼっち・ざ・ろっく')).toBe('ぼっち ざ ろっく');
  });

  it('builds targeted fallbacks without splitting plain gibberish tokens', () => {
    expect(buildFallbackSearchQueries('nonexistent-xyz')).toEqual([]);
    expect(buildFallbackSearchQueries('進撃 の 巨人')).toEqual(['進撃の巨人']);
    expect(buildFallbackSearchQueries('ふりーれん')).toEqual(['フリーレン']);
    expect(buildFallbackSearchQueries('Levi Ackerman')).toEqual(['Levi']);
    expect(buildFallbackSearchQueries('Satoru Gojou')).toContain('Satoru Gojo');
  });

  it('filters character parent media against active search criteria and adult mode', () => {
    const frieren = makeMedia();
    expect(
      filterCharacterMedia(
        frieren,
        { type: 'ANIME', genres: ['Fantasy'], year: 2023 },
        false,
      ),
    ).toBe(true);
    expect(
      filterCharacterMedia(
        makeMedia({ isAdult: true }),
        { type: 'ANIME', genres: [] },
        false,
      ),
    ).toBe(false);
    expect(
      filterCharacterMedia(
        frieren,
        { type: 'MANGA', genres: [] },
        true,
      ),
    ).toBe(false);
  });

  it('returns helpful hints for character matches and romaji/native alternate titles', () => {
    const media = makeMedia();
    expect(getSearchCardHint(media, 'Gojo', 'ENGLISH', 'Satoru Gojou')).toBe(
      'Char: Satoru Gojou',
    );
    expect(getSearchCardHint(media, 'Sousou no Frieren', 'ENGLISH')).toBe(
      'Sousou no Frieren',
    );
    expect(getSearchCardHint(media, '葬送のフリーレン', 'ENGLISH')).toBe(
      '葬送のフリーレン',
    );
    expect(getSearchCardHint(media, 'Frieren', 'ENGLISH')).toBeNull();
  });

  it('formats AniList raw tag categories cleanly and filters adult categories when disabled', () => {
    expect(formatTagCategoryLabel('Theme-Game-Sport')).toBe('Game Sport');
    expect(formatTagCategoryLabel('Theme-Game-Card & Board Game')).toBe('Card & Board Game');
    expect(formatTagCategoryLabel('Theme-Sci-Fi-Mecha')).toBe('Mecha');
    expect(formatTagCategoryLabel('Theme-Other')).toBe('Other Themes');
    expect(formatTagCategoryLabel('Cast-Traits')).toBe('Character Traits');

    const rawTags = [
      { category: 'Theme-Game-Sport', isAdult: false },
      { category: 'Theme-Game-Sport', isAdult: false },
      { category: 'Sexual Content', isAdult: true },
      { category: 'Cast-Traits', isAdult: false },
    ];

    expect(extractAvailableTagCategories(rawTags, false)).toEqual([
      { value: 'Cast-Traits', label: 'Character Traits' },
      { value: 'Theme-Game-Sport', label: 'Game Sport' },
    ]);

    expect(extractAvailableTagCategories(rawTags, true)).toEqual([
      { value: 'Cast-Traits', label: 'Character Traits' },
      { value: 'Theme-Game-Sport', label: 'Game Sport' },
      { value: 'Sexual Content', label: 'Sexual Content' },
    ]);
  });
});
