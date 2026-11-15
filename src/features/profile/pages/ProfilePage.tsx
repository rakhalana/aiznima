import { useState } from 'react';
import { BarChart3, LayoutGrid, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/app/layouts/AuthGuard';
import { EditProfileModal } from '@/features/profile/components/EditProfileModal';
import { ProfileDeepStatsPanel } from '@/features/profile/components/ProfileDeepStatsPanel';
import { ProfileHeaderAndStats } from '@/features/profile/components/ProfileHeaderAndStats';
import type { ScoreFormat } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { DetailSkeleton } from '@/shared/components/Skeleton';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';

type ProfileTab = 'OVERVIEW' | 'DEEP_STATS';

function AuthenticatedProfileContent() {
  const navigate = useNavigate();
  const viewer = useAuthStore((state) => state.viewer);
  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('OVERVIEW');

  if (!viewer) {
    return <DetailSkeleton />;
  }

  const scoreFormat: ScoreFormat =
    viewer.mediaListOptions?.scoreFormat ?? 'POINT_100';

  const tabBar = (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'OVERVIEW'}
        onClick={() => setActiveTab('OVERVIEW')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${
          activeTab === 'OVERVIEW'
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Overview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'DEEP_STATS'}
        onClick={() => setActiveTab('DEEP_STATS')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${
          activeTab === 'DEEP_STATS'
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
      >
        <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Deep Stats
      </button>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <ProfileHeaderAndStats
        user={viewer}
        preferredLanguage={preferredLanguage}
        allowAdult={allowAdult}
        canEdit
        middleSlot={tabBar}
        hideOverviewBody={activeTab === 'DEEP_STATS'}
        onEdit={() => setEditOpen(true)}
        onSelectMedia={(media) => navigate(`/media/${media.id}`)}
      />

      {activeTab === 'DEEP_STATS' ? (
        <ProfileDeepStatsPanel
          preferredLanguage={preferredLanguage}
          scoreFormat={scoreFormat}
        />
      ) : null}

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
