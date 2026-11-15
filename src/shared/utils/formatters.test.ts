import { describe, expect, it } from 'vitest';
import {
  buildSequentialSeasons,
  formatCountdown,
  formatFuzzyDate,
  formatMediaTitle,
  formatScore,
  formatSeasonLabel,
  getCurrentAndNextSeason,
  parseSeasonFromParams,
} from './formatters';

describe('formatters', () => {
  it('computes current and next season including year rollover', () => {
    expect(getCurrentAndNextSeason(new Date(2026, 0, 15))).toEqual({
      current: { season: 'WINTER', year: 2026 },
      next: { season: 'SPRING', year: 2026 },
    });
    expect(getCurrentAndNextSeason(new Date(2026, 4, 1))).toEqual({
      current: { season: 'SPRING', year: 2026 },
      next: { season: 'SUMMER', year: 2026 },
    });
    expect(getCurrentAndNextSeason(new Date(2026, 7, 10))).toEqual({
      current: { season: 'SUMMER', year: 2026 },
      next: { season: 'FALL', year: 2026 },
    });
    expect(getCurrentAndNextSeason(new Date(2026, 10, 14))).toEqual({
      current: { season: 'FALL', year: 2026 },
      next: { season: 'WINTER', year: 2027 },
    });
  });

  it('formats media titles according to user preference with fallbacks', () => {
    const title = { romaji: 'Sousou no Frieren', english: 'Frieren', native: '葬送のフリーレン' };
    expect(formatMediaTitle(title, 'ROMAJI')).toBe('Sousou no Frieren');
    expect(formatMediaTitle(title, 'ENGLISH')).toBe('Frieren');
    expect(formatMediaTitle(title, 'NATIVE')).toBe('葬送のフリーレン');
    expect(formatMediaTitle({ romaji: 'Fallback', english: null, native: null }, 'ENGLISH')).toBe(
      'Fallback',
    );
  });

  it('formats scores across all AniList ScoreFormat options', () => {
    expect(formatScore(0, 'POINT_100')).toBe('—');
    expect(formatScore(88, 'POINT_100')).toBe('88');
    expect(formatScore(8.5, 'POINT_10_DECIMAL')).toBe('8.5');
    expect(formatScore(9, 'POINT_10')).toBe('9');
    expect(formatScore(4, 'POINT_5')).toBe('4/5');
    expect(formatScore(3, 'POINT_3')).toBe('3/3');
  });

  it('formats countdowns and fuzzy dates cleanly', () => {
    expect(formatCountdown(0)).toBe('Aired');
    expect(formatCountdown(900)).toBe('15m');
    expect(formatCountdown(5400)).toBe('1h 30m');
    expect(formatCountdown(90000)).toBe('1d 1h');

    expect(formatFuzzyDate({ year: 2026, month: 11, day: 14 })).toBe('Nov 14 2026');
    expect(formatFuzzyDate({ year: null, month: null, day: null })).toBe('TBA');
  });

  it('builds sequential 5-year seasonal tabs starting from 1 season ahead', () => {
    const seasons = buildSequentialSeasons(5, new Date(2026, 10, 15));
    expect(seasons).toHaveLength(21);
    expect(seasons.slice(0, 5)).toEqual([
      { season: 'WINTER', year: 2027 },
      { season: 'FALL', year: 2026 },
      { season: 'SUMMER', year: 2026 },
      { season: 'SPRING', year: 2026 },
      { season: 'WINTER', year: 2026 },
    ]);
    expect(seasons[seasons.length - 1]).toEqual({ season: 'WINTER', year: 2022 });
    expect(formatSeasonLabel('FALL', 2026)).toBe('Fall 2026');

    expect(parseSeasonFromParams('summer', '2026', seasons, { season: 'FALL', year: 2026 })).toEqual({
      season: 'SUMMER',
      year: 2026,
    });
    expect(parseSeasonFromParams('FALL', '1999', seasons, { season: 'FALL', year: 2026 })).toEqual({
      season: 'FALL',
      year: 2026,
    });
  });
});
