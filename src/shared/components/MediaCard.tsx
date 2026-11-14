import { useState } from 'react';
import { BookOpen, Film, Star } from 'lucide-react';
import type { MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import {
  formatListStatusLabel,
  formatMeanScore,
  formatMediaFormat,
  formatMediaTitle,
} from '@/shared/utils/formatters';

interface MediaCardProps {
  media: MediaSummary;
  preferredLanguage?: UserTitleLanguage | null;
  onSelect?: (media: MediaSummary) => void;
}

export function MediaCard({
  media,
  preferredLanguage = 'ROMAJI',
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

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={() => onSelect?.(media)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-[10px]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] shadow-token-xs transition-crisp group-hover:border-[var(--border-strong)] group-active:scale-[0.98]">
          {coverUrl && !imgError ? (
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
              className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-[var(--text-muted)]"
            >
              {media.type === 'MANGA' ? (
                <BookOpen className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Film className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span className="text-[11px] font-medium">No Cover</span>
            </div>
          )}

          {media.meanScore ? (
            <span className="tabular-nums absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
              {formatMeanScore(media.meanScore)}
            </span>
          ) : null}

          {statusEntry ? (
            <span className="absolute right-2 top-2 rounded-md bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-token-xs">
              {formatListStatusLabel(statusEntry, media.type)}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
          {title}
        </h3>
        <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-muted)] tabular-nums">
          {formatMediaFormat(media.format)} · {countUnit}
        </p>
      </button>
    </article>
  );
}
