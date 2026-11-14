import { useState, type ReactNode } from 'react';
import { User } from 'lucide-react';

interface EntityPortraitCardProps {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  badgeTopLeft?: ReactNode;
  badgeTopRight?: ReactNode;
  fallbackIcon?: ReactNode;
  onSelect: () => void;
}

/**
 * Shared 2:3 portrait card for Character and Staff search/credit grids.
 */
export function EntityPortraitCard({
  title,
  subtitle,
  imageUrl,
  badgeTopLeft,
  badgeTopRight,
  fallbackIcon,
  onSelect,
}: EntityPortraitCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-[10px]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] shadow-token-xs transition-crisp group-hover:border-[var(--border-strong)] group-active:scale-[0.98]">
          {imageUrl && !imgError ? (
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-[var(--text-muted)]">
              {fallbackIcon ?? <User className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
              <span className="text-[11px] font-medium">No Image</span>
            </div>
          )}

          {badgeTopLeft ? (
            <span className="tabular-nums absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
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
      </button>
    </article>
  );
}
