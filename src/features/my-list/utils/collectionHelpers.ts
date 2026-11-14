import type {
  MediaListCollection,
  MediaListEntry,
  MediaListStatus,
  MediaType,
} from '@/shared/api/types';
import { formatListStatusLabel } from '@/shared/utils/formatters';

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

export function filterListEntries(
  entries: MediaListEntry[],
  query: string,
): MediaListEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return entries;
  }

  return entries.filter(({ media }) => {
    const candidates = [
      media.title.romaji,
      media.title.english,
      media.title.native,
    ];
    return candidates.some((t) => t?.toLowerCase().includes(normalized));
  });
}
