import { useState } from 'react';
import { ArrowLeft, BookmarkPlus, Edit3, Heart, Star, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { useMediaDetailQuery } from '@/features/media/api/mediaQueries';
import { AdultContentGate } from '@/features/media/components/AdultContentGate';
import {
  MediaDetailTabs,
  getMediaHeroTitle,
  type MediaDetailTab,
} from '@/features/media/components/MediaDetailTabs';
import { ListEditorModal } from '@/features/my-list/components/ListEditorModal';
import { NetworkError } from '@/shared/api/graphqlClient';
import { Button } from '@/shared/components/Button';
import { DetailSkeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import {
  formatCompactCount,
  formatListStatusLabel,
  formatMeanScore,
  formatMediaFormat,
} from '@/shared/utils/formatters';

const TABS: Array<{ id: MediaDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'related', label: 'Related' },
  { id: 'characters', label: 'Characters' },
  { id: 'staff', label: 'Staff' },
  { id: 'recommendations', label: 'Recommendations' },
];

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const parsedId = Number.parseInt(id ?? '', 10);
  const validId = !Number.isNaN(parsedId) && parsedId > 0 ? parsedId : null;

  const [trackedId, setTrackedId] = useState(validId);
  const [activeTab, setActiveTab] = useState<MediaDetailTab>('overview');
  const [revealedAdult, setRevealedAdult] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  if (trackedId !== validId) {
    setTrackedId(validId);
    setActiveTab('overview');
    setRevealedAdult(false);
    setEditorOpen(false);
  }

  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);

  const { data: media, isLoading, isError, error, refetch } = useMediaDetailQuery(validId);

  if (!validId) {
    return (
      <ErrorState
        title="Invalid media ID"
        message="The requested media identifier is not valid."
      />
    );
  }

  if (isLoading && !media) {
    return <DetailSkeleton />;
  }

  if (isError && !media) {
    return (
      <ErrorState
        isOffline={error instanceof NetworkError}
        message={error instanceof Error ? error.message : 'Unable to load media details.'}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!media) {
    return null;
  }

  if (media.isAdult && !allowAdult && !revealedAdult) {
    return (
      <AdultContentGate
        onGoBack={() => navigate(-1)}
        onReveal={() => setRevealedAdult(true)}
      />
    );
  }

  const title = getMediaHeroTitle(media, preferredLanguage);
  const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;
  const entry = media.mediaListEntry;

  const handleTrackClick = () => {
    if (!accessToken) {
      openLoginPrompt(
        `Log in with AniList to add "${title}" to your list and track your progress.`,
        `/media/${media.id}`,
      );
      return;
    }

    setEditorOpen(true);
  };

  return (
    <div className="flex flex-col">
      <div
        className={`pointer-events-none sticky z-30 flex justify-start ${media.bannerImage
          ? 'top-safe pl-3 pt-3 md:top-0 md:pl-4 md:pt-4'
          : 'top-safe-float mb-3 md:top-4 md:mb-4'
          }`}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-glass)] text-xs font-semibold text-[var(--text-primary)] shadow-token-sm backdrop-blur-md transition-crisp hover:bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Banner + Header */}
      <section
        className={`overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-token-xs ${media.bannerImage ? '-mt-12 md:-mt-[52px]' : ''
          }`}
      >
        {media.bannerImage ? (
          <div className="h-32 w-full overflow-hidden bg-[var(--bg-subtle)] sm:h-40 md:h-52">
            <img
              src={media.bannerImage}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-[96px_1fr] items-end gap-x-3.5 gap-y-3 p-3.5 sm:grid-cols-[116px_1fr] sm:gap-x-5 sm:gap-y-2.5 md:grid-cols-[144px_1fr] md:p-6">
          <div
            className={`aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] shadow-token-sm sm:row-span-2 ${media.bannerImage ? '-mt-12 sm:-mt-16' : ''
              }`}
          >
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="min-w-0 space-y-2 self-end">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[var(--text-secondary)]">
                {formatMediaFormat(media.format)}
              </span>
              {media.meanScore ? (
                <span className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--score-bg)] px-2 py-0.5 text-[var(--score-text)]">
                  <Star className="h-3 w-3 fill-current" strokeWidth={1.75} />
                  {formatMeanScore(media.meanScore)}
                </span>
              ) : null}
              {media.isAdult ? (
                <span className="rounded-md bg-[var(--error-bg)] px-2 py-0.5 text-[var(--error-text)]">
                  18+
                </span>
              ) : null}
            </div>

            <h1 className="text-lg font-bold leading-snug tracking-tight text-[var(--text-primary)] sm:text-xl md:text-2xl">
              {title}
            </h1>

            {typeof media.popularity === 'number' || typeof media.favourites === 'number' ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                {typeof media.popularity === 'number' ? (
                  <span
                    title={`Popularity: ${media.popularity.toLocaleString()}`}
                    className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[var(--text-secondary)]"
                  >
                    <Users className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                    <span>{formatCompactCount(media.popularity)} Popularity</span>
                  </span>
                ) : null}
                {typeof media.favourites === 'number' ? (
                  <span
                    title={`Favorites: ${media.favourites.toLocaleString()}`}
                    className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--error-bg)] px-2 py-0.5 text-[var(--error-text)]"
                  >
                    <Heart className="h-3 w-3 fill-current" strokeWidth={1.75} aria-hidden="true" />
                    <span>{formatCompactCount(media.favourites)} Favorites</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="col-span-2 space-y-2.5 sm:col-span-1 sm:col-start-2">
            {media.genres.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {media.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="pt-0.5">
              <Button
                variant={entry ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleTrackClick}
                leftIcon={
                  entry ? (
                    <Edit3 className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <BookmarkPlus className="h-4 w-4" strokeWidth={1.75} />
                  )
                }
              >
                {entry?.status
                  ? `${formatListStatusLabel(entry.status, media.type)} · ${entry.progress ?? 0}`
                  : 'Add to List'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Media detail sections"
        className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1 md:mt-6"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-9 shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${activeTab === tab.id
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 md:mt-6">
        <MediaDetailTabs
          key={media.id}
          media={media}
          activeTab={activeTab}
          preferredLanguage={preferredLanguage}
          allowAdult={allowAdult || revealedAdult}
          onSelectMedia={(selected) => navigate(`/media/${selected.id}`)}
          onSelectCharacter={(id) => navigate(`/character/${id}`)}
          onSelectStaff={(id) => navigate(`/staff/${id}`)}
          onSelectStudio={(id) => navigate(`/studio/${id}`)}
        />
      </div>

      <ListEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        media={media}
        entry={entry}
      />
    </div>
  );
}
