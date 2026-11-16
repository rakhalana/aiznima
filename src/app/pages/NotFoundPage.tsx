import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <section className="mx-auto max-w-md py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
        404
      </p>
      <h1 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Page not found</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        The page you requested does not exist or may have moved.
      </p>
      <Link to="/" className="mt-5 inline-block">
        <Button variant="primary" size="sm">
          Back to Discover
        </Button>
      </Link>
    </section>
  );
}
