import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useStudioDetailQuery,
  useStudioMediaQuery,
} from '@/features/studio/api/studioQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaSort } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { DetailTopBar } from '@/shared/components/DetailTopBar';
import { EntityDetailHero } from '@/shared/components/EntityDetailHero';
import { MediaCard } from '@/shared/components/MediaCard';
import { DetailSkeleton, MediaCardSkeleton } from '@/shared/components/Skeleton';
import { SelectDropdown } from '@/shared/components/SelectDropdown';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';

const STUDIO_SORT_OPTIONS: Array<{ value: MediaSort; label: string }> = [
  { value: 'POPULARITY_DESC', label: 'Most Popular' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'SCORE_DESC', label: 'Top Rated' },
  { value: 'FAVOURITES_DESC', label: 'Most Favourited' },
];

export function StudioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const studioId = Number(id);

  const [mainOnly, setMainOnly] = useState(false);
  const [sort, setSort] = useState<MediaSort>('POPULARITY_DESC');

  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const detailQuery = useStudioDetailQuery(studioId);
  const mediaQuery = useStudioMediaQuery(studioId, sort, mainOnly);

  if (!Number.isFinite(studioId) || studioId <= 0) {
    return (
      <EmptyState
        title="Invalid studio ID"
        description="The requested studio link does not contain a valid ID."
        actionLabel="Browse Studios"
        onAction={() => navigate('/search?type=STUDIO')}
      />
    );
  }

  if (detailQuery.isLoading) {
    return <DetailSkeleton />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    const isNetwork =
      detailQuery.error instanceof NetworkError || detailQuery.error instanceof TypeError;
    return (
      <ErrorState
        isOffline={isNetwork}
        title={isNetwork ? 'Network error' : 'Studio not found'}
        message={
          isNetwork
            ? 'Could not reach AniList. Check your connection and retry.'
            : 'This studio could not be loaded from AniList.'
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const studio = detailQuery.data;
  const totalCount = mediaQuery.data?.pages[0]?.Studio?.media.pageInfo.total;
  const allEdges =
    mediaQuery.data?.pages.flatMap((page) => page.Studio?.media.edges ?? []) ?? [];
  const visibleEdges = allEdges.filter((edge) => edge.node && (allowAdult || !edge.node.isAdult));

  const shareUrl = studio.siteUrl ?? `https://anilist.co/studio/${studio.id}`;

  return (
    <div className="flex flex-col">
      <DetailTopBar onBack={() => navigate(-1)} shareUrl={shareUrl} />

      <div className="space-y-5 md:space-y-6">
        <EntityDetailHero
          title={studio.name}
          favourites={studio.favourites}
          siteUrl={studio.siteUrl}
          favoriteTarget={{
            kind: 'STUDIO',
            id: studio.id,
            returnTo: `/studio/${studio.id}`,
            isFavourite: Boolean(studio.isFavourite),
          }}
          badges={
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent-ink)]">
              <Building2 className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
              {studio.isAnimationStudio ? 'Animation Studio' : 'Producer'}
            </span>
          }
          metaItems={
            typeof totalCount === 'number'
              ? [{ label: 'Listed Titles', value: String(totalCount) }]
              : []
          }
        />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Works & Productions
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter studio productions"
              className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
            >
              <button
                type="button"
                aria-pressed={!mainOnly}
                onClick={() => setMainOnly(false)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-crisp ${
                  !mainOnly
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={mainOnly}
                onClick={() => setMainOnly(true)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-crisp ${
                  mainOnly
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Main Studio
              </button>
            </div>

            <SelectDropdown
              ariaLabel="Sort studio works"
              size="sm"
              surface="surface"
              value={sort}
              options={STUDIO_SORT_OPTIONS}
              onChange={(nextSort) => setSort(nextSort)}
              className="min-w-[144px]"
            />
          </div>
        </div>

        {mediaQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <MediaCardSkeleton key={idx} />
            ))}
          </div>
        ) : mediaQuery.isError ? (
          <ErrorState
            isOffline={mediaQuery.error instanceof NetworkError}
            title="Could not load studio works"
            message="Something went wrong while fetching this studio's credits."
            onRetry={() => void mediaQuery.refetch()}
          />
        ) : visibleEdges.length === 0 ? (
          <EmptyState
            title="No productions found"
            description="No works matched the current studio filter."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
              {visibleEdges.map((edge) => (
                <div key={edge.id} className="space-y-1">
                  {edge.isMainStudio ? (
                    <span className="inline-block rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                      Main Studio
                    </span>
                  ) : (
                    <span className="inline-block rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Credit
                    </span>
                  )}
                  <MediaCard
                    media={edge.node}
                    preferredLanguage={preferredLanguage}
                    onSelect={(media) => navigate(`/media/${media.id}`)}
                  />
                </div>
              ))}
            </div>

            {mediaQuery.hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={mediaQuery.isFetchingNextPage}
                  onClick={() => void mediaQuery.fetchNextPage()}
                >
                  Load More
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
      </div>
    </div>
  );
}
