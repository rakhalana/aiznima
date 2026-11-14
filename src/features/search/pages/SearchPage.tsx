import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useSearchMediaQuery,
  type SearchFilters,
} from '@/features/search/api/searchQueries';
import { FilterSheet } from '@/features/search/components/FilterSheet';
import { NetworkError } from '@/shared/api/graphqlClient';
import type {
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaStatus,
  MediaType,
} from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { MediaCard } from '@/shared/components/MediaCard';
import { MediaCardSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';

function parseFiltersFromParams(params: URLSearchParams): SearchFilters {
  const rawType = params.get('type');
  const rawYear = Number.parseInt(params.get('year') ?? '', 10);
  const rawGenres = params.get('genre');
  const rawTags = params.get('tag');

  return {
    search: params.get('q') ?? '',
    type: rawType === 'MANGA' ? 'MANGA' : 'ANIME',
    format: (params.get('format') as MediaFormat) || undefined,
    status: (params.get('status') as MediaStatus) || undefined,
    season: (params.get('season') as MediaSeason) || undefined,
    year: !Number.isNaN(rawYear) && rawYear > 0 ? rawYear : undefined,
    genres: rawGenres ? rawGenres.split(',').filter(Boolean) : [],
    tags: rawTags ? rawTags.split(',').filter(Boolean) : [],
    sort: (params.get('sort') as MediaSort) || 'TRENDING_DESC',
  };
}

function serializeFilters(filters: SearchFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.search.trim()) next.set('q', filters.search.trim());
  if (filters.type !== 'ANIME') next.set('type', filters.type);
  if (filters.format) next.set('format', filters.format);
  if (filters.status) next.set('status', filters.status);
  if (filters.season && filters.type === 'ANIME') next.set('season', filters.season);
  if (filters.year) next.set('year', String(filters.year));
  if (filters.genres.length > 0) next.set('genre', filters.genres.join(','));
  if (filters.tags.length > 0) next.set('tag', filters.tags.join(','));
  if (filters.sort !== 'TRENDING_DESC') next.set('sort', filters.sort);
  return next;
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const urlFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(urlFilters.search);
  const debouncedQuery = useDebounce(searchInput, 450);
  const pendingUserEditRef = useRef(false);

  const { allowAdult, isAdultQueryArg } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  useEffect(() => {
    pendingUserEditRef.current = false;
    setSearchInput(urlFilters.search);
  }, [urlFilters.search]);

  useEffect(() => {
    if (!pendingUserEditRef.current || debouncedQuery !== searchInput) {
      return;
    }
    pendingUserEditRef.current = false;
    if (debouncedQuery.trim() === urlFilters.search.trim()) {
      return;
    }
    setSearchParams(
      serializeFilters({ ...urlFilters, search: debouncedQuery }),
      { replace: true },
    );
  }, [debouncedQuery, searchInput, urlFilters, setSearchParams]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    refetch,
  } = useSearchMediaQuery(urlFilters, isAdultQueryArg);

  const allItems = useMemo(
    () => data?.pages.flatMap((page) => page.Page.media) ?? [],
    [data],
  );

  const activeFilterCount =
    (urlFilters.format ? 1 : 0) +
    (urlFilters.status ? 1 : 0) +
    (urlFilters.season ? 1 : 0) +
    (urlFilters.year ? 1 : 0) +
    urlFilters.genres.length +
    urlFilters.tags.length +
    (urlFilters.sort !== 'TRENDING_DESC' ? 1 : 0);

  const handleResetFilters = () => {
    pendingUserEditRef.current = false;
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleSwitchType = (type: MediaType) => {
    setSearchParams(
      serializeFilters({
        ...urlFilters,
        type,
        format: undefined,
        season: undefined,
      }),
      { replace: true },
    );
  };

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Search</h1>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
              Find Anime and Manga by title, genre, tag, format, or season.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Search media type"
            className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
          >
            {(['ANIME', 'MANGA'] as const).map((type) => (
              <button
                key={type}
                role="tab"
                type="button"
                aria-selected={urlFilters.type === type}
                onClick={() => handleSwitchType(type)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${
                  urlFilters.type === type
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {type === 'ANIME' ? 'Anime' : 'Manga'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={searchInput}
              onChange={(e) => {
                pendingUserEditRef.current = true;
                setSearchInput(e.target.value);
              }}
              placeholder={`Search ${urlFilters.type.toLowerCase()} titles... (press /)`}
              aria-label="Search titles"
              className="min-h-11 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] pl-10 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-token-xs focus:border-[var(--accent-primary)] focus:outline-none"
            />
            {searchInput ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  pendingUserEditRef.current = false;
                  setSearchInput('');
                  setSearchParams(
                    serializeFilters({ ...urlFilters, search: '' }),
                    { replace: true },
                  );
                }}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>

          <Button
            variant="secondary"
            onClick={() => setFilterOpen(true)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />}
          >
            <span>Filters</span>
            {activeFilterCount > 0 ? (
              <span className="tabular-nums rounded-full bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </header>

      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, idx) => (
            <MediaCardSkeleton key={idx} />
          ))}
        </div>
      ) : null}

      {isError && !data ? (
        <ErrorState
          isOffline={error instanceof NetworkError}
          message={error instanceof Error ? error.message : 'Unable to fetch search results.'}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && data && allItems.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" strokeWidth={1.75} />}
          title="No results found"
          description="No titles match your current query or filters. Try adjusting or resetting them."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : null}

      {allItems.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
            {allItems.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                preferredLanguage={preferredLanguage}
                onSelect={(media) => navigate(`/media/${media.id}`)}
              />
            ))}
          </div>

          {hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                isLoading={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                Load More
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={{ ...urlFilters, search: searchInput }}
        allowAdult={allowAdult}
        onApply={(next) => {
          pendingUserEditRef.current = false;
          setSearchParams(serializeFilters(next), { replace: true });
        }}
        onReset={handleResetFilters}
      />
    </div>
  );
}
