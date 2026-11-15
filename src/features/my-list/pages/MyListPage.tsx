import { useMemo, useState } from 'react';
import { Bookmark, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/app/layouts/AuthGuard';
import {
  useMyListQuery,
  useUpdateProgressMutation,
} from '@/features/my-list/api/myListQueries';
import { ListEditorModal } from '@/features/my-list/components/ListEditorModal';
import { ListEntryCard } from '@/features/my-list/components/ListEntryCard';
import {
  buildListTabs,
  filterListEntries,
  sortListEntries,
  type ListSortOption,
} from '@/features/my-list/utils/collectionHelpers';
import { NetworkError } from '@/shared/api/graphqlClient';
import type {
  MediaFormat,
  MediaListEntry,
  MediaType,
  ScoreFormat,
} from '@/shared/api/types';
import { SelectDropdown, type SelectOption } from '@/shared/components/SelectDropdown';
import { MediaRowSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { ViewModeToggle } from '@/shared/components/ViewModeToggle';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';
import { formatMediaFormat, formatMediaTitle } from '@/shared/utils/formatters';

const LIST_SORT_OPTIONS: Array<SelectOption<ListSortOption>> = [
  { value: 'UPDATED_DESC', label: 'Recently Updated' },
  { value: 'SCORE_DESC', label: 'Highest Score' },
  { value: 'PROGRESS_DESC', label: 'Progress %' },
  { value: 'TITLE_ASC', label: 'Title A–Z' },
];

const ANIME_FORMATS: MediaFormat[] = [
  'TV',
  'TV_SHORT',
  'MOVIE',
  'SPECIAL',
  'OVA',
  'ONA',
  'MUSIC',
];
const MANGA_FORMATS: MediaFormat[] = ['MANGA', 'NOVEL', 'ONE_SHOT'];

function MyListContent() {
  const navigate = useNavigate();
  const viewer = useAuthStore((state) => state.viewer);
  const initialType = usePrefsStore((state) => state.activeMediaType);
  const listViewMode = usePrefsStore((state) => state.listViewMode);
  const setListViewMode = usePrefsStore((state) => state.setListViewMode);
  const addToast = useToastStore((state) => state.addToast);
  const preferredLanguage = usePreferredTitleLanguage();

  const [mediaType, setMediaType] = useState<MediaType>(initialType);
  const [selectedTab, setSelectedTab] = useState<string>('CURRENT');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<ListSortOption>('UPDATED_DESC');
  const [formatFilter, setFormatFilter] = useState<MediaFormat | ''>('');
  const [editingEntry, setEditingEntry] = useState<MediaListEntry | null>(null);

  const { data, isLoading, isError, error, refetch } = useMyListQuery(
    viewer?.id,
    mediaType,
  );
  const updateProgress = useUpdateProgressMutation(viewer?.id, mediaType);

  const tabs = useMemo(
    () => buildListTabs(data, mediaType, true),
    [data, mediaType],
  );

  const activeTabGroup =
    tabs.find((tab) => tab.key === selectedTab) ?? tabs[0]!;

  const formatOptions = useMemo<Array<SelectOption<MediaFormat | ''>>>(
    () => [
      { value: '', label: 'All Formats' },
      ...(mediaType === 'ANIME' ? ANIME_FORMATS : MANGA_FORMATS).map((format) => ({
        value: format,
        label: formatMediaFormat(format),
      })),
    ],
    [mediaType],
  );

  const hasActiveFilters =
    filterQuery.trim().length > 0 || formatFilter !== '';

  const visibleEntries = useMemo(() => {
    const filtered = filterListEntries(activeTabGroup?.entries ?? [], {
      query: filterQuery,
      format: formatFilter,
    });
    return sortListEntries(filtered, sortBy, preferredLanguage);
  }, [
    activeTabGroup,
    filterQuery,
    formatFilter,
    sortBy,
    preferredLanguage,
  ]);

  const scoreFormat: ScoreFormat = viewer?.mediaListOptions?.scoreFormat ?? 'POINT_100';

  const handleQuickIncrement = (entry: MediaListEntry) => {
    const prevProgress = entry.progress ?? 0;
    const maxCount =
      entry.media.type === 'MANGA' ? entry.media.chapters : entry.media.episodes;
    const nextProgress = maxCount
      ? Math.min(maxCount, prevProgress + 1)
      : prevProgress + 1;

    if (nextProgress === prevProgress) {
      return;
    }

    const title = formatMediaTitle(entry.media.title, preferredLanguage);
    updateProgress.mutate(
      {
        entryId: entry.id,
        mediaId: entry.mediaId,
        progress: nextProgress,
      },
      {
        onSuccess() {
          addToast({
            variant: 'success',
            message: `${title} · ${nextProgress} ${mediaType === 'MANGA' ? 'ch' : 'ep'}`,
            durationMs: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                updateProgress.mutate({
                  entryId: entry.id,
                  mediaId: entry.mediaId,
                  progress: prevProgress,
                });
              },
            },
          });
        },
      },
    );
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">My List</h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] md:text-sm">
            Track episode & chapter progress synced with your AniList account.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="List media type"
          className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
        >
          {(['ANIME', 'MANGA'] as const).map((type) => (
            <button
              key={type}
              role="tab"
              type="button"
              aria-selected={mediaType === type}
              onClick={() => {
                setMediaType(type);
                setSelectedTab('CURRENT');
                setFormatFilter('');
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${
                mediaType === type
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {type === 'ANIME' ? 'Anime' : 'Manga'}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-3 md:rounded-2xl md:border md:border-[var(--border-hairline)] md:bg-[var(--bg-surface)]/85 md:p-3.5 md:shadow-token-xs">
        <div
          role="tablist"
          aria-label="List status filter"
          className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
        >
          {tabs.map((tab) => {
            const active = activeTabGroup?.key === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSelectedTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-crisp ${
                  active
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="tabular-nums rounded-md bg-[var(--bg-canvas)]/80 px-1.5 py-0.5 text-[10px] font-bold">
                  {tab.entries.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2.5 md:border-t md:border-[var(--border-hairline)] md:pt-3 lg:flex-nowrap lg:justify-between">
          <div className="relative w-full md:min-w-[200px] md:flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter your list..."
              aria-label="Filter your list"
              className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>

          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto lg:shrink-0">
            <SelectDropdown
              ariaLabel="Sort list entries"
              size="sm"
              surface="surface"
              value={sortBy}
              options={LIST_SORT_OPTIONS}
              onChange={(nextSort) => setSortBy(nextSort)}
              className="min-w-0 flex-1 md:min-w-[156px] md:flex-none"
            />

            <SelectDropdown
              ariaLabel="Filter by format"
              size="sm"
              surface="surface"
              value={formatFilter}
              options={formatOptions}
              onChange={(nextFormat) => setFormatFilter(nextFormat)}
              className="min-w-0 flex-1 md:min-w-[132px] md:flex-none"
            />

            <ViewModeToggle
              mode={listViewMode}
              onToggle={() =>
                void setListViewMode(listViewMode === 'grid' ? 'list' : 'grid')
              }
              size="sm"
              className="shrink-0"
            />
          </div>
        </div>
      </div>

      {(!viewer?.id || isLoading) && !data ? (
        <div
          className={
            listViewMode === 'list'
              ? 'grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3.5'
              : 'grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:gap-3.5 lg:grid-cols-3'
          }
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <MediaRowSkeleton key={idx} layout={listViewMode} />
          ))}
        </div>
      ) : null}

      {isError && !data ? (
        <ErrorState
          isOffline={error instanceof NetworkError}
          message={error instanceof Error ? error.message : 'Unable to load your list.'}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && data && visibleEntries.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" strokeWidth={1.75} />}
          title={hasActiveFilters ? 'No matching entries' : 'Your list is empty'}
          description={
            hasActiveFilters
              ? 'No entries in this tab match your current filters.'
              : 'Explore trending titles on Discover to add your first entry.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Browse Discover'}
          onAction={
            hasActiveFilters
              ? () => {
                  setFilterQuery('');
                  setFormatFilter('');
                }
              : () => navigate('/')
          }
        />
      ) : null}

      {visibleEntries.length > 0 ? (
        <div
          className={
            listViewMode === 'list'
              ? 'grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3.5'
              : 'grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:gap-3.5 lg:grid-cols-3'
          }
        >
          {visibleEntries.map((entry) => (
            <ListEntryCard
              key={entry.id}
              entry={entry}
              layout={listViewMode}
              preferredLanguage={preferredLanguage}
              scoreFormat={scoreFormat}
              onSelectMedia={(id) => navigate(`/media/${id}`)}
              onEdit={setEditingEntry}
              onIncrementProgress={handleQuickIncrement}
            />
          ))}
        </div>
      ) : null}

      {editingEntry ? (
        <ListEditorModal
          open={Boolean(editingEntry)}
          onClose={() => setEditingEntry(null)}
          media={editingEntry.media}
          entry={editingEntry}
        />
      ) : null}
    </section>
  );
}

export function MyListPage() {
  return (
    <AuthGuard
      title="Track your Anime & Manga"
      description="Log in with AniList to view and update your personal watchlist, episode progress, and scores."
    >
      <MyListContent />
    </AuthGuard>
  );
}
