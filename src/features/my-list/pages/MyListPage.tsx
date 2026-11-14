import { AuthGuard } from '@/app/layouts/AuthGuard';

export function MyListPage() {
  return (
    <AuthGuard
      title="Track your Anime & Manga"
      description="Log in with AniList to view and update your personal watchlist, episode progress, and scores."
    >
      <section className="space-y-4">
        <header>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">My List</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Your synced AniList watchlist and readlist entries.
          </p>
        </header>
      </section>
    </AuthGuard>
  );
}
