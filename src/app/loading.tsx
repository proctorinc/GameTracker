const loadingTicks = Array.from({ length: 4 }, (_, index) => index);

export default function Loading() {
  return (
    <main className="fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center justify-center overflow-hidden overscroll-none">
      <div className="absolute inset-0 -z-20 animate-splash-gradient-breathe bg-[linear-gradient(135deg,#f8fafc_0%,#f8fafc_24%,#e2e8f0_24%,#e2e8f0_50%,#f1f5f9_50%,#f1f5f9_74%,#cbd5e1_74%,#cbd5e1_100%),linear-gradient(45deg,transparent_0%,transparent_46%,rgba(15,23,42,0.08)_46%,rgba(15,23,42,0.08)_54%,transparent_54%,transparent_100%)] dark:bg-[linear-gradient(135deg,#020617_0%,#020617_24%,#111827_24%,#111827_50%,#1e293b_50%,#1e293b_74%,#334155_74%,#334155_100%),linear-gradient(45deg,transparent_0%,transparent_46%,rgba(248,250,252,0.08)_46%,rgba(248,250,252,0.08)_54%,transparent_54%,transparent_100%)]" />
      <div
        className="absolute inset-0 -z-10 animate-splash-gradient-breathe bg-[linear-gradient(135deg,transparent_0%,transparent_46%,rgba(15,23,42,0.08)_46%,rgba(15,23,42,0.08)_54%,transparent_54%,transparent_100%)] dark:bg-[linear-gradient(135deg,transparent_0%,transparent_46%,rgba(248,250,252,0.1)_46%,rgba(248,250,252,0.1)_54%,transparent_54%,transparent_100%)]"
        style={{ animationDelay: "220ms" }}
      />

      <section className="w-full max-w-md animate-pulse px-6 text-center">
        <h1 className="font-logo text-5xl font-black uppercase tracking-[0.08em] text-slate-950 dark:text-slate-50 sm:text-6xl">
          GAME TRACKER
        </h1>

        <div className="mt-10 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2" aria-hidden="true">
            {loadingTicks.map((tick) => (
              <span
                key={tick}
                className="h-3 w-3 animate-bounce rounded-full bg-slate-950 dark:bg-slate-50"
                style={{ animationDelay: `${tick * 180}ms` }}
              />
            ))}
          </div>
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-300">
            Loading
          </span>
        </div>
      </section>
    </main>
  );
}
