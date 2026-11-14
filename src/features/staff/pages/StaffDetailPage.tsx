import { useState } from 'react';
import { Briefcase, Film, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useStaffCharacterMediaQuery,
  useStaffDetailQuery,
  useStaffMediaQuery,
} from '@/features/staff/api/staffQueries';
import { NetworkError } from '@/shared/api/graphqlClient';
import type { MediaType } from '@/shared/api/types';
import { Button } from '@/shared/components/Button';
import {
  EntityDetailHero,
  type EntityMetaItem,
} from '@/shared/components/EntityDetailHero';
import { MediaCard } from '@/shared/components/MediaCard';
import { DetailSkeleton, MediaCardSkeleton } from '@/shared/components/Skeleton';
import { EmptyState, ErrorState } from '@/shared/components/StateFeedback';
import { useIsAdultFilter } from '@/shared/hooks/useIsAdultFilter';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import {
  formatFuzzyDate,
  formatMediaFormat,
  formatMediaTitle,
} from '@/shared/utils/formatters';

type StaffTab = 'roles' | 'credits';

const STAFF_TABS: Array<{ id: StaffTab; label: string }> = [
  { id: 'roles', label: 'Voice Roles' },
  { id: 'credits', label: 'Staff Credits' },
];

const MEDIA_FILTERS: Array<{ label: string; value?: MediaType }> = [
  { label: 'All', value: undefined },
  { label: 'Anime', value: 'ANIME' },
  { label: 'Manga', value: 'MANGA' },
];

function formatYearsActive(yearsActive: number[] | null | undefined): string | null {
  if (!yearsActive || yearsActive.length === 0) return null;
  const [start, end] = yearsActive;
  if (!start) return null;
  return end ? `${start}–${end}` : `${start}–Present`;
}

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const staffId = Number(id);

  const [activeTab, setActiveTab] = useState<StaffTab>('roles');
  const [creditFilter, setCreditFilter] = useState<MediaType | undefined>(undefined);

  const { allowAdult } = useIsAdultFilter();
  const preferredLanguage = usePreferredTitleLanguage();

  const detailQuery = useStaffDetailQuery(staffId);
  const rolesQuery = useStaffCharacterMediaQuery(staffId, activeTab === 'roles');
  const creditsQuery = useStaffMediaQuery(
    staffId,
    creditFilter,
    activeTab === 'credits',
  );

  if (!Number.isFinite(staffId) || staffId <= 0) {
    return (
      <EmptyState
        title="Invalid staff ID"
        description="The requested staff link does not contain a valid ID."
        actionLabel="Browse Staff"
        onAction={() => navigate('/search?type=STAFF')}
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
        title={isNetwork ? 'Network error' : 'Staff member not found'}
        message={
          isNetwork
            ? 'Could not reach AniList. Check your connection and retry.'
            : 'This staff entry could not be loaded from AniList.'
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const staff = detailQuery.data;
  const birthday = formatFuzzyDate(staff.dateOfBirth);
  const deathDate = formatFuzzyDate(staff.dateOfDeath);
  const yearsRange = formatYearsActive(staff.yearsActive);

  const metaItems: EntityMetaItem[] = [];
  if (staff.gender) metaItems.push({ label: 'Gender', value: staff.gender });
  if (typeof staff.age === 'number') metaItems.push({ label: 'Age', value: String(staff.age) });
  if (birthday !== 'TBA') metaItems.push({ label: 'Birthday', value: birthday });
  if (deathDate !== 'TBA') metaItems.push({ label: 'Deceased', value: deathDate });
  if (staff.homeTown) metaItems.push({ label: 'Home Town', value: staff.homeTown });
  if (staff.bloodType) metaItems.push({ label: 'Blood Type', value: staff.bloodType });
  if (yearsRange) metaItems.push({ label: 'Years Active', value: yearsRange });

  const roleEdges = (
    rolesQuery.data?.pages.flatMap((page) => page.Staff?.characterMedia.edges ?? []) ?? []
  ).filter((edge) => edge.node && (allowAdult || !edge.node.isAdult));

  const creditEdges = (
    creditsQuery.data?.pages.flatMap((page) => page.Staff?.staffMedia.edges ?? []) ?? []
  ).filter((edge) => edge.node && (allowAdult || !edge.node.isAdult));

  return (
    <div className="space-y-5 md:space-y-6">
      <EntityDetailHero
        title={staff.name.full ?? 'Unknown Staff'}
        nativeTitle={staff.name.native}
        alternativeNames={staff.name.alternative}
        imageUrl={staff.image?.large ?? staff.image?.medium ?? null}
        favourites={staff.favourites}
        siteUrl={staff.siteUrl}
        badges={
          <>
            <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent-ink)]">
              Staff
            </span>
            {staff.languageV2 ? (
              <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[var(--text-secondary)]">
                {staff.languageV2}
              </span>
            ) : null}
            {(staff.primaryOccupations ?? []).slice(0, 2).map((occ) => (
              <span
                key={occ}
                className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[var(--text-secondary)]"
              >
                {occ}
              </span>
            ))}
          </>
        }
        metaItems={metaItems}
        descriptionHtml={staff.description}
        fallbackIcon={<Briefcase className="h-7 w-7" strokeWidth={1.5} />}
      />

      <div
        role="tablist"
        aria-label="Staff work sections"
        className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
      >
        {STAFF_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-crisp ${
              activeTab === tab.id
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-token-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roles' ? (
        rolesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <MediaCardSkeleton key={idx} />
            ))}
          </div>
        ) : rolesQuery.isError ? (
          <ErrorState
            isOffline={rolesQuery.error instanceof NetworkError}
            title="Could not load voice roles"
            message="Something went wrong while fetching character roles."
            onRetry={() => void rolesQuery.refetch()}
          />
        ) : roleEdges.length === 0 ? (
          <EmptyState
            title="No voice acting roles"
            description="No character roles recorded for this person. Check Staff Credits for production roles."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
              {roleEdges.map((edge) => {
                const character = edge.characters[0];
                const mediaTitle = formatMediaTitle(edge.node.title, preferredLanguage);
                const coverThumb = edge.node.coverImage?.medium || edge.node.coverImage?.large;

                return (
                  <div
                    key={edge.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-token-xs"
                  >
                    {character ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/character/${character.id}`)}
                        className="group flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-subtle)]">
                          {character.image?.large || character.image?.medium ? (
                            <img
                              src={character.image.large || character.image.medium || ''}
                              alt={character.name.full ?? 'Character'}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                              <User className="h-6 w-6" strokeWidth={1.5} />
                            </div>
                          )}
                          {edge.characterRole ? (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-xs">
                              {edge.characterRole}
                            </span>
                          ) : null}
                        </div>
                        <div className="px-2.5 py-2">
                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                            {character.name.full ?? 'Unknown Character'}
                          </p>
                        </div>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => navigate(`/media/${edge.node.id}`)}
                      className="flex items-center gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 px-2.5 py-2 text-left hover:bg-[var(--bg-subtle)] transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-[var(--bg-subtle)]">
                        {coverThumb ? (
                          <img
                            src={coverThumb}
                            alt={mediaTitle}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                            <Film className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[11px] font-semibold text-[var(--text-primary)]">
                          {mediaTitle}
                        </p>
                        <p className="truncate text-[10px] text-[var(--text-muted)]">
                          {formatMediaFormat(edge.node.format)}
                          {edge.node.seasonYear ? ` · ${edge.node.seasonYear}` : ''}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {rolesQuery.hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={rolesQuery.isFetchingNextPage}
                  onClick={() => void rolesQuery.fetchNextPage()}
                >
                  Load More
                </Button>
              </div>
            ) : null}
          </>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <div
              role="group"
              aria-label="Filter staff credits by type"
              className="inline-flex rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
            >
              {MEDIA_FILTERS.map((item) => {
                const selected = creditFilter === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCreditFilter(item.value)}
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

          {creditsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <MediaCardSkeleton key={idx} />
              ))}
            </div>
          ) : creditsQuery.isError ? (
            <ErrorState
              isOffline={creditsQuery.error instanceof NetworkError}
              title="Could not load staff credits"
              message="Something went wrong while fetching production credits."
              onRetry={() => void creditsQuery.refetch()}
            />
          ) : creditEdges.length === 0 ? (
            <EmptyState
              title="No staff credits found"
              description="No production credits matched the selected media filter."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
                {creditEdges.map((edge) => (
                  <div
                    key={edge.id}
                    className="space-y-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2 shadow-token-xs"
                  >
                    {edge.staffRole ? (
                      <span className="inline-block max-w-full truncate rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)]">
                        {edge.staffRole}
                      </span>
                    ) : null}
                    <MediaCard
                      media={edge.node}
                      preferredLanguage={preferredLanguage}
                      onSelect={(media) => navigate(`/media/${media.id}`)}
                    />
                  </div>
                ))}
              </div>

              {creditsQuery.hasNextPage ? (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={creditsQuery.isFetchingNextPage}
                    onClick={() => void creditsQuery.fetchNextPage()}
                  >
                    Load More
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
