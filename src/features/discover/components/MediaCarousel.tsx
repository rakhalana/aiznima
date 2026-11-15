import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import { MediaCard } from '@/shared/components/MediaCard';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  seeAllTo: string;
  items: MediaSummary[];
  preferredLanguage: UserTitleLanguage;
  onSelect: (media: MediaSummary) => void;
  getItemProps?: (media: MediaSummary) => {
    subtitleHint?: string | null;
    statusLabelOverride?: string | null;
  };
}

export function MediaCarousel({
  title,
  subtitle,
  seeAllTo,
  items,
  preferredLanguage,
  onSelect,
  getItemProps,
}: MediaCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, 5);

  const handleScroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({
      left: direction * 360,
      behavior: 'smooth',
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] md:text-lg">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {visibleItems.length > 2 ? (
            <div className="hidden items-center gap-1 md:flex lg:hidden">
              <button
                type="button"
                onClick={() => handleScroll(-1)}
                aria-label={`Scroll ${title} left`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-token-xs transition-crisp hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll(1)}
                aria-label={`Scroll ${title} right`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-token-xs transition-crisp hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          ) : null}

          <Link
            to={seeAllTo}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
          >
            See all
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Snap carousel on mobile/tablet; symmetric 5-column showcase row on desktop (lg+) */}
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1.5 scroll-smooth no-scrollbar sm:gap-3.5 md:gap-4 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:pb-0"
      >
        {visibleItems.map((item) => {
          const extra = getItemProps?.(item);
          return (
            <div
              key={item.id}
              className="w-[148px] shrink-0 snap-start sm:w-[168px] md:w-[188px] lg:w-auto lg:shrink"
            >
              <MediaCard
                media={item}
                preferredLanguage={preferredLanguage}
                subtitleHint={extra?.subtitleHint}
                statusLabelOverride={extra?.statusLabelOverride}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
