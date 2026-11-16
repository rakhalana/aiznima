import { useMemo, useState } from 'react';
import { ArrowLeft, Lock, Search, UserX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import {
  useMyListQuery,
  usePublicUserListQuery,
} from '@/features/my-list/api/myListQueries';
import { ListEntryCard } from '@/features/my-list/components/ListEntryCard';
import { buildListTabs } from '@/features/my-list/utils/collectionHelpers';
import {
  isPrivateListError,
  isUserNotFoundError,
  usePublicUserQuery,
} from '@/features/profile/api/profileQueries';
import { ProfileHeaderAndStats } from '@/features/profile/components/ProfileHeaderAndStats';
import { CompatibilityCard } from '@/features/user/components/CompatibilityCard';
import { computeUserCompatibility } from '@/features/user/utils/compatibilityEngine';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaType, ScoreFormat } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { DetailSkeleton, MediaRowSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';

export function PublicUserPage() {
  const { username = '' } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);
  const viewer = useAuthStore((state) => state.viewer);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);

  const [listType, setListType] = useState<MediaType>('ANIME');
  const [selectedTab, setSelectedTab] = useState<string>('ALL');

  const {
    data: publicUser,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicUserQuery(username);
  useDocumentTitle(publicUser?.name ?? (username || 'User Profile'));

  const isAuthenticated = Boolean(accessToken && viewer?.id);
  const isOwnProfile = Boolean(
    viewer &&
      publicUser &&
      (viewer.id === publicUser.id ||
        viewer.name.toLowerCase() === publicUser.name.toLowerCase()),
  );

  const {
    data: listCollection,
    isLoading: listLoading,
    isError: listIsError,
    error: listError,
    refetch: refetchList,
  } = usePublicUserListQuery(publicUser?.name, listType, Boolean(publicUser?.name));

  const viewerListQuery = useMyListQuery(
    isAuthenticated && publicUser && !isOwnProfile && !listIsError
      ? viewer?.id
      : undefined,
    listType,
  );

  const viewerScoreFormat: ScoreFormat =
    viewer?.mediaListOptions?.scoreFormat ?? 'POINT_100';

  const compatibility = useMemo(() => {
    if (!isAuthenticated || isOwnProfile || !listCollection || !viewerListQuery.data) {
      return null;
    }
    return computeUserCompatibility({
      mediaType: listType,
      viewerCollection: viewerListQuery.data,
      targetCollection: listCollection,
      viewerScoreFormat,
      targetScoreFormat: publicUser?.mediaListOptions?.scoreFormat ?? 'POINT_100',
      allowAdult,
    });
  }, [
    isAuthenticated,
    isOwnProfile,
    listCollection,
    viewerListQuery.data,
    listType,
    viewerScoreFormat,
    publicUser?.mediaListOptions?.scoreFormat,
    allowAdult,
  ]);

  const tabs = useMemo(
    () => buildListTabs(listCollection, listType, false),
    [listCollection, listType],
  );

  const activeTabGroup = tabs.find((tab) => tab.key === selectedTab) ?? tabs[0]!;

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
      <EmptyState
        icon={<UserX className="h-6 w-6" strokeWidth={1.75} />}
        title="User not found"
        description={`No AniList profile named "${username}" could be found.`}
        actionLabel="Search Users"
        onAction={() => navigate('/search?type=USER')}
      />
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
        actionLabel="Search Users"
        onAction={() => navigate('/search?type=USER')}
      />
    );
  }

  const scoreFormat: ScoreFormat =
    publicUser.mediaListOptions?.scoreFormat ?? 'POINT_100';

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back
        </button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/search?type=USER')}
          leftIcon={<Search className="h-3.5 w-3.5" strokeWidth={1.75} />}
        >
          Find Users
        </Button>
      </div>

      <ProfileHeaderAndStats
        user={publicUser}
        preferredLanguage={preferredLanguage}
        allowAdult={allowAdult}
        onSelectMedia={(media) => navigate(`/media/${media.id}`)}
      />

      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
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

        {!isOwnProfile && !listIsError ? (
          <CompatibilityCard
            targetName={publicUser.name}
            mediaType={listType}
            isAuthenticated={isAuthenticated}
            isLoading={listLoading || viewerListQuery.isLoading}
            compatibility={compatibility}
            viewerScoreFormat={viewerScoreFormat}
            targetScoreFormat={scoreFormat}
            preferredLanguage={preferredLanguage}
            onLoginClick={() =>
              openLoginPrompt(
                `Log in with AniList to compare your taste compatibility with ${publicUser.name}.`,
                `/user/${encodeURIComponent(publicUser.name)}`,
              )
            }
            onSelectMedia={(mediaId) => navigate(`/media/${mediaId}`)}
          />
        ) : null}

        {listLoading && !listCollection ? (
          <div className="grid grid-cols-2 gap-2.5 md:gap-3.5 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <MediaRowSkeleton key={idx} />
            ))}
          </div>
        ) : listIsError && isPrivateListError(listError) ? (
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
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
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
              <div className="grid grid-cols-2 gap-2.5 md:gap-3.5 lg:grid-cols-3">
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
