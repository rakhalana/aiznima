import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDiscoverQuery } from '@/features/discover/api/discoverQueries';
import { HeroBanner } from '@/features/discover/components/HeroBanner';
import { MediaCarousel } from '@/features/discover/components/MediaCarousel';
import { useUnreadNotificationCount } from '@/features/notifications/api/notificationQueries';
import { usePersonalizedTaste } from '@/features/taste/hooks/usePersonalizedTaste';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaSummary, MediaType } from '@/shared/api/types';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/StateFeedback';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

const DISCOVER_TABS: Array<{ type: MediaType; label: string }> = [
  { type: 'ANIME', label: 'Anime' },
  { type: 'MANGA', label: 'Manga' },
];

export function DiscoverPage() {
  const navigate = useNavigate();
  const activeMediaType = usePrefsStore((state) => state.activeMediaType);
  const setActiveMediaType = usePrefsStore((state) => state.setActiveMediaType);
  const { isAdultQueryArg } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const unreadNotificationCount = useUnreadNotificationCount();
  useDocumentTitle(null);

  const { data, isLoading, isError, isRefetchError, error, refetch } =
    useDiscoverQuery(activeMediaType, isAdultQueryArg);

  const { recommendations } = usePersonalizedTaste(activeMediaType, {
    includeRecommendations: true,
  });

  const recommendationMap = useMemo(
    () => new Map(recommendations.map((item) => [item.media.id, item])),
    [recommendations],
  );
  const recommendedItems = useMemo(
    () => recommendations.slice(0, 5).map((item) => item.media),
    [recommendations],
  );

  const handleSelectMedia = (media: MediaSummary) => {
    navigate(`/media/${media.id}`);
  };

  return (
    <div className="space-y-5 md:space-y-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start justify-between gap-3">
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
        </div>

        <div
          role="tablist"
          aria-label="Discover media type"
          className="inline-flex w-fit rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
        >
          {DISCOVER_TABS.map((tab) => {
            const active = activeMediaType === tab.type;
            return (
              <button
                key={tab.type}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveMediaType(tab.type)}
                className={`min-h-8 rounded-lg px-3.5 py-1 text-xs font-semibold transition-crisp ${
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

      {isLoading && !data ? (
        <div className="space-y-6">
          <div className="h-48 w-full animate-pulse rounded-2xl bg-[var(--bg-subtle)] md:h-72 lg:h-[340px]" />
          <div className="flex gap-3 overflow-hidden sm:gap-3.5 md:gap-4 lg:grid lg:grid-cols-5 lg:gap-5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="w-[148px] shrink-0 sm:w-[168px] md:w-[188px] lg:w-auto lg:shrink"
              >
                <MediaCardSkeleton />
              </div>
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
            {recommendedItems.length > 0 ? (
              <MediaCarousel
                title="Recommended For You"
                subtitle="Tailored from your Taste DNA"
                seeAllTo={`/discover/recommended?type=${activeMediaType}`}
                items={recommendedItems}
                preferredLanguage={preferredLanguage}
                getItemProps={(media) => {
                  const match = recommendationMap.get(media.id);
                  if (!match) return {};
                  return {
                    subtitleHint: match.subtitleHint,
                    statusLabelOverride: match.inPlanning ? 'In Planning' : null,
                  };
                }}
                onSelect={handleSelectMedia}
              />
            ) : null}

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
