export function App() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <section className="max-w-md w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-xs">
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Phase 1 Ready
        </span>
        <h1 className="mt-3 text-xl font-bold tracking-tight">Aiznima</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Crisp Cool Minimalist AniList client workspace initialized.
        </p>
      </section>
    </main>
  );
}
