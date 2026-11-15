import type {
  MediaFormat,
  MediaListCollection,
  MediaListEntry,
  MediaListStatus,
  MediaType,
  UserTitleLanguage,
} from '@/shared/api/types';
import { normalizeSearchInput } from '@/features/search/utils/searchHelpers';
import {
  formatListStatusLabel,
  formatMediaTitle,
  formatNextAiringInfo,
  getBehindEpisodeCount,
} from '@/shared/utils/formatters';

export const STATUS_TAB_ORDER: MediaListStatus[] = [
  'CURRENT',
  'PLANNING',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
  'REPEATING',
];

export interface ListTabGroup {
  key: string;
  label: string;
  entries: MediaListEntry[];
}

export function buildListTabs(
  collection: MediaListCollection | undefined,
  mediaType: MediaType,
  includeEmptyStandardTabs = true,
): ListTabGroup[] {
  const uniqueMap = new Map<number, MediaListEntry>();
  const statusBuckets = new Map<MediaListStatus, MediaListEntry[]>();
  for (const st of STATUS_TAB_ORDER) {
    statusBuckets.set(st, []);
  }
  const customTabs: ListTabGroup[] = [];

  for (const group of collection?.lists ?? []) {
    for (const entry of group.entries) {
      if (!uniqueMap.has(entry.id)) {
        uniqueMap.set(entry.id, entry);
      }
    }

    if (group.isCustomList) {
      customTabs.push({
        key: `custom:${group.name}`,
        label: group.name,
        entries: group.entries,
      });
    } else if (group.status && statusBuckets.has(group.status)) {
      const existing = statusBuckets.get(group.status) ?? [];
      statusBuckets.set(group.status, [...existing, ...group.entries]);
    }
  }

  const tabs: ListTabGroup[] = [
    { key: 'ALL', label: 'All', entries: Array.from(uniqueMap.values()) },
  ];

  for (const status of STATUS_TAB_ORDER) {
    const entries = statusBuckets.get(status) ?? [];
    if (includeEmptyStandardTabs || entries.length > 0) {
      tabs.push({
        key: status,
        label: formatListStatusLabel(status, mediaType),
        entries,
      });
    }
  }

  return [...tabs, ...customTabs];
}

export type ListSortOption =
  | 'UPDATED_DESC'
  | 'SCORE_DESC'
  | 'PROGRESS_DESC'
  | 'TITLE_ASC';

export interface ListFilterCriteria {
  query: string;
  format?: MediaFormat | '';
  airingBehindOnly?: boolean;
}

export function isEntryAiringOrBehind(entry: MediaListEntry): boolean {
  if (entry.media.type !== 'ANIME') {
    return false;
  }
  if (entry.media.status === 'RELEASING' || Boolean(formatNextAiringInfo(entry.media.nextAiringEpisode))) {
    return true;
  }
  return (
    getBehindEpisodeCount(
      entry.media.nextAiringEpisode?.episode,
      entry.progress,
      entry.status,
    ) > 0
  );
}

export function filterListEntries(
  entries: MediaListEntry[],
  criteriaOrQuery: string | ListFilterCriteria,
): MediaListEntry[] {
  const criteria: ListFilterCriteria =
    typeof criteriaOrQuery === 'string'
      ? { query: criteriaOrQuery }
      : criteriaOrQuery;
  const normalized = normalizeSearchInput(criteria.query).toLowerCase();

  return entries.filter((entry) => {
    if (criteria.format && entry.media.format !== criteria.format) {
      return false;
    }
    if (criteria.airingBehindOnly && !isEntryAiringOrBehind(entry)) {
      return false;
    }
    if (!normalized) {
      return true;
    }

    const candidates = [
      entry.media.title.romaji,
      entry.media.title.english,
      entry.media.title.native,
    ];
    return candidates.some((t) =>
      t ? normalizeSearchInput(t).toLowerCase().includes(normalized) : false,
    );
  });
}

function getProgressSortRatio(entry: MediaListEntry): number {
  const progress = entry.progress ?? 0;
  const total =
    entry.media.type === 'MANGA' ? entry.media.chapters : entry.media.episodes;
  if (total && total > 0) {
    return Math.min(1, progress / total);
  }
  return progress > 0 ? 0.01 : 0;
}

export function sortListEntries(
  entries: MediaListEntry[],
  sortBy: ListSortOption,
  preferredLanguage: UserTitleLanguage,
): MediaListEntry[] {
  if (sortBy === 'UPDATED_DESC') {
    return [...entries].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }
  if (sortBy === 'SCORE_DESC') {
    return [...entries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  if (sortBy === 'PROGRESS_DESC') {
    return [...entries].sort((a, b) => {
      const ratioDiff = getProgressSortRatio(b) - getProgressSortRatio(a);
      if (ratioDiff !== 0) {
        return ratioDiff;
      }
      return (b.progress ?? 0) - (a.progress ?? 0);
    });
  }
  return [...entries].sort((a, b) =>
    formatMediaTitle(a.media.title, preferredLanguage).localeCompare(
      formatMediaTitle(b.media.title, preferredLanguage),
    ),
  );
}
