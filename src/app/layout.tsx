import { type Metadata, type Viewport } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased")}
    >
      <body className="min-h-full flex bg-slate-100 dark:bg-black">
        <ClerkProvider
          appearance={{
            theme: shadcn,
          }}
        >
          <ThemeProvider>
            <main className="relative flex-1 h-full overflow-auto">
              <div className="flex h-16 w-full items-center justify-center gap-3 px-4 text-center backdrop-blur-sm">
                <Link
                  href="/dashboard"
                  aria-label={`${APP_NAME} home`}
                  className="group flex items-center items-center gap-1.5 rounded-full border border-border px-4 py-2 text-foreground transition-transform transition-colors hover:scale-[1.01] hover:border-border/40 dark:border-white/20 scale-75"
                >
                  <Image
                    src="/score-loser.png"
                    alt={`${APP_NAME} logo`}
                    width={24}
                    height={24}
                    className="size-6 object-contain"
                    unoptimized
                  />
                  <span className="font-bold font-logo tracking-[0.18em]">
                    {APP_NAME}
                  </span>
                </Link>
              </div>
              {children}
            </main>
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
