import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import { MediaCard } from '@/shared/components/MediaCard';

interface MediaCarouselProps {
  title: string;
  seeAllTo: string;
  items: MediaSummary[];
  preferredLanguage: UserTitleLanguage;
  onSelect: (media: MediaSummary) => void;
}

export function MediaCarousel({
  title,
  seeAllTo,
  items,
  preferredLanguage,
  onSelect,
}: MediaCarouselProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] md:text-lg">
          {title}
        </h2>
        <Link
          to={seeAllTo}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>

      {/* Structured 2-column grid on mobile expanding responsively on tablet/desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {items.slice(0, 6).map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            preferredLanguage={preferredLanguage}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
