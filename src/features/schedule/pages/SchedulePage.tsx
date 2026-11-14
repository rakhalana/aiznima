import { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getDayBoundsSeconds,
  useScheduleQuery,
} from '@/features/schedule/api/scheduleQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import {
  formatCountdown,
  formatMediaFormat,
  formatMediaTitle,
} from '@/shared/utils/formatters';

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
  const [dayOffset, setDayOffset] = useState(0);
  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const { data, isLoading, isError, error, refetch } = useScheduleQuery(
    dayOffset,
    allowAdult,
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Airing Schedule</h1>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
          Upcoming episode release times in your local timezone.
        </p>
      </header>

      <div className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-1 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
        {Array.from({ length: 7 }).map((_, idx) => {
          const { label, sub } = formatDayChip(idx);
          const active = dayOffset === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setDayOffset(idx)}
              className={`min-w-[80px] shrink-0 rounded-xl border px-3 py-2 text-left transition-crisp ${
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

      {!isLoading && data && data.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-6 w-6" strokeWidth={1.75} />}
          title="No episodes scheduled"
          description="There are no episodes scheduled for this day."
          actionLabel={dayOffset !== 0 ? 'View Today' : undefined}
          onAction={dayOffset !== 0 ? () => setDayOffset(0) : undefined}
        />
      ) : null}

      {data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {data.map((item) => {
            const title = formatMediaTitle(item.media.title, preferredLanguage);
            const cover = item.media.coverImage?.large || item.media.coverImage?.medium;

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

                  <span className="tabular-nums absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                    <Clock className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden="true" />
                    {formatLocalTime(item.airingAt)}
                  </span>

                  <span className="tabular-nums absolute right-1.5 top-1.5 rounded-md bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-token-xs">
                    {formatCountdown(item.timeUntilAiring)}
                  </span>
                </div>

                <div className="mt-2 flex min-w-0 flex-1 flex-col justify-between gap-1">
                  <h2 className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] sm:text-sm">
                    {title}
                  </h2>
                  <p className="truncate text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
                    Episode {item.episode} · {formatMediaFormat(item.media.format)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
