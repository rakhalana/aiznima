import { useState } from 'react';
import { ChevronDown, ChevronUp, HeartHandshake, LogIn } from 'lucide-react';
import type {
  MediaType,
  ScoreFormat,
  UserTitleLanguage,
} from '@/shared/api/types';
import type { UserCompatibilityResult } from '@/features/user/utils/compatibilityEngine';
import { Button } from '@/shared/components/Button';
import {
  formatListStatusLabel,
  formatMediaTitle,
  formatScore,
} from '@/shared/utils/formatters';

interface CompatibilityCardProps {
  targetName: string;
  mediaType: MediaType;
  isAuthenticated: boolean;
  isLoading: boolean;
  compatibility: UserCompatibilityResult | null;
  viewerScoreFormat: ScoreFormat;
  targetScoreFormat: ScoreFormat;
  preferredLanguage: UserTitleLanguage;
  onLoginClick: () => void;
  onSelectMedia: (mediaId: number) => void;
}

const PREVIEW_LIMIT = 4;

function getVerdictBadgeClass(percent: number | null): string {
  if (percent === null) {
    return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]';
  }
  if (percent >= 85) {
    return 'bg-[var(--success-bg)] text-[var(--success-text)] border-emerald-300/50 dark:border-emerald-700/40';
  }
  if (percent >= 70) {
    return 'bg-[var(--accent-soft)] text-[var(--accent-ink)] border-blue-300/50 dark:border-blue-700/40';
  }
  if (percent >= 50) {
    return 'bg-[var(--status-paused-bg)] text-[var(--status-paused-text)] border-amber-300/50 dark:border-amber-700/40';
  }
  return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]';
}

export function CompatibilityCard({
  targetName,
  mediaType,
  isAuthenticated,
  isLoading,
  compatibility,
  viewerScoreFormat,
  targetScoreFormat,
  preferredLanguage,
  onLoginClick,
  onSelectMedia,
}: CompatibilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const unitLabel = mediaType === 'MANGA' ? 'manga' : 'anime';

  if (!isAuthenticated) {
    return (
      <section className="flex flex-col gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-start gap-2.5">
          <HeartHandshake
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Taste Compatibility
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Log in with AniList to see your compatibility % and shared {unitLabel} with {targetName}.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start sm:self-auto"
          onClick={onLoginClick}
          leftIcon={<LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />}
        >
          Log in to Compare
        </Button>
      </section>
    );
  }

  if (isLoading && !compatibility) {
    return (
      <div
        aria-label="Loading compatibility"
        className="h-24 w-full animate-pulse rounded-xl bg-[var(--bg-subtle)]"
      />
    );
  }

  if (!compatibility) {
    return null;
  }

  const sharedTitles = compatibility.sharedTitles;
  const visibleShared = expanded ? sharedTitles : sharedTitles.slice(0, PREVIEW_LIMIT);
  const canToggleMore = sharedTitles.length > PREVIEW_LIMIT;

  return (
    <section
      aria-label="Taste Compatibility"
      className="space-y-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-token-xs sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <HeartHandshake
            className="h-4 w-4 shrink-0 text-[var(--accent-primary)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Compatibility · {mediaType === 'MANGA' ? 'Manga' : 'Anime'}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {sharedTitles.length} shared {unitLabel}
              {compatibility.avgScoreDiff !== null
                ? ` · Avg score diff ±${Math.round(compatibility.avgScoreDiff)} pts`
                : ''}
              {compatibility.sharedTopGenres.length > 0
                ? ` · ${compatibility.sharedTopGenres.join(', ')}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {compatibility.compatibilityPercent !== null ? (
            <span
              className={`tabular-nums inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getVerdictBadgeClass(
                compatibility.compatibilityPercent,
              )}`}
            >
              <span>{compatibility.compatibilityPercent}% Match</span>
              {compatibility.verdict ? (
                <span className="font-semibold opacity-85">· {compatibility.verdict}</span>
              ) : null}
            </span>
          ) : (
            <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              Not enough {unitLabel} data
            </span>
          )}
        </div>
      </div>

      {sharedTitles.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          No shared {unitLabel} entries between you and {targetName} yet.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleShared.map((item) => {
              const title = formatMediaTitle(item.media.title, preferredLanguage);
              const coverUrl =
                item.media.coverImage?.medium || item.media.coverImage?.large || null;
              const viewerLabel =
                item.viewerScore100 > 0
                  ? formatScore(item.viewerRawScore, viewerScoreFormat)
                  : item.viewerStatus
                    ? formatListStatusLabel(item.viewerStatus, item.media.type)
                    : '—';
              const targetLabel =
                item.targetScore100 > 0
                  ? formatScore(item.targetRawScore, targetScoreFormat)
                  : item.targetStatus
                    ? formatListStatusLabel(item.targetStatus, item.media.type)
                    : '—';

              return (
                <button
                  key={item.media.id}
                  type="button"
                  onClick={() => onSelectMedia(item.media.id)}
                  className="group flex items-center gap-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2 text-left transition-crisp hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={title}
                      loading="lazy"
                      className="h-11 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-8 shrink-0 items-center justify-center rounded bg-[var(--bg-subtle)] text-[10px] font-bold text-[var(--text-muted)]">
                      {item.media.type === 'MANGA' ? 'MG' : 'AN'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                      {title}
                    </p>
                    <p className="tabular-nums mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                      <span>You: </span>
                      <strong className="text-[var(--text-primary)]">{viewerLabel}</strong>
                      <span> · {targetName}: </span>
                      <strong className="text-[var(--text-primary)]">{targetLabel}</strong>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {canToggleMore ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              {expanded ? (
                <>
                  Show fewer shared titles
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                </>
              ) : (
                <>
                  Show all {sharedTitles.length} shared {unitLabel}
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                </>
              )}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
