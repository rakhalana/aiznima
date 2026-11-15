import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, SlidersHorizontal, Users, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createDefaultSearchFilters,
  useSearchCharactersQuery,
  useSearchMediaQuery,
  useSearchStaffQuery,
  useSearchStudiosQuery,
  useSearchUsersQuery,
  type SearchFilters,
} from '@/features/search/api/searchQueries';
import { CharacterCard } from '@/features/search/components/CharacterCard';
import { FilterSheet } from '@/features/search/components/FilterSheet';
import { StaffCard } from '@/features/search/components/StaffCard';
import { StudioCard } from '@/features/search/components/StudioCard';
import { UserCard } from '@/features/search/components/UserCard';
import { getSearchCardHint } from '@/features/search/utils/searchHelpers';
import { NetworkError } from '@/shared/api/graphqlClient';
import type {
  CharacterSort,
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaStatus,
  SearchEntityType,
  StaffSort,
  StudioSort,
  UserSort,
} from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { MediaCard } from '@/shared/components/MediaCard';
import { MediaCardSkeleton, MediaRowSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { ViewModeToggle } from '@/shared/components/ViewModeToggle';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';

const SEARCH_TABS: Array<{
  type: SearchEntityType;
  label: string;
  placeholder: string;
}> = [
    { type: 'ANIME', label: 'Anime', placeholder: 'Search anime titles... ' },
    { type: 'MANGA', label: 'Manga', placeholder: 'Search manga titles... ' },
    { type: 'CHARACTER', label: 'Character', placeholder: 'Search characters... ' },
    { type: 'STAFF', label: 'Staff', placeholder: 'Search staff & voice actors... ' },
    { type: 'STUDIO', label: 'Studios', placeholder: 'Search animation studios... ' },
    { type: 'USER', label: 'Users', placeholder: 'Search AniList usernames... ' },
  ];

const VALID_ENTITY_TYPES = new Set<SearchEntityType>([
  'ANIME',
  'MANGA',
  'CHARACTER',
  'STAFF',
  'STUDIO',
  'USER',
]);

function parseEntityType(raw: string | null): SearchEntityType {
  const normalized = raw?.toUpperCase();
  if (normalized === 'STUDIOS') return 'STUDIO';
  if (normalized === 'USERS') return 'USER';
  if (normalized === 'CHARACTERS') return 'CHARACTER';
  if (normalized && VALID_ENTITY_TYPES.has(normalized as SearchEntityType)) {
    return normalized as SearchEntityType;
  }
  return 'ANIME';
}

function parseFiltersFromParams(params: URLSearchParams): SearchFilters {
  const type = parseEntityType(params.get('type'));
  const base = createDefaultSearchFilters(type, params.get('q') ?? '');
  const rawSort = params.get('sort');

  if (type === 'ANIME' || type === 'MANGA') {
    const rawYear = Number.parseInt(params.get('year') ?? '', 10);
    const rawGenres = params.get('genre');
    const rawTags = params.get('tag');
    const rawTagCategories = params.get('tagCategory');
    return {
      ...base,
      format: (params.get('format') as MediaFormat) || undefined,
      status: (params.get('status') as MediaStatus) || undefined,
      season: type === 'ANIME' ? (params.get('season') as MediaSeason) || undefined : undefined,
      year: !Number.isNaN(rawYear) && rawYear > 0 ? rawYear : undefined,
      genres: rawGenres ? rawGenres.split(',').filter(Boolean) : [],
      tags: rawTags ? rawTags.split(',').filter(Boolean) : [],
      tagCategories: rawTagCategories ? rawTagCategories.split(',').filter(Boolean) : [],
      sort: (rawSort as MediaSort) || 'TRENDING_DESC',
    };
  }

  if (type === 'CHARACTER') {
    return {
      ...base,
      characterSort: (rawSort as CharacterSort) || 'FAVOURITES_DESC',
      isBirthday: params.get('birthday') === '1' ? true : undefined,
    };
  }

  if (type === 'STAFF') {
    return {
      ...base,
      staffSort: (rawSort as StaffSort) || 'FAVOURITES_DESC',
      isBirthday: params.get('birthday') === '1' ? true : undefined,
    };
  }

  if (type === 'STUDIO') {
    return {
      ...base,
      studioSort: (rawSort as StudioSort) || 'FAVOURITES_DESC',
      animationStudioOnly: params.get('animOnly') === '1' ? true : undefined,
    };
  }

  return {
    ...base,
    userSort: (rawSort as UserSort) || 'SEARCH_MATCH',
    isModerator: params.get('mod') === '1' ? true : undefined,
  };
}

function serializeFilters(filters: SearchFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.search.trim()) next.set('q', filters.search.trim());
  if (filters.type !== 'ANIME') next.set('type', filters.type);

  if (filters.type === 'ANIME' || filters.type === 'MANGA') {
    if (filters.format) next.set('format', filters.format);
    if (filters.status) next.set('status', filters.status);
    if (filters.season && filters.type === 'ANIME') next.set('season', filters.season);
    if (filters.year) next.set('year', String(filters.year));
    if (filters.genres.length > 0) next.set('genre', filters.genres.join(','));
    if (filters.tags.length > 0) next.set('tag', filters.tags.join(','));
    if (filters.tagCategories.length > 0) {
      next.set('tagCategory', filters.tagCategories.join(','));
    }
    if (filters.sort !== 'TRENDING_DESC') next.set('sort', filters.sort);
  } else if (filters.type === 'CHARACTER') {
    if (filters.characterSort !== 'FAVOURITES_DESC') next.set('sort', filters.characterSort);
    if (filters.isBirthday) next.set('birthday', '1');
  } else if (filters.type === 'STAFF') {
    if (filters.staffSort !== 'FAVOURITES_DESC') next.set('sort', filters.staffSort);
    if (filters.isBirthday) next.set('birthday', '1');
  } else if (filters.type === 'STUDIO') {
    if (filters.studioSort !== 'FAVOURITES_DESC') next.set('sort', filters.studioSort);
    if (filters.animationStudioOnly) next.set('animOnly', '1');
  } else if (filters.type === 'USER') {
    if (filters.userSort !== 'SEARCH_MATCH') next.set('sort', filters.userSort);
    if (filters.isModerator) next.set('mod', '1');
  }

  return next;
}

function countActiveFilters(filters: SearchFilters): number {
  if (filters.type === 'ANIME' || filters.type === 'MANGA') {
    return (
      (filters.format ? 1 : 0) +
      (filters.status ? 1 : 0) +
      (filters.season && filters.type === 'ANIME' ? 1 : 0) +
      (filters.year ? 1 : 0) +
      filters.genres.length +
      filters.tags.length +
      filters.tagCategories.length +
      (filters.sort !== 'TRENDING_DESC' ? 1 : 0)
    );
  }
  if (filters.type === 'CHARACTER') {
    return (filters.isBirthday ? 1 : 0) + (filters.characterSort !== 'FAVOURITES_DESC' ? 1 : 0);
  }
  if (filters.type === 'STAFF') {
    return (filters.isBirthday ? 1 : 0) + (filters.staffSort !== 'FAVOURITES_DESC' ? 1 : 0);
  }
  if (filters.type === 'STUDIO') {
    return (
      (filters.animationStudioOnly ? 1 : 0) +
      (filters.studioSort !== 'FAVOURITES_DESC' ? 1 : 0)
    );
  }
  return (filters.isModerator ? 1 : 0) + (filters.userSort !== 'SEARCH_MATCH' ? 1 : 0);
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

  const searchViewMode = usePrefsStore((state) => state.searchViewMode);
  const setSearchViewMode = usePrefsStore((state) => state.setSearchViewMode);

  const mediaQuery = useSearchMediaQuery(urlFilters, isAdultQueryArg);
  const charactersQuery = useSearchCharactersQuery(urlFilters);
  const staffQuery = useSearchStaffQuery(urlFilters);
  const studiosQuery = useSearchStudiosQuery(urlFilters);
  const usersQuery = useSearchUsersQuery(urlFilters);

  const activeQuery =
    urlFilters.type === 'CHARACTER'
      ? charactersQuery
      : urlFilters.type === 'STAFF'
        ? staffQuery
        : urlFilters.type === 'STUDIO'
          ? studiosQuery
          : urlFilters.type === 'USER'
            ? usersQuery
            : mediaQuery;

  const mediaItems = useMemo(
    () => mediaQuery.data?.pages.flatMap((page) => page.Page.media) ?? [],
    [mediaQuery.data],
  );
  const characterItems = useMemo(
    () => charactersQuery.data?.pages.flatMap((page) => page.Page.characters) ?? [],
    [charactersQuery.data],
  );
  const staffItems = useMemo(
    () => staffQuery.data?.pages.flatMap((page) => page.Page.staff) ?? [],
    [staffQuery.data],
  );
  const studioItems = useMemo(() => {
    const raw = studiosQuery.data?.pages.flatMap((page) => page.Page.studios) ?? [];
    return urlFilters.animationStudioOnly
      ? raw.filter((studio) => studio.isAnimationStudio)
      : raw;
  }, [studiosQuery.data, urlFilters.animationStudioOnly]);
  const userItems = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.Page.users) ?? [],
    [usersQuery.data],
  );

  const resultCount =
    urlFilters.type === 'CHARACTER'
      ? characterItems.length
      : urlFilters.type === 'STAFF'
        ? staffItems.length
        : urlFilters.type === 'STUDIO'
          ? studioItems.length
          : urlFilters.type === 'USER'
            ? userItems.length
            : mediaItems.length;

  const needsUserSearchPrompt =
    urlFilters.type === 'USER' && !urlFilters.search.trim() && !urlFilters.isModerator;

  const activeFilterCount = countActiveFilters(urlFilters);
  const activeTabMeta = SEARCH_TABS.find((t) => t.type === urlFilters.type) ?? SEARCH_TABS[0]!;

  const handleResetFilters = () => {
    pendingUserEditRef.current = false;
    setSearchInput('');
    setSearchParams(
      serializeFilters(createDefaultSearchFilters(urlFilters.type, '')),
      { replace: true },
    );
  };

  const handleSwitchType = (type: SearchEntityType) => {
    pendingUserEditRef.current = false;
    setSearchParams(
      serializeFilters(createDefaultSearchFilters(type, searchInput)),
      { replace: true },
    );
  };

  const isCompactInfoGrid = urlFilters.type === 'STUDIO' || urlFilters.type === 'USER';
  const resultsGridClass =
    searchViewMode === 'list'
      ? 'grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3'
      : isCompactInfoGrid
        ? 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4'
        : 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6';

  return (
    <div className="space-y-4 md:space-y-5">
      <header className="space-y-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Search</h1>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
              Explore Anime, Manga, Characters, Staff, Studios, and Users.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Search category"
            className="flex w-full items-center gap-0.5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5 sm:gap-1 sm:p-1 lg:inline-flex lg:w-auto"
          >
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.type}
                role="tab"
                type="button"
                aria-selected={urlFilters.type === tab.type}
                onClick={() => handleSwitchType(tab.type)}
                className={`flex-auto whitespace-nowrap rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold transition-crisp sm:px-3 sm:text-xs ${urlFilters.type === tab.type
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] sm:left-3.5"
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
              placeholder={activeTabMeta.placeholder}
              aria-label="Search AniList catalog"
              className="min-h-11 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] pl-9 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-token-xs focus:border-[var(--accent-primary)] focus:outline-none sm:pl-10"
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

          <ViewModeToggle
            mode={searchViewMode}
            onToggle={() =>
              void setSearchViewMode(searchViewMode === 'grid' ? 'list' : 'grid')
            }
            size="md"
          />

          <Button
            variant="secondary"
            onClick={() => setFilterOpen(true)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />}
            className="shrink-0 px-3 sm:px-4"
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

      {needsUserSearchPrompt ? (
        <EmptyState
          icon={<Users className="h-6 w-6" strokeWidth={1.75} />}
          title="Search AniList users"
          description="Type a username above to find public profiles and lists, or open Filters to browse AniList moderators."
        />
      ) : null}

      {!needsUserSearchPrompt && activeQuery.isLoading && !activeQuery.data ? (
        searchViewMode === 'list' ? (
          <div className={resultsGridClass}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <MediaRowSkeleton key={idx} layout="list" />
            ))}
          </div>
        ) : (
          <div className={resultsGridClass}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <MediaCardSkeleton key={idx} />
            ))}
          </div>
        )
      ) : null}

      {!needsUserSearchPrompt && activeQuery.isError && !activeQuery.data ? (
        <ErrorState
          isOffline={activeQuery.error instanceof NetworkError}
          message={
            activeQuery.error instanceof Error
              ? activeQuery.error.message
              : 'Unable to fetch search results.'
          }
          onRetry={() => void activeQuery.refetch()}
        />
      ) : null}

      {!needsUserSearchPrompt &&
        !activeQuery.isLoading &&
        activeQuery.data &&
        resultCount === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" strokeWidth={1.75} />}
          title="No results found"
          description="No entries match your current query or filters. Try adjusting or resetting them."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : null}

      {!needsUserSearchPrompt && resultCount > 0 ? (
        <>
          {urlFilters.type === 'ANIME' || urlFilters.type === 'MANGA' ? (
            <div className={resultsGridClass}>
              {mediaItems.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  preferredLanguage={preferredLanguage}
                  subtitleHint={getSearchCardHint(
                    item,
                    urlFilters.search,
                    preferredLanguage,
                    item.matchedCharacterName,
                  )}
                  layout={searchViewMode}
                  onSelect={(media) => navigate(`/media/${media.id}`)}
                />
              ))}
            </div>
          ) : null}

          {urlFilters.type === 'CHARACTER' ? (
            <div className={resultsGridClass}>
              {characterItems.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  preferredLanguage={preferredLanguage}
                  allowAdult={allowAdult}
                  layout={searchViewMode}
                  onSelect={(c) => navigate(`/character/${c.id}`)}
                />
              ))}
            </div>
          ) : null}

          {urlFilters.type === 'STAFF' ? (
            <div className={resultsGridClass}>
              {staffItems.map((member) => (
                <StaffCard
                  key={member.id}
                  staff={member}
                  layout={searchViewMode}
                  onSelect={(s) => navigate(`/staff/${s.id}`)}
                />
              ))}
            </div>
          ) : null}

          {urlFilters.type === 'STUDIO' ? (
            <div className={resultsGridClass}>
              {studioItems.map((studio) => (
                <StudioCard
                  key={studio.id}
                  studio={studio}
                  layout={searchViewMode}
                  onSelect={(st) => navigate(`/studio/${st.id}`)}
                />
              ))}
            </div>
          ) : null}

          {urlFilters.type === 'USER' ? (
            <div className={resultsGridClass}>
              {userItems.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  layout={searchViewMode}
                  onSelect={(u) => navigate(`/user/${encodeURIComponent(u.name)}`)}
                />
              ))}
            </div>
          ) : null}

          {activeQuery.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                isLoading={activeQuery.isFetchingNextPage}
                onClick={() => void activeQuery.fetchNextPage()}
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
