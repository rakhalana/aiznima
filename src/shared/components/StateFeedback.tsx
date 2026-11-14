import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-12 text-center shadow-token-xs">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)]">
        {icon ?? <Inbox className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  isOffline?: boolean;
  showingCached?: boolean;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to load data',
  message,
  isOffline = false,
  showingCached = false,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-10 text-center shadow-token-xs"
    >
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--error-bg)] text-[var(--error-text)]">
        {isOffline ? (
          <WifiOff className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        )}
      </div>
      {showingCached ? (
        <span className="mb-2 rounded-md bg-[var(--status-paused-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-paused-text)]">
          Showing cached data
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">{message}</p>
      {onRetry ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
          className="mt-4"
        >
          Try Again
        </Button>
      ) : null}
    </div>
  );
}
