import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Film } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  flattenSeasonalMedia,
  useSeasonalAnimeInfiniteQuery,
} from '@/features/discover/api/discoverQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import type {
  MediaFormat,
  MediaSort,
  MediaSummary,
  UserTitleLanguage,
} from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { MediaCard } from '@/shared/components/MediaCard';
import { SelectDropdown, type SelectOption } from '@/shared/components/SelectDropdown';
import { MediaCardSkeleton, MediaRowSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { ViewModeToggle } from '@/shared/components/ViewModeToggle';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import type { ViewMode } from '@/shared/stores/usePrefsStore';
import {
  buildSequentialSeasons,
  formatSeasonLabel,
  getCurrentAndNextSeason,
  parseSeasonFromParams,
  type SeasonPeriod,
} from '@/shared/utils/formatters';

export type SeasonalSortField =
  | 'POPULARITY'
  | 'SCORE'
  | 'TRENDING'
  | 'START_DATE'
  | 'FAVOURITES'
  | 'TITLE';

export type SeasonalSortOrder = 'DESC' | 'ASC';

const SORT_FIELD_OPTIONS: ReadonlyArray<SelectOption<SeasonalSortField>> = [
  { value: 'POPULARITY', label: 'Popularity' },
  { value: 'SCORE', label: 'Score' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'START_DATE', label: 'Release Date' },
  { value: 'FAVOURITES', label: 'Favourites' },
  { value: 'TITLE', label: 'Title' },
];

const SORT_ORDER_OPTIONS: ReadonlyArray<SelectOption<SeasonalSortOrder>> = [
  { value: 'DESC', label: 'Descending' },
  { value: 'ASC', label: 'Ascending' },
];

const FORMAT_OPTIONS: Array<{ value: MediaFormat | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'TV', label: 'TV' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'ONA', label: 'ONA' },
  { value: 'OVA', label: 'OVA' },
  { value: 'SPECIAL', label: 'Special' },
];

const SORT_PAIR_MAP: Record<
  Exclude<SeasonalSortField, 'TITLE'>,
  { DESC: MediaSort; ASC: MediaSort }
> = {
  POPULARITY: { DESC: 'POPULARITY_DESC', ASC: 'POPULARITY' },
  SCORE: { DESC: 'SCORE_DESC', ASC: 'SCORE' },
  TRENDING: { DESC: 'TRENDING_DESC', ASC: 'TRENDING' },
  START_DATE: { DESC: 'START_DATE_DESC', ASC: 'START_DATE' },
  FAVOURITES: { DESC: 'FAVOURITES_DESC', ASC: 'FAVOURITES' },
};

export function resolveSeasonalMediaSort(
  field: SeasonalSortField,
  order: SeasonalSortOrder,
  preferredLanguage: UserTitleLanguage = 'ROMAJI',
): MediaSort {
  if (field === 'TITLE') {
    const normalized = preferredLanguage.toUpperCase();
    if (normalized.startsWith('ENGLISH')) {
      return order === 'ASC' ? 'TITLE_ENGLISH' : 'TITLE_ENGLISH_DESC';
    }
    if (normalized.startsWith('NATIVE')) {
      return order === 'ASC' ? 'TITLE_NATIVE' : 'TITLE_NATIVE_DESC';
    }
    return order === 'ASC' ? 'TITLE_ROMAJI' : 'TITLE_ROMAJI_DESC';
  }

  return SORT_PAIR_MAP[field][order];
}

function isSameSeason(a: SeasonPeriod, b: SeasonPeriod): boolean {
  return a.season === b.season && a.year === b.year;
}

export function SeasonalPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdultQueryArg } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const seasons = useMemo(() => buildSequentialSeasons(5), []);
  const { current } = useMemo(() => getCurrentAndNextSeason(), []);

  const activeSeason = useMemo(
    () =>
      parseSeasonFromParams(
        searchParams.get('season'),
        searchParams.get('year'),
        seasons,
        current,
      ),
    [searchParams, seasons, current],
  );

  const [selectedFormat, setSelectedFormat] = useState<MediaFormat | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SeasonalSortField>('POPULARITY');
  const [sortOrder, setSortOrder] = useState<SeasonalSortOrder>('DESC');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = activeTabRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeSeason.season, activeSeason.year]);

  const resolvedSort = useMemo(
    () => resolveSeasonalMediaSort(sortField, sortOrder, preferredLanguage),
    [sortField, sortOrder, preferredLanguage],
  );

  const query = useSeasonalAnimeInfiniteQuery({
    season: activeSeason.season,
    seasonYear: activeSeason.year,
    format: selectedFormat === 'ALL' ? undefined : selectedFormat,
    sort: resolvedSort,
    isAdultQueryArg,
  });

  const items = useMemo(
    () => flattenSeasonalMedia(query.data?.pages),
    [query.data?.pages],
  );

  const totalCount = query.data?.pages[0]?.pageInfo.total ?? null;
  const activeSeasonLabel = formatSeasonLabel(activeSeason.season, activeSeason.year);
  useDocumentTitle(`${activeSeasonLabel} Anime`);

  const handleSelectSeason = (period: SeasonPeriod) => {
    setSearchParams(
      { season: period.season, year: String(period.year) },
      { replace: true },
    );
  };

  const handleSelectMedia = (media: MediaSummary) => {
    navigate(`/media/${media.id}`);
  };

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

        <ViewModeToggle
          mode={viewMode}
          size="sm"
          onToggle={() => setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))}
        />
      </div>

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] md:text-2xl">
            Seasonal Anime
          </h1>
        </div>
        <p className="text-xs text-[var(--text-secondary)] md:text-sm tabular-nums">
          {activeSeasonLabel}
          {typeof totalCount === 'number' && totalCount > 0 ? ` ` : ''}
        </p>
      </header>

      {/* Scrolled sequential seasonal tabs (1 season ahead + last 5 years) */}
      <div
        role="tablist"
        aria-label="Browse anime seasons"
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {seasons.map((period) => {
          const active = isSameSeason(period, activeSeason);
          const label = formatSeasonLabel(period.season, period.year);

          return (
            <button
              key={`${period.season}-${period.year}`}
              ref={active ? activeTabRef : undefined}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectSeason(period)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${active
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Format pills + Sort By + Order By */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3.5 md:rounded-2xl md:border md:border-[var(--border-hairline)] md:bg-[var(--bg-surface)]/85 md:p-3 md:shadow-token-xs lg:flex-nowrap">
        <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible md:pb-0">
          {FORMAT_OPTIONS.map((opt) => {
            const active = selectedFormat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedFormat(opt.value)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-crisp ${active
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="grid w-full grid-cols-2 gap-2.5 md:flex md:w-auto md:shrink-0 md:items-center md:gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">Sort</span>
            <SelectDropdown
              ariaLabel="Sort seasonal anime by"
              size="sm"
              surface="surface"
              value={sortField}
              options={SORT_FIELD_OPTIONS}
              onChange={(nextField) => setSortField(nextField)}
              className="min-w-0 flex-1 md:w-44 md:flex-none"
            />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">Order</span>
            <SelectDropdown
              ariaLabel="Order seasonal anime"
              size="sm"
              surface="surface"
              value={sortOrder}
              options={SORT_ORDER_OPTIONS}
              onChange={(nextOrder) => setSortOrder(nextOrder)}
              className="min-w-0 flex-1 md:w-36 md:flex-none"
            />
          </div>
        </div>
      </div>

      {query.isLoading && items.length === 0 ? (
        viewMode === 'list' ? (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <MediaRowSkeleton key={idx} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
            {Array.from({ length: 10 }).map((_, idx) => (
              <MediaCardSkeleton key={idx} />
            ))}
          </div>
        )
      ) : query.isError && items.length === 0 ? (
        <ErrorState
          isOffline={query.error instanceof NetworkError}
          message={
            query.error instanceof Error
              ? query.error.message
              : `Unable to load ${activeSeasonLabel} anime.`
          }
          onRetry={() => void query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Film className="h-6 w-6" strokeWidth={1.75} />}
          title={`No anime listed for ${activeSeasonLabel}`}
          description={
            selectedFormat !== 'ALL'
              ? 'Try switching Format back to All or choosing another season.'
              : 'Check another season tab above.'
          }
          actionLabel={selectedFormat !== 'ALL' ? 'Show All Formats' : undefined}
          onAction={
            selectedFormat !== 'ALL' ? () => setSelectedFormat('ALL') : undefined
          }
        />
      ) : (
        <>
          {query.isError ? (
            <ErrorState
              showingCached
              isOffline={query.error instanceof NetworkError}
              message={
                query.error instanceof Error
                  ? query.error.message
                  : 'Unable to load more seasonal anime.'
              }
              onRetry={() => void query.refetch()}
            />
          ) : null}

          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
              {items.map((media) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  layout="list"
                  preferredLanguage={preferredLanguage}
                  onSelect={handleSelectMedia}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
              {items.map((media) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  layout="grid"
                  preferredLanguage={preferredLanguage}
                  onSelect={handleSelectMedia}
                />
              ))}
            </div>
          )}

          {query.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                isLoading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Load More Anime
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
