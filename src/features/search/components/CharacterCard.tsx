import { Heart, User } from 'lucide-react';
import type { CharacterSummary, UserTitleLanguage } from '@/shared/api/types';
import { EntityPortraitCard } from '@/shared/components/EntityPortraitCard';
import type { ViewMode } from '@/shared/stores/usePrefsStore';
import { formatCompactCount, formatMediaTitle } from '@/shared/utils/formatters';

interface CharacterCardProps {
  character: CharacterSummary;
  preferredLanguage?: UserTitleLanguage | null;
  allowAdult?: boolean;
  layout?: ViewMode;
  onSelect: (character: CharacterSummary) => void;
}

export function CharacterCard({
  character,
  preferredLanguage = 'ROMAJI',
  allowAdult = true,
  layout = 'grid',
  onSelect,
}: CharacterCardProps) {
  const title = character.name.full || character.name.native || 'Unknown Character';
  const imageUrl = character.image?.large || character.image?.medium;
  const parentMedia =
    character.media?.nodes?.find((node) => node && (allowAdult || !node.isAdult)) ?? null;
  const parentTitle = parentMedia
    ? formatMediaTitle(parentMedia.title, preferredLanguage)
    : null;
  const parentCaption =
    parentMedia && parentTitle
      ? `${parentMedia.type === 'MANGA' ? 'Manga' : 'Anime'} · ${parentTitle}`
      : null;

  return (
    <EntityPortraitCard
      title={title}
      subtitle={character.name.native && character.name.native !== title ? character.name.native : null}
      caption={parentCaption}
      imageUrl={imageUrl}
      layout={layout}
      fallbackIcon={<User className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
      badgeTopLeft={
        typeof character.favourites === 'number' ? (
          <>
            <Heart className="h-3 w-3 fill-rose-400 text-rose-400" strokeWidth={1.75} aria-hidden="true" />
            {formatCompactCount(character.favourites)}
          </>
        ) : undefined
      }
      onSelect={() => onSelect(character)}
    />
  );
}
