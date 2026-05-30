import { type Metadata } from "next";
import {
  Fredoka,
  Geist_Mono,
  Ranchers,
  Chicle,
  Dongle,
} from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";

// const fontSans = Winky_Sans({
//   subsets: ["latin"],
//   variable: "--font-winky",
// });

const fontSkybo = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const fontRanchers = Ranchers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ranchers",
});

const fontChicle = Chicle({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-chicle",
});

const fontDongle = Dongle({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dongle",
});

export const metadata: Metadata = {
  title: "Game Tracker",
  description: "A game scoring and tracking app",
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
      className={cn(
        "h-full antialiased",
        fontSkybo.variable,
        fontChicle.variable,
        fontRanchers.variable,
        fontMono.variable,
        fontDongle.variable,
      )}
    >
      <body className="min-h-full flex">
        <ThemeProvider>
          <main className="relative flex-1 h-full overflow-auto">
            <div className="flex items-center justify-center text-center w-full h-14">
              <Link
                href="/dashboard"
                className="font-logo text-xl font-black tracking-narrow text-foreground"
              >
                GAME TRACKER
              </Link>
            </div>
            <div className="fixed inset-0 -z-50 h-full w-full overflow-hidden bg-slate-200 dark:bg-background">
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-20 dark:opacity-25",
                )}
                style={{
                  backgroundImage: `
                    linear-gradient(30deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000),
                    linear-gradient(30deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)
                  `,
                  backgroundSize: "20px 35px",
                  backgroundPosition: "0 0, 10px 17.5px",
                  mixBlendMode: "overlay",
                  filter: "invert(0)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 hidden dark:block"
                style={{
                  backgroundImage: `
                    linear-gradient(30deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.18) 75%, rgba(255,255,255,0.18)),
                    linear-gradient(30deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.18) 75%, rgba(255,255,255,0.18))
                  `,
                  backgroundSize: "20px 35px",
                  backgroundPosition: "0 0, 10px 17.5px",
                  mixBlendMode: "screen",
                  opacity: 0.22,
                }}
              />
            </div>
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
