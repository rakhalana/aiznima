import { Heart } from 'lucide-react';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import {
  useToggleFavouriteMutation,
  type FavouriteTargetKind,
} from '@/shared/api/favouriteMutation';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';

interface FavoriteButtonProps {
  targetKind: FavouriteTargetKind;
  targetId: number;
  targetLabel: string;
  returnTo: string;
  isFavourite: boolean;
  isBlocked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Auth-guarded Favorite toggle button used across Media, Character, Staff,
 * and Studio detail pages.
 */
export function FavoriteButton({
  targetKind,
  targetId,
  targetLabel,
  returnTo,
  isFavourite,
  isBlocked = false,
  size = 'sm',
  className = '',
}: FavoriteButtonProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);
  const toggleMutation = useToggleFavouriteMutation();

  const handleClick = () => {
    if (isBlocked) return;
    if (!accessToken) {
      openLoginPrompt(
        `Log in with AniList to favorite "${targetLabel}".`,
        returnTo,
      );
      return;
    }

    toggleMutation.mutate({
      kind: targetKind,
      id: targetId,
      nextIsFavourite: !isFavourite,
    });
  };

  const activeStyle = isFavourite
    ? 'border-rose-500/35 bg-[var(--error-bg)] text-[var(--error-text)] hover:opacity-90'
    : '';

  return (
    <Button
      variant="secondary"
      size={size}
      disabled={isBlocked || toggleMutation.isPending}
      aria-pressed={isFavourite}
      title={
        isBlocked
          ? 'Favoriting is blocked for this entry'
          : isFavourite
            ? 'Remove from favorites'
            : 'Add to favorites'
      }
      onClick={handleClick}
      className={`${activeStyle} ${className}`.trim()}
      leftIcon={
        <Heart
          className={`h-4 w-4 shrink-0 ${isFavourite ? 'fill-current' : ''}`}
          strokeWidth={1.75}
        />
      }
    >
      {isBlocked ? 'Unavailable' : isFavourite ? 'Favorited' : 'Favorite'}
    </Button>
  );
}
