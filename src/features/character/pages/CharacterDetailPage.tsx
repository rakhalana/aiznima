import { useState } from 'react';
import { Mic, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCharacterDetailQuery,
  useCharacterMediaQuery,
} from '@/features/character/api/characterQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { CharacterMediaEdge, MediaType } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import { DetailTopBar } from '@/shared/components/DetailTopBar';
import {
  EntityDetailHero,
  type EntityMetaItem,
} from '@/shared/components/EntityDetailHero';
import { MediaCard } from '@/shared/components/MediaCard';
import { DetailSkeleton, MediaCardSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { formatFuzzyDate } from '@/shared/utils/formatters';

const MEDIA_FILTERS: Array<{ label: string; value?: MediaType }> = [
  { label: 'All', value: undefined },
  { label: 'Anime', value: 'ANIME' },
  { label: 'Manga', value: 'MANGA' },
];

function selectVoiceActors(voiceActors: CharacterMediaEdge['voiceActors']) {
  const priority = voiceActors.filter((va) =>
    va.languageV2 === 'Japanese' || va.languageV2 === 'English',
  );
  const rest = voiceActors.filter(
    (va) => va.languageV2 !== 'Japanese' && va.languageV2 !== 'English',
  );
  if (priority.length > 0) {
    return { primary: priority, extra: rest };
  }
  return {
    primary: voiceActors.slice(0, 2),
    extra: voiceActors.slice(2),
  };
}

export function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const characterId = Number(id);

  const [mediaFilter, setMediaFilter] = useState<MediaType | undefined>(undefined);
  const [expandedEdgeIds, setExpandedEdgeIds] = useState<Record<number, boolean>>({});

  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const detailQuery = useCharacterDetailQuery(characterId);
  const mediaQuery = useCharacterMediaQuery(characterId, mediaFilter);

  if (!Number.isFinite(characterId) || characterId <= 0) {
    return (
      <EmptyState
        title="Invalid character ID"
        description="The requested character link does not contain a valid ID."
        actionLabel="Browse Characters"
        onAction={() => navigate('/search?type=CHARACTER')}
      />
    );
  }

  if (detailQuery.isLoading) {
    return <DetailSkeleton />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    const isNetwork =
      detailQuery.error instanceof NetworkError || detailQuery.error instanceof TypeError;
    return (
      <ErrorState
        isOffline={isNetwork}
        title={isNetwork ? 'Network error' : 'Character not found'}
        message={
          isNetwork
            ? 'Could not reach AniList. Check your connection and retry.'
            : 'This character could not be loaded from AniList.'
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const character = detailQuery.data;
  const birthday = formatFuzzyDate(character.dateOfBirth);

  const metaItems: EntityMetaItem[] = [];
  if (character.gender) metaItems.push({ label: 'Gender', value: character.gender });
  if (character.age) metaItems.push({ label: 'Age', value: character.age });
  if (birthday !== 'TBA') metaItems.push({ label: 'Birthday', value: birthday });
  if (character.bloodType) metaItems.push({ label: 'Blood Type', value: character.bloodType });

  const allEdges =
    mediaQuery.data?.pages.flatMap((page) => page.Character?.media.edges ?? []) ?? [];
  const visibleEdges = allEdges.filter((edge) => edge.node && (allowAdult || !edge.node.isAdult));

  const toggleExpandEdge = (edgeId: number) => {
    setExpandedEdgeIds((prev) => ({ ...prev, [edgeId]: !prev[edgeId] }));
  };

  const shareUrl = character.siteUrl ?? `https://anilist.co/character/${character.id}`;

  return (
    <div className="flex flex-col">
      <DetailTopBar onBack={() => navigate(-1)} shareUrl={shareUrl} />

      <div className="space-y-5 md:space-y-6">
        <EntityDetailHero
          title={character.name.full ?? 'Unknown Character'}
          nativeTitle={character.name.native}
          alternativeNames={character.name.alternative}
          imageUrl={character.image?.large ?? character.image?.medium ?? null}
          favourites={character.favourites}
          siteUrl={character.siteUrl}
          favoriteTarget={{
            kind: 'CHARACTER',
            id: character.id,
            returnTo: `/character/${character.id}`,
            isFavourite: Boolean(character.isFavourite),
            isBlocked: Boolean(character.isFavouriteBlocked),
          }}
          badges={
            <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent-ink)]">
              Character
            </span>
          }
          metaItems={metaItems}
          descriptionHtml={character.description}
          fallbackIcon={<User className="h-7 w-7" strokeWidth={1.5} />}
        />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Appearances & Voice Actors
          </h2>
          <div
            role="tablist"
            aria-label="Filter character appearances"
            className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
          >
            {MEDIA_FILTERS.map((item) => {
              const selected = mediaFilter === item.value;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMediaFilter(item.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-crisp ${
                    selected
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {mediaQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <MediaCardSkeleton key={idx} />
            ))}
          </div>
        ) : mediaQuery.isError ? (
          <ErrorState
            isOffline={mediaQuery.error instanceof NetworkError}
            title="Could not load appearances"
            message="Something went wrong while fetching connected series."
            onRetry={() => void mediaQuery.refetch()}
          />
        ) : visibleEdges.length === 0 ? (
          <EmptyState
            title="No appearances found"
            description="No anime or manga credits matched the current filter."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
              {visibleEdges.map((edge) => {
                const { primary, extra } = selectVoiceActors(edge.voiceActors);
                const isExpanded = Boolean(expandedEdgeIds[edge.id]);
                const displayedVas = isExpanded ? [...primary, ...extra] : primary;

                return (
                  <div
                    key={edge.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2 shadow-token-xs"
                  >
                    <div className="space-y-1.5">
                      {edge.characterRole ? (
                        <span className="inline-block rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                          {edge.characterRole}
                        </span>
                      ) : null}
                      <MediaCard
                        media={edge.node}
                        preferredLanguage={preferredLanguage}
                        onSelect={(media) => navigate(`/media/${media.id}`)}
                      />
                    </div>

                    {displayedVas.length > 0 ? (
                      <div className="space-y-1 border-t border-[var(--border-hairline)] pt-2">
                        {displayedVas.map((va) => (
                          <button
                            key={va.id}
                            type="button"
                            onClick={() => navigate(`/staff/${va.id}`)}
                            className="flex w-full items-center gap-2 rounded-lg bg-[var(--bg-canvas)] px-1.5 py-1 text-left hover:bg-[var(--bg-subtle)] transition-crisp"
                          >
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                              {va.image?.medium ? (
                                <img
                                  src={va.image.medium}
                                  alt={va.name.full ?? 'Voice actor'}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                                  <Mic className="h-3 w-3" strokeWidth={1.75} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                                {va.name.full ?? 'Unknown VA'}
                              </p>
                              <p className="truncate text-[10px] text-[var(--text-muted)]">
                                {va.languageV2 ?? 'Voice'}
                              </p>
                            </div>
                          </button>
                        ))}
                        {extra.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpandEdge(edge.id)}
                            className="w-full py-0.5 text-center text-[10px] font-semibold text-[var(--accent-primary)] hover:underline"
                          >
                            {isExpanded ? 'Show fewer VAs' : `+${extra.length} more languages`}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {mediaQuery.hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={mediaQuery.isFetchingNextPage}
                  onClick={() => void mediaQuery.fetchNextPage()}
                >
                  Load More
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
      </div>
    </div>
  );
}
