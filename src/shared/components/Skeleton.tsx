export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <div className="aspect-[2/3] w-full animate-pulse rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[var(--bg-subtle)]" />
      <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-[var(--bg-subtle)]" />
    </div>
  );
}

export function MediaRowSkeleton() {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:p-3"
      aria-hidden="true"
    >
      <div className="aspect-[3/4] w-full shrink-0 animate-pulse rounded-lg bg-[var(--bg-subtle)] sm:aspect-auto sm:h-24 sm:w-16" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-subtle)]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--bg-subtle)]" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-[var(--bg-subtle)]" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-44 w-full animate-pulse rounded-2xl bg-[var(--bg-subtle)] md:h-56" />
      <div className="flex gap-4">
        <div className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-[10px] bg-[var(--bg-subtle)] md:w-40" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-6 w-3/4 animate-pulse rounded bg-[var(--bg-subtle)]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-subtle)]" />
          <div className="h-10 w-36 animate-pulse rounded-[10px] bg-[var(--bg-subtle)]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-subtle)]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-subtle)]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--bg-subtle)]" />
      </div>
    </div>
  );
}
