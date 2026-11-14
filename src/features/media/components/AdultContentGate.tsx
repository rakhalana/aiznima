import { Eye, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/Button';

interface AdultContentGateProps {
  onGoBack: () => void;
  onReveal: () => void;
}

export function AdultContentGate({ onGoBack, onReveal }: AdultContentGateProps) {
  return (
    <section className="mx-auto max-w-lg py-10">
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 text-center shadow-token-xs">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-paused-bg)] text-[var(--status-paused-text)]">
          <ShieldAlert className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">
          18+ Content Hidden
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          This entry is marked as mature (18+) on AniList and is hidden by your current content filter.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={onGoBack}>
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={onReveal}
            leftIcon={<Eye className="h-4 w-4" strokeWidth={1.75} />}
          >
            Show this entry
          </Button>
        </div>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          You can adjust Guest content filtering anytime in{' '}
          <Link to="/settings" className="font-semibold text-[var(--accent-primary)] hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
