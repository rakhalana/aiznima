import { useState } from 'react';
import { BookOpen, Film, Star } from 'lucide-react';
import type { MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import type { ViewMode } from '@/shared/stores/usePrefsStore';
import {
  formatListStatusLabel,
  formatMeanScore,
  formatMediaFormat,
  formatMediaTitle,
  formatNextAiringInfo,
} from '@/shared/utils/formatters';

interface MediaCardProps {
  media: MediaSummary;
  preferredLanguage?: UserTitleLanguage | null;
  subtitleHint?: string | null;
  statusLabelOverride?: string | null;
  layout?: ViewMode;
  onSelect?: (media: MediaSummary) => void;
}

export function MediaCard({
  media,
  preferredLanguage = 'ROMAJI',
  subtitleHint = null,
  statusLabelOverride = null,
  layout = 'grid',
  onSelect,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const title = formatMediaTitle(media.title, preferredLanguage);
  const coverUrl = media.coverImage?.large || media.coverImage?.medium || null;
  const countUnit =
    media.type === 'ANIME'
      ? media.episodes
        ? `${media.episodes} ep`
        : media.status === 'RELEASING'
          ? 'Airing'
          : 'TBA'
      : media.chapters
        ? `${media.chapters} ch`
        : media.status === 'RELEASING'
          ? 'Ongoing'
          : 'Manga';

  const statusEntry = media.mediaListEntry?.status;
  const statusBadgeLabel =
    statusLabelOverride ??
    (statusEntry ? formatListStatusLabel(statusEntry, media.type) : null);
  const nextAiring =
    media.type === 'ANIME' ? formatNextAiringInfo(media.nextAiringEpisode) : null;

  const posterContent =
    coverUrl && !imgError ? (
      <img
        src={coverUrl}
        alt={title}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          imgLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    ) : (
      <div
        data-testid="media-cover-fallback"
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-[var(--text-muted)]"
      >
        {media.type === 'MANGA' ? (
          <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Film className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        )}
        <span className="text-[10px] font-medium">No Cover</span>
      </div>
    );

  if (layout === 'list') {
    return (
      <article className="group">
        <button
          type="button"
          onClick={() => onSelect?.(media)}
          className="flex w-full items-stretch gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 text-left shadow-token-xs transition-crisp hover:border-[var(--border-strong)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <div className="relative h-24 w-[66px] shrink-0 overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] sm:h-28 sm:w-[76px]">
            {posterContent}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-0.5">
            <div className="space-y-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                {title}
              </h3>
              {subtitleHint ? (
                <p className="truncate text-[11px] font-medium text-[var(--accent-ink)]">
                  {subtitleHint}
                </p>
              ) : null}
              <p className="truncate text-xs font-medium text-[var(--text-muted)] tabular-nums">
                {formatMediaFormat(media.format)} · {countUnit}
                {media.seasonYear ? ` · ${media.seasonYear}` : ''}
              </p>
              {nextAiring ? (
                <p className="truncate text-[11px] font-medium text-[var(--accent-primary)] tabular-nums">
                  {nextAiring.shortLabel}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {media.meanScore ? (
                <span className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--score-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--score-text)]">
                  <Star className="h-3 w-3 fill-current" strokeWidth={1.75} aria-hidden="true" />
                  {formatMeanScore(media.meanScore)}
                </span>
              ) : null}

              {statusBadgeLabel ? (
                <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)]">
                  {statusBadgeLabel}
                </span>
              ) : null}

              {media.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={() => onSelect?.(media)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-[10px]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] shadow-token-xs transition-crisp group-hover:border-[var(--border-strong)] group-active:scale-[0.98]">
          {posterContent}

          {media.meanScore ? (
            <span className="tabular-nums absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white md:bg-slate-900/75 md:backdrop-blur-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
              {formatMeanScore(media.meanScore)}
            </span>
          ) : null}

          {statusBadgeLabel ? (
            <span className="absolute right-2 top-2 rounded-md bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-token-xs">
              {statusBadgeLabel}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
          {title}
        </h3>
        {subtitleHint ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--accent-ink)]">
            {subtitleHint}
          </p>
        ) : null}
        <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-muted)] tabular-nums">
          {formatMediaFormat(media.format)} · {countUnit}
        </p>
        {nextAiring ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--accent-primary)] tabular-nums">
            {nextAiring.shortLabel}
          </p>
        ) : null}
      </button>
    </article>
  );
}
