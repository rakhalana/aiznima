import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToastStore, type ToastVariant } from '@/shared/stores/useToastStore';

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

const VARIANT_ACCENTS: Record<ToastVariant, string> = {
  info: 'text-[var(--accent-primary)]',
  success: 'text-[var(--status-current-text)]',
  warning: 'text-[var(--status-paused-text)]',
  error: 'text-[var(--error-text)]',
};

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
    >
      {toasts.map((toast) => {
        const Icon = VARIANT_ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-token-sm"
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${VARIANT_ACCENTS[toast.variant]}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="flex-1 text-xs font-medium text-[var(--text-primary)] md:text-sm">
              {toast.message}
            </p>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-soft)] transition-crisp"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
