import { useParams } from 'react-router-dom';

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Media Detail #{id}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Overview, relations, characters, and community recommendations.
        </p>
      </header>
    </section>
  );
}
