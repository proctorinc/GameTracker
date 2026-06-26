import AppLogo from "@/components/app-logo";

type AppLoadingScreenProps = {
  className?: string;
};

export function AppLoadingScreen({
  className = "fixed inset-0 z-[60]",
}: AppLoadingScreenProps) {
  return (
    <main
      className={`${className} flex h-dvh w-screen flex-col items-center justify-center overflow-hidden overscroll-none`}
    >
      <div className="absolute inset-0 -z-20 bg-background" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_45%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />

      <section className="flex w-full max-w-md justify-center px-6">
        <AppLogo size="xl" className="animate-pulse text-card-foreground" />
      </section>
    </main>
  );
}
