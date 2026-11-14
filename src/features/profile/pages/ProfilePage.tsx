import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/app/layouts/AuthGuard';
import { EditProfileModal } from '@/features/profile/components/EditProfileModal';
import { ProfileHeaderAndStats } from '@/features/profile/components/ProfileHeaderAndStats';
import { Button } from '@/shared/components/Button';
import { DetailSkeleton } from '@/shared/components/Skeleton';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';

function AuthenticatedProfileContent() {
  const navigate = useNavigate();
  const viewer = useAuthStore((state) => state.viewer);
  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const [editOpen, setEditOpen] = useState(false);

  if (!viewer) {
    return <DetailSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <ProfileHeaderAndStats
        user={viewer}
        preferredLanguage={preferredLanguage}
        allowAdult={allowAdult}
        canEdit
        onEdit={() => setEditOpen(true)}
        onSelectMedia={(media) => navigate(`/media/${media.id}`)}
      />

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        viewer={viewer}
      />
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();

  return (
    <AuthGuard
      title="Your AniList Profile"
      description="Log in with AniList to view your anime/manga stats, favorites, and update your profile preferences."
      secondarySlot={
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-xs text-[var(--text-muted)]">
            Looking up someone else&apos;s public AniList profile?
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/search?type=USER')}
            leftIcon={<Search className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Search Users
          </Button>
        </div>
      }
    >
      <AuthenticatedProfileContent />
    </AuthGuard>
  );
}
