import { useEffect, useState } from 'react';
import {
  useSearchMetadataQuery,
  type SearchFilters,
} from '@/features/search/api/searchQueries';
import type {
  CharacterSort,
  MediaFormat,
  MediaSeason,
  MediaSort,
  MediaStatus,
  StaffSort,
  StudioSort,
  UserSort,
} from '@/shared/api/types';
import { BottomSheetOrModal } from '@/shared/components/BottomSheetOrModal';
import { Button } from '@/shared/components/Button';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  allowAdult: boolean;
  onApply: (next: SearchFilters) => void;
  onReset: () => void;
}

const ANIME_FORMATS: MediaFormat[] = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'TV_SHORT'];
const MANGA_FORMATS: MediaFormat[] = ['MANGA', 'NOVEL', 'ONE_SHOT'];
const STATUSES: MediaStatus[] = ['RELEASING', 'FINISHED', 'NOT_YET_RELEASED', 'HIATUS', 'CANCELLED'];
const SEASONS: MediaSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const MEDIA_SORTS: Array<{ value: MediaSort; label: string }> = [
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'POPULARITY_DESC', label: 'Most Popular' },
  { value: 'SCORE_DESC', label: 'Highest Score' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'FAVOURITES_DESC', label: 'Most Favourited' },
];

const CHARACTER_STAFF_SORTS: Array<{ value: CharacterSort & StaffSort; label: string }> = [
  { value: 'FAVOURITES_DESC', label: 'Most Favourited' },
  { value: 'FAVOURITES', label: 'Least Favourited' },
  { value: 'SEARCH_MATCH', label: 'Relevance' },
  { value: 'ID_DESC', label: 'Newest Added' },
];

const STUDIO_SORTS: Array<{ value: StudioSort; label: string }> = [
  { value: 'FAVOURITES_DESC', label: 'Most Favourited' },
  { value: 'NAME', label: 'Name (A – Z)' },
  { value: 'NAME_DESC', label: 'Name (Z – A)' },
  { value: 'SEARCH_MATCH', label: 'Relevance' },
  { value: 'ID_DESC', label: 'Newest Added' },
];

const USER_SORTS: Array<{ value: UserSort; label: string }> = [
  { value: 'SEARCH_MATCH', label: 'Relevance' },
  { value: 'WATCHED_TIME_DESC', label: 'Most Anime Watched' },
  { value: 'CHAPTERS_READ_DESC', label: 'Most Chapters Read' },
  { value: 'USERNAME', label: 'Username (A – Z)' },
  { value: 'USERNAME_DESC', label: 'Username (Z – A)' },
];

export function FilterSheet({
  open,
  onClose,
  filters,
  allowAdult,
  onApply,
  onReset,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const isMedia = draft.type === 'ANIME' || draft.type === 'MANGA';
  const { data: meta } = useSearchMetadataQuery(isMedia);

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [open, filters]);

  const formats = draft.type === 'ANIME' ? ANIME_FORMATS : MANGA_FORMATS;
  const availableGenres = (meta?.GenreCollection ?? []).filter(
    (g) => allowAdult || g !== 'Hentai',
  );
  const availableTags = (meta?.MediaTagCollection ?? [])
    .filter((tag) => allowAdult || !tag.isAdult)
    .slice(0, 28);

  const toggleItem = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <BottomSheetOrModal open={open} onClose={onClose} title="Filter & Sort">
      <div className="space-y-4">
        {/* Media (Anime / Manga) Filters */}
        {isMedia ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
                <span>Sort By</span>
                <select
                  value={draft.sort}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, sort: e.target.value as MediaSort }))
                  }
                  className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
                >
                  {MEDIA_SORTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
                <span>Format</span>
                <select
                  value={draft.format ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      format: (e.target.value as MediaFormat) || undefined,
                    }))
                  }
                  className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
                >
                  <option value="">Any Format</option>
                  {formats.map((format) => (
                    <option key={format} value={format}>
                      {format.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
                <span>Status</span>
                <select
                  value={draft.status ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      status: (e.target.value as MediaStatus) || undefined,
                    }))
                  }
                  className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
                >
                  <option value="">Any Status</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
                <span>Year</span>
                <input
                  type="number"
                  min={1950}
                  max={2035}
                  placeholder="e.g. 2026"
                  value={draft.year ?? ''}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    setDraft((prev) => ({
                      ...prev,
                      year: !Number.isNaN(parsed) && parsed >= 1950 ? parsed : undefined,
                    }));
                  }}
                  className="tabular-nums min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
                />
              </label>
            </div>

            {draft.type === 'ANIME' ? (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Season
                </span>
                <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap">
                  {SEASONS.map((season) => {
                    const active = draft.season === season;
                    return (
                      <button
                        key={season}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            season: active ? undefined : season,
                          }))
                        }
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-crisp ${
                          active
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {season.charAt(0) + season.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {availableGenres.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Genres
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableGenres.map((genre) => {
                    const active = draft.genres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            genres: toggleItem(prev.genres, genre),
                          }))
                        }
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-crisp ${
                          active
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {availableTags.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Popular Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const active = draft.tags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            tags: toggleItem(prev.tags, tag.name),
                          }))
                        }
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-crisp ${
                          active
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* Character / Staff Filters */}
        {draft.type === 'CHARACTER' || draft.type === 'STAFF' ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Sort By</span>
              <select
                value={draft.type === 'CHARACTER' ? draft.characterSort : draft.staffSort}
                onChange={(e) => {
                  const nextSort = e.target.value;
                  setDraft((prev) =>
                    prev.type === 'CHARACTER'
                      ? { ...prev, characterSort: nextSort as CharacterSort }
                      : { ...prev, staffSort: nextSort as StaffSort },
                  );
                }}
                className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
              >
                {CHARACTER_STAFF_SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs font-semibold text-[var(--text-primary)]">
              <div>
                <span>Birthday Today Only</span>
                <p className="mt-0.5 text-[11px] font-normal text-[var(--text-muted)]">
                  Show {draft.type === 'CHARACTER' ? 'characters' : 'staff members'} celebrating their birthday today.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.isBirthday)}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    isBirthday: e.target.checked || undefined,
                  }))
                }
                className="h-5 w-5 accent-[var(--accent-primary)]"
              />
            </label>
          </div>
        ) : null}

        {/* Studios Filters */}
        {draft.type === 'STUDIO' ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Sort By</span>
              <select
                value={draft.studioSort}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, studioSort: e.target.value as StudioSort }))
                }
                className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
              >
                {STUDIO_SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs font-semibold text-[var(--text-primary)]">
              <div>
                <span>Animation Studios Only</span>
                <p className="mt-0.5 text-[11px] font-normal text-[var(--text-muted)]">
                  Filter out non-animation production committees from the current results.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.animationStudioOnly)}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    animationStudioOnly: e.target.checked || undefined,
                  }))
                }
                className="h-5 w-5 accent-[var(--accent-primary)]"
              />
            </label>
          </div>
        ) : null}

        {/* Users Filters */}
        {draft.type === 'USER' ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Sort By</span>
              <select
                value={draft.userSort}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, userSort: e.target.value as UserSort }))
                }
                className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm font-medium text-[var(--text-primary)]"
              >
                {USER_SORTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs font-semibold text-[var(--text-primary)]">
              <div>
                <span>Moderators Only</span>
                <p className="mt-0.5 text-[11px] font-normal text-[var(--text-muted)]">
                  Show AniList moderators (also works without typing a username).
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.isModerator)}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    isModerator: e.target.checked || undefined,
                  }))
                }
                className="h-5 w-5 accent-[var(--accent-primary)]"
              />
            </label>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onReset();
              onClose();
            }}
          >
            Reset All
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </BottomSheetOrModal>
  );
}
