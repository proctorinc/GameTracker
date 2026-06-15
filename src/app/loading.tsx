import AppLogo from "@/components/app-logo";

const loadingTicks = Array.from({ length: 4 }, (_, index) => index);

export default function Loading() {
  return (
    <main className="fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center justify-center overflow-hidden overscroll-none">
      <div className="absolute inset-0 -z-20 bg-background" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_45%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />

      <section className="w-full flex justify-center max-w-md px-6">
        <AppLogo size="xl" className="text-card-foreground animate-pulse" />
      </section>
    </main>
  );
}
