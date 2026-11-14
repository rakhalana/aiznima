import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDiscoverQuery } from '@/features/discover/api/discoverQueries';
import { HeroBanner } from '@/features/discover/components/HeroBanner';
import { MediaCarousel } from '@/features/discover/components/MediaCarousel';
import { useUnreadNotificationCount } from '@/features/notifications/api/notificationQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaSummary } from '@/shared/api/types';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';

export function DiscoverPage() {
  const navigate = useNavigate();
  const { isAdultQueryArg } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const unreadNotificationCount = useUnreadNotificationCount();

  const { data, isLoading, isError, isRefetchError, error, refetch } =
    useDiscoverQuery('ANIME', isAdultQueryArg);

  const handleSelectMedia = (media: MediaSummary) => {
    navigate(`/media/${media.id}`);
  };

  return (
    <div className="space-y-5 md:space-y-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Discover</h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
            Explore trending, seasonal highlights, and top-rated titles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label={
            unreadNotificationCount > 0
              ? `Notifications (${unreadNotificationCount} unread)`
              : 'Notifications'
          }
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-token-xs transition-crisp hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 md:hidden"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          {unreadNotificationCount > 0 ? (
            <span className="tabular-nums absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[10px] font-bold leading-[18px] text-white shadow-token-xs">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          ) : null}
        </button>
      </header>

      {isLoading && !data ? (
        <div className="space-y-6">
          <div className="h-48 w-full animate-pulse rounded-2xl bg-[var(--bg-subtle)] md:h-60" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <MediaCardSkeleton key={idx} />
            ))}
          </div>
        </div>
      ) : null}

      {isError && !data ? (
        <ErrorState
          isOffline={error instanceof NetworkError}
          message={
            error instanceof Error ? error.message : 'Unable to load Discover feed.'
          }
          onRetry={() => void refetch()}
        />
      ) : null}

      {data ? (
        <>
          {isError || isRefetchError ? (
            <ErrorState
              showingCached
              isOffline={error instanceof NetworkError}
              message={
                error instanceof Error
                  ? error.message
                  : 'Could not refresh latest Discover feed.'
              }
              onRetry={() => void refetch()}
            />
          ) : null}

          {data.hero ? (
            <HeroBanner
              media={data.hero}
              preferredLanguage={preferredLanguage}
              onSelect={handleSelectMedia}
            />
          ) : null}

          <div className="space-y-8">
            {data.sections.map((section) => (
              <MediaCarousel
                key={section.key}
                title={section.title}
                seeAllTo={section.seeAllTo}
                items={section.items}
                preferredLanguage={preferredLanguage}
                onSelect={handleSelectMedia}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
