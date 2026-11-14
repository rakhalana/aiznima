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

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-slate-900 shadow-token-xs">
      {bgUrl ? (
        <img
          src={bgUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20"
      />

      <div className="relative flex min-h-48 flex-col justify-end p-5 text-white md:min-h-60 md:p-7">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-md bg-white/15 px-2 py-0.5 backdrop-blur-xs">
            #1 Trending
          </span>
          <span className="rounded-md bg-white/15 px-2 py-0.5 backdrop-blur-xs">
            {formatMediaFormat(media.format)}
          </span>
          {media.meanScore ? (
            <span className="tabular-nums inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 backdrop-blur-xs">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.75} />
              {formatMeanScore(media.meanScore)}
            </span>
          ) : null}
        </div>

        <h2 className="max-w-2xl text-xl font-bold tracking-tight md:text-2xl">
          {title}
        </h2>

        {media.genres.length > 0 ? (
          <p className="mt-1.5 text-xs text-slate-200">
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
    </section>
  );
}
