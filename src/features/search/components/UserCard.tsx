import { useState } from 'react';
import { BookOpen, Film, ShieldCheck } from 'lucide-react';
import type { UserSearchSummary } from '@/shared/api/types';
import type { ViewMode } from '@/shared/stores/usePrefsStore';
import { formatCompactCount } from '@/shared/utils/formatters';

interface UserCardProps {
  user: UserSearchSummary;
  layout?: ViewMode;
  onSelect: (user: UserSearchSummary) => void;
}

export function UserCard({ user, layout = 'grid', onSelect }: UserCardProps) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = user.avatar?.large || user.avatar?.medium;
  const animeCount = user.statistics?.anime?.count ?? 0;
  const mangaCount = user.statistics?.manga?.count ?? 0;
  const isMod = Boolean(user.moderatorRoles && user.moderatorRoles.length > 0);

  if (layout === 'list') {
    return (
      <button
        type="button"
        onClick={() => onSelect(user)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 text-left shadow-token-xs transition-crisp hover:border-[var(--border-strong)] active:scale-[0.99]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-ink)]">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={user.name}
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{user.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {user.name}
            </h3>
            {isMod ? (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)]">
                <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
                Moderator
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                Public Profile
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Film className="h-3 w-3 text-[var(--text-muted)]" strokeWidth={1.75} aria-hidden="true" />
            {formatCompactCount(animeCount)} anime
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3 text-[var(--text-muted)]" strokeWidth={1.75} aria-hidden="true" />
            {formatCompactCount(mangaCount)} manga
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="group flex flex-col gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 text-left shadow-token-xs transition-crisp hover:border-[var(--border-strong)] active:scale-[0.98]"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-ink)]">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={user.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{user.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            {user.name}
          </h3>
          {isMod ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)]">
              <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
              Moderator
            </span>
          ) : (
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              Public Profile
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-hairline)] pt-2 text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
        <span className="inline-flex items-center gap-1">
          <Film className="h-3 w-3 text-[var(--text-muted)]" strokeWidth={1.75} aria-hidden="true" />
          {formatCompactCount(animeCount)} anime
        </span>
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3 w-3 text-[var(--text-muted)]" strokeWidth={1.75} aria-hidden="true" />
          {formatCompactCount(mangaCount)} manga
        </span>
      </div>
    </button>
  );
}
