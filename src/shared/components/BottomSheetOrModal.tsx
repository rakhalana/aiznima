import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetOrModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  panelClassName?: string;
  children: ReactNode;
}

export function BottomSheetOrModal({
  open,
  onClose,
  title,
  footer,
  panelClassName,
  children,
}: BottomSheetOrModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="glass-scrim fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`animate-sheet-in glass-modal relative z-10 flex w-full flex-col rounded-t-2xl pb-safe md:max-w-lg md:rounded-2xl ${
          panelClassName ?? 'max-h-[88vh] md:max-h-[85vh]'
        }`}
      >
        <div className="shrink-0">
          <div className="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          </div>
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-3.5 py-2.5 md:px-5 md:py-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-crisp focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 md:px-5 md:py-4">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--border-hairline)] px-3.5 py-3 md:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
