import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthGuard } from '@/app/layouts/AuthGuard';
import { Button } from '@/shared/components/Button';
import { useAuthStore } from '@/shared/stores/useAuthStore';

function PublicUserLookupForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      navigate(`/user/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label
        htmlFor="public-user-lookup"
        className="block text-xs font-semibold text-[var(--text-secondary)]"
      >
        Or browse a public AniList profile without logging in
      </label>
      <div className="flex gap-2">
        <input
          id="public-user-lookup"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter AniList username..."
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <Button
          type="submit"
          variant="secondary"
          leftIcon={<Search className="h-4 w-4" strokeWidth={1.75} />}
        >
          Lookup
        </Button>
      </div>
    </form>
  );
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const viewer = useAuthStore((state) => state.viewer);

  if (username) {
    return (
      <section className="space-y-4">
        <header>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            Public Profile: {username}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Public statistics and watchlist entries for {username}.
          </p>
        </header>
      </section>
    );
  }

  return (
    <AuthGuard
      title="Your AniList Profile"
      description="Log in with AniList to view your anime/manga stats, favorites, and update your profile preferences."
      secondarySlot={<PublicUserLookupForm />}
    >
      <section className="space-y-4">
        <header>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {viewer?.name ?? 'Profile'}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Personal statistics, favorites, and account preferences.
          </p>
        </header>
      </section>
    </AuthGuard>
  );
}
