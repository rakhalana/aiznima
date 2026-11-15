import { useState, type ReactNode } from 'react';
import { BookOpen, Edit3, ExternalLink, Film } from 'lucide-react';
import { openExternalUrl } from '@/platform';
import type {
  MediaSummary,
  UserProfile,
  UserTitleLanguage,
} from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { MediaCard } from '@/shared/components/MediaCard';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';

interface ProfileHeaderAndStatsProps {
  user: UserProfile;
  preferredLanguage: UserTitleLanguage;
  allowAdult: boolean;
  canEdit?: boolean;
  middleSlot?: ReactNode;
  hideOverviewBody?: boolean;
  onEdit?: () => void;
  onSelectMedia: (media: MediaSummary) => void;
}

export function ProfileHeaderAndStats({
  user,
  preferredLanguage,
  allowAdult,
  canEdit = false,
  middleSlot = null,
  hideOverviewBody = false,
  onEdit,
  onSelectMedia,
}: ProfileHeaderAndStatsProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarUrl = user.avatar?.large || user.avatar?.medium;
  const artworkBackdropUrl = user.bannerImage || (!avatarFailed ? avatarUrl : null);
  const cleanAbout = sanitizeHtml(user.about);
  const animeStats = user.statistics?.anime;
  const mangaStats = user.statistics?.manga;

  const favAnime = (user.favourites?.anime?.nodes ?? []).filter(
    (item) => allowAdult || !item.isAdult,
  );
  const favManga = (user.favourites?.manga?.nodes ?? []).filter(
    (item) => allowAdult || !item.isAdult,
  );

  const hoursWatched = animeStats
    ? Math.round((animeStats.minutesWatched ?? 0) / 60)
    : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="glass-artwork-card relative overflow-hidden rounded-2xl">
        {artworkBackdropUrl ? (
          <div
            aria-hidden="true"
            className={`glass-ambient-artwork pointer-events-none absolute inset-x-0 bottom-0 hidden overflow-hidden md:block ${
              user.bannerImage ? 'top-28' : 'top-0'
            }`}
          >
            <img
              src={artworkBackdropUrl}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="h-full w-full scale-110 object-cover opacity-[0.12] blur-2xl saturate-150 dark:opacity-[0.18]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-surface)]/25 via-[var(--bg-surface)]/55 to-[var(--bg-surface)]/92" />
          </div>
        ) : null}

        {user.bannerImage ? (
          <div className="relative z-10 h-28 w-full overflow-hidden bg-[var(--bg-subtle)] sm:h-32 md:h-44">
            <img
              src={user.bannerImage}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent"
            />
          </div>
        ) : null}

        <div className="relative z-10 flex flex-col gap-3.5 p-3.5 sm:flex-row sm:items-end sm:justify-between md:p-6">
          <div className="flex items-end gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--bg-surface)] bg-[var(--accent-soft)] text-xl font-bold text-[var(--accent-ink)] shadow-token-sm ${
                user.bannerImage ? '-mt-12 sm:-mt-14' : ''
              }`}
            >
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt={user.name}
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{user.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] md:text-2xl">
                {user.name}
              </h1>
              {user.siteUrl ? (
                <button
                  type="button"
                  onClick={() => void openExternalUrl(user.siteUrl!)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  <span>anilist.co/user/{user.name}</span>
                  <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                </button>
              ) : null}
            </div>
          </div>

          {canEdit && onEdit ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit3 className="h-4 w-4" strokeWidth={1.75} />}
            >
              Edit Profile
            </Button>
          ) : null}
        </div>

        {cleanAbout ? (
          <div
            className="relative z-10 border-t border-[var(--border-hairline)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)] md:px-6 [&_a]:text-[var(--accent-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: cleanAbout }}
          />
        ) : null}
      </section>

      {middleSlot}

      {!hideOverviewBody ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <Film className="h-4 w-4 text-[var(--accent-primary)]" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Anime Statistics
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Titles
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {animeStats?.count ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Episodes
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {animeStats?.episodesWatched ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Hours
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {hoursWatched}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Mean Score
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {animeStats?.meanScore ? `${Math.round(animeStats.meanScore)}%` : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--accent-primary)]" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Manga Statistics
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Titles
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {mangaStats?.count ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Chapters
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {mangaStats?.chaptersRead ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Volumes
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {mangaStats?.volumesRead ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Mean Score
              </dt>
              <dd className="tabular-nums mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {mangaStats?.meanScore ? `${Math.round(mangaStats.meanScore)}%` : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {favAnime.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Favourite Anime
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {favAnime.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                preferredLanguage={preferredLanguage}
                onSelect={onSelectMedia}
              />
            ))}
          </div>
        </section>
      ) : null}

      {favManga.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Favourite Manga
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
            {favManga.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                preferredLanguage={preferredLanguage}
                onSelect={onSelectMedia}
              />
            ))}
          </div>
        </section>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
