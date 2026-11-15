import type { MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import { formatMediaTitle } from '@/shared/utils/formatters';

const LATIN_MACRON_MAP: Record<string, string> = {
  ā: 'a',
  Ā: 'A',
  ī: 'i',
  Ī: 'I',
  ū: 'u',
  Ū: 'U',
  ē: 'e',
  Ē: 'E',
  ō: 'o',
  Ō: 'O',
  â: 'a',
  Â: 'A',
  î: 'i',
  Î: 'I',
  û: 'u',
  Û: 'U',
  ê: 'e',
  Ê: 'E',
  ô: 'o',
  Ô: 'O',
};

const STOP_WORDS = new Set([
  'no',
  'wa',
  'ga',
  'wo',
  'ni',
  'de',
  'to',
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'and',
  'kara',
]);

const CJK_CHAR_RE = /[\u3040-\u30ff\u4e00-\u9faf]/;
const HIRAGANA_RE = /[\u3041-\u3096]/;
const KATAKANA_RE = /[\u30a1-\u30f6]/;
const KANJI_RE = /[\u4e00-\u9faf]/;

function fullwidthToAscii(value: string): string {
  return value.replace(/[\uff01-\uff5e]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

/**
 * Normalizes user search input across fullwidth IME text, Latin macrons, and
 * decorative symbols while leaving Japanese kana dakuten and kanji intact.
 */
export function normalizeSearchInput(raw: string): string {
  if (!raw) {
    return '';
  }

  let normalized = fullwidthToAscii(raw)
    .replace(/[×・]/g, ' ')
    .replace(/[「」『』〜～]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');

  normalized = normalized.replace(
    /[āĀīĪūŪēĒōŌâÂîÎûÛêÊôÔ]/g,
    (ch) => LATIN_MACRON_MAP[ch] ?? ch,
  );

  return normalized.replace(/\s+/g, ' ').trim();
}

function toKatakana(value: string): string {
  return value.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
}

function toHiragana(value: string): string {
  return value.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

/**
 * Generates up to 2 fallback queries when an initial AniList search yields 0
 * results (CJK whitespace removal, hiragana/katakana swap, relaxed romaji, or
 * primary significant word for multi-word character/title searches).
 */
export function buildFallbackSearchQueries(normalizedQuery: string): string[] {
  if (normalizedQuery.length < 2) {
    return [];
  }

  const candidates: string[] = [];
  const pushUnique = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= 2 && trimmed !== normalizedQuery && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  if (CJK_CHAR_RE.test(normalizedQuery)) {
    const collapsed = normalizedQuery.replace(/\s+/g, '');
    pushUnique(collapsed);

    if (!KANJI_RE.test(collapsed)) {
      if (HIRAGANA_RE.test(collapsed)) {
        pushUnique(toKatakana(collapsed));
      } else if (KATAKANA_RE.test(collapsed)) {
        pushUnique(toHiragana(collapsed));
      }
    }
    return candidates.slice(0, 2);
  }

  if (/[/:]/.test(normalizedQuery)) {
    pushUnique(normalizedQuery.replace(/[/:]+/g, ' ').replace(/\s+/g, ' '));
  }

  if (/ou|uu/i.test(normalizedQuery)) {
    pushUnique(normalizedQuery.replace(/ou/gi, 'o').replace(/uu/gi, 'u'));
  }

  const words = normalizedQuery
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word.toLowerCase()));

  if (words.length >= 3) {
    pushUnique(words.slice(0, 2).join(' '));
  }
  if (words.length >= 2) {
    pushUnique(words[0]!);
  }

  return candidates.slice(0, 2);
}

export interface MediaFilterCriteria {
  type: 'ANIME' | 'MANGA';
  format?: string;
  status?: string;
  season?: string;
  year?: number;
  genres: string[];
}

/**
 * Checks whether a character's parent media satisfies the user's active media
 * filters and safe-mode flag.
 */
export function filterCharacterMedia(
  media: MediaSummary,
  criteria: MediaFilterCriteria,
  allowAdult: boolean,
): boolean {
  if (!allowAdult && media.isAdult) {
    return false;
  }
  if (media.type !== criteria.type) {
    return false;
  }
  if (criteria.format && media.format !== criteria.format) {
    return false;
  }
  if (criteria.status && media.status !== criteria.status) {
    return false;
  }
  if (criteria.type === 'ANIME' && criteria.season && media.season !== criteria.season) {
    return false;
  }
  if (criteria.year && media.seasonYear !== criteria.year) {
    return false;
  }
  if (
    criteria.genres.length > 0 &&
    !criteria.genres.every((genre) => media.genres.includes(genre))
  ) {
    return false;
  }
  return true;
}

/**
 * Returns a helpful 1-line subtitle hint on Search cards when a result matched
 * via character lookup or an alternative title variant (Romaji / Native / English).
 */
export function getSearchCardHint(
  media: MediaSummary,
  searchQuery: string,
  preferredLanguage: UserTitleLanguage,
  matchedCharacterName?: string | null,
): string | null {
  if (matchedCharacterName) {
    return `Char: ${matchedCharacterName}`;
  }

  const normalized = normalizeSearchInput(searchQuery).toLowerCase();
  if (normalized.length < 2) {
    return null;
  }

  const displayed = formatMediaTitle(media.title, preferredLanguage);
  if (normalizeSearchInput(displayed).toLowerCase().includes(normalized)) {
    return null;
  }

  const alternatives = [media.title.romaji, media.title.native, media.title.english].filter(
    (value): value is string => Boolean(value && value !== displayed),
  );

  const directMatch = alternatives.find((alt) =>
    normalizeSearchInput(alt).toLowerCase().includes(normalized),
  );
  if (directMatch) {
    return directMatch;
  }

  if (CJK_CHAR_RE.test(normalized) && media.title.native && media.title.native !== displayed) {
    return media.title.native;
  }

  return null;
}

const TAG_CATEGORY_LABELS: Record<string, string> = {
  'Cast-Main Cast': 'Main Cast',
  'Cast-Traits': 'Character Traits',
  Demographic: 'Demographic',
  'Setting-Scene': 'Setting & Scene',
  'Setting-Time': 'Time Period',
  'Setting-Universe': 'Setting & Universe',
  'Sexual Content': 'Sexual Content',
  Technical: 'Technical',
  'Theme-Action': 'Action',
  'Theme-Arts': 'Arts',
  'Theme-Arts-Music': 'Music',
  'Theme-Comedy': 'Comedy',
  'Theme-Drama': 'Drama',
  'Theme-Fantasy': 'Fantasy',
  'Theme-Game': 'Game',
  'Theme-Game-Card & Board Game': 'Card & Board Game',
  'Theme-Game-Sport': 'Game Sport',
  'Theme-Other': 'Other Themes',
  'Theme-Other-Organisations': 'Organisations',
  'Theme-Other-Vehicle': 'Vehicle',
  'Theme-Romance': 'Romance',
  'Theme-Sci-Fi': 'Sci-Fi',
  'Theme-Sci-Fi-Mecha': 'Mecha',
  'Theme-Slice of Life': 'Slice of Life',
};

export interface TagCategoryOption {
  value: string;
  label: string;
}

/**
 * Formats an AniList raw MediaTag.category identifier (e.g. "Theme-Game-Sport")
 * into a concise human-readable filter chip label ("Game Sport").
 */
export function formatTagCategoryLabel(rawCategory: string): string {
  const mapped = TAG_CATEGORY_LABELS[rawCategory];
  if (mapped) {
    return mapped;
  }
  return rawCategory
    .replace(/^(Theme-Other-|Theme-Arts-|Theme-Sci-Fi-|Theme-Game-|Theme-|Setting-|Cast-)/, '')
    .replace(/-/g, ' ')
    .trim();
}

/**
 * Builds deduplicated, alphabetically sorted tag category options from AniList's
 * MediaTagCollection while hiding adult categories when adult content is disabled.
 */
export function extractAvailableTagCategories(
  tags: Array<{ category: string | null; isAdult: boolean | null }> | undefined,
  allowAdult: boolean,
): TagCategoryOption[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const options: TagCategoryOption[] = [];

  for (const tag of tags) {
    const raw = tag.category?.trim();
    if (!raw || seen.has(raw)) {
      continue;
    }
    if (!allowAdult && (tag.isAdult || raw === 'Sexual Content')) {
      continue;
    }
    seen.add(raw);
    options.push({ value: raw, label: formatTagCategoryLabel(raw) });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}
