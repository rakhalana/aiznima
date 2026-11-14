import { Heart, User } from 'lucide-react';
import type { CharacterSummary } from '@/shared/api/types';
import { EntityPortraitCard } from '@/shared/components/EntityPortraitCard';
import { formatCompactCount } from '@/shared/utils/formatters';

interface CharacterCardProps {
  character: CharacterSummary;
  onSelect: (character: CharacterSummary) => void;
}

export function CharacterCard({ character, onSelect }: CharacterCardProps) {
  const title = character.name.full || character.name.native || 'Unknown Character';
  const imageUrl = character.image?.large || character.image?.medium;

  return (
    <EntityPortraitCard
      title={title}
      subtitle={character.name.native && character.name.native !== title ? character.name.native : null}
      imageUrl={imageUrl}
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
