import { useNavigate } from 'react-router-dom';
import { useDiscoverQuery } from '@/features/discover/api/discoverQueries';
import { HeroBanner } from '@/features/discover/components/HeroBanner';
import { MediaCarousel } from '@/features/discover/components/MediaCarousel';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaSummary, MediaType } from '@/shared/api/types';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

export function DiscoverPage() {
  const navigate = useNavigate();
  const activeMediaType = usePrefsStore((state) => state.activeMediaType);
  const setActiveMediaType = usePrefsStore((state) => state.setActiveMediaType);
  const { isAdultQueryArg } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const { data, isLoading, isError, isRefetchError, error, refetch } =
    useDiscoverQuery(activeMediaType, isAdultQueryArg);

  const handleSelectMedia = (media: MediaSummary) => {
    navigate(`/media/${media.id}`);
  };

  const switchMediaType = (type: MediaType) => {
    void setActiveMediaType(type);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Discover</h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
            Explore trending, seasonal highlights, and top-rated titles.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Media type"
          className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
        >
          {(['ANIME', 'MANGA'] as const).map((type) => (
            <button
              key={type}
              role="tab"
              type="button"
              aria-selected={activeMediaType === type}
              onClick={() => switchMediaType(type)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${
                activeMediaType === type
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {type === 'ANIME' ? 'Anime' : 'Manga'}
            </button>
          ))}
        </div>
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
