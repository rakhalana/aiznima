import { useState, type ReactNode } from 'react';
import { User } from 'lucide-react';
import type { ViewMode } from '@/shared/stores/usePrefsStore';

interface EntityPortraitCardProps {
  title: string;
  subtitle?: string | null;
  caption?: string | null;
  imageUrl?: string | null;
  badgeTopLeft?: ReactNode;
  badgeTopRight?: ReactNode;
  fallbackIcon?: ReactNode;
  layout?: ViewMode;
  onSelect: () => void;
}

/**
 * Shared 2:3 portrait card for Character and Staff search/credit grids,
 * supporting both portrait grid cards and horizontal left-poster rows.
 */
export function EntityPortraitCard({
  title,
  subtitle,
  caption,
  imageUrl,
  badgeTopLeft,
  badgeTopRight,
  fallbackIcon,
  layout = 'grid',
  onSelect,
}: EntityPortraitCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const portraitContent =
    imageUrl && !imgError ? (
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          imgLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-[var(--text-muted)]">
        {fallbackIcon ?? <User className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
        <span className="text-[10px] font-medium">No Image</span>
      </div>
    );

  if (layout === 'list') {
    return (
      <article className="group">
        <button
          type="button"
          onClick={onSelect}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 text-left shadow-token-xs transition-crisp hover:border-[var(--border-strong)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <div className="h-24 w-[66px] shrink-0 overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
            {portraitContent}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div>
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-muted)]">
                  {subtitle}
                </p>
              ) : null}
              {caption ? (
                <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--accent-ink)]">
                  {caption}
                </p>
              ) : null}
            </div>

            {badgeTopLeft || badgeTopRight ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {badgeTopLeft ? (
                  <span className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {badgeTopLeft}
                  </span>
                ) : null}
                {badgeTopRight ? (
                  <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)]">
                    {badgeTopRight}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </button>
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-[10px]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] shadow-token-xs transition-crisp group-hover:border-[var(--border-strong)] group-active:scale-[0.98]">
          {portraitContent}

          {badgeTopLeft ? (
            <span className="tabular-nums absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white md:bg-slate-900/75 md:backdrop-blur-xs">
              {badgeTopLeft}
            </span>
          ) : null}

          {badgeTopRight ? (
            <span className="absolute right-2 top-2 rounded-md bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-token-xs">
              {badgeTopRight}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
        {caption ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-secondary)]">
            {caption}
          </p>
        ) : null}
      </button>
    </article>
  );
}
