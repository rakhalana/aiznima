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
import { SelectDropdown, type SelectOption } from '@/shared/components/SelectDropdown';
import { formatMediaFormat } from '@/shared/utils/formatters';

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
const STATUS_OPTIONS: Array<SelectOption<MediaStatus | ''>> = [
  { value: '', label: 'Any Status' },
  { value: 'RELEASING', label: 'Releasing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'NOT_YET_RELEASED', label: 'Not Yet Released' },
  { value: 'HIATUS', label: 'Hiatus' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
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
  const [yearInput, setYearInput] = useState(() =>
    filters.year ? String(filters.year) : '',
  );
  const isMedia = draft.type === 'ANIME' || draft.type === 'MANGA';
  const { data: meta } = useSearchMetadataQuery(isMedia);

  useEffect(() => {
    if (open) {
      setDraft(filters);
      setYearInput(filters.year ? String(filters.year) : '');
    }
  }, [open, filters]);

  const formatOptions: Array<SelectOption<MediaFormat | ''>> = [
    { value: '', label: 'Any Format' },
    ...(draft.type === 'ANIME' ? ANIME_FORMATS : MANGA_FORMATS).map((format) => ({
      value: format,
      label: formatMediaFormat(format),
    })),
  ];
  const availableGenres = (meta?.GenreCollection ?? []).filter(
    (g) => allowAdult || g !== 'Hentai',
  );

  const toggleItem = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <BottomSheetOrModal open={open} onClose={onClose} title="Filter & Sort">
      <div className="space-y-4">
        {/* Media (Anime / Manga) Filters */}
        {isMedia ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <SelectDropdown
                label="Sort By"
                value={draft.sort}
                options={MEDIA_SORTS}
                onChange={(nextSort) =>
                  setDraft((prev) => ({ ...prev, sort: nextSort as MediaSort }))
                }
              />

              <SelectDropdown
                label="Format"
                value={draft.format ?? ''}
                options={formatOptions}
                onChange={(nextFormat) =>
                  setDraft((prev) => ({
                    ...prev,
                    format: (nextFormat as MediaFormat) || undefined,
                  }))
                }
              />

              <SelectDropdown
                label="Status"
                value={draft.status ?? ''}
                options={STATUS_OPTIONS}
                onChange={(nextStatus) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: (nextStatus as MediaStatus) || undefined,
                  }))
                }
              />

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                <span>Year</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 2026"
                  value={yearInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setYearInput(digits);
                    const parsed = Number.parseInt(digits, 10);
                    const isValidYear =
                      digits.length === 4 && !Number.isNaN(parsed) && parsed >= 1900 && parsed <= 2099;
                    setDraft((prev) => ({
                      ...prev,
                      year: isValidYear ? parsed : undefined,
                    }));
                  }}
                  className="tabular-nums h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm font-medium text-[var(--text-primary)] shadow-token-xs focus-visible:outline-none focus-visible:border-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-blue-500/20"
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
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-crisp ${active
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
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-crisp ${active
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
          </>
        ) : null}

        {/* Character / Staff Filters */}
        {draft.type === 'CHARACTER' || draft.type === 'STAFF' ? (
          <div className="space-y-3">
            <SelectDropdown
              label="Sort By"
              value={draft.type === 'CHARACTER' ? draft.characterSort : draft.staffSort}
              options={CHARACTER_STAFF_SORTS}
              onChange={(nextSort) => {
                setDraft((prev) =>
                  prev.type === 'CHARACTER'
                    ? { ...prev, characterSort: nextSort as CharacterSort }
                    : { ...prev, staffSort: nextSort as StaffSort },
                );
              }}
            />

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
            <SelectDropdown
              label="Sort By"
              value={draft.studioSort}
              options={STUDIO_SORTS}
              onChange={(nextSort) =>
                setDraft((prev) => ({ ...prev, studioSort: nextSort as StudioSort }))
              }
            />

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
            <SelectDropdown
              label="Sort By"
              value={draft.userSort}
              options={USER_SORTS}
              onChange={(nextSort) =>
                setDraft((prev) => ({ ...prev, userSort: nextSort as UserSort }))
              }
            />

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
