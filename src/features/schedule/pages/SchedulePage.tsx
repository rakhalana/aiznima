import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { useMyListQuery } from '@/features/my-list/api/myListQueries';
import {
  getDayBoundsSeconds,
  useScheduleQuery,
} from '@/features/schedule/api/scheduleQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaListEntrySummary } from '@/shared/api/types';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import {
  formatCountdown,
  formatListStatusLabel,
  formatMediaFormat,
  formatMediaTitle,
  getBehindEpisodeCount,
} from '@/shared/utils/formatters';

type ScheduleListFilter = 'ALL' | 'MY_LIST' | 'WATCHING';

const SCHEDULE_LIST_TABS: Array<{ key: ScheduleListFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'MY_LIST', label: 'My List' },
  { key: 'WATCHING', label: 'Watching' },
];

function formatDayChip(offset: number): { label: string; sub: string } {
  const { date } = getDayBoundsSeconds(offset);
  const sub = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (offset === 0) return { label: 'Today', sub };
  if (offset === 1) return { label: 'Tomorrow', sub };
  return {
    label: date.toLocaleDateString(undefined, { weekday: 'short' }),
    sub,
  };
}

function formatLocalTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SchedulePage() {
  const navigate = useNavigate();
  useDocumentTitle('Airing Schedule');
  const [dayOffset, setDayOffset] = useState(0);
  const [listFilter, setListFilter] = useState<ScheduleListFilter>('ALL');
  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);
  const viewer = useAuthStore((state) => state.viewer);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);

  const { data, isLoading, isError, error, refetch } = useScheduleQuery(
    dayOffset,
    allowAdult,
  );
  const myListQuery = useMyListQuery(
    accessToken ? viewer?.id : undefined,
    'ANIME',
  );

  const entryByMediaId = useMemo(() => {
    const map = new Map<number, MediaListEntrySummary>();
    for (const group of myListQuery.data?.lists ?? []) {
      for (const entry of group.entries) {
        if (!map.has(entry.mediaId)) {
          map.set(entry.mediaId, entry);
        }
      }
    }
    return map;
  }, [myListQuery.data]);

  const effectiveFilter: ScheduleListFilter = accessToken ? listFilter : 'ALL';

  const visibleItems = useMemo(() => {
    if (!data) return [];
    if (effectiveFilter === 'ALL') return data;

    return data.filter((item) => {
      const entry = entryByMediaId.get(item.mediaId) ?? item.media.mediaListEntry;
      if (!entry) return false;
      if (effectiveFilter === 'WATCHING') {
        return entry.status === 'CURRENT';
      }
      return true;
    });
  }, [data, effectiveFilter, entryByMediaId]);

  const handleSelectListFilter = (next: ScheduleListFilter) => {
    if (next !== 'ALL' && !accessToken) {
      openLoginPrompt(
        'Log in with AniList to filter the airing schedule by your personal watchlist.',
        '/schedule',
      );
      return;
    }
    setListFilter(next);
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Airing Schedule</h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
            Upcoming episode release times in your local timezone.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter schedule by watchlist"
          className="inline-flex w-fit rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
        >
          {SCHEDULE_LIST_TABS.map((tab) => {
            const active = effectiveFilter === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => handleSelectListFilter(tab.key)}
                className={`min-h-8 rounded-lg px-3 py-1 text-xs font-semibold transition-crisp ${
                  active
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-1 sm:-mx-4 sm:px-4 md:mx-0 md:grid md:grid-cols-7 md:gap-2.5 md:overflow-visible md:px-0 md:pb-0">
        {Array.from({ length: 7 }).map((_, idx) => {
          const { label, sub } = formatDayChip(idx);
          const active = dayOffset === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setDayOffset(idx)}
              className={`min-w-[80px] shrink-0 rounded-xl border px-3 py-2 text-left transition-crisp md:min-w-0 ${
                active
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <span className="block text-xs font-semibold">{label}</span>
              <span className="tabular-nums block text-[11px] opacity-80">{sub}</span>
            </button>
          );
        })}
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <MediaCardSkeleton key={idx} />
          ))}
        </div>
      ) : null}

      {isError && !data ? (
        <ErrorState
          isOffline={error instanceof NetworkError}
          message={error instanceof Error ? error.message : 'Unable to load airing schedule.'}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && data && visibleItems.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-6 w-6" strokeWidth={1.75} />}
          title={
            effectiveFilter !== 'ALL'
              ? 'No matching episodes in your list'
              : 'No episodes scheduled'
          }
          description={
            effectiveFilter !== 'ALL'
              ? 'None of the anime airing on this day match your selected list filter.'
              : 'There are no episodes scheduled for this day.'
          }
          actionLabel={
            effectiveFilter !== 'ALL'
              ? 'Show All'
              : dayOffset !== 0
                ? 'View Today'
                : undefined
          }
          onAction={
            effectiveFilter !== 'ALL'
              ? () => setListFilter('ALL')
              : dayOffset !== 0
                ? () => setDayOffset(0)
                : undefined
          }
        />
      ) : null}

      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {visibleItems.map((item) => {
            const title = formatMediaTitle(item.media.title, preferredLanguage);
            const cover = item.media.coverImage?.large || item.media.coverImage?.medium;
            const listEntry =
              entryByMediaId.get(item.mediaId) ?? item.media.mediaListEntry ?? null;
            const behindCount = getBehindEpisodeCount(
              item.episode,
              listEntry?.progress,
              listEntry?.status,
            );

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/media/${item.mediaId}`)}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2 text-left shadow-token-xs transition-crisp hover:border-[var(--border-strong)] active:scale-[0.98]"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
                  {cover ? (
                    <img
                      src={cover}
                      alt={title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}

                  <span className="tabular-nums absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white md:bg-slate-900/75 md:backdrop-blur-xs">
                    <Clock className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden="true" />
                    {formatLocalTime(item.airingAt)}
                  </span>

                  <span className="tabular-nums absolute right-1.5 top-1.5 rounded-md bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-token-xs">
                    {formatCountdown(item.timeUntilAiring)}
                  </span>
                </div>

                <div className="mt-2 flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                  <div>
                    <h2 className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] sm:text-sm">
                      {title}
                    </h2>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
                      Episode {item.episode} · {formatMediaFormat(item.media.format)}
                    </p>
                  </div>

                  {listEntry?.status || behindCount > 0 ? (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold tabular-nums">
                      {listEntry?.status ? (
                        <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[var(--accent-ink)]">
                          {formatListStatusLabel(listEntry.status, 'ANIME')}
                        </span>
                      ) : null}
                      {behindCount > 0 ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                          Behind {behindCount} ep
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
