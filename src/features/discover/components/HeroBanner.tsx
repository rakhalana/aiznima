import { ArrowRight, Star } from 'lucide-react';
import type { MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import {
  formatMeanScore,
  formatMediaFormat,
  formatMediaTitle,
} from '@/shared/utils/formatters';

interface HeroBannerProps {
  media: MediaSummary;
  preferredLanguage: UserTitleLanguage;
  onSelect: (media: MediaSummary) => void;
}

export function HeroBanner({ media, preferredLanguage, onSelect }: HeroBannerProps) {
  const title = formatMediaTitle(media.title, preferredLanguage);
  const bgUrl = media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large;
  const posterUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-slate-900 shadow-token-xs">
      {bgUrl ? (
        <img
          src={bgUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-60 md:opacity-80"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/50 to-slate-950/15 md:bg-gradient-to-r md:from-slate-950/88 md:via-slate-950/45 md:to-slate-950/15"
      />

      <div className="relative flex min-h-48 items-end justify-between gap-6 p-5 text-white md:min-h-72 md:p-7 lg:min-h-[340px] lg:p-8">
        <div className="glass-hero-dock w-full md:max-w-xl md:rounded-xl md:p-5 lg:max-w-2xl lg:p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="glass-hero-badge rounded-md px-2 py-0.5">
              #1 Trending
            </span>
            <span className="glass-hero-badge rounded-md px-2 py-0.5">
              {formatMediaFormat(media.format)}
            </span>
            {media.meanScore ? (
              <span className="glass-hero-badge tabular-nums inline-flex items-center gap-1 rounded-md px-2 py-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.75} />
                {formatMeanScore(media.meanScore)}
              </span>
            ) : null}
          </div>

          <h2 className="max-w-2xl text-xl font-bold tracking-tight md:text-2xl lg:text-[28px] lg:leading-tight">
            {title}
          </h2>

          {media.genres.length > 0 ? (
            <p className="mt-1.5 text-xs text-slate-200 md:text-[13px]">
              {media.genres.slice(0, 4).join(' · ')}
            </p>
          ) : null}

          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSelect(media)}
              leftIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />}
            >
              View Details
            </Button>
          </div>
        </div>

        {posterUrl ? (
          <div className="hidden shrink-0 md:block">
            <div className="aspect-[2/3] w-28 overflow-hidden rounded-xl border border-white/25 bg-slate-800 shadow-token-lg lg:w-36">
              <img
                src={posterUrl}
                alt=""
                aria-hidden="true"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
