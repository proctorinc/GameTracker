"use client";

const skeletonRows = Array.from({ length: 3 }, (_, index) => index);

export default function ProtectedLoading() {
  return (
    <main className="min-h-dvh px-4 pb-28 pt-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
          <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-muted" />
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {skeletonRows.slice(0, 2).map((row) => (
            <section
              key={row}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
              <div className="mt-5 space-y-3">
                {skeletonRows.map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
          <div className="mt-5 space-y-3">
            {skeletonRows.map((row) => (
              <div
                key={row}
                className="h-16 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
