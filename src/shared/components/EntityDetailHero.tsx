import { useState, type ReactNode } from 'react';
import { ExternalLink, Heart, User } from 'lucide-react';
import { openExternalUrl } from '@/platform';
import type { FavouriteTargetKind } from '@/shared/api/favouriteMutation';
import { FavoriteButton } from '@/shared/components/FavoriteButton';
import { formatCompactCount } from '@/shared/utils/formatters';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';
import { CollapsibleHtmlSection } from './CollapsibleHtmlSection';

export interface EntityMetaItem {
  label: string;
  value: string;
}

export interface EntityFavoriteTarget {
  kind: FavouriteTargetKind;
  id: number;
  returnTo: string;
  isFavourite: boolean;
  isBlocked?: boolean;
}

interface EntityDetailHeroProps {
  title: string;
  nativeTitle?: string | null;
  alternativeNames?: string[] | null;
  imageUrl?: string | null;
  favourites?: number | null;
  siteUrl?: string | null;
  badges?: ReactNode;
  metaItems?: EntityMetaItem[];
  descriptionHtml?: string | null;
  fallbackIcon?: ReactNode;
  favoriteTarget?: EntityFavoriteTarget;
}

/**
 * Reusable mobile-friendly 2-column detail header + metadata + bio block
 * for Character, Staff, and Studio pages.
 */
export function EntityDetailHero({
  title,
  nativeTitle,
  alternativeNames,
  imageUrl,
  favourites,
  siteUrl,
  badges,
  metaItems = [],
  descriptionHtml,
  fallbackIcon,
  favoriteTarget,
}: EntityDetailHeroProps) {
  const [imgError, setImgError] = useState(false);

  const cleanBio = sanitizeHtml(descriptionHtml);
  const altList = (alternativeNames ?? []).filter(Boolean);

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="glass-artwork-card relative overflow-hidden rounded-2xl p-3.5 sm:p-5 md:p-6">
        {imageUrl && !imgError ? (
          <div
            aria-hidden="true"
            className="glass-ambient-artwork pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
          >
            <img
              src={imageUrl}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="h-full w-full scale-110 object-cover opacity-[0.10] blur-2xl saturate-150 dark:opacity-[0.16]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-surface)]/35 via-[var(--bg-surface)]/65 to-[var(--bg-surface)]/92" />
          </div>
        ) : null}

        <div
          className={`relative z-10 ${
            imageUrl !== undefined
              ? 'grid grid-cols-[96px_1fr] items-start gap-3.5 sm:grid-cols-[128px_1fr] sm:gap-5 md:grid-cols-[152px_1fr]'
              : 'space-y-3'
          }`}
        >
          {imageUrl !== undefined ? (
            <div className="aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] shadow-token-xs">
              {imageUrl && !imgError ? (
                <img
                  src={imageUrl}
                  alt={title}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                  {fallbackIcon ?? <User className="h-7 w-7" strokeWidth={1.75} />}
                </div>
              )}
            </div>
          ) : null}

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {badges}
              {typeof favourites === 'number' ? (
                <span className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--error-bg)] px-2 py-0.5 text-[var(--error-text)]">
                  <Heart className="h-3 w-3 fill-current" strokeWidth={1.75} aria-hidden="true" />
                  {formatCompactCount(favourites)}
                </span>
              ) : null}
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl md:text-2xl">
                {title}
              </h1>
              {nativeTitle ? (
                <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                  {nativeTitle}
                </p>
              ) : null}
            </div>

            {altList.length > 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Also known as: {altList.slice(0, 5).join(', ')}
              </p>
            ) : null}

            {favoriteTarget || siteUrl ? (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {favoriteTarget ? (
                  <FavoriteButton
                    targetKind={favoriteTarget.kind}
                    targetId={favoriteTarget.id}
                    targetLabel={title}
                    returnTo={favoriteTarget.returnTo}
                    isFavourite={favoriteTarget.isFavourite}
                    isBlocked={favoriteTarget.isBlocked}
                    size="sm"
                  />
                ) : null}
                {siteUrl ? (
                  <button
                    type="button"
                    onClick={() => void openExternalUrl(siteUrl)}
                    className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    <span>View on AniList</span>
                    <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {metaItems.length > 0 ? (
          <dl className="relative z-10 mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[var(--border-hairline)] pt-4 sm:grid-cols-4">
            {metaItems.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)] sm:text-sm tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {cleanBio ? (
        <CollapsibleHtmlSection
          title="About"
          html={cleanBio}
          className="p-3.5 sm:p-4 md:p-5"
        />
      ) : null}
    </div>
  );
}
