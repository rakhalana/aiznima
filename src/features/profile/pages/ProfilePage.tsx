import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Lock, Search, UserX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthGuard } from '@/app/layouts/AuthGuard';
import { usePublicUserListQuery } from '@/features/my-list/api/myListQueries';
import { ListEntryCard } from '@/features/my-list/components/ListEntryCard';
import { buildListTabs } from '@/features/my-list/utils/collectionHelpers';
import {
  isPrivateListError,
  isUserNotFoundError,
  usePublicUserQuery,
} from '@/features/profile/api/profileQueries';
import { EditProfileModal } from '@/features/profile/components/EditProfileModal';
import { ProfileHeaderAndStats } from '@/features/profile/components/ProfileHeaderAndStats';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaType, ScoreFormat } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { DetailSkeleton, MediaRowSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';

function PublicUserLookupForm({
  label = 'Or browse a public AniList profile without logging in',
}: {
  label?: string;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      navigate(`/user/${encodeURIComponent(trimmed)}`);
      setUsername('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label
        htmlFor="public-user-lookup"
        className="block text-xs font-semibold text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id="public-user-lookup"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter AniList username..."
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <Button
          type="submit"
          variant="secondary"
          leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
        >
          Lookup
        </Button>
      </div>
    </form>
  );
}

function PublicProfileView({ username }: { username: string }) {
  const navigate = useNavigate();
  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const [listType, setListType] = useState<MediaType>('ANIME');
  const [selectedTab, setSelectedTab] = useState<string>('ALL');

  const {
    data: publicUser,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicUserQuery(username);

  const {
    data: listCollection,
    isLoading: listLoading,
    isError: listIsError,
    error: listError,
    refetch: refetchList,
  } = usePublicUserListQuery(publicUser?.name, listType, Boolean(publicUser?.name));

  const tabs = useMemo(
    () => buildListTabs(listCollection, listType, false),
    [listCollection, listType],
  );

  const activeTabGroup =
    tabs.find((tab) => tab.key === selectedTab) ?? tabs[0]!;

  const visibleEntries = useMemo(
    () =>
      (activeTabGroup?.entries ?? []).filter(
        (entry) => allowAdult || !entry.media.isAdult,
      ),
    [activeTabGroup, allowAdult],
  );

  if (isLoading && !publicUser) {
    return <DetailSkeleton />;
  }

  if (isError && isUserNotFoundError(error)) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<UserX className="h-6 w-6" strokeWidth={1.75} />}
          title="User not found"
          description={`No AniList profile named "${username}" could be found.`}
          actionLabel="Back to Profile"
          onAction={() => navigate('/profile')}
        />
      </div>
    );
  }

  if (isError && !publicUser) {
    return (
      <ErrorState
        isOffline={error instanceof NetworkError}
        message={error instanceof Error ? error.message : 'Unable to load public profile.'}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!publicUser) {
    return (
      <EmptyState
        icon={<UserX className="h-6 w-6" strokeWidth={1.75} />}
        title="User not found"
        description={`No AniList profile named "${username}" could be found.`}
        actionLabel="Back to Profile"
        onAction={() => navigate('/profile')}
      />
    );
  }

  const scoreFormat: ScoreFormat =
    publicUser.mediaListOptions?.scoreFormat ?? 'POINT_100';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back
        </button>

        <div className="w-full max-w-sm">
          <PublicUserLookupForm label="Look up another public profile" />
        </div>
      </div>

      <ProfileHeaderAndStats
        user={publicUser}
        preferredLanguage={preferredLanguage}
        allowAdult={allowAdult}
        onSelectMedia={(media) => navigate(`/media/${media.id}`)}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] md:text-lg">
            Public List
          </h2>

          <div
            role="tablist"
            aria-label="Public list media type"
            className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
          >
            {(['ANIME', 'MANGA'] as const).map((type) => (
              <button
                key={type}
                role="tab"
                type="button"
                aria-selected={listType === type}
                onClick={() => {
                  setListType(type);
                  setSelectedTab('ALL');
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-crisp ${
                  listType === type
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {type === 'ANIME' ? 'Anime' : 'Manga'}
              </button>
            ))}
          </div>
        </div>

        {listLoading && !listCollection ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <MediaRowSkeleton key={idx} />
            ))}
          </div>
        ) : listIsError && isPrivateListError(listError) ? (
          // AF-05: Private user list graceful handling
          <EmptyState
            icon={<Lock className="h-6 w-6" strokeWidth={1.75} />}
            title="This user's list is private"
            description={`${publicUser.name}'s ${listType.toLowerCase()} list is set to private on AniList.`}
          />
        ) : listIsError ? (
          <ErrorState
            isOffline={listError instanceof NetworkError}
            message={
              listError instanceof Error
                ? listError.message
                : 'Unable to load public list.'
            }
            onRetry={() => void refetchList()}
          />
        ) : (
          <>
            {tabs.length > 1 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                  const active = activeTabGroup?.key === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedTab(tab.key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-crisp ${
                        active
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="tabular-nums rounded-md bg-[var(--bg-canvas)]/80 px-1.5 py-0.5 text-[10px] font-bold">
                        {tab.entries.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {visibleEntries.length === 0 ? (
              <EmptyState
                title="No public entries"
                description={`${publicUser.name} has no public ${listType.toLowerCase()} entries here yet.`}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {visibleEntries.map((entry) => (
                  <ListEntryCard
                    key={entry.id}
                    entry={entry}
                    readOnly
                    preferredLanguage={preferredLanguage}
                    scoreFormat={scoreFormat}
                    onSelectMedia={(id) => navigate(`/media/${id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

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
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs">
        <PublicUserLookupForm label="Look up a public AniList profile" />
      </div>

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
  const { username } = useParams<{ username: string }>();

  if (username) {
    return <PublicProfileView username={username} />;
  }

  return (
    <AuthGuard
      title="Your AniList Profile"
      description="Log in with AniList to view your anime/manga stats, favorites, and update your profile preferences."
      secondarySlot={<PublicUserLookupForm />}
    >
      <AuthenticatedProfileContent />
    </AuthGuard>
  );
}
