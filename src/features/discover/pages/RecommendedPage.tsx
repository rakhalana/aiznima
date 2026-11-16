import { useMemo, useState } from 'react';
import { ArrowLeft, Compass, LayoutGrid, Rows3, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePersonalizedTaste } from '@/features/taste/hooks/usePersonalizedTaste';
import type { MediaSummary, MediaType } from '@/shared/api/types';
import { MediaCard } from '@/shared/components/MediaCard';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

type RecommendationFilter = 'ALL' | 'HIDDEN_GEMS' | 'IN_PLANNING';

const FILTER_OPTIONS: Array<{ id: RecommendationFilter; label: string }> = [
  { id: 'ALL', label: 'All Matches' },
  { id: 'HIDDEN_GEMS', label: 'Hidden Gems' },
  { id: 'IN_PLANNING', label: 'In Planning' },
];

export function RecommendedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeType = usePrefsStore((state) => state.activeMediaType);
  const setActiveMediaType = usePrefsStore((state) => state.setActiveMediaType);
  const viewMode = usePrefsStore((state) => state.listViewMode);
  const setViewMode = usePrefsStore((state) => state.setListViewMode);
  const preferredLanguage = usePreferredTitleLanguage();

  const rawType = searchParams.get('type');
  const mediaType: MediaType =
    rawType === 'MANGA' || rawType === 'ANIME' ? rawType : storeType;
  useDocumentTitle('Recommended For You');

  const [filter, setFilter] = useState<RecommendationFilter>('ALL');

  const {
    profile,
    recommendations,
    isLoadingStats,
    isLoadingRecommendations,
    isErrorStats,
    isErrorRecommendations,
    refetchAll,
  } = usePersonalizedTaste(mediaType, { includeRecommendations: true });

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'HIDDEN_GEMS':
        return recommendations.filter((item) => item.isHiddenGem);
      case 'IN_PLANNING':
        return recommendations.filter((item) => item.inPlanning);
      case 'ALL':
      default:
        return recommendations;
    }
  }, [recommendations, filter]);

  const handleSelectType = (nextType: MediaType) => {
    setActiveMediaType(nextType);
    setSearchParams({ type: nextType }, { replace: true });
    setFilter('ALL');
  };

  const handleSelectMedia = (media: MediaSummary) => {
    navigate(`/media/${media.id}`);
  };

  const isLoading = isLoadingStats || isLoadingRecommendations;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Discover
        </button>

        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Recommended media type"
            className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
          >
            {(['ANIME', 'MANGA'] as const).map((type) => {
              const active = mediaType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectType(type)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-crisp ${active
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  {type === 'ANIME' ? 'Anime' : 'Manga'}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            aria-label={viewMode === 'grid' ? 'Switch to row view' : 'Switch to grid view'}
            aria-pressed={viewMode === 'list'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-token-xs transition-crisp hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            {viewMode === 'grid' ? (
              <Rows3 className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      <header className="space-y-1.5">
        <div className="flex items-center gap-2">

          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] md:text-2xl">
            Recommended For You
          </h1>
        </div>
        {profile?.isReady ? (
          <p className="text-xs text-[var(--text-secondary)] md:text-sm">
            {[
              'Matched from your Taste DNA',
              profile.favoriteEra || profile.topSource
                ? [
                    profile.topGenres.slice(0, 3).join(', '),
                    profile.favoriteEra ? `Era ${profile.favoriteEra.label}` : null,
                    profile.topSource ? profile.topSource.label : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : null,
            ]
              .filter(Boolean)
              .join(': ')}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-crisp ${active
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {isLoading && recommendations.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <MediaCardSkeleton key={idx} />
          ))}
        </div>
      ) : (isErrorStats || isErrorRecommendations) && recommendations.length === 0 ? (
        <ErrorState
          message="Unable to calculate personalized recommendations right now."
          onRetry={() => void refetchAll()}
        />
      ) : !profile?.isReady ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" strokeWidth={1.75} />}
          title="Not enough taste data yet"
          description="Log in with AniList and track at least 3 titles to unlock personalized recommendations."
          actionLabel="Back to Discover"
          onAction={() => navigate('/')}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" strokeWidth={1.75} />}
          title="No matches for this filter"
          description="Try switching back to All Matches or explore another media type."
          actionLabel="Show All Matches"
          onAction={() => setFilter('ALL')}
        />
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
          {filteredItems.map((item) => (
            <MediaCard
              key={item.media.id}
              media={item.media}
              layout="list"
              preferredLanguage={preferredLanguage}
              subtitleHint={item.subtitleHint}
              statusLabelOverride={item.inPlanning ? 'In Planning' : null}
              onSelect={handleSelectMedia}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
          {filteredItems.map((item) => (
            <MediaCard
              key={item.media.id}
              media={item.media}
              preferredLanguage={preferredLanguage}
              subtitleHint={item.subtitleHint}
              statusLabelOverride={item.inPlanning ? 'In Planning' : null}
              onSelect={handleSelectMedia}
            />
          ))}
        </div>
      )}
    </div>
  );
}
