import { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  Film,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePersonalizedTaste } from '@/features/taste/hooks/usePersonalizedTaste';
import type {
  GenreMatrixRow,
  GenreMatrixTag,
  TasteProfile,
} from '@/features/taste/utils/tasteEngine';
import type {
  MediaListEntry,
  MediaType,
  ScoreFormat,
  UserTitleLanguage,
} from '@/shared/api/types';
import { BottomSheetOrModal } from '@/shared/components/BottomSheetOrModal';
import { ErrorState } from '@/shared/components/StateFeedback';
import {
  formatListStatusLabel,
  formatMeanScore,
  formatMediaTitle,
  formatScore,
} from '@/shared/utils/formatters';

interface ProfileDeepStatsPanelProps {
  preferredLanguage: UserTitleLanguage;
  scoreFormat: ScoreFormat;
}

interface DrillDownState {
  title: string;
  subtitle?: string;
  mediaIds: number[];
}

const MATRIX_BADGE_CLASSES: Record<GenreMatrixTag, string> = {
  Signature:
    'bg-[var(--accent-soft)] text-[var(--accent-ink)] border-blue-300/50 dark:border-blue-700/40',
  'Hidden Favorite':
    'bg-[var(--success-bg)] text-[var(--success-text)] border-emerald-300/50 dark:border-emerald-700/40',
  Habitual:
    'bg-[var(--status-paused-bg)] text-[var(--status-paused-text)] border-amber-300/50 dark:border-amber-700/40',
  'High Drop':
    'bg-[var(--error-bg)] text-[var(--error-text)] border-red-300/50 dark:border-red-800/40',
  Standard:
    'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]',
};

function formatProgressUnit(progressUnits: number, mediaType: MediaType): string {
  if (mediaType === 'MANGA') {
    return `${progressUnits} ch`;
  }
  const hours = Math.round(progressUnits / 60);
  return `${hours}h`;
}

function InteractiveMetricBar({
  label,
  count,
  maxCount,
  meanScore,
  meta,
  badge,
  badgeClassName,
  onClick,
}: {
  label: string;
  count: number;
  maxCount: number;
  meanScore?: number;
  meta?: string;
  badge?: string | null;
  badgeClassName?: string;
  onClick: () => void;
}) {
  const widthPct = maxCount > 0 ? Math.max(6, Math.round((count / maxCount) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-lg p-1.5 text-left transition-crisp hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            {label}
          </span>
          {badge ? (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badgeClassName ?? MATRIX_BADGE_CLASSES.Standard
                }`}
            >
              {badge}
            </span>
          ) : null}
        </div>
        <div className="tabular-nums flex shrink-0 items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span>{count}</span>
          {meta ? <span>· {meta}</span> : null}
          {meanScore && meanScore > 0 ? (
            <span className="rounded bg-[var(--score-bg)] px-1.5 py-0.5 font-semibold text-[var(--score-text)]">
              {Math.round(meanScore)}%
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </button>
  );
}

function GenreMatrixCard({
  profile,
  onOpenDrillDown,
}: {
  profile: TasteProfile;
  onOpenDrillDown: (state: DrillDownState) => void;
}) {
  const [sortBy, setSortBy] = useState<'VOLUME' | 'QUALITY'>('VOLUME');

  const sortedGenres = useMemo(() => {
    const base = [...profile.genreMatrix];
    if (sortBy === 'QUALITY') {
      const minThreshold = profile.totalTitles >= 10 ? 3 : 2;
      base.sort((a, b) => {
        const aq = a.count >= minThreshold && a.meanScore > 0 ? 1 : 0;
        const bq = b.count >= minThreshold && b.meanScore > 0 ? 1 : 0;
        if (aq !== bq) return bq - aq;
        if (b.meanScore !== a.meanScore) return b.meanScore - a.meanScore;
        return b.count - a.count;
      });
    }
    return base.slice(0, 12);
  }, [profile.genreMatrix, profile.totalTitles, sortBy]);

  if (sortedGenres.length === 0) {
    return null;
  }

  const maxCount = Math.max(...sortedGenres.map((g) => g.count));

  const formatRowMeta = (row: GenreMatrixRow) => {
    const unit = formatProgressUnit(
      profile.mediaType === 'MANGA' ? row.chaptersRead : row.minutesWatched,
      profile.mediaType,
    );
    if (row.dropRate >= 35) {
      return `${unit} · ${row.dropRate}% drop`;
    }
    if (row.completionRate > 0) {
      return `${unit} · ${row.completionRate}% done`;
    }
    return unit;
  };

  return (
    <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Genre Matrix (Quantity vs Quality)
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Tap any genre to inspect your titles locally
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Sort genre matrix"
          className="inline-flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
        >
          {(['VOLUME', 'QUALITY'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={sortBy === mode}
              onClick={() => setSortBy(mode)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-crisp ${sortBy === mode
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {mode === 'VOLUME' ? 'Most Watched' : 'Top Rated'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 md:gap-x-4">
        {sortedGenres.map((row) => (
          <InteractiveMetricBar
            key={row.genre}
            label={row.genre}
            count={row.count}
            maxCount={maxCount}
            meanScore={row.meanScore}
            meta={formatRowMeta(row)}
            badge={row.matrixTag !== 'Standard' ? row.matrixTag : null}
            badgeClassName={MATRIX_BADGE_CLASSES[row.matrixTag]}
            onClick={() =>
              onOpenDrillDown({
                title: `${row.genre} (${row.count})`,
                subtitle: `${row.meanScore ? `Mean ${Math.round(row.meanScore)}% · ` : ''}${row.matrixTag !== 'Standard' ? row.matrixTag : 'Genre breakdown'
                  }`,
                mediaIds: row.mediaIds,
              })
            }
          />
        ))}
      </div>
    </section>
  );
}

export function ProfileDeepStatsPanel({
  preferredLanguage,
  scoreFormat,
}: ProfileDeepStatsPanelProps) {
  const navigate = useNavigate();
  const [mediaType, setMediaType] = useState<MediaType>('ANIME');
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const { profile, entriesByMediaId, isLoadingStats, isErrorStats, refetchAll } =
    usePersonalizedTaste(mediaType, { skipColdStartCheck: true });

  const drillDownEntries = useMemo<MediaListEntry[]>(() => {
    if (!drillDown) return [];
    const matched: MediaListEntry[] = [];
    const seen = new Set<number>();
    for (const id of drillDown.mediaIds) {
      if (seen.has(id)) continue;
      const entry = entriesByMediaId.get(id);
      if (entry) {
        seen.add(id);
        matched.push(entry);
      }
    }
    return matched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [drillDown, entriesByMediaId]);

  if (isLoadingStats && !profile) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
          <div className="h-44 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
        </div>
      </div>
    );
  }

  if (isErrorStats && !profile) {
    return (
      <ErrorState
        message="Unable to load deep profile statistics right now."
        onRetry={() => void refetchAll()}
      />
    );
  }

  if (!profile) {
    return null;
  }

  const maxFormat = Math.max(1, ...profile.formats.map((f) => f.count));
  const maxLength = Math.max(1, ...profile.lengths.map((l) => l.count));
  const maxScoreCount = Math.max(1, ...profile.scores.map((s) => s.count));
  const maxTagCount = Math.max(1, ...profile.tags.slice(0, 14).map((t) => t.count));
  const maxSourceCount = Math.max(1, ...profile.sourceAffinity.map((s) => s.count));
  const maxYearCount = Math.max(
    1,
    ...profile.releaseYears.slice(0, 12).map((y) => y.count),
  );
  const creators =
    mediaType === 'ANIME' ? profile.studios.slice(0, 10) : profile.staff.slice(0, 10);
  const maxCreatorCount = Math.max(1, ...creators.map((c) => c.count));
  const topVAs = mediaType === 'ANIME' ? profile.voiceActors.slice(0, 8) : [];

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Taste DNA &amp; Deep Statistics
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Powers personalized recommendations on Discover. Click any metric to inspect matching entries.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Deep statistics media type"
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
                onClick={() => setMediaType(type)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-crisp ${active
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {type === 'ANIME' ? (
                  <Film className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                )}
                {type === 'ANIME' ? 'Anime' : 'Manga'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Taste DNA Summary */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 shadow-token-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)]" strokeWidth={1.75} />
            Scoring Style
          </div>
          <p className="tabular-nums mt-1 text-base font-bold text-[var(--text-primary)]">
            {profile.meanScore > 0 ? `${profile.meanScore}%` : '—'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {profile.standardDeviation > 0
              ? `StdDev ±${profile.standardDeviation}`
              : `${profile.totalTitles} entries`}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 shadow-token-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Calendar className="h-3.5 w-3.5 text-[var(--accent-primary)]" strokeWidth={1.75} />
            Favorite Era
          </div>
          <p className="tabular-nums mt-1 text-base font-bold text-[var(--text-primary)]">
            {profile.favoriteEra?.label ?? '—'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {profile.favoriteEra
              ? `${profile.favoriteEra.count} titles · ${Math.round(profile.favoriteEra.meanScore)}%`
              : 'Need year data'}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 shadow-token-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Layers className="h-3.5 w-3.5 text-[var(--accent-primary)]" strokeWidth={1.75} />
            Top Source
          </div>
          <p className="mt-1 truncate text-base font-bold text-[var(--text-primary)]">
            {profile.topSource?.label ?? '—'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {profile.topSource
              ? `${profile.topSource.count} titles · ${profile.topSource.meanScore ? `${Math.round(profile.topSource.meanScore)}%` : 'no score'
              }`
              : 'Syncing list'}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 shadow-token-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Compass className="h-3.5 w-3.5 text-[var(--accent-primary)]" strokeWidth={1.75} />
            Reach &amp; Habits
          </div>
          <p className="mt-1 truncate text-base font-bold text-[var(--text-primary)]">
            {profile.mainstreamProfile}
          </p>
          <p className="tabular-nums text-[11px] text-[var(--text-muted)]">
            {profile.completionRate > 0 || profile.dropRate > 0
              ? `${profile.completionRate}% done · ${profile.dropRate}% drop`
              : `${profile.totalTitles} entries`}
          </p>
        </div>
      </section>

      {/* Statuses & Score Distribution */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {profile.statuses.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Status Distribution
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.statuses.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() =>
                    setDrillDown({
                      title: `${st.label} (${st.count})`,
                      subtitle: st.meanScore ? `Mean ${Math.round(st.meanScore)}%` : undefined,
                      mediaIds: st.mediaIds,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-crisp hover:border-[var(--accent-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  <span>{st.label}</span>
                  <span className="tabular-nums rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-ink)]">
                    {st.count}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {profile.scores.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              Score Distribution
            </h3>
            <div className="space-y-1">
              {profile.scores.slice(0, 8).map((sc) => (
                <InteractiveMetricBar
                  key={sc.key}
                  label={`Score ${sc.label}`}
                  count={sc.count}
                  maxCount={maxScoreCount}
                  meta={formatProgressUnit(sc.progressUnits, mediaType)}
                  onClick={() =>
                    setDrillDown({
                      title: `Rated ${sc.label} (${sc.count})`,
                      mediaIds: sc.mediaIds,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Quantity vs Quality Genre Matrix */}
      <GenreMatrixCard profile={profile} onOpenDrillDown={setDrillDown} />

      {/* Formats & Episode/Chapter Lengths */}
      {(profile.formats.length > 0 || profile.lengths.length > 0) ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {profile.formats.length > 0 ? (
            <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Formats
              </h3>
              <div className="space-y-1">
                {profile.formats.map((fmt) => (
                  <InteractiveMetricBar
                    key={fmt.key}
                    label={fmt.label}
                    count={fmt.count}
                    maxCount={maxFormat}
                    meanScore={fmt.meanScore}
                    meta={formatProgressUnit(fmt.progressUnits, mediaType)}
                    onClick={() =>
                      setDrillDown({
                        title: `${fmt.label} (${fmt.count})`,
                        subtitle: fmt.meanScore ? `Mean ${Math.round(fmt.meanScore)}%` : undefined,
                        mediaIds: fmt.mediaIds,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {profile.lengths.length > 0 ? (
            <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                {mediaType === 'MANGA' ? 'Chapter Lengths' : 'Episode Lengths'}
              </h3>
              <div className="space-y-1">
                {profile.lengths.map((len) => (
                  <InteractiveMetricBar
                    key={len.key}
                    label={len.label}
                    count={len.count}
                    maxCount={maxLength}
                    meanScore={len.meanScore}
                    meta={formatProgressUnit(len.progressUnits, mediaType)}
                    onClick={() =>
                      setDrillDown({
                        title: `${len.label} (${len.count})`,
                        mediaIds: len.mediaIds,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* Source Affinity & Studio/Staff Loyalty */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {profile.sourceAffinity.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              Source Adaptation Affinity
            </h3>
            <div className="space-y-1">
              {profile.sourceAffinity.map((src) => (
                <InteractiveMetricBar
                  key={src.source}
                  label={src.label}
                  count={src.count}
                  maxCount={maxSourceCount}
                  meanScore={src.meanScore}
                  meta={src.completionRate > 0 ? `${src.completionRate}% done` : undefined}
                  onClick={() =>
                    setDrillDown({
                      title: `${src.label} Adaptations (${src.count})`,
                      subtitle: src.meanScore ? `Mean ${Math.round(src.meanScore)}%` : undefined,
                      mediaIds: src.mediaIds,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {creators.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {mediaType === 'ANIME' ? 'Studio Loyalty' : 'Staff & Creator Loyalty'}
              </h3>
            </div>
            <div className="space-y-1">
              {creators.map((creator) => (
                <InteractiveMetricBar
                  key={creator.id}
                  label={creator.name}
                  count={creator.count}
                  maxCount={maxCreatorCount}
                  meanScore={creator.meanScore}
                  meta={formatProgressUnit(creator.progressUnits, mediaType)}
                  badge={creator.isLoyal ? 'Loyal' : null}
                  badgeClassName={MATRIX_BADGE_CLASSES.Signature}
                  onClick={() =>
                    setDrillDown({
                      title: `${creator.name} (${creator.count})`,
                      subtitle: creator.meanScore ? `Mean ${Math.round(creator.meanScore)}%` : undefined,
                      mediaIds: creator.mediaIds,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Tags & Release Years */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {profile.tags.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Top Theme &amp; Setting Tags
              </h3>
            </div>
            <div className="space-y-1">
              {profile.tags.slice(0, 12).map((tag) => (
                <InteractiveMetricBar
                  key={tag.id}
                  label={tag.name}
                  count={tag.count}
                  maxCount={maxTagCount}
                  meanScore={tag.meanScore}
                  onClick={() =>
                    setDrillDown({
                      title: `${tag.name} (${tag.count})`,
                      subtitle: tag.meanScore ? `Mean ${Math.round(tag.meanScore)}%` : undefined,
                      mediaIds: tag.mediaIds,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {profile.releaseYears.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Release Years (Era Curve)
              </h3>
            </div>
            <div className="space-y-1">
              {profile.releaseYears.slice(0, 12).map((yr) => (
                <InteractiveMetricBar
                  key={yr.releaseYear}
                  label={String(yr.releaseYear)}
                  count={yr.count}
                  maxCount={maxYearCount}
                  meanScore={yr.meanScore}
                  meta={formatProgressUnit(yr.progressUnits, mediaType)}
                  onClick={() =>
                    setDrillDown({
                      title: `Released in ${yr.releaseYear} (${yr.count})`,
                      subtitle: yr.meanScore ? `Mean ${Math.round(yr.meanScore)}%` : undefined,
                      mediaIds: yr.mediaIds,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Voice Actors, Countries & Rewatches */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {topVAs.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Top Voice Actors
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {topVAs.map((va) => (
                <button
                  key={va.id}
                  type="button"
                  onClick={() =>
                    setDrillDown({
                      title: `${va.name} (${va.count})`,
                      subtitle: va.meanScore ? `Mean ${Math.round(va.meanScore)}%` : undefined,
                      mediaIds: va.mediaIds,
                    })
                  }
                  className="flex items-center gap-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2 text-left transition-crisp hover:border-[var(--accent-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  {va.imageUrl ? (
                    <img
                      src={va.imageUrl}
                      alt={va.name}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">
                      {va.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {va.name}
                    </p>
                    <p className="tabular-nums truncate text-[11px] text-[var(--text-muted)]">
                      {va.count} titles{va.meanScore ? ` · ${Math.round(va.meanScore)}%` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {(profile.rewatches.totalTitles > 0 || profile.countries.length > 0) ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4 space-y-3">
            {profile.rewatches.totalTitles > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {mediaType === 'MANGA' ? 'Reread Value' : 'Rewatch Value'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDrillDown({
                        title:
                          mediaType === 'MANGA'
                            ? `Reread Titles (${profile.rewatches.totalTitles})`
                            : `Rewatched Titles (${profile.rewatches.totalTitles})`,
                        mediaIds: profile.rewatches.mediaIds,
                      })
                    }
                    className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    View all ({profile.rewatches.totalTitles})
                  </button>
                </div>
                <p className="tabular-nums text-xs text-[var(--text-secondary)]">
                  {profile.rewatches.totalRepeats}{' '}
                  {mediaType === 'MANGA' ? 'rereads' : 'rewatches'} · +
                  {mediaType === 'MANGA'
                    ? `${profile.rewatches.estimatedExtraChapters} extra chapters`
                    : `${profile.rewatches.estimatedExtraHours} extra hours`}
                </p>
              </div>
            ) : null}

            {profile.countries.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  Countries of Origin
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.countries.map((co) => (
                    <button
                      key={co.key}
                      type="button"
                      onClick={() =>
                        setDrillDown({
                          title: `${co.label} (${co.count})`,
                          subtitle: co.meanScore ? `Mean ${Math.round(co.meanScore)}%` : undefined,
                          mediaIds: co.mediaIds,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-crisp hover:border-[var(--accent-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <span>{co.label}</span>
                      <span className="tabular-nums text-[11px] font-bold text-[var(--accent-ink)]">
                        {co.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* Local Drill-Down Modal */}
      <BottomSheetOrModal
        open={Boolean(drillDown)}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title ?? 'Matched Entries'}
      >
        <div className="space-y-3">
          {drillDown?.subtitle ? (
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {drillDown.subtitle}
            </p>
          ) : null}

          {drillDownEntries.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--text-muted)]">
              No matching entries found in your current loaded list.
            </p>
          ) : (
            <div className="space-y-2">
              {drillDownEntries.map((entry) => {
                const entryTitle = formatMediaTitle(entry.media.title, preferredLanguage);
                const cover =
                  entry.media.coverImage?.medium || entry.media.coverImage?.large;
                return (
                  <button
                    key={entry.mediaId}
                    type="button"
                    onClick={() => {
                      setDrillDown(null);
                      navigate(`/media/${entry.mediaId}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2 text-left transition-crisp hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--bg-subtle)]">
                      {cover ? (
                        <img
                          src={cover}
                          alt={entryTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {entryTitle}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                        {entry.status ? (
                          <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 font-semibold text-[var(--accent-ink)]">
                            {formatListStatusLabel(entry.status, entry.media.type)}
                          </span>
                        ) : null}
                        <span className="tabular-nums">
                          {entry.progress ?? 0}
                          {entry.media.type === 'MANGA'
                            ? entry.media.chapters
                              ? ` / ${entry.media.chapters} ch`
                              : ' ch'
                            : entry.media.episodes
                              ? ` / ${entry.media.episodes} ep`
                              : ' ep'}
                        </span>
                        {entry.score && entry.score > 0 ? (
                          <span className="tabular-nums font-semibold text-[var(--score-text)]">
                            Score {formatScore(entry.score, scoreFormat)}
                          </span>
                        ) : entry.media.meanScore ? (
                          <span className="tabular-nums">
                            Avg {formatMeanScore(entry.media.meanScore)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheetOrModal>
    </div>
  );
}
