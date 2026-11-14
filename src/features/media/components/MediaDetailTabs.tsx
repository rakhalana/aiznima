import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, ChevronDown, ExternalLink, Play, User } from 'lucide-react';
import { openExternalUrl } from '@/platform';
import type { MediaDetail, MediaSummary, UserTitleLanguage } from '@/shared/api/types';
import { EntityPortraitCard } from '@/shared/components/EntityPortraitCard';
import { MediaCard } from '@/shared/components/MediaCard';
import { EmptyState } from '@/shared/components/StateFeedback';
import {
  formatFuzzyDate,
  formatMediaFormat,
  formatMediaTitle,
} from '@/shared/utils/formatters';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';

export type MediaDetailTab =
  | 'overview'
  | 'related'
  | 'characters'
  | 'staff'
  | 'recommendations';

const COLLAPSED_SYNOPSIS_HEIGHT = 112;

interface SynopsisSectionProps {
  html: string;
}

function SynopsisSection({ html }: SynopsisSectionProps) {
  const plainLength = useMemo(
    () => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length,
    [html],
  );
  const lineBreakCount = useMemo(
    () => (html.match(/<(?:p|br)\b/gi) ?? []).length,
    [html],
  );

  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(
    () => plainLength > 200 || lineBreakCount >= 3,
  );
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) {
      return undefined;
    }

    const measure = () => {
      if (el.scrollHeight > 0) {
        setCanCollapse(el.scrollHeight > COLLAPSED_SYNOPSIS_HEIGHT + 4);
      }
    };

    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [html]);

  const isClamped = canCollapse && !expanded;

  return (
    <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs md:p-5">
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Synopsis</h2>
      <div
        onClick={(event) => {
          if (isClamped && !(event.target as HTMLElement).closest('a')) {
            setExpanded(true);
          }
        }}
        className={`relative ${isClamped ? 'max-h-28 cursor-pointer overflow-hidden' : ''}`}
      >
        <div
          ref={contentRef}
          className="prose-sm max-w-none space-y-2 text-sm leading-relaxed text-[var(--text-secondary)] [&_a]:text-[var(--accent-primary)] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {isClamped ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-surface)] to-transparent"
          />
        ) : null}
      </div>

      {canCollapse ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-[var(--accent-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <span>{expanded ? 'Show less' : 'Read more'}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </section>
  );
}

interface MediaDetailTabsProps {
  media: MediaDetail;
  activeTab: MediaDetailTab;
  preferredLanguage: UserTitleLanguage;
  allowAdult: boolean;
  onSelectMedia: (media: MediaSummary) => void;
  onSelectCharacter?: (characterId: number) => void;
  onSelectStaff?: (staffId: number) => void;
  onSelectStudio?: (studioId: number) => void;
}

export function MediaDetailTabs({
  media,
  activeTab,
  preferredLanguage,
  allowAdult,
  onSelectMedia,
  onSelectCharacter,
  onSelectStaff,
  onSelectStudio,
}: MediaDetailTabsProps) {
  const [showSpoilers, setShowSpoilers] = useState(false);

  if (activeTab === 'overview') {
    const cleanSynopsis = sanitizeHtml(media.description);
    const spoilerTags = media.tags.filter((tag) => tag.isMediaSpoiler);
    const safeTags = media.tags.filter((tag) => !tag.isMediaSpoiler);
    const visibleTags = showSpoilers ? media.tags : safeTags;

    const studios = media.studios?.edges?.length
      ? [...media.studios.edges]
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((edge) => ({ id: edge.node.id, name: edge.node.name, isMain: edge.isMain }))
      : (media.studios?.nodes ?? []).map((studio) => ({
          id: studio.id,
          name: studio.name,
          isMain: true,
        }));

    const studioValue: ReactNode =
      studios.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {studios.map((studio) => (
            <button
              key={studio.id}
              type="button"
              onClick={() => onSelectStudio?.(studio.id)}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-crisp ${
                studio.isMain
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:opacity-85'
                  : 'border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {studio.name}
            </button>
          ))}
        </div>
      ) : (
        'Unknown'
      );

    const trailerUrl =
      media.trailer?.site === 'youtube' && media.trailer.id
        ? `https://www.youtube.com/watch?v=${media.trailer.id}`
        : null;

    const infoItems: Array<{ label: string; value: ReactNode; fullRow?: boolean }> = [
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
            : media.seasonYear
              ? String(media.seasonYear)
              : '—',
      },
      { label: 'Source', value: media.source?.replace(/_/g, ' ') ?? 'Unknown' },
      { label: 'Start Date', value: formatFuzzyDate(media.startDate) },
      {
        label: 'End Date',
        value: media.endDate?.year
          ? formatFuzzyDate(media.endDate)
          : media.status === 'RELEASING' || media.status === 'NOT_YET_RELEASED'
            ? 'TBA'
            : '—',
      },
      { label: 'Studio', value: studioValue, fullRow: true },
    ];

    const titleItems: Array<{ label: string; value: string }> = [
      { label: 'Native', value: media.title.native || '—' },
      { label: 'English', value: media.title.english || '—' },
      { label: 'Romaji', value: media.title.romaji || '—' },
    ];

    return (
      <div className="space-y-4 md:space-y-6">
        {cleanSynopsis ? <SynopsisSection html={cleanSynopsis} /> : null}

        <section className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Details
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {infoItems.map((item) => (
              <div key={item.label} className={item.fullRow ? 'col-span-2 sm:col-span-4' : ''}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <dl className="mt-3.5 grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-[var(--border-hairline)] pt-3.5 sm:grid-cols-3">
            {titleItems.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {item.label}
                </dt>
                <dd className="mt-0.5 break-words text-sm font-semibold text-[var(--text-primary)]">
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

  if (activeTab === 'related') {
    const edges = (media.relations?.edges ?? []).filter(
      (edge) => edge.node && (allowAdult || !edge.node.isAdult),
    );

    if (edges.length === 0) {
      return (
        <EmptyState
          title="No related titles listed"
          description="There are no prequels, sequels, or adaptations recorded for this title."
        />
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {edges.map((edge) => (
          <div key={edge.id} className="space-y-1">
            <span className="inline-block rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
              {edge.relationType?.replace(/_/g, ' ') ?? 'Related'}
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        {edges.map((edge) => {
          const va = edge.voiceActors[0];
          return (
            <div
              key={edge.id}
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-token-xs"
            >
              <button
                type="button"
                onClick={() => onSelectCharacter?.(edge.node.id)}
                className="group flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-subtle)]">
                  {edge.node.image?.medium ? (
                    <img
                      src={edge.node.image.medium}
                      alt={edge.node.name.full ?? 'Character'}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                      <User className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                  )}
                  {edge.role ? (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-xs">
                      {edge.role}
                    </span>
                  ) : null}
                </div>
                <div className="px-2.5 py-2">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {edge.node.name.full ?? 'Unknown'}
                  </p>
                </div>
              </button>

              {va ? (
                <button
                  type="button"
                  onClick={() => onSelectStaff?.(va.id)}
                  className="flex items-center gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 px-2.5 py-1.5 text-left hover:bg-[var(--bg-subtle)] transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    {va.image?.medium ? (
                      <img
                        src={va.image.medium}
                        alt={va.name.full ?? 'Voice actor'}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                        <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                      {va.name.full}
                    </p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      {va.languageV2 ?? 'Japanese'}
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (activeTab === 'staff') {
    const edges = media.staff?.edges ?? [];

    if (edges.length === 0) {
      return (
        <EmptyState
          title="No staff listed"
          description="Staff credits are not available for this entry yet."
        />
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        {edges.map((edge) => (
          <EntityPortraitCard
            key={edge.id}
            title={edge.node.name.full ?? 'Unknown'}
            subtitle={edge.role ?? edge.node.languageV2 ?? 'Staff'}
            imageUrl={edge.node.image?.large ?? edge.node.image?.medium}
            fallbackIcon={<Briefcase className="h-6 w-6" strokeWidth={1.5} />}
            onSelect={() => onSelectStaff?.(edge.node.id)}
          />
        ))}
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
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
