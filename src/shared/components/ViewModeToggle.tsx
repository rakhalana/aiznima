import { LayoutGrid, LayoutList } from 'lucide-react';
import type { ViewMode } from '@/shared/stores/usePrefsStore';

interface ViewModeToggleProps {
  mode: ViewMode;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Icon button positioned beside search/filter inputs to toggle between
 * portrait grid view and horizontal row-with-poster view.
 */
export function ViewModeToggle({
  mode,
  onToggle,
  size = 'md',
  className = '',
}: ViewModeToggleProps) {
  const isList = mode === 'list';
  const label = isList ? 'Switch to grid view' : 'Switch to row view';
  const dimensions = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isList}
      title={label}
      className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-token-xs transition-crisp hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${className}`}
    >
      {isList ? (
        <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <LayoutList className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
