import { useState } from 'react';
import { ExternalLink, Play, User } from 'lucide-react';
import { openExternalUrl } from '@/platform';
import type { MediaDetail, MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import { MediaCard } from '@/shared/components/MediaCard';
import { EmptyState } from '@/shared/components/StateFeedback';
import {
  formatFuzzyDate,
  formatMediaFormat,
  formatMediaTitle,
} from '@/shared/utils/formatters';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';

export type MediaDetailTab = 'overview' | 'relations' | 'characters' | 'recommendations';

interface MediaDetailTabsProps {
  media: MediaDetail;
  activeTab: MediaDetailTab;
  preferredLanguage: UserTitleLanguage;
  allowAdult: boolean;
  onSelectMedia: (media: MediaSummary) => void;
}

export function MediaDetailTabs({
  media,
  activeTab,
  preferredLanguage,
  allowAdult,
  onSelectMedia,
}: MediaDetailTabsProps) {
  const [showSpoilers, setShowSpoilers] = useState(false);

  if (activeTab === 'overview') {
    const cleanSynopsis = sanitizeHtml(media.description);
    const spoilerTags = media.tags.filter((tag) => tag.isMediaSpoiler);
    const safeTags = media.tags.filter((tag) => !tag.isMediaSpoiler);
    const visibleTags = showSpoilers ? media.tags : safeTags;

    const mainStudios =
      media.studios?.nodes.map((s) => s.name).join(', ') || 'Unknown';

    const trailerUrl =
      media.trailer?.site === 'youtube' && media.trailer.id
        ? `https://www.youtube.com/watch?v=${media.trailer.id}`
        : null;

    const infoItems = [
      { label: 'Format', value: formatMediaFormat(media.format) },
      { label: 'Status', value: media.status?.replace(/_/g, ' ') ?? 'Unknown' },
      {
        label: media.type === 'ANIME' ? 'Episodes' : 'Chapters',
        value:
          media.type === 'ANIME'
            ? media.episodes
              ? String(media.episodes)
              : 'TBA'
            : media.chapters
              ? String(media.chapters)
              : 'TBA',
      },
      {
        label: media.type === 'ANIME' ? 'Duration' : 'Volumes',
        value:
          media.type === 'ANIME'
            ? media.duration
              ? `${media.duration} min`
              : '—'
            : media.volumes
              ? String(media.volumes)
              : '—',
      },
      {
        label: 'Season',
        value:
          media.season && media.seasonYear
            ? `${media.season.charAt(0) + media.season.slice(1).toLowerCase()} ${media.seasonYear}`
            : formatFuzzyDate(media.startDate),
      },
      { label: 'Start Date', value: formatFuzzyDate(media.startDate) },
      { label: 'Source', value: media.source?.replace(/_/g, ' ') ?? 'Unknown' },
      { label: 'Studio', value: mainStudios },
    ];

    return (
      <div className="space-y-6">
        {cleanSynopsis ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs md:p-5">
            <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              Synopsis
            </h2>
            <div
              className="prose-sm max-w-none space-y-2 text-sm leading-relaxed text-[var(--text-secondary)] [&_a]:text-[var(--accent-primary)] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: cleanSynopsis }}
            />
          </section>
        ) : null}

        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Details
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {infoItems.map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {visibleTags.length > 0 || spoilerTags.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Tags</h2>
              {spoilerTags.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowSpoilers((prev) => !prev)}
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  {showSpoilers
                    ? 'Hide spoiler tags'
                    : `Show ${spoilerTags.length} spoiler tags`}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    tag.isMediaSpoiler
                      ? 'border-amber-300/60 bg-[var(--status-paused-bg)] text-[var(--status-paused-text)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {tag.name}
                  {tag.rank ? (
                    <span className="tabular-nums opacity-70">{tag.rank}%</span>
                  ) : null}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {trailerUrl || media.externalLinks.length > 0 ? (
          <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Trailer & External Links
            </h2>
            <div className="flex flex-wrap gap-2">
              {trailerUrl ? (
                <button
                  type="button"
                  onClick={() => void openExternalUrl(trailerUrl)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] hover:opacity-90 transition-crisp"
                >
                  <Play className="h-3.5 w-3.5" strokeWidth={2} />
                  Watch Trailer (YouTube)
                </button>
              ) : null}

              {media.externalLinks.map((link) =>
                link.url ? (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => void openExternalUrl(link.url!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-crisp"
                  >
                    {link.site}
                    <ExternalLink className="h-3 w-3 opacity-70" strokeWidth={1.75} />
                  </button>
                ) : null,
              )}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (activeTab === 'relations') {
    const edges = (media.relations?.edges ?? []).filter(
      (edge) => edge.node && (allowAdult || !edge.node.isAdult),
    );

    if (edges.length === 0) {
      return (
        <EmptyState
          title="No relations listed"
          description="There are no prequels, sequels, or adaptations recorded for this title."
        />
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {edges.map((edge) => (
          <div key={edge.id} className="space-y-1">
            <span className="inline-block rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
              {edge.relationType?.replace(/_/g, ' ') ?? 'Relation'}
            </span>
            <MediaCard
              media={edge.node}
              preferredLanguage={preferredLanguage}
              onSelect={onSelectMedia}
            />
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === 'characters') {
    const edges = media.characters?.edges ?? [];

    if (edges.length === 0) {
      return (
        <EmptyState
          title="No characters listed"
          description="Character information is not available for this entry yet."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {edges.map((edge) => {
          const va = edge.voiceActors[0];
          return (
            <div
              key={edge.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 shadow-token-xs"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-subtle)]">
                  {edge.node.image?.medium ? (
                    <img
                      src={edge.node.image.medium}
                      alt={edge.node.name.full ?? 'Character'}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                      <User className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {edge.node.name.full ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {edge.role ?? 'Character'}
                  </p>
                </div>
              </div>

              {va ? (
                <div className="flex min-w-0 items-center gap-2.5 text-right">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {va.name.full}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {va.languageV2 ?? 'Japanese'}
                    </p>
                  </div>
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-subtle)]">
                    {va.image?.medium ? (
                      <img
                        src={va.image.medium}
                        alt={va.name.full ?? 'Voice actor'}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const recommendations = (media.recommendations?.nodes ?? [])
    .map((node) => node.mediaRecommendation)
    .filter((rec): rec is MediaSummary =>
      Boolean(rec && (allowAdult || !rec.isAdult)),
    );

  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        description="Community recommendations will appear here once added on AniList."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
      {recommendations.map((rec) => (
        <MediaCard
          key={rec.id}
          media={rec}
          preferredLanguage={preferredLanguage}
          onSelect={onSelectMedia}
        />
      ))}
    </div>
  );
}

export function getMediaHeroTitle(
  media: MediaDetail,
  preferredLanguage: UserTitleLanguage,
): string {
  return formatMediaTitle(media.title, preferredLanguage);
}
