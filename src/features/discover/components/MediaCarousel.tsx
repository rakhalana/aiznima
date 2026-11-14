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

      {/* Horizontal snap rail on small screens, structured grid on tablet/desktop */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
        {items.slice(0, 6).map((item) => (
          <div key={item.id} className="w-36 shrink-0 md:w-auto">
            <MediaCard
              media={item}
              preferredLanguage={preferredLanguage}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
