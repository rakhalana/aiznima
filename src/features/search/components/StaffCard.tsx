import { Heart, Mic } from 'lucide-react';
import type { StaffSummary } from '@/shared/api/types';
import { EntityPortraitCard } from '@/shared/components/EntityPortraitCard';
import type { ViewMode } from '@/shared/stores/usePrefsStore';
import { formatCompactCount } from '@/shared/utils/formatters';

interface StaffCardProps {
  staff: StaffSummary;
  layout?: ViewMode;
  onSelect: (staff: StaffSummary) => void;
}

export function StaffCard({ staff, layout = 'grid', onSelect }: StaffCardProps) {
  const title = staff.name.full || staff.name.native || 'Unknown Staff';
  const imageUrl = staff.image?.large || staff.image?.medium;
  const occupation =
    staff.primaryOccupations && staff.primaryOccupations.length > 0
      ? staff.primaryOccupations.slice(0, 2).join(' · ')
      : staff.name.native && staff.name.native !== title
        ? staff.name.native
        : null;

  return (
    <EntityPortraitCard
      title={title}
      subtitle={occupation}
      imageUrl={imageUrl}
      layout={layout}
      fallbackIcon={<Mic className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
      badgeTopLeft={
        typeof staff.favourites === 'number' ? (
          <>
            <Heart className="h-3 w-3 fill-rose-400 text-rose-400" strokeWidth={1.75} aria-hidden="true" />
            {formatCompactCount(staff.favourites)}
          </>
        ) : undefined
      }
      badgeTopRight={staff.languageV2 ?? undefined}
      onSelect={() => onSelect(staff)}
    />
  );
}
