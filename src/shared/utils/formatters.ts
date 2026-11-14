import type {
  FuzzyDate,
  MediaFormat,
  MediaListStatus,
  MediaSeason,
  MediaTitle,
  ScoreFormat,
  UserTitleLanguage,
} from '@/shared/api/types';

export interface SeasonPeriod {
  season: MediaSeason;
  year: number;
}

export function getCurrentAndNextSeason(date = new Date()): {
  current: SeasonPeriod;
  next: SeasonPeriod;
} {
  const month = date.getMonth(); // 0..11
  const year = date.getFullYear();

  if (month <= 2) {
    return {
      current: { season: 'WINTER', year },
      next: { season: 'SPRING', year },
    };
  }
  if (month <= 5) {
    return {
      current: { season: 'SPRING', year },
      next: { season: 'SUMMER', year },
    };
  }
  if (month <= 8) {
    return {
      current: { season: 'SUMMER', year },
      next: { season: 'FALL', year },
    };
  }

  return {
    current: { season: 'FALL', year },
    next: { season: 'WINTER', year: year + 1 },
  };
}

export function formatMediaTitle(
  title: MediaTitle | null | undefined,
  preferred: UserTitleLanguage | null | undefined = 'ROMAJI',
): string {
  if (!title) {
    return 'Untitled';
  }

  const normalized = preferred ?? 'ROMAJI';

  if (normalized.startsWith('ENGLISH')) {
    return title.english || title.romaji || title.native || 'Untitled';
  }
  if (normalized.startsWith('NATIVE')) {
    return title.native || title.romaji || title.english || 'Untitled';
  }

  return title.romaji || title.english || title.native || 'Untitled';
}

export function formatScore(
  score: number | null | undefined,
  scoreFormat: ScoreFormat | null | undefined = 'POINT_100',
): string {
  if (score === null || score === undefined || score <= 0) {
    return '—';
  }

  switch (scoreFormat) {
    case 'POINT_10_DECIMAL':
      return score > 10 ? (score / 10).toFixed(1) : score.toFixed(1);
    case 'POINT_10':
      return String(score > 10 ? Math.round(score / 10) : Math.round(score));
    case 'POINT_5':
      return `${score}/5`;
    case 'POINT_3':
      return `${score}/3`;
    case 'POINT_100':
    default:
      return String(Math.round(score));
  }
}

export function formatMeanScore(meanScore: number | null | undefined): string {
  if (meanScore === null || meanScore === undefined || meanScore <= 0) {
    return '—';
  }
  return `${Math.round(meanScore)}%`;
}

export function formatFuzzyDate(date: FuzzyDate | null | undefined): string {
  if (!date || (!date.year && !date.month && !date.day)) {
    return 'TBA';
  }

  const parts: string[] = [];
  if (date.month) {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    parts.push(monthNames[date.month - 1] ?? String(date.month));
  }
  if (date.day) {
    parts.push(String(date.day));
  }
  if (date.year) {
    parts.push(String(date.year));
  }

  return parts.join(' ');
}

export function formatCountdown(secondsUntil: number): string {
  if (secondsUntil <= 0) {
    return 'Aired';
  }

  const days = Math.floor(secondsUntil / 86400);
  const hours = Math.floor((secondsUntil % 86400) / 3600);
  const minutes = Math.floor((secondsUntil % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(1, minutes)}m`;
}

const FORMAT_LABELS: Record<MediaFormat, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
  MANGA: 'Manga',
  NOVEL: 'Light Novel',
  ONE_SHOT: 'One Shot',
};

export function formatMediaFormat(format: MediaFormat | null | undefined): string {
  if (!format) {
    return 'Unknown';
  }
  return FORMAT_LABELS[format] ?? format;
}

export function formatListStatusLabel(
  status: MediaListStatus,
  mediaType: 'ANIME' | 'MANGA' = 'ANIME',
): string {
  switch (status) {
    case 'CURRENT':
      return mediaType === 'MANGA' ? 'Reading' : 'Watching';
    case 'PLANNING':
      return 'Planning';
    case 'COMPLETED':
      return 'Completed';
    case 'PAUSED':
      return 'Paused';
    case 'DROPPED':
      return 'Dropped';
    case 'REPEATING':
      return mediaType === 'MANGA' ? 'Rereading' : 'Rewatching';
  }
}

export function formatCompactCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(Math.round(value));
}
