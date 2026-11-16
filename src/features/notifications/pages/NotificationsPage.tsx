import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  ExternalLink,
  Film,
  MessageSquare,
  Tv,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/app/layouts/AuthGuard';
import {
  useNotificationsInfiniteQuery,
  useUnreadNotificationCount,
} from '@/features/notifications/api/notificationQueries';
import {
  NOTIFICATION_FILTERS,
  presentNotification,
  type NotificationFilterCategory,
  type PresentedNotification,
} from '@/features/notifications/utils/notificationFormatters';
import { openExternalUrl } from '@/platform';
import { NetworkError } from '@/shared/api/graphqlClient';
import { Button } from '@/shared/components/Button';
import { MediaRowSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';

function renderCategoryIcon(item: PresentedNotification) {
  switch (item.kind) {
    case 'airing':
      return <Tv className="h-4 w-4 text-[var(--accent-primary)]" strokeWidth={1.75} />;
    case 'social':
      return item.imageShape === 'avatar' ? (
        <User className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
      ) : (
        <MessageSquare className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
      );
    case 'media':
      return <Film className="h-4 w-4 text-amber-500" strokeWidth={1.75} />;
  }
}

function NotificationsContent() {
  const navigate = useNavigate();
  const preferredLanguage = usePreferredTitleLanguage();
  const { allowAdult } = useIsAdultFilter();

  const [category, setCategory] = useState<NotificationFilterCategory>('ALL');
  const liveUnreadCount = useUnreadNotificationCount();
  const [unreadHighlightCount, setUnreadHighlightCount] = useState<number>(liveUnreadCount);

  useEffect(() => {
    setUnreadHighlightCount((prev) => (liveUnreadCount === 0 ? 0 : Math.max(prev, liveUnreadCount)));
  }, [liveUnreadCount]);

  const activeFilter =
    NOTIFICATION_FILTERS.find((item) => item.key === category) ?? NOTIFICATION_FILTERS[0]!;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotificationsInfiniteQuery(activeFilter.types);

  const items = useMemo(() => {
    const raw = data?.pages.flatMap((page) => page.Page.notifications) ?? [];
    return raw
      .map((notification) => presentNotification(notification, preferredLanguage))
      .filter((item) => allowAdult || !item.isAdultMedia);
  }, [data, preferredLanguage, allowAdult]);

  const handleItemClick = (item: PresentedNotification) => {
    if (!item.target) {
      return;
    }
    if (item.target.kind === 'internal') {
      navigate(item.target.path);
    } else {
      void openExternalUrl(item.target.url);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Notifications</h1>
            {liveUnreadCount > 0 ? (
              <span className="tabular-nums rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[11px] font-bold text-white">
                {liveUnreadCount > 99 ? '99+' : liveUnreadCount} unread
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
            Airing alerts, replies, followers, and database updates.
          </p>
        </div>

      </header>

      <div
        role="tablist"
        aria-label="Filter notifications"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {NOTIFICATION_FILTERS.map((option) => {
          const isSelected = category === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setCategory(option.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-crisp ${isSelected
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <MediaRowSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          isOffline={error instanceof NetworkError || error instanceof TypeError}
          message={
            error instanceof Error ? error.message : 'Unable to load your AniList notifications.'
          }
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
          title="You're all caught up"
          description={
            category === 'ALL'
              ? 'No AniList notifications yet. Airing updates and interactions will show up here.'
              : 'No notifications in this category yet.'
          }
          actionLabel={category !== 'ALL' ? 'Show All Notifications' : undefined}
          onAction={category !== 'ALL' ? () => setCategory('ALL') : undefined}
        />
      ) : null}

      {!isLoading && !isError && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => {
            const isUnread = category === 'ALL' && index < unreadHighlightCount;
            const clickable = Boolean(item.target);

            return (
              <button
                key={item.id}
                type="button"
                disabled={!clickable}
                onClick={() => handleItemClick(item)}
                className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${isUnread
                    ? 'border-[var(--accent-primary)]/35 bg-[var(--accent-soft)]/50'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
                  } ${clickable ? 'hover:bg-[var(--bg-subtle)] cursor-pointer' : 'cursor-default'}`}
              >
                <div
                  className={`relative shrink-0 overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-subtle)] ${item.imageShape === 'avatar'
                      ? 'h-11 w-11 rounded-full'
                      : 'h-14 w-10 rounded-md'
                    }`}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {renderCategoryIcon(item)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {isUnread ? (
                      <span
                        aria-label="Unread notification"
                        className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)]"
                      />
                    ) : null}
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                  </div>
                  <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                  {item.secondaryText ? (
                    <p className="line-clamp-1 text-[11px] text-[var(--text-muted)]">
                      {item.secondaryText}
                    </p>
                  ) : null}
                  <p className="text-[11px] font-medium text-[var(--text-muted)]">
                    {item.timeAgo}
                  </p>
                </div>

                {clickable ? (
                  <div className="shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]">
                    {item.target?.kind === 'external' ? (
                      <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}

          {hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void fetchNextPage()}
                isLoading={isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  useDocumentTitle('Notifications');

  return (
    <div className="mx-auto max-w-4xl space-y-4 md:space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back
      </button>

      <AuthGuard
        title="Notifications"
        description="Sign in with AniList to see your airing alerts, replies, and activity updates."
      >
        <NotificationsContent />
      </AuthGuard>
    </div>
  );
}
