import { Building2, ChevronRight, Heart } from 'lucide-react';
import type { StudioSummary } from '@/shared/api/types';
import { formatCompactCount } from '@/shared/utils/formatters';

interface StudioCardProps {
  studio: StudioSummary;
  onSelect: (studio: StudioSummary) => void;
}

export function StudioCard({ studio, onSelect }: StudioCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(studio)}
      className="group flex flex-col justify-between gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 text-left shadow-token-xs transition-crisp hover:border-[var(--border-strong)] active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)]">
          <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </span>

        {typeof studio.favourites === 'number' ? (
          <span className="tabular-nums inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            <Heart className="h-3 w-3 fill-rose-400 text-rose-400" strokeWidth={1.75} aria-hidden="true" />
            {formatCompactCount(studio.favourites)}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 space-y-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
          {studio.name}
        </h3>
        <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-[var(--text-muted)]">
          <span>{studio.isAnimationStudio ? 'Animation Studio' : 'Producer / Studio'}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={2} />
        </div>
      </div>
    </button>
  );
}
