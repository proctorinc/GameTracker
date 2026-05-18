import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-between py-32 px-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">
          Welcome to App
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mb-8">
          A Next.js application built with Drizzle ORM, TailwindCSS, and shadcn/ui.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Go to Dashboard
          </Link>
          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Deploy on Vercel
          </a>
        </div>
      </main>
    </div>
  );
}
