import { useState } from 'react';
import { Lock, Plus, Star } from 'lucide-react';
import type {
  MediaListEntry,
  ScoreFormat,
  UserTitleLanguage,
} from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import type { ViewMode } from '@/shared/stores/usePrefsStore';
import {
  formatListStatusLabel,
  formatMediaFormat,
  formatMediaTitle,
  formatNextAiringInfo,
  formatScore,
  getBehindEpisodeCount,
} from '@/shared/utils/formatters';

interface ListEntryCardProps {
  entry: MediaListEntry;
  preferredLanguage: UserTitleLanguage;
  scoreFormat: ScoreFormat;
  layout?: ViewMode;
  readOnly?: boolean;
  onSelectMedia: (mediaId: number) => void;
  onEdit?: (entry: MediaListEntry) => void;
  onIncrementProgress?: (entry: MediaListEntry) => void;
}

export function ListEntryCard({
  entry,
  preferredLanguage,
  scoreFormat,
  layout = 'grid',
  readOnly = false,
  onSelectMedia,
  onEdit,
  onIncrementProgress,
}: ListEntryCardProps) {
  const [imageError, setImageError] = useState(false);
  const isRow = layout === 'list';

  const media = entry.media;
  const title = formatMediaTitle(media.title, preferredLanguage);
  const coverUrl = media.coverImage?.large || media.coverImage?.medium;
  const totalCount = media.type === 'MANGA' ? media.chapters : media.episodes;
  const currentProgress = entry.progress ?? 0;
  const nextAiring =
    media.type === 'ANIME' ? formatNextAiringInfo(media.nextAiringEpisode) : null;
  const behindCount =
    media.type === 'ANIME'
      ? getBehindEpisodeCount(
          media.nextAiringEpisode?.episode,
          currentProgress,
          entry.status,
        )
      : 0;
  const isAtMax = totalCount !== null && totalCount > 0 && currentProgress >= totalCount;
  const progressPercent =
    totalCount && totalCount > 0
      ? Math.min(100, Math.round((currentProgress / totalCount) * 100))
      : null;

  return (
    <article
      className={`flex rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-token-xs transition-crisp hover:border-[var(--border-strong)] ${
        isRow ? 'flex-row gap-3 p-2.5 sm:p-3' : 'flex-col gap-2.5 p-2.5 sm:flex-row sm:gap-3 sm:p-3'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectMedia(media.id)}
        className={`relative shrink-0 overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          isRow
            ? 'h-24 w-[66px] sm:h-28 sm:w-[76px]'
            : 'aspect-[3/4] w-full sm:aspect-auto sm:h-28 sm:w-[76px]'
        }`}
      >
        {coverUrl && !imageError ? (
          <img
            src={coverUrl}
            alt={title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] font-medium text-[var(--text-muted)]">
            No Cover
          </div>
        )}

        {!isRow && entry.score && entry.score > 0 ? (
          <span className="tabular-nums absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-md bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 sm:hidden">
            <Star className="h-2.5 w-2.5 fill-current" strokeWidth={1.75} aria-hidden="true" />
            {formatScore(entry.score, scoreFormat)}
          </span>
        ) : null}

        {!isRow && entry.private ? (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:hidden">
            <Lock className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : null}
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => (onEdit && !readOnly ? onEdit(entry) : onSelectMedia(media.id))}
              className="text-left focus-visible:outline-none focus-visible:underline"
            >
              <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors sm:text-sm">
                {title}
              </h3>
            </button>

            {entry.score && entry.score > 0 ? (
              <span
                className={`tabular-nums shrink-0 items-center gap-1 rounded-md bg-[var(--score-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--score-text)] ${
                  isRow ? 'inline-flex' : 'hidden sm:inline-flex'
                }`}
              >
                <Star className="h-3 w-3 fill-current" strokeWidth={1.75} aria-hidden="true" />
                {formatScore(entry.score, scoreFormat)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
            <span>{formatMediaFormat(media.format)}</span>
            {entry.status ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatListStatusLabel(entry.status, media.type)}</span>
              </>
            ) : null}
            {entry.private ? (
              <span
                className={`items-center gap-0.5 rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] ${
                  isRow ? 'inline-flex' : 'hidden sm:inline-flex'
                }`}
              >
                <Lock className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden="true" />
                Private
              </span>
            ) : null}
          </div>

          {nextAiring || behindCount > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-semibold tabular-nums">
              {nextAiring ? (
                <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[var(--accent-ink)]">
                  {nextAiring.shortLabel}
                </span>
              ) : null}
              {behindCount > 0 ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                  Behind {behindCount} ep
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          {progressPercent !== null ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-1.5">
            <span className="tabular-nums truncate text-[11px] font-semibold text-[var(--text-secondary)] sm:text-xs">
              {currentProgress} / {totalCount ?? '?'} {media.type === 'MANGA' ? 'ch' : 'ep'}
            </span>

            {!readOnly ? (
              <div className="flex shrink-0 items-center gap-1">
                {onEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(entry)}
                    className="min-h-8 px-2 text-xs sm:px-2.5"
                  >
                    Edit
                  </Button>
                ) : null}

                {onIncrementProgress ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isAtMax}
                    aria-label={`Increment progress for ${title}`}
                    onClick={() => onIncrementProgress(entry)}
                    leftIcon={<Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />}
                    className="tabular-nums min-h-8 px-2 text-xs sm:px-2.5"
                  >
                    1
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
