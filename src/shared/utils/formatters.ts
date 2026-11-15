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

const SEASON_ORDER: readonly MediaSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

export function getPreviousSeasonPeriod(period: SeasonPeriod): SeasonPeriod {
  const idx = SEASON_ORDER.indexOf(period.season);
  if (idx <= 0) {
    return { season: 'FALL', year: period.year - 1 };
  }
  return { season: SEASON_ORDER[idx - 1]!, year: period.year };
}

export function formatSeasonLabel(season: MediaSeason, year: number): string {
  const label = season.charAt(0) + season.slice(1).toLowerCase();
  return `${label} ${year}`;
}

export function buildSequentialSeasons(
  yearsBack = 5,
  date = new Date(),
): SeasonPeriod[] {
  const { current, next } = getCurrentAndNextSeason(date);
  const totalSeasons = Math.max(1, yearsBack) * 4 + 1;
  const result: SeasonPeriod[] = [next];

  let cursor: SeasonPeriod = current;
  while (result.length < totalSeasons) {
    result.push(cursor);
    cursor = getPreviousSeasonPeriod(cursor);
  }

  return result;
}

export function parseSeasonFromParams(
  seasonParam: string | null,
  yearParam: string | null,
  validSeasons: ReadonlyArray<SeasonPeriod>,
  fallback: SeasonPeriod,
): SeasonPeriod {
  const normalizedSeason = seasonParam?.toUpperCase() as MediaSeason | undefined;
  const parsedYear = Number.parseInt(yearParam ?? '', 10);
  if (!normalizedSeason || Number.isNaN(parsedYear)) {
    return fallback;
  }

  return (
    validSeasons.find(
      (item) => item.season === normalizedSeason && item.year === parsedYear,
    ) ?? fallback
  );
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

export function formatRelativeTime(
  unixSeconds: number | null | undefined,
  nowMs = Date.now(),
): string {
  if (!unixSeconds || unixSeconds <= 0) {
    return 'Unknown time';
  }

  const diffSeconds = Math.max(0, Math.floor(nowMs / 1000) - unixSeconds);
  if (diffSeconds < 60) {
    return 'Just now';
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  if (diffSeconds < 604800) {
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }
  if (diffSeconds < 2592000) {
    return `${Math.floor(diffSeconds / 604800)}w ago`;
  }
  if (diffSeconds < 31536000) {
    return `${Math.floor(diffSeconds / 2592000)}mo ago`;
  }
  return `${Math.floor(diffSeconds / 31536000)}y ago`;
}

export interface NextAiringDisplayInfo {
  episode: number;
  countdown: string;
  shortLabel: string;
  formattedDate: string | null;
}

export function formatAiringDateTime(airingAt: number | null | undefined): string | null {
  if (!airingAt || airingAt <= 0) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(airingAt * 1000));
}

export function formatNextAiringInfo(
  nextAiringEpisode:
    | {
        episode: number;
        timeUntilAiring: number;
        airingAt?: number | null;
      }
    | null
    | undefined,
  nowMs = Date.now(),
): NextAiringDisplayInfo | null {
  if (!nextAiringEpisode) {
    return null;
  }

  const airingAt = nextAiringEpisode.airingAt ?? null;
  let secondsUntil: number;
  if (airingAt && airingAt * 1000 > nowMs) {
    secondsUntil = Math.floor((airingAt * 1000 - nowMs) / 1000);
  } else if (nextAiringEpisode.timeUntilAiring > 0) {
    secondsUntil = nextAiringEpisode.timeUntilAiring;
  } else {
    return null;
  }

  const countdown = formatCountdown(secondsUntil);
  return {
    episode: nextAiringEpisode.episode,
    countdown,
    shortLabel: `Ep ${nextAiringEpisode.episode} in ${countdown}`,
    formattedDate: formatAiringDateTime(airingAt),
  };
}

const ACTIVE_BEHIND_STATUSES: ReadonlySet<MediaListStatus> = new Set([
  'CURRENT',
  'PLANNING',
  'PAUSED',
]);

export function getBehindEpisodeCount(
  upcomingEpisode: number | null | undefined,
  progress: number | null | undefined,
  status: MediaListStatus | null | undefined,
): number {
  if (!upcomingEpisode || upcomingEpisode <= 1 || !status || !ACTIVE_BEHIND_STATUSES.has(status)) {
    return 0;
  }
  const airedSoFar = upcomingEpisode - 1;
  const diff = airedSoFar - (progress ?? 0);
  return diff > 0 ? diff : 0;
}

const SOURCE_LABELS: Record<string, string> = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light Novel',
  VISUAL_NOVEL: 'Visual Novel',
  VIDEO_GAME: 'Video Game',
  OTHER: 'Other',
  NOVEL: 'Novel',
  DOUJINSHI: 'Doujinshi',
  ANIME: 'Anime',
  WEB_NOVEL: 'Web Novel',
  LIVE_ACTION: 'Live Action',
  GAME: 'Game',
  COMIC: 'Comic',
  MULTIMEDIA_PROJECT: 'Multimedia',
  PICTURE_BOOK: 'Picture Book',
};

export function formatMediaSource(source: string | null | undefined): string {
  if (!source) {
    return 'Unknown';
  }
  return (
    SOURCE_LABELS[source] ??
    source
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  );
}

const COUNTRY_LABELS: Record<string, string> = {
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  TW: 'Taiwan',
  US: 'United States',
};

export function formatCountryCode(code: string | null | undefined): string {
  if (!code) {
    return 'Unknown';
  }
  return COUNTRY_LABELS[code.toUpperCase()] ?? code.toUpperCase();
}

export function normalizeScoreTo100(
  score: number | null | undefined,
  scoreFormat: ScoreFormat | null | undefined = 'POINT_100',
): number {
  if (score === null || score === undefined || score <= 0) {
    return 0;
  }
  switch (scoreFormat) {
    case 'POINT_10_DECIMAL':
    case 'POINT_10':
      return score <= 10 ? score * 10 : Math.min(100, score);
    case 'POINT_5':
      return score <= 5 ? Math.round((score / 5) * 100) : Math.min(100, score);
    case 'POINT_3':
      return score <= 3 ? Math.round((score / 3) * 100) : Math.min(100, score);
    case 'POINT_100':
    default:
      return Math.min(100, score);
  }
}
